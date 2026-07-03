// ============================================
// MessageList.tsx - Liste aller Nachrichten
// 
// Zweck: Zeigt Nachrichten im aktuellen Ordner
//        Mit Dringlichkeits-Badges, Kategorie-Anzeige und Pagination
// Verwendet von: InboxPage.tsx
// ============================================

'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  useInboxStore, 
  useInboxMessages,
  useSelectedFolder,
  useSearchQuery,
  useInboxFilters,
  useInboxAccounts,
  useSuggestionForMessage,
  useSelectedMessageIds,
  useSelectedLabelId,
  getFilteredMessages 
} from '../store';
import type { Message, MessageFolder } from '../types';
import { useThemeStyles } from '@/lib/theme';

// Konstanten für Pagination
const MESSAGES_PER_PAGE = 25;

// --------------------------------------------
// Komponente: MessageList
// --------------------------------------------

export function MessageList() {
  // Rohe Daten holen
  const allMessages = useInboxMessages();
  const selectedFolder = useSelectedFolder();
  const selectedLabelId = useSelectedLabelId();
  const searchQuery = useSearchQuery();
  const filters = useInboxFilters();
  const accounts = useInboxAccounts();
  const selectedMessageIds = useSelectedMessageIds();
  const { surface, accentColor, designStyle, textColor } = useThemeStyles();
  
  // Bulk-Aktionen
  const clearSelection = useInboxStore((state) => state.clearSelection);
  const selectAllInFolder = useInboxStore((state) => state.selectAllInFolder);
  const bulkMoveToFolder = useInboxStore((state) => state.bulkMoveToFolder);
  const bulkDelete = useInboxStore((state) => state.bulkDelete);
  const bulkMarkAsRead = useInboxStore((state) => state.bulkMarkAsRead);
  const bulkMarkAsSpam = useInboxStore((state) => state.bulkMarkAsSpam);
  
  // Pagination State
  const [displayCount, setDisplayCount] = useState(MESSAGES_PER_PAGE);
  
  // Filtern mit useMemo um Infinite Loop zu vermeiden
  // Berücksichtigt jetzt auch selectedLabelId
  const allFilteredMessages = useMemo(
    () => getFilteredMessages(allMessages, selectedFolder, searchQuery, filters, accounts, selectedLabelId),
    [allMessages, selectedFolder, searchQuery, filters, accounts, selectedLabelId]
  );
  
  // Pagination: Nur die ersten N Nachrichten anzeigen
  const messages = useMemo(
    () => allFilteredMessages.slice(0, displayCount),
    [allFilteredMessages, displayCount]
  );
  
  // Reset displayCount wenn Ordner wechselt
  useMemo(() => {
    setDisplayCount(MESSAGES_PER_PAGE);
  }, [selectedFolder]);
  
  const hasMore = allFilteredMessages.length > displayCount;
  const remainingCount = allFilteredMessages.length - displayCount;

  return (
    <div 
      className="flex h-full flex-col"
      style={{
        ...surface.base,
        borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
      }}
    >
      {/* Header mit Bulk-Aktionen wenn Auswahl vorhanden */}
      {selectedMessageIds.length > 0 ? (
        <div 
          className="flex flex-wrap items-center gap-3 px-4 py-3"
          style={{
            borderBottom: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(255, 255, 255, 0.1)',
            background: `${accentColor}15`,
          }}
        >
          {/* Auswahl-Info */}
          <span className="text-sm font-medium" style={{ color: accentColor }}>
            {selectedMessageIds.length} ausgewählt
          </span>
          
          {/* Trennlinie */}
          <div className="h-5 w-px bg-white/20" />
          
          {/* Alle auswählen Button */}
          <button
            onClick={selectAllInFolder}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-white/10"
            style={{ color: textColor }}
            title="Alle auswählen"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>Alle</span>
          </button>
          
          {/* Bulk-Aktionen mit Icons + Text */}
          <button
            onClick={() => bulkMarkAsRead()}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-white/10"
            style={{ color: textColor }}
            title="Als gelesen markieren"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="hidden sm:inline">Gelesen</span>
          </button>
          
          <button
            onClick={() => bulkMoveToFolder('archive')}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-white/10"
            style={{ color: textColor }}
            title="Archivieren"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <span className="hidden sm:inline">Archiv</span>
          </button>
          
          <button
            onClick={() => bulkMarkAsSpam()}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-orange-400 transition-colors hover:bg-orange-500/10"
            title="Als Spam markieren"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="hidden sm:inline">Spam</span>
          </button>
          
          <button
            onClick={() => bulkDelete()}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-500/10"
            title="Löschen"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="hidden sm:inline">Löschen</span>
          </button>
          
          {/* Abbrechen */}
          <div className="flex-1" />
          <button
            onClick={clearSelection}
            className="rounded-lg px-3 py-1.5 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            Abbrechen
          </button>
        </div>
      ) : (
        <div 
          className="flex items-center justify-between px-4 py-3"
          style={{
            borderBottom: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <h3 className="text-sm font-semibold" style={{ color: textColor }}>
            {selectedLabelId ? 'Nachrichten mit Label' : 'Nachrichten'}
          </h3>
          <span className="text-xs" style={{ color: textColor, opacity: 0.5 }}>
            {displayCount < allFilteredMessages.length 
              ? `${displayCount} von ${allFilteredMessages.length}`
              : `${allFilteredMessages.length}`
            } Nachricht{allFilteredMessages.length !== 1 ? 'en' : ''}
          </span>
        </div>
      )}

      {/* Nachrichtenliste */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {messages.length > 0 ? (
            <>
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.3) }}
                >
                  <MessageItem message={message} accentColor={accentColor} designStyle={designStyle} textColor={textColor} />
                </motion.div>
              ))}
              
              {/* Mehr laden Button */}
              {hasMore && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4"
                >
                  <button
                    onClick={() => setDisplayCount(prev => prev + MESSAGES_PER_PAGE)}
                    className="w-full rounded-lg py-3 text-sm font-medium transition-colors"
                    style={{
                      background: `${accentColor}20`,
                      color: accentColor,
                      border: designStyle === 'brutal' ? '2px solid #000' : `1px solid ${accentColor}40`,
                      borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
                    }}
                  >
                    Mehr laden ({remainingCount} weitere)
                  </button>
                </motion.div>
              )}
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center p-8 text-center"
            >
              <div 
                className="mb-3 p-4"
                style={{
                  background: designStyle === 'brutal' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                  borderRadius: designStyle === 'brutal' ? '0.5rem' : '9999px',
                  border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                }}
              >
                <svg
                  className="h-8 w-8"
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
                Keine Nachrichten in "{selectedFolder}"
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// --------------------------------------------
// MessageItem Komponente
// Einzelne Nachricht in der Liste
// Mit Dringlichkeits-Badges und Kategorie-Anzeige
// --------------------------------------------

