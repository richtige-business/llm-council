'use client';

// ============================================
// CodeBlock.tsx - Syntax-Highlighting fuer Markdown-Codebloecke
//
// Zweck: Rendert Codebloecke mit Shiki, Sprach-Label
//        und Copy-Button im LLM Council-Design
// Verwendet von: ChatMarkdown.tsx
// ============================================

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { getSingletonHighlighter, type BundledLanguage } from 'shiki/bundle/web';
import { useThemeStyles } from '@/lib/theme';

// --------------------------------------------
// Sprach-Mapping fuer haeufige Markdown-Aliase
// So koennen uebliche Fence-Namen sauber auf
// Shiki-Sprachen abgebildet werden.
// --------------------------------------------
const LANGUAGE_ALIASES: Record<string, BundledLanguage> = {
  bash: 'bash',
  c: 'c',
  css: 'css',
  csv: 'csv',
  html: 'html',
  java: 'java',
  javascript: 'javascript',
  js: 'javascript',
  json: 'json',
  jsx: 'jsx',
  markdown: 'markdown',
  md: 'markdown',
  php: 'php',
  py: 'python',
  python: 'python',
  scss: 'scss',
  sh: 'bash',
  shell: 'bash',
  sql: 'sql',
  ts: 'typescript',
  tsx: 'tsx',
  typescript: 'typescript',
  vue: 'vue',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  zsh: 'zsh',
};

// --------------------------------------------
// HTML escapen fuer den Plain-Text-Fallback
// Wird genutzt, wenn keine bekannte Sprache
// vorliegt oder das Highlighting fehlschlaegt.
// --------------------------------------------
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// --------------------------------------------
// Sprache normalisieren
// Entfernt typische Prefixe wie "language-"
// und mappt bekannte Kurzformen auf Shiki.
// --------------------------------------------
function normalizeLanguage(language?: string): BundledLanguage | null {
  if (!language) {
    return null;
  }

  const normalized = language
    .trim()
    .toLowerCase()
    .replace(/^language-/, '');

  return LANGUAGE_ALIASES[normalized] ?? null;
}

interface CodeBlockProps {
  code: string;
  language?: string;
  compact?: boolean;
}

export function CodeBlock({ code, language, compact = false }: CodeBlockProps) {
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const { accentColor, designStyle } = useThemeStyles();

  const normalizedLanguage = useMemo(
    () => normalizeLanguage(language),
    [language],
  );

  const languageLabel = normalizedLanguage ?? language?.replace(/^language-/, '') ?? 'text';

  const fallbackHtml = useMemo(
    () =>
      `<pre class="shiki github-dark" style="background-color: transparent; color: #e5e7eb"><code>${escapeHtml(code)}</code></pre>`,
    [code],
  );

  useEffect(() => {
    let isCancelled = false;

    async function highlightCode() {
      if (!normalizedLanguage) {
        setHighlightedHtml(null);
        return;
      }

      try {
        const highlighter = await getSingletonHighlighter({
          langs: [normalizedLanguage],
          themes: ['github-dark'],
        });

        const html = highlighter.codeToHtml(code, {
          lang: normalizedLanguage,
          theme: 'github-dark',
        });

        if (!isCancelled) {
          setHighlightedHtml(html);
        }
      } catch (error) {
        console.error('Code-Highlighting fehlgeschlagen:', error);
        if (!isCancelled) {
          setHighlightedHtml(null);
        }
      }
    }

    highlightCode();

    return () => {
      isCancelled = true;
    };
  }, [code, normalizedLanguage]);

  // --------------------------------------------
  // Copy-Handling
  // Kopiert den reinen Code in die Zwischenablage
  // und zeigt kurz einen Erfolgszustand an.
  // --------------------------------------------
  const handleCopy = async () => {
    if (typeof window === 'undefined' || !navigator?.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1800);
    } catch (error) {
      console.error('Code konnte nicht kopiert werden:', error);
    }
  };

  return (
    <div
      className={`overflow-hidden last:mb-0 ${compact ? 'mb-1.5' : 'mb-2'}`}
      style={{
        borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
        border: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(8, 10, 18, 0.55)',
        boxShadow: designStyle === 'brutal' ? '3px 3px 0 #000' : 'none',
      }}
    >
      {/* ----------------------------------------
          Kopfzeile mit Sprache und Copy-Action
          ---------------------------------------- */}
      <div
        className={`flex items-center justify-between gap-3 ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2'}`}
        style={{
          borderBottom: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.04)',
        }}
      >
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
          {languageLabel}
        </span>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium transition-colors"
          style={{
            borderRadius: designStyle === 'brutal' ? '0.35rem' : '9999px',
            border: designStyle === 'brutal' ? '1px solid #000' : '1px solid rgba(255,255,255,0.08)',
            background: isCopied ? accentColor : 'rgba(255,255,255,0.06)',
            color: '#f8fafc',
          }}
          title={isCopied ? 'Kopiert' : 'Code kopieren'}
        >
          {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{isCopied ? 'Kopiert' : 'Copy'}</span>
        </button>
      </div>

      {/* ----------------------------------------
          Highlighted Output
          Shiki liefert HTML mit Inline-Styles.
          Bei unbekannter Sprache wird Plain-Text gezeigt.
          ---------------------------------------- */}
      <div
        className={`overflow-auto text-[13px] leading-6 [&_.line]:block [&_code]:font-mono [&_pre]:m-0 [&_pre]:bg-transparent ${
          compact ? 'max-h-40 [&_pre]:p-3' : '[&_pre]:p-4'
        }`}
        dangerouslySetInnerHTML={{ __html: highlightedHtml ?? fallbackHtml }}
      />
    </div>
  );
}
