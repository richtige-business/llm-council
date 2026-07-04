// ============================================
// ContextIndicator.tsx - Kontext-Token-Tracker
// 
// Zweck: Zeigt die aktuelle Kontext-Auslastung an
//        Warnt bei hoher Auslastung und bietet
//        Zusammenfassung an
// Verwendet von: AgentChatBar.tsx
// ============================================

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Brain, AlertTriangle } from 'lucide-react';
import { CONTEXT_WINDOWS, DEFAULT_CONTEXT_WINDOW, CHARS_PER_TOKEN } from '../constants';
import type { ChatMessageData } from '../types';

// --------------------------------------------
// Props
// --------------------------------------------

interface ContextIndicatorProps {
  messages: ChatMessageData[];  // Aktuelle Nachrichten
  modelId: string;              // Aktuelles Modell
  onSummarize?: () => void;     // Callback für Zusammenfassung
}

// --------------------------------------------
// Token-Approximation
// Berechnet ungefähre Token-Anzahl aus Text
// (~4 Zeichen pro Token, Standard-Approximation)
// --------------------------------------------

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

// --------------------------------------------
// Formatierung: Große Zahlen kompakt anzeigen
// z.B. 45000 → "45k", 1500 → "1.5k"
// --------------------------------------------

function formatTokenCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`;
  }
  return count.toString();
}

// --------------------------------------------
// Komponente: ContextIndicator
// Kompakte Anzeige der Kontext-Auslastung
// --------------------------------------------

export function ContextIndicator({ messages, modelId, onSummarize }: ContextIndicatorProps) {
  // Kontext-Fenster für aktuelles Modell bestimmen
  const contextWindow = CONTEXT_WINDOWS[modelId] || DEFAULT_CONTEXT_WINDOW;

  // Token-Verbrauch berechnen
  const tokenUsage = useMemo(() => {
    const totalTokens = messages.reduce((sum, msg) => {
      // Nutze gespeicherte Token-Anzahl wenn vorhanden, sonst Approximation
      return sum + (msg.tokenCount || estimateTokens(msg.content));
    }, 0);

    const usagePercent = (totalTokens / contextWindow.maxTokens) * 100;
    const shouldSummarize = usagePercent >= contextWindow.summarizeThreshold * 100;

    return {
      totalTokens,
      maxTokens: contextWindow.maxTokens,
      usagePercent,
      shouldSummarize,
    };
  }, [messages, contextWindow]);

  // Farbe je nach Auslastung
  const getColor = () => {
    if (tokenUsage.usagePercent >= 90) return '#ef4444'; // Rot
    if (tokenUsage.usagePercent >= 70) return '#f59e0b'; // Gelb
    return 'rgba(255,255,255,0.4)'; // Normal
  };

  const color = getColor();

  return (
    <div className="flex items-center gap-1.5">
      {/* Token-Anzeige */}
      <button
        onClick={tokenUsage.shouldSummarize ? onSummarize : undefined}
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-colors ${
          tokenUsage.shouldSummarize
            ? 'hover:bg-amber-500/20 cursor-pointer'
            : 'cursor-default'
        }`}
        title={`${tokenUsage.totalTokens.toLocaleString()} / ${tokenUsage.maxTokens.toLocaleString()} Tokens (${tokenUsage.usagePercent.toFixed(1)}%)`}
      >
        {tokenUsage.shouldSummarize ? (
          <AlertTriangle className="h-2.5 w-2.5" style={{ color }} />
        ) : (
          <Brain className="h-2.5 w-2.5" style={{ color }} />
        )}
        <span style={{ color }}>
          {formatTokenCount(tokenUsage.totalTokens)}/{formatTokenCount(tokenUsage.maxTokens)}
        </span>
      </button>

      {/* Mini Progress-Bar */}
      <div className="w-12 h-1 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(tokenUsage.usagePercent, 100)}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
