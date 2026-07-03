// ============================================
// LifeOS Module Builder - Response Parser
// 
// Zweck: Parsed AI-Responses und extrahiert
//        Artifacts, Dateien und Tool-Calls
// Verwendet von: Generate API Route, Builder UI
// ============================================

import type { FileArtifact, ModuleArtifact, ParserCallbacks } from './types';

// --------------------------------------------
// Streaming Message Parser
// Inspiriert von bolt.diy/Chef's StreamingMessageParser
// --------------------------------------------

export class ModuleResponseParser {
  private callbacks: ParserCallbacks;
  private currentArtifact: Partial<ModuleArtifact> | null = null;
  private currentFile: Partial<FileArtifact> | null = null;
  private buffer: string = '';
  
  constructor(callbacks: ParserCallbacks = {}) {
    this.callbacks = callbacks;
  }
  
  // --------------------------------------------
  // Haupt-Parse-Funktion
  // --------------------------------------------
  
  parse(content: string): ModuleArtifact[] {
    const artifacts: ModuleArtifact[] = [];
    this.buffer += content;
    
    // Suche nach Artifact-Tags
    const artifactRegex = /<lifeosArtifact\s+id="([^"]+)"\s+title="([^"]+)">([\s\S]*?)<\/lifeosArtifact>/g;
    let match;
    
    while ((match = artifactRegex.exec(this.buffer)) !== null) {
      const [, id, title, innerContent] = match;
      const artifact = this.parseArtifact(id, title, innerContent);
      if (artifact) {
        artifacts.push(artifact);
      }
    }
    
    // Text ohne Artifacts an Callback
    const textContent = this.buffer.replace(artifactRegex, '').trim();
    if (textContent && this.callbacks.onText) {
      this.callbacks.onText(textContent);
    }
    
    return artifacts;
  }
  
  // --------------------------------------------
  // Artifact-Parsing
  // --------------------------------------------
  
  private parseArtifact(id: string, title: string, content: string): ModuleArtifact | null {
    try {
      if (this.callbacks.onArtifactStart) {
        this.callbacks.onArtifactStart({ id, title });
      }
      
      const files = this.parseFiles(content);
      
      const artifact: ModuleArtifact = {
        id,
        title,
        files,
      };
      
      if (this.callbacks.onArtifactEnd) {
        this.callbacks.onArtifactEnd(artifact);
      }
      
      return artifact;
    } catch (error) {
      if (this.callbacks.onError) {
        this.callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      }
      return null;
    }
  }
  
  // --------------------------------------------
  // Datei-Parsing aus Artifact-Content
  // --------------------------------------------
  
  private parseFiles(content: string): FileArtifact[] {
    const files: FileArtifact[] = [];
    
    // Suche nach lifeosAction type="file" Tags
    const fileRegex = /<lifeosAction\s+type="file"\s+filePath="([^"]+)">([\s\S]*?)<\/lifeosAction>/g;
    let match;
    
    while ((match = fileRegex.exec(content)) !== null) {
      const [, path, fileContent] = match;
      
      const file: FileArtifact = {
        path: path.trim(),
        content: this.cleanFileContent(fileContent),
        language: this.detectLanguage(path),
      };
      
      if (this.callbacks.onFileStart) {
        this.callbacks.onFileStart({ path: file.path });
      }
      
      if (this.callbacks.onFileContent) {
        this.callbacks.onFileContent(file);
      }
      
      if (this.callbacks.onFileEnd) {
        this.callbacks.onFileEnd(file);
      }
      
      files.push(file);
    }
    
    return files;
  }
  
  // --------------------------------------------
  // Hilfsfunktionen
  // --------------------------------------------
  
  private cleanFileContent(content: string): string {
    // Entferne führende/nachfolgende Leerzeilen
    return content.trim();
  }
  
  private detectLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'json': 'json',
      'css': 'css',
      'html': 'html',
      'md': 'markdown',
    };
    
    return languageMap[ext || ''] || 'text';
  }
  
  // --------------------------------------------
  // Reset für neuen Parse-Vorgang
  // --------------------------------------------
  
  reset(): void {
    this.currentArtifact = null;
    this.currentFile = null;
    this.buffer = '';
  }
}

// --------------------------------------------
// Einfache Parse-Funktion ohne Callbacks
// --------------------------------------------

export function parseModuleResponse(content: string): {
  text: string;
  artifacts: ModuleArtifact[];
} {
  let text = '';
  const artifacts: ModuleArtifact[] = [];
  
  const parser = new ModuleResponseParser({
    onText: (t) => { text += t; },
    onArtifactEnd: (a) => { artifacts.push(a); },
  });
  
  parser.parse(content);
  
  return { text, artifacts };
}

// --------------------------------------------
// Tool-Call Extraktion
// --------------------------------------------

export interface ExtractedToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export function extractToolCalls(
  responseContent: Array<{ type: string; id?: string; name?: string; input?: unknown }>
): ExtractedToolCall[] {
  return responseContent
    .filter((block): block is { type: 'tool_use'; id: string; name: string; input: unknown } => 
      block.type === 'tool_use' && !!block.id && !!block.name
    )
    .map((block) => ({
      id: block.id,
      name: block.name,
      input: block.input as Record<string, unknown>,
    }));
}

// --------------------------------------------
// Text-Extraktion aus Response
// --------------------------------------------

export function extractTextContent(
  responseContent: Array<{ type: string; text?: string }>
): string {
  return responseContent
    .filter((block): block is { type: 'text'; text: string } => 
      block.type === 'text' && !!block.text
    )
    .map((block) => block.text)
    .join('\n');
}

// --------------------------------------------
// Validierung von generierten Dateien
// --------------------------------------------

export function validateGeneratedFiles(
  files: FileArtifact[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const seenPaths = new Set<string>();
  
  for (const file of files) {
    // Prüfe auf leeren Pfad
    if (!file.path || file.path.trim() === '') {
      errors.push('Datei ohne Pfad gefunden');
      continue;
    }
    
    // Prüfe auf Duplikate
    if (seenPaths.has(file.path)) {
      errors.push(`Doppelter Dateipfad: ${file.path}`);
    }
    seenPaths.add(file.path);
    
    // Prüfe auf leeren Inhalt
    if (!file.content || file.content.trim() === '') {
      errors.push(`Leere Datei: ${file.path}`);
    }
    
    // Prüfe TypeScript/TSX Dateien auf 'use client'
    if (
      (file.path.endsWith('.tsx') || file.path.endsWith('.ts')) &&
      file.path.includes('components/') &&
      !file.content.includes("'use client'") &&
      !file.content.includes('"use client"')
    ) {
      errors.push(`Komponente ohne 'use client': ${file.path}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}



