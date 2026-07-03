// ============================================
// InboxPage.tsx - Hauptseite des Postfach-Moduls
// 
// Zweck: Container für alle Postfach-Komponenten
//        Nachrichtenliste links, Nachrichtenansicht rechts
//        Verwendet Theme-System für dynamisches Styling
// Verwendet von: /app/inbox/page.tsx (Route)
// ============================================

'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { useInboxStore, hydrateInboxStore } from '../store';
import { InboxHeader } from './InboxHeader';
import { AccountBar } from './AccountBar';
import { FolderList } from './FolderList';
import { MessageList } from './MessageList';
import { MessageView } from './MessageView';
import { ComposeModal } from './ComposeModal';
import { AccountSetup } from './AccountSetup';
import { CalendarSuggestionModal } from './CalendarSuggestionModal';
import { ContactDetailModal } from './ContactDetailModal';
import { useThemeStyles } from '@/lib/theme';
import { INBOX_MODULE_INFO } from '../constants';
import { ModuleSettingsButton } from '@/components/agent';

// --------------------------------------------
// Fehlermeldungen für OAuth-Probleme
// --------------------------------------------

const ERROR_MESSAGES: Record<string, { title: string; message: string }> = {
  oauth_not_configured: {
    title: 'OAuth nicht konfiguriert',
    message: 'Die OAuth-Anmeldung ist noch nicht eingerichtet. Bitte füge die entsprechenden API-Schlüssel in der .env Datei hinzu (GOOGLE_CLIENT_ID/SECRET oder MICROSOFT_CLIENT_ID/SECRET).',
  },
  oauth_start_failed: {
    title: 'Verbindungsfehler',
    message: 'Die Verbindung zum E-Mail-Anbieter konnte nicht hergestellt werden. Bitte versuche es später erneut.',
  },
  oauth_callback_failed: {
    title: 'Authentifizierung fehlgeschlagen',
    message: 'Die Anmeldung beim E-Mail-Anbieter ist fehlgeschlagen. Bitte versuche es erneut.',
  },
};

// --------------------------------------------
// Komponente: InboxPage
// Die Hauptseite mit drei-spaltigem Layout
// --------------------------------------------

