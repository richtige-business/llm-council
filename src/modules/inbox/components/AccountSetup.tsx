// ============================================
// AccountSetup.tsx - Modal zum Verbinden von E-Mail-Konten
// 
// Zweck: OAuth für Gmail/Outlook oder IMAP-Credentials eingeben
// Verwendet von: InboxPage.tsx
// ============================================

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInboxStore } from '../store';
import { PROVIDERS } from '../constants';
import { KNOWN_PROVIDERS } from '@/lib/email/providers';
import { useThemeStyles } from '@/lib/theme';

// --------------------------------------------
// Komponente: AccountSetup
// --------------------------------------------

export function AccountSetup() {
  const isOpen = useInboxStore((state) => state.isAccountSetupOpen);
  const closeAccountSetup = useInboxStore((state) => state.closeAccountSetup);
  const accounts = useInboxStore((state) => state.accounts);
  const removeAccount = useInboxStore((state) => state.removeAccount);
  
  // Theme-Styles für dynamisches Design
  const { container, designStyle } = useThemeStyles();

  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [isImapForm, setIsImapForm] = useState(false);

  // IMAP Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Provider auswählen
  const handleProviderSelect = (providerId: string) => {
    const provider = PROVIDERS.find(p => p.id === providerId);
    
    if (provider?.authUrl) {
      // OAuth - direkt weiterleiten
      window.location.href = provider.authUrl;
    } else {
      // IMAP - Formular anzeigen
      setSelectedProvider(providerId);
      setIsImapForm(true);
    }
  };

  // IMAP-Konto verbinden
  const handleImapConnect = async () => {
    if (!email || !password) {
      setError('E-Mail und Passwort sind erforderlich');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const response = await fetch('/api/inbox/oauth/imap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          displayName: displayName || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Verbindung fehlgeschlagen');
      }

      // Erfolgreich - Modal schließen
      handleClose();
      
      // Seite neu laden um Account zu aktualisieren
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIsConnecting(false);
    }
  };

  // Konto entfernen
  const handleRemoveAccount = async (accountId: string) => {
    if (!confirm('Möchtest du dieses Konto wirklich entfernen?')) return;

    try {
      await fetch(`/api/inbox/accounts?id=${accountId}`, {
        method: 'DELETE',
      });
      
      removeAccount(accountId);
    } catch (err) {
      console.error('Fehler beim Entfernen:', err);
    }
  };

  // Modal schließen und zurücksetzen
  const handleClose = () => {
    closeAccountSetup();
    setSelectedProvider(null);
    setIsImapForm(false);
    setEmail('');
    setPassword('');
    setDisplayName('');
    setError(null);
  };

  // Provider-Domain erkennen
  const detectedProvider = email 
    ? KNOWN_PROVIDERS[email.split('@')[1]?.toLowerCase()]
    : null;

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="fixed left-1/2 top-1/2 z-[var(--z-modal)] w-full max-w-lg -translate-x-1/2 -translate-y-1/2"
          >
            <div 
              className="overflow-hidden shadow-2xl"
              style={{
                // Dynamisches Styling basierend auf Design-Stil
                background: designStyle === 'glass' 
                  ? 'rgba(20, 20, 28, 0.95)' 
                  : designStyle === 'brutal'
                  ? '#2a2a3c'
                  : '#1a1a24',
                backdropFilter: designStyle === 'glass' ? 'blur(40px) saturate(150%)' : 'none',
                WebkitBackdropFilter: designStyle === 'glass' ? 'blur(40px) saturate(150%)' : 'none',
                border: designStyle === 'brutal' 
                  ? '3px solid #000' 
                  : '1px solid rgba(255, 255, 255, 0.15)',
                boxShadow: designStyle === 'brutal'
                  ? '6px 6px 0 #000'
                  : '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                borderRadius: designStyle === 'brutal' ? '0.75rem' : '1rem',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <h3 className="text-lg font-semibold text-white">
                  {isImapForm ? 'IMAP-Konto verbinden' : 'E-Mail-Konto hinzufügen'}
                </h3>
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
                {!isImapForm ? (
                  <>
                    {/* Provider-Auswahl */}
                    <p className="mb-6 text-sm text-white/60">
                      Wähle deinen E-Mail-Anbieter um dein Konto zu verbinden.
                    </p>

                    <div className="mb-6 space-y-3">
                      {PROVIDERS.map((provider) => (
                        <motion.button
                          key={provider.id}
                          onClick={() => handleProviderSelect(provider.id)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex w-full items-center gap-4 rounded-xl p-4 text-left transition-colors hover:bg-white/10"
                          style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                        >
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-lg"
                            style={{ backgroundColor: `${provider.color}20` }}
                          >
                            <svg 
                              className="h-5 w-5" 
                              fill="none" 
                              viewBox="0 0 24 24" 
                              stroke={provider.color}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-medium text-white">
                              {provider.name}
                            </h4>
                            <p className="text-sm text-white/50">
                              {provider.description}
                            </p>
                          </div>
                          <svg className="ml-auto h-5 w-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </motion.button>
                      ))}
                    </div>

                    {/* Verbundene Konten */}
                    {accounts.length > 0 && (
                      <div>
                        <h4 className="mb-3 text-sm font-medium text-white/50">
                          Verbundene Konten ({accounts.length})
                        </h4>
                        <div className="space-y-2">
                          {accounts.map((account) => (
                            <div
                              key={account.id}
                              className="flex items-center justify-between rounded-xl px-4 py-3"
                              style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`h-2 w-2 rounded-full ${account.isActive ? 'bg-[var(--accent-success)]' : 'bg-[var(--accent-danger)]'}`} />
                                <div>
                                  <p className="text-sm font-medium text-white">
                                    {account.displayName || account.email}
                                  </p>
                                  <p className="text-xs text-white/50">
                                    {account.provider} • {account.email}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveAccount(account.id)}
                                className="rounded-lg p-2 text-white/50 transition-colors hover:bg-[var(--accent-danger)]/10 hover:text-[var(--accent-danger)]"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* IMAP Form */}
                    <button
                      onClick={() => setIsImapForm(false)}
                      className="mb-4 flex items-center gap-2 text-sm text-white/50 hover:text-white"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Zurück
                    </button>

                    {/* Error */}
                    {error && (
                      <div className="mb-4 rounded-xl bg-[var(--accent-danger)]/10 px-4 py-3 text-sm text-[var(--accent-danger)]">
                        {error}
                      </div>
                    )}

                    {/* E-Mail */}
                    <div className="mb-4">
                      <label className="mb-1.5 block text-sm text-white/50">
                        E-Mail-Adresse
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="deine@email.de"
                        className="w-full rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                        style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                      />
                      {detectedProvider && (
                        <p className="mt-1.5 text-xs text-[var(--accent-success)]">
                          ✓ {detectedProvider.name} erkannt - Server werden automatisch konfiguriert
                        </p>
                      )}
                    </div>

                    {/* Passwort */}
                    <div className="mb-4">
                      <label className="mb-1.5 block text-sm text-white/50">
                        Passwort
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                        style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                      />
                      <p className="mt-1.5 text-xs text-white/40">
                        Bei einigen Anbietern benötigst du ein App-Passwort
                      </p>
                    </div>

                    {/* Anzeigename (optional) */}
                    <div className="mb-6">
                      <label className="mb-1.5 block text-sm text-white/50">
                        Anzeigename (optional)
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="z.B. Arbeit oder Privat"
                        className="w-full rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                        style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                      />
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setIsImapForm(false)}
                        className="rounded-xl px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        Abbrechen
                      </button>
                      <button
                        onClick={handleImapConnect}
                        disabled={!email || !password || isConnecting}
                        className="flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-[var(--accent-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isConnecting ? (
                          <>
                            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Verbinde...
                          </>
                        ) : (
                          'Verbinden'
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

