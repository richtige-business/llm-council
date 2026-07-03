// ============================================
// ChatMessage.tsx - Einzelne Chat-Nachricht
// 
// Zweck: Rendert eine einzelne Chat-Nachricht
//        (User-Nachricht links, AI-Nachricht rechts)
// Verwendet von: ChatPage.tsx
// ============================================

'use client';

import { motion } from 'framer-motion';
import { User, Bot } from 'lucide-react';
import type { ChatMessageData } from '../types';

// --------------------------------------------
// Komponente: ChatMessage
// Eine einzelne Chat-Nachricht
// --------------------------------------------

interface ChatMessageProps {
  message: ChatMessageData;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  
  // Zeitstempel formatieren (z.B. "14:30" oder "vor 2 Minuten")
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Heute: Nur Uhrzeit
    if (diffDays === 0) {
      if (diffMins < 1) return 'gerade eben';
      if (diffMins < 60) return `vor ${diffMins} Min.`;
      if (diffHours < 24) return `vor ${diffHours} Std.`;
      return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }

    // Gestern
    if (diffDays === 1) return 'Gestern';

    // Älter: Datum + Uhrzeit
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const timeAgo = formatTime(message.timestamp);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* ----------------------------------------
          Avatar
          User-Icon oder Bot-Icon
          ---------------------------------------- */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? 'bg-indigo-500'
            : 'bg-gradient-to-br from-purple-500 to-pink-500'
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-white" />
        )}
      </div>

      {/* ----------------------------------------
          Nachricht-Content
          Bubble mit Text und Zeitstempel
          ---------------------------------------- */}
      <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-indigo-500 text-white'
              : 'bg-white/10 text-white backdrop-blur-sm'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>
        
        {/* Zeitstempel */}
        <span className="text-xs text-white/40 px-2">
          {timeAgo}
        </span>
      </div>
    </motion.div>
  );
}