export function InboxPage() {
  const selectedMessageId = useInboxStore((state) => state.selectedMessageId);
  const accounts = useInboxStore((state) => state.accounts);
  const searchParams = useSearchParams();
  
  // Fehler-State aus URL-Parametern
  const [errorInfo, setErrorInfo] = useState<{ title: string; message: string } | null>(null);
  
  // Store-Actions
  const setAccounts = useInboxStore((state) => state.setAccounts);
  const setMessages = useInboxStore((state) => state.setMessages);
  const setSyncing = useInboxStore((state) => state.setSyncing);
  const setLastSyncAt = useInboxStore((state) => state.setLastSyncAt);
  const fetchLabels = useInboxStore((state) => state.fetchLabels);

  // Daten von der API laden
  const loadData = async () => {
    try {
      // Konten laden
      const accountsRes = await fetch('/api/inbox/accounts');
      if (accountsRes.ok) {
        const { accounts: loadedAccounts } = await accountsRes.json();
        setAccounts(loadedAccounts || []);
      }
      
      // Nachrichten laden (alle Ordner mit folder=all)
      const messagesRes = await fetch('/api/inbox/messages?folder=all&limit=500');
      if (messagesRes.ok) {
        const { messages: loadedMessages } = await messagesRes.json();
        setMessages(loadedMessages || []);
      }
      
      // Labels laden
      await fetchLabels();
    } catch (err) {
      console.error('Fehler beim Laden der Inbox-Daten:', err);
    }
  };

  // Store beim ersten Render hydratisieren und Daten laden
  useEffect(() => {
    hydrateInboxStore();
    loadData(); // Daten von API laden
    
    // Prüfe auf Fehler in URL-Parametern
    const error = searchParams.get('error');
    const provider = searchParams.get('provider');
    const success = searchParams.get('success');
    
    if (error && ERROR_MESSAGES[error]) {
      const errorData = ERROR_MESSAGES[error];
      setErrorInfo({
        title: errorData.title,
        message: provider 
          ? errorData.message.replace('E-Mail-Anbieter', provider === 'gmail' ? 'Google' : 'Microsoft')
          : errorData.message,
      });
      
      // URL aufräumen (Fehler-Parameter entfernen)
      window.history.replaceState({}, '', '/inbox');
    }
    
    // Bei erfolgreicher Verbindung: Sync starten und Daten neu laden
    if (success === 'gmail_connected' || success === 'outlook_connected') {
      setSyncing(true);
      fetch('/api/inbox/sync', { method: 'POST' })
        .then(() => {
          setLastSyncAt(new Date().toISOString());
          loadData(); // Nach Sync Daten neu laden
        })
        .catch(console.error)
        .finally(() => setSyncing(false));
      
      // URL aufräumen
      window.history.replaceState({}, '', '/inbox');
    }
  }, [searchParams]);

  return (
    // h-full für volle verfügbare Höhe (Shell kümmert sich um Chatbar-Freiraum)
    <div className="flex h-full flex-col p-4" data-agent-panel="inbox-root">
      {/* ----------------------------------------
          Fehleranzeige (wenn OAuth fehlschlägt)
          ---------------------------------------- */}
      <AnimatePresence>
        {errorInfo && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-4 rounded-2xl bg-[var(--accent-warning)]/10 p-4"
            style={{ border: '1px solid rgba(245, 158, 11, 0.2)' }}
          >
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-[var(--accent-warning)]/20 p-2">
                <svg className="h-5 w-5 text-[var(--accent-warning)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-[var(--accent-warning)]">{errorInfo.title}</h4>
                <p className="mt-1 text-sm text-white/60">{errorInfo.message}</p>
              </div>
              <button
                onClick={() => setErrorInfo(null)}
                className="rounded-lg p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----------------------------------------
          Seiten-Header
          Mit Suche und Aktionen
          ---------------------------------------- */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <InboxHeader />
      </motion.div>

      {/* ----------------------------------------
          Konto-Leiste (AccountBar)
          Zeigt Konto-Icons mit Labels
          ---------------------------------------- */}
      {accounts.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.15 }}
          className="mb-3 flex items-center gap-3"
        >
          <span className="text-xs font-medium uppercase tracking-wider opacity-40">
            Konten
          </span>
          <AccountBar />
        </motion.div>
      )}

      {/* ----------------------------------------
          Haupt-Content
          Drei-Spalten-Layout: Ordner | Liste | Details
          ---------------------------------------- */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-1 gap-4 overflow-hidden rounded-2xl"
      >
        {/* Ordner-Sidebar (schmal) */}
        <div className="w-48 shrink-0">
          <FolderList />
        </div>

        {/* Nachrichtenliste (mittel) */}
        <div className="w-80 shrink-0">
          <MessageList />
        </div>

        {/* Nachrichtenansicht (expandiert) */}
        <div className="flex-1">
          {selectedMessageId ? (
            <MessageView />
          ) : (
            <EmptyState hasAccounts={accounts.length > 0} />
          )}
        </div>
      </motion.div>

      {/* ----------------------------------------
          Modals
          ---------------------------------------- */}
      <ComposeModal />
      <AccountSetup />
      <CalendarSuggestionModal />
      <ContactDetailModal />
      
      {/* Agent Settings Button */}
      <ModuleSettingsButton
        moduleId={INBOX_MODULE_INFO.id}
        moduleName={INBOX_MODULE_INFO.name}
        moduleColor={INBOX_MODULE_INFO.color}
      />
    </div>
  );
}

// --------------------------------------------
// EmptyState Komponente
// Wird angezeigt wenn keine Nachricht ausgewählt ist
// --------------------------------------------

function EmptyState({ hasAccounts }: { hasAccounts: boolean }) {
  const openAccountSetup = useInboxStore((state) => state.openAccountSetup);
  const { surface, button, accentColor, designStyle } = useThemeStyles();

  return (
    <div 
      className="flex h-full flex-col items-center justify-center p-8"
      style={surface.base}
    >
      <div 
        className="mb-4 p-6"
        style={{
          ...button.base,
          borderRadius: designStyle === 'brutal' ? '0.5rem' : '9999px',
        }}
      >
        <svg
          className="h-12 w-12 text-white/40"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>
      
      <h3 className="mb-2 text-lg font-medium text-white">
        {hasAccounts 
          ? 'Keine Nachricht ausgewählt' 
          : 'Willkommen im Postfach'
        }
      </h3>
      
      <p className="mb-6 max-w-md text-center text-sm text-white/60">
        {hasAccounts 
          ? 'Wähle eine Nachricht aus der Liste aus, um sie hier anzuzeigen.'
          : 'Verbinde dein erstes E-Mail-Konto, um Nachrichten zu empfangen.'
        }
      </p>
      
      {!hasAccounts && (
        <button
          onClick={openAccountSetup}
          className="px-6 py-3 font-medium text-white transition-all"
          style={{
            background: accentColor,
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
            border: designStyle === 'brutal' ? '2px solid #000' : 'none',
            boxShadow: designStyle === 'brutal' ? '3px 3px 0 #000' : 'none',
          }}
        >
          E-Mail-Konto verbinden
        </button>
      )}
    </div>
  );
}

