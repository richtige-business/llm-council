// ============================================
// MessageView.tsx - Detailansicht einer Nachricht
// 
// Zweck: Zeigt den vollständigen Inhalt einer Nachricht
// Verwendet von: InboxPage.tsx
// ============================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInboxStore, useSelectedMessage, useAccountById, useInboxLabels } from '../store';
import { useThemeStyles } from '@/lib/theme';

// --------------------------------------------
// Komponente: LabelDropdown
// Dropdown-Menü zum Zuweisen von Labels
// --------------------------------------------

interface LabelDropdownProps {
  messageId: string;
  currentLabels: string[];
  onClose: () => void;
}

function LabelDropdown({ messageId, currentLabels, onClose }: LabelDropdownProps) {
  const labels = useInboxLabels();
  const addLabelToMessage = useInboxStore((state) => state.addLabelToMessage);
  const removeLabelFromMessage = useInboxStore((state) => state.removeLabelFromMessage);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Schließen bei Klick außerhalb
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleToggleLabel = async (labelId: string) => {
    if (currentLabels.includes(labelId)) {
      await removeLabelFromMessage(messageId, labelId);
    } else {
      await addLabelToMessage(messageId, labelId);
    }
  };

  return (
    <motion.div
      ref={dropdownRef}
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full z-50 mt-2 min-w-[200px] rounded-xl border border-white/10 bg-[#1a1a2e]/95 p-2 shadow-2xl backdrop-blur-xl"
    >
      <p className="mb-2 px-2 text-xs font-medium text-white/50">Labels zuweisen</p>
      
      {labels.length === 0 ? (
        <p className="px-2 py-3 text-sm text-white/40">
          Keine Labels vorhanden
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {labels.map((label) => {
            const isAssigned = currentLabels.includes(label.id);
            return (
              <button
                key={label.id}
                onClick={() => handleToggleLabel(label.id)}
                className="flex items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-white/10"
              >
                {/* Checkbox */}
                <div 
                  className="flex h-4 w-4 items-center justify-center rounded border-2 transition-colors"
                  style={{
                    borderColor: isAssigned ? label.color : 'rgba(255, 255, 255, 0.3)',
                    backgroundColor: isAssigned ? label.color : 'transparent',
                  }}
                >
                  {isAssigned && (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                
                {/* Color dot + Name */}
                <span 
                  className="h-2.5 w-2.5 rounded-full" 
                  style={{ backgroundColor: label.color }}
                />
                <span className="text-white/80">{label.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// --------------------------------------------
// Komponente: MessageView
// --------------------------------------------

export function MessageView() {
  const message = useSelectedMessage();
  const account = useAccountById(message?.accountId || '');
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  
  const markAsUnread = useInboxStore((state) => state.markAsUnread);
  const moveToFolder = useInboxStore((state) => state.moveToFolder);
  const deleteMessage = useInboxStore((state) => state.deleteMessage);
  const markAsSpam = useInboxStore((state) => state.markAsSpam);
  const unmarkAsSpam = useInboxStore((state) => state.unmarkAsSpam);
  const openCompose = useInboxStore((state) => state.openCompose);
  const selectMessage = useInboxStore((state) => state.selectMessage);

  // Theme-Styles
  const { surface, designStyle } = useThemeStyles();

  // Dropdown schließen wenn Nachricht wechselt
  useEffect(() => {
    setShowLabelDropdown(false);
  }, [message?.id]);

  if (!message) return null;

  // Formatiere Datum
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Löschen Handler
  const handleDelete = () => {
    if (message.folder === 'trash') {
      // Endgültig löschen (permanent = true)
      deleteMessage(message.id, true);
    } else {
      // In Papierkorb verschieben
      moveToFolder(message.id, 'trash');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex h-full flex-col"
      style={{
        ...surface.base,
        borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
      }}
    >
      {/* ----------------------------------------
          TOOLBAR - Komplett neue Struktur
          Alle Buttons in einer scrollbaren Reihe
          ---------------------------------------- */}
      <div 
        className="shrink-0 border-b px-4 py-3"
        style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
      >
        {/* Alle Buttons in einer Reihe mit horizontalem Scroll wenn nötig */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Zurück Button */}
          <button
            onClick={() => selectMessage(null)}
            className="shrink-0 rounded-lg p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            title="Zurück zur Liste"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {/* Trennlinie */}
          <div className="h-6 w-px shrink-0 bg-white/20" />
          
          {/* Aktions-Buttons */}
          {/* Antworten */}
          {message.type === 'email' && (
            <button
              onClick={() => openCompose(message, 'reply')}
              className="shrink-0 rounded-lg p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              title="Antworten"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
          )}

          {/* Weiterleiten */}
          {message.type === 'email' && (
            <button
              onClick={() => openCompose(message, 'forward')}
              className="shrink-0 rounded-lg p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              title="Weiterleiten"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          )}

          {/* Als ungelesen markieren */}
          <button
            onClick={() => markAsUnread(message.id)}
            className="shrink-0 rounded-lg p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            title="Als ungelesen markieren"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>

          {/* Spam */}
          <button
            onClick={() => {
              if (message.folder === 'spam') {
                unmarkAsSpam(message.id);
              } else {
                markAsSpam(message.id);
              }
            }}
            className={`shrink-0 rounded-lg p-2 transition-colors hover:bg-white/10 ${
              message.folder === 'spam' ? 'text-red-400' : 'text-white/50'
            }`}
            title={message.folder === 'spam' ? 'Kein Spam' : 'Als Spam markieren'}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </button>

          {/* Label-Button mit Dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowLabelDropdown(!showLabelDropdown)}
              className={`rounded-lg p-2 transition-colors hover:bg-white/10 ${
                showLabelDropdown ? 'bg-white/10 text-white' : 'text-white/50'
              }`}
              title="Label zuweisen"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </button>
            
            <AnimatePresence>
              {showLabelDropdown && (
                <LabelDropdown
                  messageId={message.id}
                  currentLabels={message.labels || []}
                  onClose={() => setShowLabelDropdown(false)}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Archivieren */}
          <button
            onClick={() => moveToFolder(message.id, 'archive')}
            className="shrink-0 rounded-lg p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            title="Archivieren"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </button>

          {/* Löschen */}
          <button
            onClick={handleDelete}
            className="shrink-0 rounded-lg p-2 text-white/50 transition-colors hover:bg-red-500/20 hover:text-red-400"
            title={message.folder === 'trash' ? 'Endgültig löschen' : 'In Papierkorb'}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* ----------------------------------------
          HEADER - Betreff & Absender
          ---------------------------------------- */}
      <div className="shrink-0 border-b px-6 py-4" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
        {/* Betreff */}
        <h2 className="mb-4 text-xl font-semibold text-white">
          {message.subject || '(Kein Betreff)'}
        </h2>

        {/* Absender */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div 
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: 'var(--accent-primary, #8B5CF6)' }}
          >
            <span className="text-sm font-semibold text-white">
              {(message.senderName || message.sender || '?').charAt(0).toUpperCase()}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white">
                {message.senderName || message.sender?.split('@')[0] || 'Unbekannt'}
              </span>
              {message.priority === 'high' && (
                <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                  Wichtig
                </span>
              )}
            </div>
            <p className="truncate text-sm text-white/50">
              {message.sender}
            </p>
          </div>

          {/* Datum */}
          <p className="shrink-0 text-sm text-white/50">
            {formatDate(message.receivedAt)}
          </p>
        </div>

        {/* Empfänger */}
        {message.recipients && message.recipients.length > 0 && (
          <div className="mt-3 text-sm text-white/50">
            <span>An: </span>
            {message.recipients.join(', ')}
          </div>
        )}
        {message.cc && message.cc.length > 0 && (
          <div className="text-sm text-white/50">
            <span>CC: </span>
            {message.cc.join(', ')}
          </div>
        )}

        {/* Zugewiesene Labels anzeigen */}
        {message.labels && message.labels.length > 0 && (
          <AssignedLabels labelIds={message.labels} />
        )}
      </div>

      {/* ----------------------------------------
          BODY - Scrollbarer Inhalt
          Prüft ob Inhalt HTML ist (auch wenn im body-Feld)
          ---------------------------------------- */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        {(() => {
          // Prüfen ob bodyHtml vorhanden
          if (message.bodyHtml) {
            return (
              <div
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
              />
            );
          }
          
          // Prüfen ob body HTML-Inhalt enthält (z.B. wenn mimeType falsch war)
          const bodyContent = message.body || '';
          const isHtmlContent = bodyContent.trim().startsWith('<!DOCTYPE') || 
                                bodyContent.trim().startsWith('<html') ||
                                bodyContent.trim().startsWith('<HTML') ||
                                (bodyContent.includes('<table') && bodyContent.includes('</table>')) ||
                                (bodyContent.includes('<div') && bodyContent.includes('</div>'));
          
          if (isHtmlContent) {
            return (
              <div
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: bodyContent }}
              />
            );
          }
          
          // Normaler Plain-Text
          return (
            <div className="whitespace-pre-wrap text-white/80">
              {bodyContent || '(Kein Inhalt)'}
            </div>
          );
        })()}

        {/* System-Benachrichtigung: Action-Button */}
        {message.type === 'system' && message.actionUrl && (
          <div className="mt-6">
            <a
              href={message.actionUrl}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-600"
            >
              Öffnen
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}
      </div>

      {/* ----------------------------------------
          ATTACHMENTS
          ---------------------------------------- */}
      {message.hasAttachments && message.attachments && message.attachments.length > 0 && (
        <div className="shrink-0 border-t px-6 py-4" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <h4 className="mb-3 text-sm font-medium text-white/50">
            Anhänge ({message.attachments.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {message.attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2"
              >
                <svg className="h-4 w-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span className="text-sm text-white/70">
                  {attachment.filename}
                </span>
                <span className="text-xs text-white/40">
                  ({Math.round(attachment.size / 1024)} KB)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// --------------------------------------------
// Hilfkomponente: Zugewiesene Labels anzeigen
// --------------------------------------------

function AssignedLabels({ labelIds }: { labelIds: string[] }) {
  const labels = useInboxLabels();
  const assignedLabels = labels.filter((l) => labelIds.includes(l.id));

  if (assignedLabels.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {assignedLabels.map((label) => (
        <span
          key={label.id}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
          style={{ 
            backgroundColor: `${label.color}20`,
            color: label.color,
          }}
        >
          <span 
            className="h-2 w-2 rounded-full" 
            style={{ backgroundColor: label.color }}
          />
          {label.name}
        </span>
      ))}
    </div>
  );
}
