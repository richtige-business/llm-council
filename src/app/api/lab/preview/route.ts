// ============================================
// route.ts - Module Preview API
// 
// Zweck: Generiert eine Info-Preview für Module
//        Zeigt Struktur, Features und Code-Highlights
// Verwendet von: ModulePreview Component
// ============================================

import { NextRequest, NextResponse } from 'next/server';

// --------------------------------------------
// Typ-Definitionen
// --------------------------------------------

interface ModuleFile {
  path: string;
  content: string;
}

interface ModuleInfo {
  name: string;
  description: string;
  version: string;
  features: string[];
  widgets: string[];
  tools: { name: string; description: string }[];
}

// --------------------------------------------
// Modul-Info aus Dateien extrahieren
// --------------------------------------------

function extractModuleInfo(files: ModuleFile[]): ModuleInfo {
  // Suche module.json
  const moduleJsonFile = files.find(f => f.path.endsWith('module.json'));
  let moduleJson: Record<string, unknown> = {};
  
  if (moduleJsonFile) {
    try {
      moduleJson = JSON.parse(moduleJsonFile.content);
    } catch {
      // Ignore parse errors
    }
  }

  // Extrahiere Features aus dem Code
  const features: string[] = [];
  const tools: { name: string; description: string }[] = [];
  
  // Suche Store-Datei für Features und Tools
  const storeFile = files.find(f => f.path.endsWith('store.ts'));
  if (storeFile) {
    // Finde alle Funktionen im Store (das sind die Tools)
    const functionMatches = storeFile.content.matchAll(/(\w+):\s*\([^)]*\)\s*=>/g);
    for (const match of functionMatches) {
      const funcName = match[1];
      // Ignoriere interne Funktionen
      if (!['set', 'get', 'setState'].includes(funcName)) {
        tools.push({ 
          name: funcName, 
          description: `${funcName} Funktion aus dem Store` 
        });
      }
    }
    
    // Finde Features basierend auf State-Properties
    const stateMatches = storeFile.content.matchAll(/(\w+):\s*(\[\]|{}|''|0|false|true|null)/g);
    for (const match of stateMatches) {
      features.push(match[1]);
    }
  }
  
  // Suche Widgets
  const widgets: string[] = [];
  const widgetFile = files.find(f => f.path.endsWith('Widget.tsx'));
  if (widgetFile) {
    // Extrahiere Widget-Namen
    const nameMatch = widgetFile.content.match(/function\s+(\w+Widget)/);
    if (nameMatch) {
      widgets.push(nameMatch[1]);
    } else {
      widgets.push('Widget');
    }
  }

  return {
    name: (moduleJson.name as string) || 'Neues Modul',
    description: (moduleJson.description as string) || 'Keine Beschreibung',
    version: (moduleJson.version as string) || '0.1.0',
    features: features.slice(0, 8),
    widgets,
    tools: tools.slice(0, 10),
  };
}

// --------------------------------------------
// Code-Statistiken berechnen
// --------------------------------------------

function calculateStats(files: ModuleFile[]) {
  const totalLines = files.reduce((sum, f) => sum + f.content.split('\n').length, 0);
  const totalSize = files.reduce((sum, f) => sum + f.content.length, 0);
  const componentsCount = files.filter(f => f.path.endsWith('.tsx')).length;
  
  return {
    files: files.length,
    lines: totalLines,
    sizeKB: (totalSize / 1024).toFixed(1),
    components: componentsCount,
  };
}

// --------------------------------------------
// Generiere Preview HTML
// --------------------------------------------

