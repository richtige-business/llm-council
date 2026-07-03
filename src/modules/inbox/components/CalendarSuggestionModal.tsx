// ============================================
// CalendarSuggestionModal.tsx - Modal für Terminvorschläge
// 
// Zweck: Zeigt erkannte Terminvorschläge an und ermöglicht
//        Annehmen/Ablehnen mit Kalender-Integration
// Verwendet von: InboxPage.tsx
// ============================================

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInboxStore, useSelectedSuggestion } from '../store';
import { useCalendarStore } from '@/modules/calendar/store';

// --------------------------------------------
// Komponente: CalendarSuggestionModal
// --------------------------------------------

export function CalendarSuggestionModal() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const suggestion = useSelectedSuggestion();
  const selectSuggestion = useInboxStore((state) => state.selectSuggestion);
  const updateCalendarSuggestion = useInboxStore((state) => state.updateCalendarSuggestion);
  const updateMessage = useInboxStore((state) => state.updateMessage);
  
  // Kalender-Store für Event-Erstellung
  const addEvent = useCalendarStore((state) => state.addEvent);
  const events = useCalendarStore((state) => state.events);
  
  const isOpen = suggestion !== null;
  
  // Modal schließen
  const handleClose = () => {
    selectSuggestion(null);
    setError(null);
  };
  
  // Termin annehmen
  const handleAccept = async () => {
    if (!suggestion) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Duplikat-Check über API
      const checkResponse = await fetch(`/api/calendar/suggestions/${suggestion.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          existingEvents: events.map(e => ({
            id: e.id,
            title: e.title,
            startDate: e.startDate,
            endDate: e.endDate,
            description: e.description,
          })),
        }),
      });
      
      const checkData = await checkResponse.json();
      
      // Duplikat-Warnung
      if (checkData.warning === 'duplicate_found') {
        const confirmDuplicate = window.confirm(
          `${checkData.message}\n\nMöchtest du den Termin trotzdem erstellen?`
        );
        
        if (!confirmDuplicate) {
          setIsProcessing(false);
          return;
        }
      }
      
      // Event-Daten holen
      const eventData = checkData.eventData || checkData;
      
      if (!eventData.title) {
        throw new Error('Keine Event-Daten erhalten');
      }
      
      // Kalender-Event erstellen (lokal im Store)
      addEvent({
        title: eventData.title,
        startDate: eventData.startDate,
        endDate: eventData.endDate,
        description: eventData.description || '',
        allDay: eventData.allDay || false,
        categoryId: 'work', // Default-Kategorie
        reminders: [],
      });
      
      // Letztes Event ID holen (wurde gerade hinzugefügt)
      const lastEvent = useCalendarStore.getState().events.slice(-1)[0];
      
      // API bestätigen
      await fetch(`/api/calendar/suggestions/${suggestion.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: lastEvent?.id || 'created',
          skipDuplicateCheck: true,
        }),
      });
      
      // Lokalen State aktualisieren
      updateCalendarSuggestion(suggestion.id, { 
        status: 'accepted',
      });
      
      updateMessage(suggestion.messageId, {
        calendarActionProcessed: true,
      });
      
      // Modal schließen
      handleClose();
      
    } catch (err) {
      console.error('Fehler beim Annehmen:', err);
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Termin ablehnen
  const handleDecline = async () => {
    if (!suggestion) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      await fetch(`/api/calendar/suggestions/${suggestion.id}/decline`, {
        method: 'POST',
      });
      
      // Lokalen State aktualisieren
      updateCalendarSuggestion(suggestion.id, { 
        status: 'declined',
      });
      
      updateMessage(suggestion.messageId, {
        calendarActionProcessed: true,
      });
      
      // Modal schließen
      handleClose();
      
    } catch (err) {
      console.error('Fehler beim Ablehnen:', err);
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Datum formatieren
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Datum unbekannt';
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <AnimatePresence>
      {isOpen && suggestion && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[var(--z-modal)] bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 z-[var(--z-modal)] w-full max-w-md -translate-x-1/2 -translate-y-1/2"
          >
            <div 
              className="overflow-hidden rounded-2xl shadow-2xl"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(40px) saturate(180%)',
                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-[var(--accent-primary)]/20 p-2">
                    <svg className="h-5 w-5 text-[var(--accent-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    Terminvorschlag
                  </h3>
                </div>
                <button
                  onClick={handleClose}
                  className="rounded-lg p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Fehler-Anzeige */}
                {error && (
                  <div className="mb-4 rounded-xl bg-[var(--accent-danger)]/10 px-4 py-3 text-sm text-[var(--accent-danger)]">
                    {error}
                  </div>
                )}
                
                {/* Konfidenz-Badge */}
                <div className="mb-4 flex items-center gap-2">
                  <span className={`
                    rounded-full px-2.5 py-1 text-xs font-medium
                    ${suggestion.confidence >= 0.8 
                      ? 'bg-[var(--accent-success)]/20 text-[var(--accent-success)]'
                      : suggestion.confidence >= 0.5
                        ? 'bg-[var(--accent-warning)]/20 text-[var(--accent-warning)]'
                        : 'bg-white/10 text-white/60'
                    }
                  `}>
                    {Math.round(suggestion.confidence * 100)}% Konfidenz
                  </span>
                  {suggestion.meetingLink && (
                    <span className="rounded-full bg-[var(--accent-secondary)]/20 px-2.5 py-1 text-xs font-medium text-[var(--accent-secondary)]">
                      Mit Meeting-Link
                    </span>
                  )}
                </div>

                {/* Termin-Details */}
                <div className="mb-6 space-y-4">
                  {/* Titel */}
                  <div>
                    <label className="mb-1 block text-xs text-white/50">Titel</label>
                    <p className="text-lg font-medium text-white">
                      {suggestion.suggestedTitle}
                    </p>
                  </div>

                  {/* Datum & Zeit */}
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="mb-1 block text-xs text-white/50">Datum</label>
                      <p className="text-sm text-white">
                        {formatDate(suggestion.suggestedDate)}
                      </p>
                    </div>
                    {suggestion.suggestedTime && (
                      <div>
                        <label className="mb-1 block text-xs text-white/50">Uhrzeit</label>
                        <p className="text-sm text-white">
                          {suggestion.suggestedTime} Uhr
                          {suggestion.suggestedEndTime && ` - ${suggestion.suggestedEndTime} Uhr`}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Ort */}
                  {suggestion.location && (
                    <div>
                      <label className="mb-1 block text-xs text-white/50">Ort</label>
                      <p className="text-sm text-white">{suggestion.location}</p>
                    </div>
                  )}

                  {/* Meeting-Link */}
                  {suggestion.meetingLink && (
                    <div>
                      <label className="mb-1 block text-xs text-white/50">Meeting-Link</label>
                      <a 
                        href={suggestion.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-[var(--accent-primary)] hover:underline"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Meeting beitreten
                      </a>
                    </div>
                  )}

                  {/* Beschreibung */}
                  {suggestion.description && (
                    <div>
                      <label className="mb-1 block text-xs text-white/50">Beschreibung</label>
                      <p className="text-sm text-white/70">{suggestion.description}</p>
                    </div>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleDecline}
                    disabled={isProcessing}
                    className="flex-1 rounded-xl px-4 py-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
                    style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                  >
                    Ablehnen
                  </button>
                  <button
                    onClick={handleAccept}
                    disabled={isProcessing}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-3 text-sm font-medium text-white transition-all hover:bg-[var(--accent-primary-hover)] disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Verarbeite...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        In Kalender eintragen
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
