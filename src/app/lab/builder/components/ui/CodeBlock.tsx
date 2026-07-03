// ============================================
// LifeOS Module Builder - Code Block
// 
// Zweck: Syntax-highlighted Code-Anzeige
// Verwendet von: Chat Messages, File Preview
// ============================================

'use client';

import { memo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, Copy, FileCode } from 'lucide-react';

// --------------------------------------------
// Props
// --------------------------------------------

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
}

// --------------------------------------------
// Komponente
// --------------------------------------------

export const CodeBlock = memo(function CodeBlock({
  code,
  language = 'typescript',
  filename,
  showLineNumbers = true,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const lines = code.split('\n');
  
  return (
    <div className="rounded-lg overflow-hidden bg-[#1a1a2e] border border-white/10">
      {/* Header */}
      {filename && (
        <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <FileCode className="w-4 h-4" />
            <span>{filename}</span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-white/60 hover:text-white rounded transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400">Kopiert!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Kopieren</span>
              </>
            )}
          </button>
        </div>
      )}
      
      {/* Code Content */}
      <div className="overflow-x-auto">
        <pre className="p-4 text-sm font-mono">
          <code className={`language-${language}`}>
            {lines.map((line, i) => (
              <div key={i} className="flex">
                {showLineNumbers && (
                  <span className="w-10 flex-shrink-0 text-white/30 select-none text-right pr-4">
                    {i + 1}
                  </span>
                )}
                <span className="text-white/90 whitespace-pre">{line || ' '}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
});



