'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, ChevronDown, CircleAlert, Wrench } from 'lucide-react';
import type { AgentToolCall } from '@/lib/agent/types';
import { useThemeStyles } from '@/lib/theme';
import { CodeBlock } from './CodeBlock';
import {
  formatToolCallDuration,
  formatToolCallName,
  getToolCallStatus,
  isStructuredToolCallValue,
  stringifyToolCallValue,
} from '../lib/tool-call-formatters';

interface ToolCallCardProps {
  toolCall: AgentToolCall;
}

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { designStyle } = useThemeStyles();
  const status = getToolCallStatus(toolCall);
  const statusLabel = status === 'success' ? 'Completed' : 'Failed';
  const durationLabel = formatToolCallDuration(toolCall.durationMs);
  const hasInput = typeof toolCall.input !== 'undefined';
  const hasResultData = typeof toolCall.result.data !== 'undefined';
  const hasError = Boolean(toolCall.result.error);
  const inputValue = hasInput ? stringifyToolCallValue(toolCall.input) : null;
  const resultValue = hasResultData ? stringifyToolCallValue(toolCall.result.data) : null;
  const shouldRenderStructuredInput = hasInput && isStructuredToolCallValue(toolCall.input);
  const shouldRenderStructuredResult = hasResultData && isStructuredToolCallValue(toolCall.result.data);

  return (
    <div
      className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]"
      style={{
        borderRadius: designStyle === 'brutal' ? '0.75rem' : '1rem',
        border: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(255,255,255,0.1)',
        boxShadow: designStyle === 'brutal' ? '3px 3px 0 #000' : 'none',
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
      >
        <div className="rounded-full bg-white/10 p-1.5 text-white/75">
          <Wrench className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">
            {formatToolCallName(toolCall.name)}
          </p>
          <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-white/40">
            <span>{statusLabel}</span>
            {durationLabel ? <span>{durationLabel}</span> : null}
          </div>
        </div>
        <div
          className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium ${
            status === 'success'
              ? 'bg-emerald-500/15 text-emerald-200'
              : 'bg-rose-500/15 text-rose-200'
          }`}
        >
          {status === 'success' ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <CircleAlert className="h-3.5 w-3.5" />
          )}
          <span>{status === 'success' ? 'OK' : 'Error'}</span>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-white/45 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/10 px-3 py-3">
              {hasInput ? (
                <div className="mb-3">
                  <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/35">
                    Parameter
                  </p>
                  {shouldRenderStructuredInput && inputValue ? (
                    <CodeBlock code={inputValue} language="json" compact />
                  ) : inputValue ? (
                    <p className="whitespace-pre-wrap break-words text-xs text-white/75">{inputValue}</p>
                  ) : null}
                </div>
              ) : null}

              <div className={hasInput ? '' : 'mt-0'}>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/35">
                  Ergebnis
                </p>
                {hasError ? (
                  <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                    {toolCall.result.error}
                  </div>
                ) : shouldRenderStructuredResult && resultValue ? (
                  <CodeBlock code={resultValue} language="json" compact />
                ) : resultValue ? (
                  <p className="whitespace-pre-wrap break-words text-xs text-white/75">{resultValue}</p>
                ) : toolCall.result.message ? (
                  <p className="whitespace-pre-wrap break-words text-xs text-white/75">{toolCall.result.message}</p>
                ) : (
                  <p className="text-xs text-white/45">Kein zusätzliches Ergebnis.</p>
                )}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
