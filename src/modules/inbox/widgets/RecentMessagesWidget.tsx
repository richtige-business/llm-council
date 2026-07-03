// ============================================
// RecentMessagesWidget.tsx - Letzte Nachrichten Widget
// 
// Zweck: Dashboard-Widget das die neuesten Nachrichten anzeigt
// Verwendet von: Dashboard
// ============================================

'use client';

import { motion } from 'framer-motion';
import { useInboxStore } from '../store';
import type { Message } from '../types';
import { useThemeStyles } from '@/lib/theme';

// --------------------------------------------
// Komponente: RecentMessagesWidget
// Widget mit Liste der neuesten Nachrichten
// --------------------------------------------

export function RecentMessagesWidget() {
  const messages = useInboxStore((state) => state.messages);
  
  // Theme-Styles
  const { surface, accentColor, textColor, designStyle } = useThemeStyles();
  
  // Die 5 neuesten Nachrichten
  const recentMessages = messages
    .filter(m => m.folder === 'inbox')
    .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
    .slice(0, 5);

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
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          </div>
          <h3 className="text-sm font-medium" style={{ color: textColor }}>
            Letzte Nachrichten
          </h3>
        </div>
        
        <a
          href="/inbox"
          className="text-xs transition-colors"
          style={{ color: textColor, opacity: 0.5 }}
        >
          Alle anzeigen →
        </a>
      </div>

      {/* Nachrichtenliste */}
      <div className="space-y-2">
        {recentMessages.length > 0 ? (
          recentMessages.map((message, index) => (
            <MessageItem 
              key={message.id} 
              message={message} 
              index={index}
              accentColor={accentColor}
              textColor={textColor}
              designStyle={designStyle}
            />
          ))
        ) : (
          <div className="py-8 text-center">
            <div 
              className="mb-2 inline-flex h-12 w-12 items-center justify-center bg-white/10"
              style={{ borderRadius: designStyle === 'brutal' ? '0.5rem' : '9999px' }}
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ color: textColor, opacity: 0.4 }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
            <p className="text-sm" style={{ color: textColor, opacity: 0.4 }}>
              Keine Nachrichten
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// --------------------------------------------
// MessageItem Komponente
// Einzelne Nachricht in der Liste
// --------------------------------------------

interface MessageItemProps {
  message: Message;
  index: number;
  accentColor: string;
  textColor: string;
  designStyle: 'glass' | 'brutal' | 'neo';
}

function MessageItem({ message, index, accentColor, textColor, designStyle }: MessageItemProps) {
  // Zeitformat
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Gerade eben';
    if (minutes < 60) return `vor ${minutes} Min`;
    if (hours < 24) return `vor ${hours} Std`;
    if (days < 7) return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  return (
    <motion.a
      href={`/inbox?message=${message.id}`}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group flex items-start gap-3 p-2 transition-colors"
      style={{
        background: !message.isRead ? 'rgba(255,255,255,0.05)' : 'transparent',
        borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.75rem',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
      onMouseLeave={(e) => e.currentTarget.style.background = !message.isRead ? 'rgba(255,255,255,0.05)' : 'transparent'}
    >
      {/* Avatar / Unread Dot */}
      <div 
        className="relative flex h-8 w-8 shrink-0 items-center justify-center bg-white/10"
        style={{ borderRadius: designStyle === 'brutal' ? '0.25rem' : '9999px' }}
      >
        {message.type === 'system' ? (
          <svg className="h-4 w-4" style={{ color: accentColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        ) : (
          <span className="text-xs font-semibold" style={{ color: textColor, opacity: 0.5 }}>
            {(message.senderName || message.sender).charAt(0).toUpperCase()}
          </span>
        )}
        
        {/* Unread Dot */}
        {!message.isRead && (
          <div 
            className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 border-2 border-white/20"
            style={{ 
              background: accentColor,
              borderRadius: designStyle === 'brutal' ? '0' : '9999px',
            }}
          />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span 
            className="truncate text-sm"
            style={{ 
              color: textColor, 
              fontWeight: !message.isRead ? 600 : 400,
              opacity: !message.isRead ? 1 : 0.7,
            }}
          >
            {message.senderName || message.sender.split('@')[0]}
          </span>
          <span className="shrink-0 text-xs" style={{ color: textColor, opacity: 0.5 }}>
            {formatTime(message.receivedAt)}
          </span>
        </div>
        
        <p 
          className="truncate text-xs"
          style={{ color: textColor, opacity: !message.isRead ? 0.7 : 0.5 }}
        >
          {message.subject}
        </p>
      </div>

      {/* Priority Indicator */}
      {message.priority === 'high' && (
        <div className="shrink-0">
          <svg className="h-4 w-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
      )}
    </motion.a>
  );
}

