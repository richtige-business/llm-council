// ============================================
// LifeOS Module Builder - Artifact Parser
// 
// Zweck: Parser für <boltArtifact> und <boltAction> Tags
// Portiert von: bolt.diy
// ============================================

// --------------------------------------------
// Types
// --------------------------------------------

export interface ParsedAction {
  type: 'file' | 'shell' | 'start';
  filePath?: string;
  content: string;
}

export interface ParsedArtifact {
  id: string;
  title: string;
  actions: ParsedAction[];
}

export interface StreamCallbacks {
  onArtifactStart?: (artifact: { id: string; title: string }) => void;
  onArtifactEnd?: (artifact: ParsedArtifact) => void;
  onActionStart?: (action: { type: string; filePath?: string }) => void;
  onActionContent?: (content: string) => void;
  onActionEnd?: (action: ParsedAction) => void;
  onText?: (text: string) => void;
}

// --------------------------------------------
// Streaming Parser Klasse
// --------------------------------------------

export class ArtifactParser {
  private buffer = '';
  private currentArtifact: Partial<ParsedArtifact> | null = null;
  private currentAction: Partial<ParsedAction> | null = null;
  private currentActionContent = '';
  private callbacks: StreamCallbacks;
  private insideArtifact = false;
  private insideAction = false;

  constructor(callbacks: StreamCallbacks = {}) {
    this.callbacks = callbacks;
  }

  // Verarbeitet eingehende Chunks
  processChunk(chunk: string): void {
    this.buffer += chunk;
    this.parseBuffer();
  }

  // Parst den Buffer und extrahiert Artifacts/Actions
  private parseBuffer(): void {
    // Prüfe auf Artifact-Start
    const artifactStartMatch = this.buffer.match(/<boltArtifact\s+id="([^"]+)"\s+title="([^"]+)">/);
    if (artifactStartMatch && !this.insideArtifact) {
      const [fullMatch, id, title] = artifactStartMatch;
      const index = this.buffer.indexOf(fullMatch);
      
      // Text vor dem Artifact ausgeben
      const textBefore = this.buffer.slice(0, index).trim();
      if (textBefore) {
        this.callbacks.onText?.(textBefore);
      }
      
      this.currentArtifact = { id, title, actions: [] };
      this.insideArtifact = true;
      this.callbacks.onArtifactStart?.({ id, title });
      
      this.buffer = this.buffer.slice(index + fullMatch.length);
    }

    // Prüfe auf Action-Start (nur innerhalb eines Artifacts)
    if (this.insideArtifact && !this.insideAction) {
      // Pattern für file action
      const fileActionMatch = this.buffer.match(/<boltAction\s+type="file"\s+filePath="([^"]+)">/);
      const shellActionMatch = this.buffer.match(/<boltAction\s+type="(shell|start)">/);
      
      if (fileActionMatch) {
        const [fullMatch, filePath] = fileActionMatch;
        const index = this.buffer.indexOf(fullMatch);
        
        this.currentAction = { type: 'file', filePath };
        this.currentActionContent = '';
        this.insideAction = true;
        this.callbacks.onActionStart?.({ type: 'file', filePath });
        
        this.buffer = this.buffer.slice(index + fullMatch.length);
      } else if (shellActionMatch) {
        const [fullMatch, type] = shellActionMatch;
        const index = this.buffer.indexOf(fullMatch);
        
        this.currentAction = { type: type as 'shell' | 'start' };
        this.currentActionContent = '';
        this.insideAction = true;
        this.callbacks.onActionStart?.({ type: type as 'shell' | 'start' });
        
        this.buffer = this.buffer.slice(index + fullMatch.length);
      }
    }

    // Prüfe auf Action-Ende
    if (this.insideAction) {
      const actionEndIndex = this.buffer.indexOf('</boltAction>');
      if (actionEndIndex !== -1) {
        const content = this.buffer.slice(0, actionEndIndex);
        this.currentActionContent += content;
        
        const action: ParsedAction = {
          type: this.currentAction!.type as ParsedAction['type'],
          filePath: this.currentAction!.filePath,
          content: this.currentActionContent.trim(),
        };
        
        this.currentArtifact?.actions?.push(action);
        this.callbacks.onActionEnd?.(action);
        
        this.currentAction = null;
        this.currentActionContent = '';
        this.insideAction = false;
        
        this.buffer = this.buffer.slice(actionEndIndex + '</boltAction>'.length);
      } else {
        // Streaming: Content ausgeben und Buffer leeren (bis auf letzte 20 Zeichen für Tag-Erkennung)
        if (this.buffer.length > 20) {
          const contentToEmit = this.buffer.slice(0, -20);
          this.currentActionContent += contentToEmit;
          this.callbacks.onActionContent?.(contentToEmit);
          this.buffer = this.buffer.slice(-20);
        }
      }
    }

