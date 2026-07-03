// ============================================
// LifeOS Module Builder - StreamingCodeBlock
// 
// Zweck: Mini-Code-Fenster im Chat das live zeigt,
//        wie eine Datei vom LLM geschrieben wird.
//        Ähnlich wie Cursor's "Apply" Fenster.
// Verwendet von: Messages.tsx
// ============================================

'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileCode, 
  FileJson, 
  FileText, 
  File, 
  Loader2, 
  CheckCircle, 
  ChevronDown, 
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useWorkbenchStore, type StreamingFileStatus } from '../../stores/workbench-store';
import { useFilesStore } from '../../stores/files-store';

// --------------------------------------------
// Props
// --------------------------------------------

interface StreamingCodeBlockProps {
  filePath: string;
  status: StreamingFileStatus;
  onOpenFile?: (path: string) => void;
  themeStyles?: {
    accentColor: string;
    designStyle: string;
    textColor: string;
  };
}

// --------------------------------------------
// Hilfsfunktionen
// --------------------------------------------

// Icon basierend auf Dateiendung
function getFileIcon(path: string) {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
      return FileCode;
    case 'json':
      return FileJson;
    case 'md':
    case 'txt':
      return FileText;
    default:
      return File;
  }
}

// Dateiname aus vollem Pfad extrahieren
function getFileName(path: string): string {
  return path.split('/').pop() || path;
}

