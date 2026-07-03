// ============================================
// ComposeModal.tsx - Modal zum Verfassen von E-Mails
// 
// Zweck: Neue E-Mails schreiben oder auf bestehende antworten
//        PLUS: Generative UI - Agent kann E-Mails live tippen
// Verwendet von: InboxPage.tsx
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertCircle, Sparkles, Send } from 'lucide-react';
import { useInboxStore } from '../store';

// --------------------------------------------
// Komponente: ComposeModal
// --------------------------------------------

export function ComposeModal() {
  const isOpen = useInboxStore((state) => state.isComposeOpen);
  const replyTo = useInboxStore((state) => state.replyToMessage);
  const composeMode = useInboxStore((state) => state.composeMode);
  const closeCompose = useInboxStore((state) => state.closeCompose);
  const accounts = useInboxStore((state) => state.accounts);
  
  // Agent Compose State (Generative UI)
  const agentCompose = useInboxStore((state) => state.agentCompose);

  // Form State
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showCc, setShowCc] = useState(false);
  
  // Sync Agent Compose State zu lokalen Feldern
  useEffect(() => {
    if (agentCompose.isActive) {
      setTo(agentCompose.to);
      setSubject(agentCompose.subject);
      setBody(agentCompose.body);
      if (agentCompose.fromAccount) {
        setSelectedAccountId(agentCompose.fromAccount);
      }
    }
  }, [agentCompose.to, agentCompose.subject, agentCompose.body, agentCompose.fromAccount, agentCompose.isActive]);

  // Reply-To oder Forward initialisieren
  useEffect(() => {
    if (replyTo && composeMode === 'reply') {
      // Antwort-Modus: An den Absender schicken
      setTo(replyTo.sender);
      setSubject(`Re: ${replyTo.subject.replace(/^(Re:|Fwd:)\s*/gi, '')}`);
      setBody(`\n\n---\nAm ${new Date(replyTo.receivedAt).toLocaleString('de-DE')} schrieb ${replyTo.senderName || replyTo.sender}:\n\n${replyTo.body}`);
      if (replyTo.accountId) {
        setSelectedAccountId(replyTo.accountId);
      }
    } else if (replyTo && composeMode === 'forward') {
      // Weiterleiten-Modus: Empfänger leer, neuer Betreff
      setTo('');  // Leer - User muss Empfänger eingeben
      setSubject(`Fwd: ${replyTo.subject.replace(/^(Re:|Fwd:)\s*/gi, '')}`);
      setBody(`\n\n---------- Weitergeleitete Nachricht ----------\nVon: ${replyTo.senderName || replyTo.sender} <${replyTo.sender}>\nDatum: ${new Date(replyTo.receivedAt).toLocaleString('de-DE')}\nBetreff: ${replyTo.subject}\n\n${replyTo.body}`);
      if (replyTo.accountId) {
        setSelectedAccountId(replyTo.accountId);
      }
    } else {
      // Reset für neue E-Mail
      setTo('');
      setCc('');
      setSubject('');
      setBody('');
    }
  }, [replyTo, composeMode]);

  // Account auswählen wenn nur einer vorhanden
  useEffect(() => {
    if (accounts.length === 1 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  // Senden Handler
  const handleSend = async () => {
    if (!to || !subject || !selectedAccountId) return;

    setIsSending(true);
    
    try {
      // TODO: Hier würde die API aufgerufen werden
      // await sendEmail({ to, cc, subject, body, accountId: selectedAccountId });
      
      // Simuliere Senden
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      closeCompose();
    } catch (error) {
      console.error('Fehler beim Senden:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Modal schließen und zurücksetzen
  const handleClose = () => {
    closeCompose();
    setTo('');
    setCc('');
    setSubject('');
    setBody('');
    setShowCc(false);
  };

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
            data-agent-panel="inbox-compose"
            className="fixed left-1/2 top-1/2 z-[var(--z-modal)] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2"
          >
            <div className="glass overflow-hidden rounded-2xl shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[var(--glass-border)] px-6 py-4">
                <div className="flex items-center gap-3">
                  {/* AI Indicator */}
                  {agentCompose.isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500/20 to-blue-500/20 px-3 py-1"
                    >
                      <Sparkles className="h-4 w-4 text-violet-400 animate-pulse" />
                      <span className="text-xs font-medium text-violet-300">
                        {agentCompose.status === 'typing-to' && 'Empfänger eingeben...'}
                        {agentCompose.status === 'typing-subject' && 'Betreff schreiben...'}
                        {agentCompose.status === 'typing-body' && 'Nachricht verfassen...'}
                        {agentCompose.status === 'sending' && 'Wird gesendet...'}
                        {agentCompose.status === 'sent' && 'Gesendet!'}
                        {agentCompose.status === 'error' && 'Fehler!'}
                      </span>
                    </motion.div>
                  )}
                  
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    {agentCompose.isActive 
                      ? '✨ KI verfasst E-Mail'
                      : composeMode === 'forward' 
                        ? 'Weiterleiten' 
                        : composeMode === 'reply' 
                          ? 'Antworten' 
                          : 'Neue E-Mail'}
                  </h3>
                </div>
                
                {/* Status Icons */}
                {agentCompose.status === 'sent' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500"
                  >
                    <Check className="h-5 w-5 text-white" />
                  </motion.div>
                )}
                {agentCompose.status === 'error' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500"
                  >
                    <AlertCircle className="h-5 w-5 text-white" />
                  </motion.div>
                )}
                
                {!agentCompose.isActive && (
                  <button
                    onClick={handleClose}
                    className="rounded-lg p-2 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Form */}
              <div className="p-6">
                {/* Von (Account-Auswahl) */}
                {accounts.length > 1 && (
                  <div className="mb-4">
                    <label className="mb-1.5 block text-sm text-[var(--text-tertiary)]">
                      Von
                    </label>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="w-full rounded-xl bg-[var(--bg-elevated)] px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                    >
                      <option value="">Konto auswählen...</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.displayName || account.email} ({account.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* An */}
                <div className="mb-4">
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-sm text-[var(--text-tertiary)] flex items-center gap-2">
                      An
                      {agentCompose.status === 'typing-to' && (
                        <span className="flex gap-0.5">
                          <span className="h-1 w-1 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: '0ms' }} />
                          <span className="h-1 w-1 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: '150ms' }} />
                          <span className="h-1 w-1 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: '300ms' }} />
                        </span>
                      )}
                    </label>
                    {!showCc && !agentCompose.isActive && (
                      <button
                        onClick={() => setShowCc(true)}
                        className="text-xs text-white hover:underline"
                      >
                        CC hinzufügen
                      </button>
                    )}
                  </div>
                  <input
                    type="email"
                    value={to}
                    onChange={(e) => !agentCompose.isActive && setTo(e.target.value)}
                    placeholder="empfaenger@example.com"
                    readOnly={agentCompose.isActive}
                    data-agent-input="inbox-compose-to"
                    className={`w-full rounded-xl bg-[var(--bg-elevated)] px-4 py-2.5 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] ${
                      agentCompose.status === 'typing-to' ? 'ring-2 ring-violet-500/50 animate-pulse' : ''
                    }`}
                  />
                </div>

                {/* CC (optional) */}
                {showCc && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-4"
                  >
                    <label className="mb-1.5 block text-sm text-[var(--text-tertiary)]">
                      CC
                    </label>
                    <input
                      type="email"
                      value={cc}
                      onChange={(e) => setCc(e.target.value)}
                      placeholder="cc@example.com"
                      className="w-full rounded-xl bg-[var(--bg-elevated)] px-4 py-2.5 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                    />
                  </motion.div>
                )}

                {/* Betreff */}
                <div className="mb-4">
                  <label className="mb-1.5 block text-sm text-[var(--text-tertiary)] flex items-center gap-2">
                    Betreff
                    {agentCompose.status === 'typing-subject' && (
                      <span className="flex gap-0.5">
                        <span className="h-1 w-1 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: '0ms' }} />
                        <span className="h-1 w-1 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: '150ms' }} />
                        <span className="h-1 w-1 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: '300ms' }} />
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => !agentCompose.isActive && setSubject(e.target.value)}
                    placeholder="Betreff eingeben..."
                    readOnly={agentCompose.isActive}
                    data-agent-input="inbox-compose-subject"
                    className={`w-full rounded-xl bg-[var(--bg-elevated)] px-4 py-2.5 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] ${
                      agentCompose.status === 'typing-subject' ? 'ring-2 ring-violet-500/50 animate-pulse' : ''
                    }`}
                  />
                </div>

                {/* Body */}
                <div className="mb-6">
                  <label className="mb-1.5 block text-sm text-[var(--text-tertiary)] flex items-center gap-2">
                    Nachricht
                    {agentCompose.status === 'typing-body' && (
                      <span className="flex gap-0.5">
                        <span className="h-1 w-1 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: '0ms' }} />
                        <span className="h-1 w-1 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: '150ms' }} />
                        <span className="h-1 w-1 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: '300ms' }} />
                      </span>
                    )}
                  </label>
                  <textarea
                    value={body}
                    onChange={(e) => !agentCompose.isActive && setBody(e.target.value)}
                    placeholder="Deine Nachricht..."
                    rows={10}
                    readOnly={agentCompose.isActive}
                    data-agent-input="inbox-compose-body"
                    className={`w-full resize-none rounded-xl bg-[var(--bg-elevated)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] ${
                      agentCompose.status === 'typing-body' ? 'ring-2 ring-violet-500/50' : ''
                    }`}
                  />
                </div>
                
                {/* Send Progress für Agent */}
                {agentCompose.status === 'sending' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 flex items-center justify-center gap-3 rounded-xl bg-violet-500/10 p-4"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    >
                      <Send className="h-5 w-5 text-violet-400" />
                    </motion.div>
                    <span className="text-sm text-violet-300">E-Mail wird gesendet...</span>
                  </motion.div>
                )}
                
                {/* Success Message */}
                {agentCompose.status === 'sent' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    data-agent-state="inbox-compose-sent"
                    className="mb-4 flex items-center justify-center gap-3 rounded-xl bg-green-500/20 p-4"
                  >
                    <Check className="h-6 w-6 text-green-400" />
                    <span className="text-sm font-medium text-green-300">E-Mail erfolgreich gesendet!</span>
                  </motion.div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between">
                  {/* Attachment Button */}
                  <button className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    Anhang
                  </button>

                  {/* Send Buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleClose}
                      className="rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={!to || !subject || !selectedAccountId || isSending}
                      data-agent-button="inbox-compose-send"
                      className="flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-[var(--accent-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSending ? (
                        <>
                          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Wird gesendet...
                        </>
                      ) : (
                        <>
                          Senden
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}




