// ============================================
// LifeOS Module Builder - Editor Panel (Monaco)
// 
// Zweck: Professioneller Code-Editor mit Monaco (VS Code Engine)
//        Syntax-Highlighting, Code-Folding, Find & Replace
//        + Real-Time Streaming Modus (Phase 5)
// Verwendet von: Workbench
// ============================================

'use client';

import { memo, useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Download, FileCode, Loader2, Pencil } from 'lucide-react';
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react';
import type { editor as monacoEditor } from 'monaco-editor';
import { FileTree } from './FileTree';
import type { FileMap } from '../../stores/files-store';
import { useFilesStore } from '../../stores/files-store';
import { useWorkbenchStore } from '../../stores/workbench-store';

// --------------------------------------------
// Props
// --------------------------------------------

interface ThemeStyles {
  surface?: { base: React.CSSProperties };
  container?: { base: React.CSSProperties };
  button?: { base: React.CSSProperties };
  accentColor?: string;
  designStyle?: 'glass' | 'brutal' | 'neo';
  textColor?: string;
}

interface EditorPanelProps {
  files: FileMap;
  selectedFile?: string;
  onFileSelect: (path: string) => void;
  isStreaming?: boolean;
  themeStyles?: ThemeStyles;
}

// --------------------------------------------
// Hilfsfunktionen
// --------------------------------------------

// Sprache basierend auf Dateipfad erkennen
// Monaco braucht den Language-Identifier für Syntax-Highlighting
function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    css: 'css',
    html: 'html',
    md: 'markdown',
    yml: 'yaml',
    yaml: 'yaml',
    svg: 'xml',
  };
  return map[ext || ''] || 'plaintext';
}

// --------------------------------------------
// LifeOS Dark Theme für Monaco
// Passt zum Glassmorphism-Design der App
// --------------------------------------------

function registerLifeOSTheme(monaco: Monaco) {
  monaco.editor.defineTheme('lifeos-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      // Kommentare: Smaragdgrün, dezent
      { token: 'comment', foreground: '6b9e6b', fontStyle: 'italic' },
      // Strings: Warmes Amber
      { token: 'string', foreground: 'e5c07b' },
      // Keywords: Lila (passend zum Accent)
      { token: 'keyword', foreground: 'c678dd' },
      // Typen: Cyan
      { token: 'type', foreground: '56b6c2' },
      { token: 'type.identifier', foreground: '56b6c2' },
      // Funktionen: Blau
      { token: 'identifier', foreground: 'abb2bf' },
      // Zahlen: Orange
      { token: 'number', foreground: 'd19a66' },
      // Tags (JSX): Rot-Orange
      { token: 'tag', foreground: 'e06c75' },
      { token: 'delimiter', foreground: '636d83' },
      // Variablen: Standard-Weiß
      { token: 'variable', foreground: 'e06c75' },
    ],
    colors: {
      // Editor Hintergrund: Dunkel, transparent
      'editor.background': '#0d0d1a',
      'editor.foreground': '#abb2bf',
      // Selektion
      'editor.selectionBackground': '#3e4451',
      'editor.selectionHighlightBackground': '#3e445180',
      // Aktuelle Zeile
      'editor.lineHighlightBackground': '#ffffff08',
      'editor.lineHighlightBorder': '#ffffff00',
      // Zeilennummern
      'editorLineNumber.foreground': '#495162',
      'editorLineNumber.activeForeground': '#abb2bf',
      // Cursor
      'editorCursor.foreground': '#667eea',
      // Einrückung
      'editorIndentGuide.background1': '#ffffff10',
      'editorIndentGuide.activeBackground1': '#ffffff25',
      // Scrollbar
      'scrollbarSlider.background': '#ffffff15',
      'scrollbarSlider.hoverBackground': '#ffffff25',
      'scrollbarSlider.activeBackground': '#ffffff35',
      // Widget (Find & Replace etc.)
      'editorWidget.background': '#1a1a2e',
      'editorWidget.border': '#ffffff15',
      // Bracket-Pair-Matching
      'editorBracketMatch.background': '#667eea30',
      'editorBracketMatch.border': '#667eea60',
    },
  });
}

// --------------------------------------------
// Komponente
// --------------------------------------------