    // Prüfe auf Artifact-Ende
    if (this.insideArtifact && !this.insideAction) {
      const artifactEndIndex = this.buffer.indexOf('</boltArtifact>');
      if (artifactEndIndex !== -1) {
        const artifact: ParsedArtifact = {
          id: this.currentArtifact!.id!,
          title: this.currentArtifact!.title!,
          actions: this.currentArtifact!.actions || [],
        };
        
        this.callbacks.onArtifactEnd?.(artifact);
        
        this.currentArtifact = null;
        this.insideArtifact = false;
        
        this.buffer = this.buffer.slice(artifactEndIndex + '</boltArtifact>'.length);
        
        // Restlichen Text ausgeben
        const remainingText = this.buffer.trim();
        if (remainingText) {
          this.callbacks.onText?.(remainingText);
          this.buffer = '';
        }
      }
    }

    // Text außerhalb von Artifacts ausgeben
    if (!this.insideArtifact && !this.insideAction && this.buffer.length > 50) {
      // Prüfe ob ein Tag beginnt
      const potentialTagStart = this.buffer.lastIndexOf('<');
      if (potentialTagStart > 0) {
        const textToEmit = this.buffer.slice(0, potentialTagStart);
        this.callbacks.onText?.(textToEmit);
        this.buffer = this.buffer.slice(potentialTagStart);
      }
    }
  }

  // Beendet das Parsing und gibt verbleibenden Buffer aus
  // Wichtig: Unvollständige Actions/Artifacts werden sauber geschlossen,
  // damit Streaming-Status korrekt auf 'complete' gesetzt wird
  finish(): void {
    // Offene Action abschließen (z.B. wenn max_tokens den Stream abgeschnitten hat)
    if (this.insideAction && this.currentAction) {
      // Verbleibenden Buffer als Content hinzufügen
      if (this.buffer.trim()) {
        this.currentActionContent += this.buffer;
      }
      
      const action: ParsedAction = {
        type: this.currentAction.type as ParsedAction['type'],
        filePath: this.currentAction.filePath,
        content: this.currentActionContent.trim(),
      };
      
      this.currentArtifact?.actions?.push(action);
      this.callbacks.onActionEnd?.(action);
      
      this.currentAction = null;
      this.currentActionContent = '';
      this.insideAction = false;
      this.buffer = '';
    }
    
    // Offenes Artifact abschließen
    if (this.insideArtifact && this.currentArtifact) {
      const artifact: ParsedArtifact = {
        id: this.currentArtifact.id!,
        title: this.currentArtifact.title!,
        actions: this.currentArtifact.actions || [],
      };
      
      this.callbacks.onArtifactEnd?.(artifact);
      
      this.currentArtifact = null;
      this.insideArtifact = false;
    }
    
    // Verbleibender Text außerhalb von Artifacts
    if (this.buffer.trim()) {
      this.callbacks.onText?.(this.buffer.trim());
    }
    this.buffer = '';
  }

  // Reset für neuen Stream
  reset(): void {
    this.buffer = '';
    this.currentArtifact = null;
    this.currentAction = null;
    this.currentActionContent = '';
    this.insideArtifact = false;
    this.insideAction = false;
  }
}

// --------------------------------------------
// Statische Parser-Funktion (für nicht-streaming)
// --------------------------------------------

export function parseArtifacts(content: string): ParsedArtifact[] {
  const artifacts: ParsedArtifact[] = [];
  
  // Regex für Artifacts
  const artifactRegex = /<boltArtifact\s+id="([^"]+)"\s+title="([^"]+)">([\s\S]*?)<\/boltArtifact>/g;
  
  let match;
  while ((match = artifactRegex.exec(content)) !== null) {
    const [, id, title, innerContent] = match;
    const actions: ParsedAction[] = [];
    
    // File Actions
    const fileActionRegex = /<boltAction\s+type="file"\s+filePath="([^"]+)">([\s\S]*?)<\/boltAction>/g;
    let fileMatch;
    while ((fileMatch = fileActionRegex.exec(innerContent)) !== null) {
      actions.push({
        type: 'file',
        filePath: fileMatch[1],
        content: fileMatch[2].trim(),
      });
    }
    
    // Shell Actions
    const shellActionRegex = /<boltAction\s+type="(shell|start)">([\s\S]*?)<\/boltAction>/g;
    let shellMatch;
    while ((shellMatch = shellActionRegex.exec(innerContent)) !== null) {
      actions.push({
        type: shellMatch[1] as 'shell' | 'start',
        content: shellMatch[2].trim(),
      });
    }
    
    artifacts.push({ id, title, actions });
  }
  
  return artifacts;
}

// --------------------------------------------
// Hilfsfunktionen
// --------------------------------------------

// Extrahiert nur die Dateien aus Artifacts
export function extractFilesFromArtifacts(artifacts: ParsedArtifact[]): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [];
  
  for (const artifact of artifacts) {
    for (const action of artifact.actions) {
      if (action.type === 'file' && action.filePath) {
        files.push({
          path: action.filePath,
          content: action.content,
        });
      }
    }
  }
  
  return files;
}

// Extrahiert Text ohne Artifacts
export function extractTextContent(content: string): string {
  return content
    .replace(/<boltArtifact[\s\S]*?<\/boltArtifact>/g, '')
    .trim();
}



