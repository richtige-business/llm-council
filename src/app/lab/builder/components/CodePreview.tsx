'use client';

// ============================================
// CodePreview.tsx - Code Editor/Preview
// 
// Zweck: Zeigt den Code der ausgewählten Datei
//        Syntax Highlighting und Copy-Funktion
// Verwendet von: Builder Page
// ============================================

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Copy, 
  Check, 
  FileCode,
  Download,
  Maximize2,
  X,
} from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { useSelectedFile, useBuilderStore, useBuilderModule } from '@/lib/lab';

// --------------------------------------------
// Syntax Highlighting (vereinfacht)
// --------------------------------------------

function highlightCode(code: string, language: string): string {
  // Einfaches Syntax-Highlighting
  // In Produktion würde man Prism.js oder ähnliches verwenden
  
  if (language === 'json') {
    return code
      .replace(/"([^"]+)":/g, '<span class="text-purple-400">"$1"</span>:')
      .replace(/: "([^"]+)"/g, ': <span class="text-green-400">"$1"</span>')
      .replace(/: (\d+)/g, ': <span class="text-orange-400">$1</span>')
      .replace(/: (true|false)/g, ': <span class="text-blue-400">$1</span>');
  }
  
  if (language === 'typescript') {
    return code
      // Keywords
      .replace(/\b(import|export|from|const|let|var|function|return|if|else|for|while|class|interface|type|extends|implements|async|await|try|catch|throw|new|this|null|undefined|true|false)\b/g, 
        '<span class="text-purple-400">$1</span>')
      // Types
      .replace(/\b(string|number|boolean|void|any|unknown|never|object|Array|Promise|React|useState|useEffect|useMemo|useCallback)\b/g,
        '<span class="text-cyan-400">$1</span>')
      // Strings
      .replace(/'([^']+)'/g, '<span class="text-green-400">\'$1\'</span>')
      .replace(/"([^"]+)"/g, '<span class="text-green-400">"$1"</span>')
      .replace(/`([^`]+)`/g, '<span class="text-green-400">`$1`</span>')
      // Comments
      .replace(/(\/\/[^\n]*)/g, '<span class="text-gray-500">$1</span>')
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-gray-500">$1</span>')
      // Numbers
      .replace(/\b(\d+)\b/g, '<span class="text-orange-400">$1</span>')
      // Function names
      .replace(/(\w+)(\s*\()/g, '<span class="text-yellow-400">$1</span>$2');
  }
  
  return code;
}

// --------------------------------------------
// Komponente: CodePreview
// --------------------------------------------

export function CodePreview() {
  const { surface, container, textColor, accentColor, designStyle } = useThemeStyles();
  const selectedFile = useSelectedFile();
  const currentModule = useBuilderModule();
  const selectFile = useBuilderStore((s) => s.selectFile);
  
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  
  // Copy-Status zurücksetzen
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);
  
  // Code kopieren
  const handleCopy = async () => {
    if (selectedFile) {
      await navigator.clipboard.writeText(selectedFile.content);
      setCopied(true);
    }
  };
  
  // Zeilen mit Nummern
  const codeLines = selectedFile?.content.split('\n') || [];
  
  // Container-Style
  const containerStyle = fullscreen
    ? {
        position: 'fixed' as const,
        inset: 0,
        zIndex: 50,
        borderRadius: 0,
        ...container.base,
      }
    : {
        ...container.base,
        borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
      };
  
  // Wenn keine Datei ausgewählt
  if (!selectedFile) {
    return (
      <div 
        className="flex flex-col h-full"
        style={{
          ...container.base,
          borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
        }}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <FileCode className="h-12 w-12 mx-auto mb-3" style={{ color: textColor, opacity: 0.2 }} />
            <p className="text-sm" style={{ color: textColor, opacity: 0.4 }}>
              Wähle eine Datei aus dem Dateibaum
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <motion.div 
      className="flex flex-col h-full overflow-hidden"
      style={containerStyle}
      layout
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className="h-4 w-4 shrink-0" style={{ color: accentColor }} />
          <span 
            className="text-sm font-medium truncate"
            style={{ color: textColor }}
          >
            {selectedFile.path}
          </span>
          <span 
            className="text-xs px-1.5 py-0.5 shrink-0"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: textColor,
              opacity: 0.6,
              borderRadius: '9999px',
            }}
          >
            {selectedFile.language}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded transition-colors hover:bg-white/10"
            title="Code kopieren"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-400" />
            ) : (
              <Copy className="h-4 w-4" style={{ color: textColor, opacity: 0.6 }} />
            )}
          </button>
          
          {/* Fullscreen Toggle */}
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="p-1.5 rounded transition-colors hover:bg-white/10"
            title={fullscreen ? 'Schließen' : 'Vollbild'}
          >
            {fullscreen ? (
              <X className="h-4 w-4" style={{ color: textColor, opacity: 0.6 }} />
            ) : (
              <Maximize2 className="h-4 w-4" style={{ color: textColor, opacity: 0.6 }} />
            )}
          </button>
        </div>
      </div>
      
      {/* Code Content */}
      <div className="flex-1 overflow-auto">
        <div className="flex min-h-full">
          {/* Line Numbers */}
          <div 
            className="sticky left-0 shrink-0 py-3 px-2 text-right select-none"
            style={{ 
              background: 'rgba(0, 0, 0, 0.2)',
              borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {codeLines.map((_, i) => (
              <div 
                key={i} 
                className="text-xs leading-5 font-mono"
                style={{ color: textColor, opacity: 0.3 }}
              >
                {i + 1}
              </div>
            ))}
          </div>
          
          {/* Code */}
          <pre className="flex-1 p-3 overflow-x-auto">
            <code 
              className="text-xs leading-5 font-mono"
              style={{ color: textColor }}
              dangerouslySetInnerHTML={{
                __html: highlightCode(selectedFile.content, selectedFile.language),
              }}
            />
          </pre>
        </div>
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between p-2 border-t border-white/10 shrink-0">
        <span className="text-xs" style={{ color: textColor, opacity: 0.4 }}>
          {codeLines.length} Zeilen
        </span>
        
        {selectedFile.description && (
          <span className="text-xs" style={{ color: textColor, opacity: 0.4 }}>
            {selectedFile.description}
          </span>
        )}
      </div>
      
      {/* Fullscreen Backdrop */}
      {fullscreen && (
        <div 
          className="fixed inset-0 bg-black/50 -z-10"
          onClick={() => setFullscreen(false)}
        />
      )}
    </motion.div>
  );
}