export const EditorPanel = memo(function EditorPanel({
  files,
  selectedFile,
  onFileSelect,
  isStreaming,
  themeStyles,
}: EditorPanelProps) {
  const [copied, setCopied] = useState(false);
  const editorInstanceRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null);
  const { 
    surface, 
    container, 
    button, 
    accentColor = '#8b5cf6', 
    designStyle = 'glass', 
    textColor = '#ffffff' 
  } = themeStyles || {};
  
  // File Store - Änderungen speichern
  const setFile = useFilesStore((state) => state.setFile);
  
  // Streaming-Status der aktuellen Datei prüfen
  const streamingFiles = useWorkbenchStore((state) => state.streamingFiles);
  const isStreamingFile = selectedFile ? streamingFiles.get(selectedFile) === 'writing' : false;
  const isStreamComplete = selectedFile ? streamingFiles.get(selectedFile) === 'complete' : false;
  
  // Aktueller Dateiinhalt
  const currentFile = selectedFile ? files[selectedFile] : undefined;
  const content = currentFile?.type === 'file' ? currentFile.content : '';
  
  // Sprache für Syntax-Highlighting
  const language = useMemo(() => {
    return selectedFile ? getLanguageFromPath(selectedFile) : 'plaintext';
  }, [selectedFile]);
  
  // Datei kopieren
  const handleCopy = async () => {
    if (content) {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  // Datei herunterladen
  const handleDownload = () => {
    if (content && selectedFile) {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedFile.split('/').pop() || 'file';
      a.click();
      URL.revokeObjectURL(url);
    }
  };
  
  // --------------------------------------------
  // Monaco: Theme registrieren beim Laden
  // --------------------------------------------
  
  const handleEditorWillMount = useCallback((monaco: Monaco) => {
    registerLifeOSTheme(monaco);
  }, []);
  
  // --------------------------------------------
  // Monaco: Editor-Instanz speichern
  // --------------------------------------------
  
  const handleEditorMount: OnMount = useCallback((editor) => {
    editorInstanceRef.current = editor;
  }, []);
  
  // --------------------------------------------
  // Monaco: Änderungen speichern
  // --------------------------------------------
  
  const handleContentChange = useCallback((value: string | undefined) => {
    if (selectedFile && value !== undefined) {
      setFile(selectedFile, value);
    }
  }, [selectedFile, setFile]);
  
  // --------------------------------------------
  // Streaming: Auto-Scroll zum Ende der Datei
  // Wenn eine Datei gerade gestreamt wird, scrolle automatisch mit
  // --------------------------------------------
  
  useEffect(() => {
    if (isStreamingFile && editorInstanceRef.current) {
      const editor = editorInstanceRef.current;
      const model = editor.getModel();
      if (model) {
        // Scroll zur letzten Zeile
        const lastLine = model.getLineCount();
        editor.revealLine(lastLine, 1); // 1 = ScrollType.Smooth
      }
    }
  }, [isStreamingFile, content]); // Re-trigger bei Content-Änderung (neuer Chunk)
  
  // --------------------------------------------
  // Monaco Editor Optionen
  // --------------------------------------------
  
  const editorOptions: monacoEditor.IStandaloneEditorConstructionOptions = useMemo(() => ({
    // Read-only wenn Datei gerade gestreamt wird
    readOnly: isStreamingFile,
    // Kein Minimap (zu klein für Split-View)
    minimap: { enabled: false },
    // Schrift
    fontSize: 13,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    fontLigatures: true,
    // Zeilennummern
    lineNumbers: 'on',
    lineNumbersMinChars: 3,
    // Code-Folding (Blöcke einklappen)
    folding: true,
    foldingHighlight: true,
    // Bracket-Pair (Klammer-Färbung)
    bracketPairColorization: { enabled: true },
    // Word Wrap
    wordWrap: 'on',
    // Scrolling
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    // Auto-Layout bei Größenänderung
    automaticLayout: true,
    // Padding
    padding: { top: 12, bottom: 12 },
    // Tabs
    tabSize: 2,
    insertSpaces: true,
    // Einrückung
    autoIndent: 'full',
    formatOnPaste: true,
    // Cursor
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    // Suggestions (ohne Server kein echtes IntelliSense)
    quickSuggestions: false,
    suggestOnTriggerCharacters: false,
    parameterHints: { enabled: false },
    // Hover deaktivieren (kein Type-Server)
    hover: { enabled: false },
    // Scrollbar dezent
    scrollbar: {
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 8,
    },
    // Overviewruler (rechter Rand-Indikator)
    overviewRulerBorder: false,
    // Rendering
    renderLineHighlight: 'line',
    renderWhitespace: 'none',
  }), [isStreamingFile]);
  
  return (
    <div className="flex h-full">
      {/* File Tree Sidebar */}
      <div 
        className="w-64 flex-shrink-0 overflow-y-auto"
        style={{
          background: surface?.base?.background || 'rgba(0,0,0,0.2)',
          borderRight: designStyle === 'brutal' 
            ? '2px solid #000' 
            : '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div 
          className="p-3"
          style={{
            borderBottom: designStyle === 'brutal' 
              ? '2px solid #000' 
              : '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <h3 
            className="text-sm font-medium flex items-center gap-2"
            style={{ color: textColor, opacity: 0.6 }}
          >
            <FileCode className="w-4 h-4" />
            Dateien
          </h3>
        </div>
        <FileTree
          files={files}
          selectedFile={selectedFile}
          onFileSelect={onFileSelect}
          themeStyles={themeStyles}
        />
      </div>
      
      {/* Code Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedFile ? (
          <>
            {/* File Header */}
            <div 
              className="flex items-center justify-between px-4 py-2"
              style={{
                background: surface?.base?.background || 'rgba(0,0,0,0.2)',
                borderBottom: designStyle === 'brutal' 
                  ? '2px solid #000' 
                  : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div className="flex items-center gap-2 text-sm">
                <span style={{ color: textColor, opacity: 0.4 }}>{selectedFile}</span>
                
                {/* Streaming-Badge: Wird geschrieben */}
                {isStreamingFile && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1.5 px-2 py-0.5 text-xs"
                    style={{
                      background: `${accentColor}30`,
                      color: accentColor,
                      borderRadius: designStyle === 'brutal' ? '0.25rem' : '0.375rem',
                      border: designStyle === 'brutal' ? '1px solid #000' : 'none',
                    }}
                  >
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Wird geschrieben...
                  </motion.span>
                )}
                
                {/* Streaming-Badge: Fertig geschrieben */}
                {isStreamComplete && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1.5 px-2 py-0.5 text-xs"
                    style={{
                      background: 'rgba(34, 197, 94, 0.2)',
                      color: '#22c55e',
                      borderRadius: designStyle === 'brutal' ? '0.25rem' : '0.375rem',
                    }}
                  >
                    <Check className="w-3 h-3" />
                    Fertig
                  </motion.span>
                )}

                {/* Normaler Streaming-Badge (globaler Streaming-Status) */}
                {isStreaming && !isStreamingFile && !isStreamComplete && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-1.5 px-2 py-0.5 text-xs"
                    style={{
                      background: `${accentColor}15`,
                      color: accentColor,
                      borderRadius: designStyle === 'brutal' ? '0.25rem' : '0.375rem',
                    }}
                  >
                    <Pencil className="w-3 h-3" />
                    Wird bearbeitet...
                  </motion.span>
                )}
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded transition-colors"
                  title="Kopieren"
                  style={{ 
                    color: copied ? '#22c55e' : `${textColor}66`,
                    borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
                  }}
                  onMouseEnter={(e) => !copied && (e.currentTarget.style.color = textColor)}
                  onMouseLeave={(e) => !copied && (e.currentTarget.style.color = `${textColor}66`)}
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  className="p-1.5 rounded transition-colors"
                  title="Herunterladen"
                  style={{ 
                    color: `${textColor}66`,
                    borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = textColor}
                  onMouseLeave={(e) => e.currentTarget.style.color = `${textColor}66`}
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Monaco Editor */}
            <div 
              className="flex-1 overflow-hidden"
              style={{ background: '#0d0d1a' }}
            >
              <Editor
                height="100%"
                language={language}
                value={content}
                onChange={handleContentChange}
                theme="lifeos-dark"
                beforeMount={handleEditorWillMount}
                onMount={handleEditorMount}
                options={editorOptions}
                loading={
                  <div 
                    className="flex items-center justify-center h-full gap-2"
                    style={{ color: `${textColor}60`, background: '#0d0d1a' }}
                  >
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Editor wird geladen...</span>
                  </div>
                }
              />
            </div>
          </>
        ) : (
          // Keine Datei ausgewählt
          <div 
            className="flex-1 flex items-center justify-center"
            style={{ color: `${textColor}66` }}
          >
            <div className="text-center">
              <FileCode className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Wähle eine Datei aus</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
