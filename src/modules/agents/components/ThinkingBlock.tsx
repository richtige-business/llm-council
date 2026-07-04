'use client';

// ============================================
// ThinkingBlock.tsx - Aufklappbarer Thinking-Status
//
// Zweck: Zeigt Denk- und Ladezustaende des Agents
//        kompakt an und kann Zusatzdetails aufklappen
// Verwendet von: ChatPage.tsx, AgentsPage.tsx, ChatWidget.tsx
// ============================================

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Shimmer } from './Shimmer';

type ThinkingBlockVariant = 'dark' | 'light';

interface ThinkingBlockProps {
  isStreaming: boolean;
  title?: string;
  content?: string;
  detailItems?: string[];
  accentColor?: string;
  variant?: ThinkingBlockVariant;
  compact?: boolean;
}

export function ThinkingBlock({
  isStreaming,
  title,
  content,
  detailItems = [],
  accentColor = '#a855f7',
  variant = 'dark',
  compact = false,
}: ThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(Boolean(content || detailItems.length));

  const hasDetails = Boolean(content?.trim() || detailItems.length > 0);
  const isExpanded = isStreaming || isOpen;

  const resolvedTitle = useMemo(() => {
    if (title) {
      return title;
    }

    if (isStreaming) {
      return 'Denkt nach...';
    }

    return 'Antwort wird vorbereitet';
  }, [isStreaming, title]);

  const palette = variant === 'light'
    ? {
        background: 'rgba(255,255,255,0.88)',
        border: 'rgba(15,23,42,0.08)',
        text: '#334155',
        muted: '#64748b',
      }
    : {
        background: compact ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)',
        border: 'rgba(255,255,255,0.1)',
        text: '#f8fafc',
        muted: 'rgba(255,255,255,0.58)',
      };

  return (
    <div
      className={`overflow-hidden ${compact ? 'rounded-xl' : 'rounded-2xl'}`}
      style={{
        border: compact ? 'none' : `1px solid ${palette.border}`,
        background: palette.background,
      }}
    >
      <button
        type="button"
        onClick={() => {
          if (hasDetails) {
            setIsOpen((current) => !current);
          }
        }}
        className={`flex w-full items-center justify-between gap-3 text-left ${compact ? 'px-0 py-0' : 'px-4 py-3'}`}
        disabled={!hasDetails}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
            style={{
              background: `${accentColor}22`,
              color: accentColor,
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
          </span>

          <div className="min-w-0">
            <div className="text-sm font-medium" style={{ color: palette.text }}>
              {isStreaming ? (
                <Shimmer accentColor={accentColor}>{resolvedTitle}</Shimmer>
              ) : (
                resolvedTitle
              )}
            </div>
          </div>
        </div>

        {hasDetails && (
          <motion.span
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.18 }}
            style={{ color: palette.muted }}
          >
            <ChevronDown className="h-4 w-4" />
          </motion.span>
        )}
      </button>

      <AnimatePresence initial={false}>
        {hasDetails && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div
              className={`${compact ? 'px-9 pb-0 pt-2' : 'px-4 pb-4 pt-0'}`}
              style={{
                borderTop: compact ? 'none' : `1px solid ${palette.border}`,
              }}
            >
              {content && (
                <p
                  className="whitespace-pre-wrap text-sm leading-relaxed"
                  style={{ color: palette.text }}
                >
                  {content}
                </p>
              )}

              {detailItems.length > 0 && (
                <div className={`flex flex-col gap-1.5 ${content ? 'mt-3' : ''}`}>
                  {detailItems.map((detailItem) => (
                    <div
                      key={detailItem}
                      className="rounded-xl px-3 py-2 text-xs"
                      style={{
                        background: variant === 'light' ? 'rgba(15,23,42,0.05)' : 'rgba(255,255,255,0.06)',
                        color: palette.text,
                      }}
                    >
                      {detailItem}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