// Einfaches Syntax-Highlighting per CSS-Klassen
// Kein volles Monaco nötig — nur visuelle Unterscheidung
function highlightLine(line: string): JSX.Element {
  // Kommentare
  if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*') || line.trimStart().startsWith('/*')) {
    return <span className="text-emerald-400/60 italic">{line}</span>;
  }
  
  // Import-Zeilen
  if (line.trimStart().startsWith('import ') || line.trimStart().startsWith('export ')) {
    return <span className="text-purple-400">{line}</span>;
  }

  // Strings (einfache Erkennung)
  const parts = line.split(/('[^']*'|"[^"]*"|`[^`]*`)/g);
  if (parts.length > 1) {
    return (
      <span>
        {parts.map((part, i) => 
          /^['"`]/.test(part) 
            ? <span key={i} className="text-amber-300">{part}</span>
            : <span key={i}>{part}</span>
        )}
      </span>
    );
  }

  return <span>{line}</span>;
}

// --------------------------------------------
// Haupt-Komponente
// --------------------------------------------

export function StreamingCodeBlock({ 
  filePath, 
  status, 
  onOpenFile,
  themeStyles,
}: StreamingCodeBlockProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Aktuellen Content aus dem Files-Store lesen
  const fileContent = useFilesStore(state => {
    const entry = state.files[filePath];
    return entry?.type === 'file' ? entry.content : '';
  });
  
  // Styling
  const accentColor = themeStyles?.accentColor || '#667eea';
  const textColor = themeStyles?.textColor || 'rgba(255,255,255,0.9)';
  
  // Icon für den Dateityp
  const IconComponent = useMemo(() => getFileIcon(filePath), [filePath]);
  const fileName = useMemo(() => getFileName(filePath), [filePath]);
  
  // Zeilen berechnen
  const lines = useMemo(() => {
    if (!fileContent) return [];
    return fileContent.split('\n');
  }, [fileContent]);
  
  const lineCount = lines.length;
  
  // Letzte N Zeilen für die Anzeige (max 15)
  const visibleLines = useMemo(() => {
    const maxVisible = 15;
    if (lines.length <= maxVisible) return lines;
    return lines.slice(-maxVisible);
  }, [lines]);
  
  // Startzeile für Zeilennummern
  const startLineNumber = Math.max(1, lineCount - visibleLines.length + 1);
  
  // Auto-Collapse wenn fertig
  const isWriting = status === 'writing';
  const isComplete = status === 'complete';
  
  // Klick → Datei im Editor öffnen
  const handleOpenFile = useCallback(() => {
    onOpenFile?.(filePath);
  }, [filePath, onOpenFile]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="my-2 rounded-lg overflow-hidden"
      style={{
        background: 'rgba(0, 0, 0, 0.3)',
        border: `1px solid ${isWriting ? accentColor + '40' : 'rgba(255,255,255,0.08)'}`,
        boxShadow: isWriting ? `0 0 20px ${accentColor}15` : 'none',
      }}
    >
      {/* Header: Dateiname + Status + Zeilenzähler */}
      <div 
        className="flex items-center justify-between px-3 py-2 cursor-pointer select-none"
        onClick={() => setIsCollapsed(prev => !prev)}
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          borderBottom: isCollapsed ? 'none' : '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Collapse-Pfeil */}
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: textColor, opacity: 0.4 }} />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: textColor, opacity: 0.4 }} />
          )}
          
          {/* Status-Icon */}
          {isWriting ? (
            <Loader2 
              className="w-3.5 h-3.5 flex-shrink-0 animate-spin" 
              style={{ color: accentColor }} 
            />
          ) : (
            <CheckCircle 
              className="w-3.5 h-3.5 flex-shrink-0" 
              style={{ color: '#22c55e' }} 
            />
          )}
          
          {/* Datei-Icon + Name */}
          <IconComponent className="w-3.5 h-3.5 flex-shrink-0" style={{ color: textColor, opacity: 0.5 }} />
          <span 
            className="text-xs font-mono truncate"
            style={{ color: textColor, opacity: 0.8 }}
          >
            {fileName}
          </span>
          
          {/* Pfad (gekürzt) */}
          {filePath !== fileName && (
            <span 
              className="text-xs font-mono truncate hidden sm:inline"
              style={{ color: textColor, opacity: 0.3 }}
            >
              ({filePath})
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Zeilenzähler */}
          <span 
            className="text-xs font-mono tabular-nums"
            style={{ color: textColor, opacity: 0.4 }}
          >
            {lineCount} {lineCount === 1 ? 'Zeile' : 'Zeilen'}
          </span>
          
          {/* Datei öffnen Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenFile();
            }}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            title="Im Editor öffnen"
          >
            <ExternalLink className="w-3 h-3" style={{ color: textColor, opacity: 0.4 }} />
          </button>
        </div>
      </div>
      
      {/* Code-Bereich */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div 
              className="relative overflow-hidden"
              style={{ maxHeight: '240px' }}
            >
              {/* Fade-Gradient oben (wenn Content abgeschnitten) */}
              {lines.length > 15 && (
                <div 
                  className="absolute top-0 left-0 right-0 h-8 z-10 pointer-events-none"
                  style={{
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)',
                  }}
                />
              )}
              
              {/* Code-Zeilen */}
              <div className="px-3 py-2 font-mono text-xs leading-5 overflow-hidden">
                {visibleLines.map((line, i) => (
                  <div key={startLineNumber + i} className="flex">
                    {/* Zeilennummer */}
                    <span 
                      className="w-8 flex-shrink-0 text-right pr-3 select-none tabular-nums"
                      style={{ color: textColor, opacity: 0.2 }}
                    >
                      {startLineNumber + i}
                    </span>
                    {/* Code mit einfachem Highlighting */}
                    <span style={{ color: textColor, opacity: 0.7 }}>
                      {highlightLine(line)}
                    </span>
                  </div>
                ))}
                
                {/* Blinkender Cursor am Ende (nur beim Schreiben) */}
                {isWriting && (
                  <div className="flex">
                    <span className="w-8 flex-shrink-0" />
                    <motion.span
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
                      className="inline-block w-2 h-4"
                      style={{ background: accentColor }}
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --------------------------------------------
// Export: Liste aller Streaming-Dateien als Blöcke
// Wird von Messages.tsx genutzt
// --------------------------------------------

interface StreamingCodeBlockListProps {
  onOpenFile?: (path: string) => void;
  themeStyles?: {
    accentColor: string;
    designStyle: string;
    textColor: string;
  };
}

export function StreamingCodeBlockList({ 
  onOpenFile,
  themeStyles,
}: StreamingCodeBlockListProps) {
  // Alle aktuell streamenden Dateien aus dem Store
  const streamingFiles = useWorkbenchStore(state => state.streamingFiles);
  
  // In Array konvertieren für Rendering
  const entries = useMemo(() => {
    return Array.from(streamingFiles.entries());
  }, [streamingFiles]);
  
  if (entries.length === 0) return null;
  
  return (
    <div className="mt-2">
      <AnimatePresence>
        {entries.map(([path, status]) => (
          <StreamingCodeBlock
            key={path}
            filePath={path}
            status={status}
            onOpenFile={onOpenFile}
            themeStyles={themeStyles}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
