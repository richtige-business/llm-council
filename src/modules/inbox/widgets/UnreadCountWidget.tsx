// ============================================
// UnreadCountWidget.tsx - Ungelesene Nachrichten Zähler
// 
// Zweck: Dashboard-Widget das ungelesene Nachrichten anzeigt
// Verwendet von: Dashboard, Sidebar
// ============================================

'use client';

import { motion } from 'framer-motion';
import { useUnreadCount, useInboxStore } from '../store';
import { useThemeStyles } from '@/lib/theme';

// --------------------------------------------
// Komponente: UnreadCountWidget
// Kleines Widget mit Zähler und Link zur Inbox
// --------------------------------------------

export function UnreadCountWidget() {
  const unreadCount = useUnreadCount('inbox');
  const totalMessages = useInboxStore((state) => state.messages.length);
  
  // Theme-Styles
  const { surface, accentColor, textColor, designStyle } = useThemeStyles();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="h-full p-4"
      style={surface.base}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div 
            className="flex h-8 w-8 items-center justify-center"
            style={{
              background: accentColor,
              borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
              border: designStyle === 'brutal' ? '2px solid #000' : 'none',
              boxShadow: designStyle === 'brutal' ? '2px 2px 0 #000' : 'none',
            }}
          >
            <svg
              className="h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-sm font-medium" style={{ color: textColor }}>
            Postfach
          </h3>
        </div>
        
        <a
          href="/inbox"
          className="text-xs transition-colors"
          style={{ color: textColor, opacity: 0.5 }}
        >
          Öffnen →
        </a>
      </div>

      {/* Zähler */}
      <div className="flex items-end justify-between">
        <div>
          <motion.div
            key={unreadCount}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-3xl font-bold"
            style={{ color: textColor }}
          >
            {unreadCount}
          </motion.div>
          <p className="text-sm" style={{ color: textColor, opacity: 0.5 }}>
            Ungelesene Nachrichten
          </p>
        </div>

        {/* Mini-Statistik */}
        <div className="text-right">
          <div className="text-lg font-semibold" style={{ color: textColor, opacity: 0.7 }}>
            {totalMessages}
          </div>
          <p className="text-xs" style={{ color: textColor, opacity: 0.5 }}>
            Gesamt
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      {totalMessages > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs" style={{ color: textColor, opacity: 0.5 }}>
            <span>Gelesen</span>
            <span>{Math.round(((totalMessages - unreadCount) / totalMessages) * 100)}%</span>
          </div>
          <div 
            className="h-1.5 overflow-hidden bg-white/10"
            style={{ borderRadius: designStyle === 'brutal' ? '0' : '9999px' }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ 
                width: `${((totalMessages - unreadCount) / totalMessages) * 100}%` 
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full"
              style={{ 
                background: accentColor,
                borderRadius: designStyle === 'brutal' ? '0' : '9999px',
              }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}