function generatePreviewHTML(files: ModuleFile[], moduleName: string): string {
  const info = extractModuleInfo(files);
  const stats = calculateStats(files);
  
  // Finde die Hauptkomponente für Code-Preview
  const mainComponent = files.find(f => f.path.endsWith('Page.tsx') || f.path.endsWith('Widget.tsx'));
  const codePreview = mainComponent 
    ? mainComponent.content.split('\n').slice(0, 50).join('\n')
    : 'Keine Komponente gefunden';

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${moduleName} - Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { box-sizing: border-box; }
    body { 
      margin: 0; 
      padding: 16px;
      font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      min-height: 100vh;
      color: white;
    }
    .glass {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
    }
    .stat-card {
      background: rgba(139, 92, 246, 0.15);
      border-radius: 12px;
      padding: 12px 16px;
    }
    .code-preview {
      background: rgba(0, 0, 0, 0.3);
      border-radius: 8px;
      padding: 12px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 11px;
      overflow: auto;
      max-height: 250px;
      white-space: pre-wrap;
      color: #94a3b8;
    }
    .code-preview .keyword { color: #c084fc; }
    .code-preview .string { color: #86efac; }
    .code-preview .function { color: #60a5fa; }
    .code-preview .comment { color: #64748b; font-style: italic; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 500;
    }
    .badge-purple { background: rgba(139, 92, 246, 0.3); color: #c4b5fd; }
    .badge-blue { background: rgba(59, 130, 246, 0.3); color: #93c5fd; }
    .badge-green { background: rgba(34, 197, 94, 0.3); color: #86efac; }
    .fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .file-icon { width: 14px; height: 14px; opacity: 0.7; }
  </style>
</head>
<body>
  <div class="max-w-2xl mx-auto space-y-4 fade-in">
    <!-- Header -->
    <div class="glass p-4">
      <div class="flex items-center gap-3 mb-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div>
          <h1 class="text-xl font-bold">${info.name}</h1>
          <p class="text-sm opacity-60">${info.description}</p>
        </div>
        <span class="ml-auto badge badge-purple">v${info.version}</span>
      </div>
      
      <!-- Stats -->
      <div class="grid grid-cols-4 gap-2">
        <div class="stat-card text-center">
          <div class="text-lg font-bold text-purple-300">${stats.files}</div>
          <div class="text-xs opacity-60">Dateien</div>
        </div>
        <div class="stat-card text-center">
          <div class="text-lg font-bold text-blue-300">${stats.lines}</div>
          <div class="text-xs opacity-60">Zeilen</div>
        </div>
        <div class="stat-card text-center">
          <div class="text-lg font-bold text-green-300">${stats.sizeKB}</div>
          <div class="text-xs opacity-60">KB</div>
        </div>
        <div class="stat-card text-center">
          <div class="text-lg font-bold text-pink-300">${stats.components}</div>
          <div class="text-xs opacity-60">Kompon.</div>
        </div>
      </div>
    </div>

    <!-- Features & Tools -->
    <div class="grid grid-cols-2 gap-4">
      ${info.features.length > 0 ? `
      <div class="glass p-4">
        <h3 class="text-sm font-semibold mb-2 opacity-80 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
          </svg>
          State-Features
        </h3>
        <div class="flex flex-wrap gap-1">
          ${info.features.map(f => `<span class="badge badge-blue">${f}</span>`).join('')}
        </div>
      </div>
      ` : ''}
      
      ${info.tools.length > 0 ? `
      <div class="glass p-4">
        <h3 class="text-sm font-semibold mb-2 opacity-80 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
          Tools (${info.tools.length})
        </h3>
        <div class="space-y-1 max-h-24 overflow-auto">
          ${info.tools.map(t => `
            <div class="text-xs">
              <span class="font-mono text-purple-300">${t.name}</span>
              <span class="opacity-50 ml-1">→ ${t.description}</span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
    </div>

    <!-- File Structure -->
    <div class="glass p-4">
      <h3 class="text-sm font-semibold mb-3 opacity-80 flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        Dateistruktur
      </h3>
      <div class="space-y-1 font-mono text-sm">
        ${files.map(f => {
          const icon = f.path.endsWith('.tsx') ? '⚛️' : 
                      f.path.endsWith('.ts') ? '📘' : 
                      f.path.endsWith('.json') ? '📋' : '📄';
          const size = (f.content.length / 1024).toFixed(1);
          const lines = f.content.split('\n').length;
          return `
            <div class="flex items-center justify-between py-1 px-2 rounded hover:bg-white/5 transition-colors">
              <span class="flex items-center gap-2">
                <span>${icon}</span>
                <span class="text-blue-300">${f.path.split('/').pop()}</span>
              </span>
              <span class="text-xs opacity-40">${lines} Zeilen · ${size}KB</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Code Preview -->
    <div class="glass p-4">
      <h3 class="text-sm font-semibold mb-3 opacity-80 flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="16 18 22 12 16 6"/>
          <polyline points="8 6 2 12 8 18"/>
        </svg>
        Code-Preview
        <span class="text-xs opacity-50 font-normal ml-auto">${mainComponent?.path.split('/').pop() || 'N/A'}</span>
      </h3>
      <div class="code-preview">${escapeHtml(codePreview)}</div>
    </div>

    <!-- Info Footer -->
    <div class="text-center py-4 opacity-50 text-xs">
      <p>📦 Modul bereit zur Aktivierung</p>
      <p class="mt-1">Klicke auf "Aktivieren" um das Modul in LifeOS zu installieren</p>
    </div>
  </div>

  <script>
    // Syntax Highlighting für Code
    const codeBlock = document.querySelector('.code-preview');
    if (codeBlock) {
      let html = codeBlock.innerHTML;
      // Keywords
      html = html.replace(/\\b(const|let|var|function|return|export|import|from|if|else|for|while|async|await|try|catch|class|interface|type|extends|implements)\\b/g, '<span class="keyword">$1</span>');
      // Strings
      html = html.replace(/(['"\`])([^'"\`]*)\\1/g, '<span class="string">$1$2$1</span>');
      // Functions
      html = html.replace(/\\b([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\(/g, '<span class="function">$1</span>(');
      // Comments
      html = html.replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>');
      codeBlock.innerHTML = html;
    }
  </script>
</body>
</html>`;
}

// Escape HTML für sichere Anzeige
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// --------------------------------------------
// POST Handler
// --------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { files, moduleName } = body;

    if (!files || !Array.isArray(files)) {
      return NextResponse.json(
        { error: 'Files array required' },
        { status: 400 }
      );
    }

    console.log('[Preview] Received files:', files.map((f: ModuleFile) => f.path));

    // Prüfe ob wir eine Komponente haben
    const hasComponentFile = files.some(
      (f: ModuleFile) => f.path.endsWith('Page.tsx') || f.path.endsWith('Widget.tsx')
    );

    if (!hasComponentFile) {
      // Warte-Nachricht
      return NextResponse.json({
        html: `<!DOCTYPE html>
<html><body style="margin:0;padding:24px;background:linear-gradient(135deg,#0f172a,#1e1b4b);color:#888;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;">
<div>
  <div style="font-size:48px;margin-bottom:16px;">🏗️</div>
  <p style="color:white;font-size:18px;margin:0;">Modul wird generiert...</p>
  <p style="font-size:12px;opacity:0.6;margin-top:8px;">Warte auf Komponenten-Dateien</p>
</div>
</body></html>`,
      });
    }

    // Generiere Info-Preview
    const previewHTML = generatePreviewHTML(files, moduleName || 'Modul Preview');

    return NextResponse.json({
      html: previewHTML,
      type: 'info',
    });

  } catch (error) {
    console.error('Preview generation error:', error);
    return NextResponse.json(
      { 
        error: 'Preview generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