interface MessageItemProps {
  message: Message;
  accentColor: string;
  designStyle: 'glass' | 'brutal' | 'neo';
  textColor: string;
}

function MessageItem({ message, accentColor, designStyle, textColor }: MessageItemProps) {
  const selectedMessageId = useInboxStore((state) => state.selectedMessageId);
  const selectMessage = useInboxStore((state) => state.selectMessage);
  const toggleMessageSelection = useInboxStore((state) => state.toggleMessageSelection);
  const selectSuggestion = useInboxStore((state) => state.selectSuggestion);
  const selectedMessageIds = useInboxStore((state) => state.selectedMessageIds);
  
  // Prüfe ob es einen Terminvorschlag für diese Nachricht gibt
  const suggestion = useSuggestionForMessage(message.id);

  const isSelected = selectedMessageId === message.id;
  const isChecked = selectedMessageIds.includes(message.id);

  // Zeitformat
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('de-DE', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (days < 7) {
      return date.toLocaleDateString('de-DE', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('de-DE', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
  };

  // Dringlichkeits-Badge Farben
  const getUrgencyBadge = () => {
    if (message.urgency >= 5) {
      return { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Dringend' };
    }
    if (message.urgency >= 4) {
      return { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Wichtig' };
    }
    if (message.urgency <= 2) {
      return { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Niedrig' };
    }
    return null; // Normal = kein Badge
  };

  const urgencyBadge = getUrgencyBadge();

  // Terminvorschlag-Button Handler
  const handleSuggestionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (suggestion) {
      selectSuggestion(suggestion.id);
    }
  };

  return (
    <motion.div
      onClick={() => selectMessage(message.id)}
      whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
      className={`
        group cursor-pointer border-b border-white/10 px-4 py-3
        transition-colors
        ${isSelected ? 'bg-[var(--accent-primary)]/20' : ''}
        ${!message.isRead ? 'bg-white/5' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox für Mehrfachauswahl */}
        <div className="flex flex-col items-center gap-1 pt-1">
          {/* Checkbox */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleMessageSelection(message.id);
            }}
            className={`
              flex h-5 w-5 items-center justify-center rounded border-2 transition-all
              ${isChecked 
                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]' 
                : 'border-white/30 bg-transparent group-hover:border-white/50'
              }
            `}
          >
            {isChecked && (
              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
          
          {/* Dringlichkeits-Indikator oder Ungelesen-Punkt */}
          {message.urgency >= 4 ? (
            <div className={`h-2 w-2 rounded-full ${message.urgency >= 5 ? 'bg-red-500' : 'bg-orange-500'}`} />
          ) : !message.isRead ? (
            <div className="h-2 w-2 rounded-full bg-[var(--accent-primary)]" />
          ) : null}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Absender und Zeit */}
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 truncate">
              {/* Kategorie-Icon */}
              {message.category === 'private' && (
                <span className="text-xs" title="Privat">👤</span>
              )}
              {message.category === 'business' && (
                <span className="text-xs" title="Geschäftlich">💼</span>
              )}
              
              <span className={`
                truncate text-sm
                ${!message.isRead 
                  ? 'font-semibold text-white' 
                  : 'text-white/70'
                }
              `}>
                {message.senderName || message.sender}
              </span>
            </div>
            <span className="shrink-0 text-xs text-white/40">
              {formatDate(message.receivedAt)}
            </span>
          </div>

          {/* Betreff */}
          <h4 className={`
            mb-1 truncate text-sm
            ${!message.isRead 
              ? 'font-medium text-white' 
              : 'text-white/70'
            }
          `}>
            {message.subject}
          </h4>

          {/* Snippet */}
          <p className="line-clamp-2 text-xs text-white/40">
            {message.snippet || message.body.slice(0, 100)}
          </p>

          {/* Tags */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {/* Nachrichtentyp */}
            {message.type === 'system' && (
              <span className="rounded bg-[var(--accent-secondary)]/20 px-1.5 py-0.5 text-xs text-[var(--accent-secondary)]">
                System
              </span>
            )}
            
            {/* Dringlichkeits-Badge */}
            {urgencyBadge && (
              <span className={`rounded px-1.5 py-0.5 text-xs ${urgencyBadge.bg} ${urgencyBadge.text}`}>
                {urgencyBadge.label}
              </span>
            )}
            
            {/* Terminvorschlag-Button */}
            {suggestion && (
              <button
                onClick={handleSuggestionClick}
                className="flex items-center gap-1 rounded bg-[var(--accent-primary)]/20 px-1.5 py-0.5 text-xs text-[var(--accent-primary)] transition-colors hover:bg-[var(--accent-primary)]/30"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Termin
              </button>
            )}
            
            {/* Anhänge */}
            {message.hasAttachments && (
              <svg className="h-3.5 w-3.5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

