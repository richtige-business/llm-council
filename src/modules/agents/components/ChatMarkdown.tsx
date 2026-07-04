'use client';

// ============================================
// ChatMarkdown.tsx - Markdown-Renderer fuer Chat-Nachrichten
//
// Zweck: Rendert Assistenten-Antworten mit GFM,
//        Inline-Code und Shiki-Codebloecken
// Verwendet von: ChatMessage.tsx
// ============================================

import ReactMarkdown from 'react-markdown';
import type { ReactNode } from 'react';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';

interface ChatMarkdownProps {
  content: string;
  variant?: 'dark' | 'light';
  compact?: boolean;
}

// --------------------------------------------
// Inhalt aus React-Markdown-Code-Knoten extrahieren
// Entfernt den ueblichen trailing newline aus
// fenced code blocks fuer sauberes Rendering.
// --------------------------------------------
function getCodeContent(children: ReactNode): string {
  return String(children).replace(/\n$/, '');
}

export function ChatMarkdown({
  content,
  variant = 'dark',
  compact = false,
}: ChatMarkdownProps) {
  const palette = variant === 'light'
    ? {
        text: 'text-slate-700',
        muted: 'text-slate-600',
        quote: 'border-slate-200 text-slate-600',
        link: 'text-sky-600 hover:text-sky-500',
        inlineCode: 'bg-slate-200/80 text-slate-900',
        rule: 'border-slate-200',
        tableHead: 'border-slate-200',
        tableCell: 'border-slate-200',
        tableText: 'text-slate-700',
      }
    : {
        text: 'text-white',
        muted: 'text-white/75',
        quote: 'border-white/15 text-white/75',
        link: 'text-cyan-300 hover:text-cyan-200',
        inlineCode: 'bg-white/10 text-white',
        rule: 'border-white/10',
        tableHead: 'border-white/15',
        tableCell: 'border-white/10',
        tableText: 'text-white/80',
      };

  return (
    <div
      className={`break-words ${compact ? 'text-[13px] leading-6' : 'text-sm leading-relaxed'} ${palette.text}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className={`font-semibold last:mb-0 ${compact ? 'mb-1.5 text-sm' : 'mb-2 text-base'}`}>{children}</h1>,
          h2: ({ children }) => <h2 className={`font-semibold last:mb-0 ${compact ? 'mb-1.5 text-[13px]' : 'mb-2 text-sm'}`}>{children}</h2>,
          h3: ({ children }) => <h3 className={`font-medium last:mb-0 ${compact ? 'mb-1 text-[13px]' : 'mb-1.5 text-sm'}`}>{children}</h3>,
          p: ({ children }) => <p className={`${compact ? 'mb-1.5' : 'mb-2'} last:mb-0`}>{children}</p>,
          ul: ({ children }) => <ul className={`${compact ? 'mb-1.5 space-y-0.5' : 'mb-2 space-y-1'} ml-4 list-disc last:mb-0`}>{children}</ul>,
          ol: ({ children }) => <ol className={`${compact ? 'mb-1.5 space-y-0.5' : 'mb-2 space-y-1'} ml-4 list-decimal last:mb-0`}>{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className={`mb-2 border-l-2 pl-3 last:mb-0 ${palette.quote}`}>
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className={`underline underline-offset-2 ${palette.link}`}
            >
              {children}
            </a>
          ),
          code: ({ children, className }) => {
            const code = getCodeContent(children);
            const isInlineCode = !className && !code.includes('\n');

            if (isInlineCode) {
              return (
                <code className={`rounded px-1 py-0.5 text-[0.9em] ${palette.inlineCode}`}>
                  {children}
                </code>
              );
            }

            return <CodeBlock code={code} language={className} compact={compact} />;
          },
          pre: ({ children }) => <>{children}</>,
          hr: () => <hr className={`my-3 ${palette.rule}`} />,
          table: ({ children }) => (
            <div className={`overflow-x-auto last:mb-0 ${compact ? 'mb-1.5' : 'mb-2'}`}>
              <table className="min-w-full border-collapse text-left text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className={`border-b ${palette.tableHead}`}>{children}</thead>,
          th: ({ children }) => <th className={`px-2 py-1 font-semibold ${palette.tableText}`}>{children}</th>,
          td: ({ children }) => <td className={`border-t px-2 py-1 align-top ${palette.tableCell} ${palette.muted}`}>{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
