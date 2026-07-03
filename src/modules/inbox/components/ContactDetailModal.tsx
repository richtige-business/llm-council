// ============================================
// ContactDetailModal.tsx - Kontakt erstellen/bearbeiten Modal
// 
// Zweck: Modal zum Anlegen und Bearbeiten von Kontakten
//        Unterstützt mehrere E-Mail-Adressen und Account-Verknüpfungen
// Verwendet von: InboxPage.tsx, ContactsPanel.tsx
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInboxStore } from '../store';
import { useThemeStyles } from '@/lib/theme';
import type { Contact, MessageCategory, ContactEmail } from '../types';

// --------------------------------------------
// Interface für E-Mail-Formular-Daten
// --------------------------------------------

interface EmailFormData {
  id?: string;        // Nur bei existierenden E-Mails
  email: string;
  label: string;
  isPrimary: boolean;
  isNew?: boolean;    // Neue E-Mail (noch nicht gespeichert)
  toDelete?: boolean; // Zum Löschen markiert
}

// --------------------------------------------
// E-Mail-Label Optionen
// --------------------------------------------

const EMAIL_LABELS = ['Privat', 'Arbeit', 'Schule', 'Andere'];

// --------------------------------------------
// Komponente: ContactDetailModal
// --------------------------------------------

export function ContactDetailModal() {
  // Store
  const isOpen = useInboxStore((state) => state.isContactModalOpen);
  const selectedContact = useInboxStore((state) => state.selectedContact);
  const closeContactModal = useInboxStore((state) => state.closeContactModal);
  const createContact = useInboxStore((state) => state.createContact);
  const updateContact = useInboxStore((state) => state.updateContact);
  const removeContact = useInboxStore((state) => state.removeContact);
  const accounts = useInboxStore((state) => state.accounts);
  
  // Theme
  const { surface, accentColor, designStyle, surfaceColor, textColor } = useThemeStyles();
  
  // Formular-State
  const [formData, setFormData] = useState({
    name: '',
    category: 'unknown' as MessageCategory | 'unknown',
    company: '',
    phone: '',
    notes: '',
    isFavorite: false,
  });
  
  // E-Mails State (mehrere)
  const [emails, setEmails] = useState<EmailFormData[]>([
    { email: '', label: 'Andere', isPrimary: true, isNew: true }
  ]);
  
  // Verknüpfte Accounts
  const [linkedAccountIds, setLinkedAccountIds] = useState<string[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'emails' | 'accounts'>('info');

  // Formular initialisieren wenn Kontakt ausgewählt
  useEffect(() => {
    if (selectedContact) {
      setFormData({
        name: selectedContact.name || '',
        category: selectedContact.category,
        company: selectedContact.company || '',
        phone: selectedContact.phone || '',
        notes: selectedContact.notes || '',
        isFavorite: selectedContact.isFavorite,
      });
      
      // E-Mails laden
      if (selectedContact.emails && selectedContact.emails.length > 0) {
        setEmails(selectedContact.emails.map(e => ({
          id: e.id,
          email: e.email,
          label: e.label,
          isPrimary: e.isPrimary,
        })));
      } else if (selectedContact.email) {
        // Fallback: Alte Struktur mit einzelner E-Mail
        setEmails([{ 
          email: selectedContact.email, 
          label: 'Andere', 
          isPrimary: true 
        }]);
      }
      
      // Verknüpfte Accounts laden
      if (selectedContact.linkedAccounts) {
        setLinkedAccountIds(selectedContact.linkedAccounts.map(la => la.accountId));
      }
    } else {
      // Reset für neuen Kontakt
      setFormData({
        name: '',
        category: 'unknown',
        company: '',
        phone: '',
        notes: '',
        isFavorite: false,
      });
      setEmails([{ email: '', label: 'Andere', isPrimary: true, isNew: true }]);
      setLinkedAccountIds([]);
    }
    setError(null);
    setActiveTab('info');
  }, [selectedContact, isOpen]);

  // E-Mail hinzufügen
  const addEmail = () => {
    setEmails([...emails, { email: '', label: 'Andere', isPrimary: false, isNew: true }]);
  };

  // E-Mail entfernen
  const removeEmail = (index: number) => {
    const email = emails[index];
    if (email.id) {
      // Existierende E-Mail zum Löschen markieren
      setEmails(emails.map((e, i) => i === index ? { ...e, toDelete: true } : e));
    } else {
      // Neue E-Mail direkt entfernen
      setEmails(emails.filter((_, i) => i !== index));
    }
    
    // Wenn primäre gelöscht wird, erste verbleibende zur primären machen
    const remaining = emails.filter((_, i) => i !== index && !emails[i].toDelete);
    if (email.isPrimary && remaining.length > 0) {
      const firstIndex = emails.findIndex((e, i) => i !== index && !e.toDelete);
      if (firstIndex >= 0) {
        setEmails(prev => prev.map((e, i) => ({ 
          ...e, 
          isPrimary: i === firstIndex 
        })));
      }
    }
  };

  // E-Mail aktualisieren
  const updateEmail = (index: number, field: keyof EmailFormData, value: string | boolean) => {
    setEmails(emails.map((e, i) => {
      if (i !== index) {
        // Wenn diese zur primären wird, andere auf nicht-primär setzen
        if (field === 'isPrimary' && value === true) {
          return { ...e, isPrimary: false };
        }
        return e;
      }
      return { ...e, [field]: value };
    }));
  };

  // Account verknüpfen/trennen
  const toggleAccount = (accountId: string) => {
    if (linkedAccountIds.includes(accountId)) {
      setLinkedAccountIds(linkedAccountIds.filter(id => id !== accountId));
    } else {
      setLinkedAccountIds([...linkedAccountIds, accountId]);
    }
  };

  // Formular absenden
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validiere E-Mails
    const validEmails = emails.filter(e => !e.toDelete && e.email.trim());
    if (validEmails.length === 0) {
      setError('Mindestens eine E-Mail-Adresse ist erforderlich');
      setIsSubmitting(false);
      return;
    }

    try {
      if (selectedContact) {
        // Kontakt aktualisieren
        const addEmails = emails.filter(e => e.isNew && !e.toDelete && e.email.trim());
        const removeEmailIds = emails.filter(e => e.id && e.toDelete).map(e => e.id!);
        const updateEmails = emails
          .filter(e => e.id && !e.isNew && !e.toDelete)
          .map(e => ({ id: e.id!, label: e.label, isPrimary: e.isPrimary }));
        
        // Original Account-IDs
        const originalAccountIds = selectedContact.linkedAccounts?.map(la => la.accountId) || [];
        const addAccountIds = linkedAccountIds.filter(id => !originalAccountIds.includes(id));
        const removeAccountIds = originalAccountIds.filter(id => !linkedAccountIds.includes(id));

        await updateContact(selectedContact.id, {
          name: formData.name || null,
          category: formData.category,
          company: formData.company || null,
          phone: formData.phone || null,
          notes: formData.notes || null,
          isFavorite: formData.isFavorite,
          addEmails: addEmails.length > 0 ? addEmails : undefined,
          removeEmailIds: removeEmailIds.length > 0 ? removeEmailIds : undefined,
          updateEmails: updateEmails.length > 0 ? updateEmails : undefined,
          addAccountIds: addAccountIds.length > 0 ? addAccountIds : undefined,
          removeAccountIds: removeAccountIds.length > 0 ? removeAccountIds : undefined,
        });
      } else {
        // Neuen Kontakt erstellen
        await createContact({
          emails: validEmails.map(e => ({
            email: e.email.trim(),
            label: e.label,
            isPrimary: e.isPrimary,
          })),
          name: formData.name || null,
          category: formData.category,
          company: formData.company || null,
          phone: formData.phone || null,
          notes: formData.notes || null,
          isFavorite: formData.isFavorite,
          linkedAccountIds: linkedAccountIds.length > 0 ? linkedAccountIds : undefined,
        });
      }
      closeContactModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Kontakt löschen
  const handleDelete = async () => {
    if (!selectedContact) return;
    
    if (confirm(`Möchtest du den Kontakt "${selectedContact.name || selectedContact.email}" wirklich löschen?`)) {
      try {
        removeContact(selectedContact.id);
        await fetch(`/api/inbox/contacts?id=${selectedContact.id}`, {
          method: 'DELETE',
        });
        closeContactModal();
      } catch {
        setError('Fehler beim Löschen des Kontakts');
      }
    }
  };

  if (!isOpen) return null;

  const visibleEmails = emails.filter(e => !e.toDelete);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={closeContactModal}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 p-4"
          >
            <div 
              className="max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl"
              style={{
                background: designStyle === 'glass' 
                  ? 'rgba(15, 23, 42, 0.92)' 
                  : surfaceColor,
                backdropFilter: 'blur(24px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <h2 className="text-lg font-semibold" style={{ color: textColor }}>
                  {selectedContact ? 'Kontakt bearbeiten' : 'Neuer Kontakt'}
                </h2>
                <button
                  onClick={closeContactModal}
                  className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
                  style={{ color: textColor, opacity: 0.6 }}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-white/10">
                {(['info', 'emails', 'accounts'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="flex-1 px-4 py-3 text-sm font-medium transition-colors"
                    style={{
                      color: activeTab === tab ? accentColor : textColor,
                      opacity: activeTab === tab ? 1 : 0.5,
                      borderBottom: activeTab === tab ? `2px solid ${accentColor}` : '2px solid transparent',
                    }}
                  >
                    {tab === 'info' && '📋 Info'}
                    {tab === 'emails' && `📧 E-Mails (${visibleEmails.length})`}
                    {tab === 'accounts' && `🔗 Accounts (${linkedAccountIds.length})`}
                  </button>
                ))}
              </div>

              {/* Fehlermeldung */}
              {error && (
                <div 
                  className="mx-6 mt-4 rounded-lg p-3 text-sm"
                  style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}
                >
                  {error}
                </div>
              )}

              {/* Formular */}
              <form onSubmit={handleSubmit} className="overflow-y-auto p-6" style={{ maxHeight: 'calc(85vh - 180px)' }}>
                
                {/* ============================================
                    TAB: Info
                    ============================================ */}
                {activeTab === 'info' && (
                  <div className="space-y-4">
                    {/* Name */}
                    <div>
                      <label className="mb-1 block text-xs font-medium" style={{ color: textColor, opacity: 0.6 }}>
                        Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Max Mustermann"
                        className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                        style={{ background: surfaceColor, color: textColor }}
                      />
                    </div>

                    {/* Kategorie */}
                    <div>
                      <label className="mb-1 block text-xs font-medium" style={{ color: textColor, opacity: 0.6 }}>
                        Kategorie
                      </label>
                      <div className="flex gap-2">
                        {(['unknown', 'private', 'business'] as const).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setFormData({ ...formData, category: cat })}
                            className="flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all"
                            style={{
                              background: formData.category === cat 
                                ? cat === 'private' ? '#10B981' 
                                  : cat === 'business' ? '#6366F1' 
                                  : surfaceColor
                                : surfaceColor,
                              color: formData.category === cat ? '#fff' : textColor,
                              opacity: formData.category === cat ? 1 : 0.6,
                            }}
                          >
                            {cat === 'private' ? '👤 Privat' : cat === 'business' ? '💼 Business' : '❓ Unbekannt'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Firma */}
                    <div>
                      <label className="mb-1 block text-xs font-medium" style={{ color: textColor, opacity: 0.6 }}>
                        Firma/Organisation
                      </label>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        placeholder="Firma GmbH"
                        className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                        style={{ background: surfaceColor, color: textColor }}
                      />
                    </div>

                    {/* Telefon */}
                    <div>
                      <label className="mb-1 block text-xs font-medium" style={{ color: textColor, opacity: 0.6 }}>
                        Telefon
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+49 123 456789"
                        className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                        style={{ background: surfaceColor, color: textColor }}
                      />
                    </div>

                    {/* Notizen */}
                    <div>
                      <label className="mb-1 block text-xs font-medium" style={{ color: textColor, opacity: 0.6 }}>
                        Notizen
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Zusätzliche Informationen..."
                        rows={3}
                        className="w-full resize-none rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                        style={{ background: surfaceColor, color: textColor }}
                      />
                    </div>

                    {/* Favorit */}
                    <label className="flex cursor-pointer items-center gap-2" style={{ color: textColor }}>
                      <input
                        type="checkbox"
                        checked={formData.isFavorite}
                        onChange={(e) => setFormData({ ...formData, isFavorite: e.target.checked })}
                        className="h-4 w-4 rounded"
                      />
                      <span className="text-sm">⭐ Als Favorit markieren</span>
                    </label>
                  </div>
                )}

                {/* ============================================
                    TAB: E-Mails
                    ============================================ */}
                {activeTab === 'emails' && (
                  <div className="space-y-3">
                    <p className="text-xs" style={{ color: textColor, opacity: 0.5 }}>
                      Füge mehrere E-Mail-Adressen hinzu und markiere eine als primär.
                    </p>
                    
                    {visibleEmails.map((email, index) => {
                      const actualIndex = emails.findIndex(e => e === email || (e.id && e.id === email.id));
                      return (
                        <div 
                          key={email.id || `new-${index}`}
                          className="rounded-lg p-3"
                          style={{ background: 'rgba(255,255,255,0.05)' }}
                        >
                          {/* E-Mail Input */}
                          <div className="mb-2 flex items-center gap-2">
                            <input
                              type="email"
                              value={email.email}
                              onChange={(e) => updateEmail(actualIndex, 'email', e.target.value)}
                              placeholder="email@beispiel.de"
                              className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                              style={{ background: surfaceColor, color: textColor }}
                              required
                            />
                            {visibleEmails.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeEmail(actualIndex)}
                                className="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-500/20"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                          
                          {/* Label & Primary */}
                          <div className="flex items-center gap-3">
                            <select
                              value={email.label}
                              onChange={(e) => updateEmail(actualIndex, 'label', e.target.value)}
                              className="rounded-lg px-2 py-1 text-xs focus:outline-none"
                              style={{ background: surfaceColor, color: textColor }}
                            >
                              {EMAIL_LABELS.map(label => (
                                <option key={label} value={label}>{label}</option>
                              ))}
                            </select>
                            
                            <label className="flex cursor-pointer items-center gap-1.5 text-xs" style={{ color: textColor }}>
                              <input
                                type="radio"
                                checked={email.isPrimary}
                                onChange={() => updateEmail(actualIndex, 'isPrimary', true)}
                                className="h-3 w-3"
                              />
                              Primär
                            </label>
                          </div>
                        </div>
                      );
                    })}

                    {/* E-Mail hinzufügen Button */}
                    <button
                      type="button"
                      onClick={addEmail}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-3 text-sm font-medium transition-colors hover:border-white/30"
                      style={{ borderColor: 'rgba(255,255,255,0.15)', color: textColor, opacity: 0.6 }}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      E-Mail hinzufügen
                    </button>
                  </div>
                )}

                {/* ============================================
                    TAB: Accounts
                    ============================================ */}
                {activeTab === 'accounts' && (
                  <div className="space-y-3">
                    <p className="text-xs" style={{ color: textColor, opacity: 0.5 }}>
                      Verknüpfe diesen Kontakt mit deinen E-Mail-Accounts.
                    </p>
                    
                    {accounts.length === 0 ? (
                      <div 
                        className="rounded-lg p-4 text-center text-sm"
                        style={{ background: 'rgba(255,255,255,0.05)', color: textColor, opacity: 0.5 }}
                      >
                        Keine E-Mail-Accounts verbunden.
                      </div>
                    ) : (
                      accounts.map((account) => (
                        <label
                          key={account.id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors hover:bg-white/5"
                          style={{ 
                            background: linkedAccountIds.includes(account.id) 
                              ? 'rgba(99, 102, 241, 0.1)' 
                              : 'rgba(255,255,255,0.03)',
                            border: linkedAccountIds.includes(account.id)
                              ? '1px solid rgba(99, 102, 241, 0.3)'
                              : '1px solid transparent',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={linkedAccountIds.includes(account.id)}
                            onChange={() => toggleAccount(account.id)}
                            className="h-4 w-4 rounded"
                          />
                          
                          {/* Provider Icon */}
                          <div 
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                            style={{ 
                              background: account.provider === 'gmail' ? '#EA4335' 
                                : account.provider === 'outlook' ? '#0078D4' 
                                : '#6B7280'
                            }}
                          >
                            {account.provider === 'gmail' ? '📧' : account.provider === 'outlook' ? '📨' : '✉️'}
                          </div>
                          
                          <div className="flex-1">
                            <div className="text-sm font-medium" style={{ color: textColor }}>
                              {account.displayName || account.email}
                            </div>
                            <div className="text-xs" style={{ color: textColor, opacity: 0.5 }}>
                              {account.email}
                            </div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                )}

                {/* Buttons */}
                <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                  {selectedContact ? (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-red-500/20"
                      style={{ color: '#EF4444' }}
                    >
                      Löschen
                    </button>
                  ) : (
                    <div />
                  )}
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={closeContactModal}
                      className="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-white/10"
                      style={{ color: textColor, opacity: 0.6 }}
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || visibleEmails.filter(e => e.email.trim()).length === 0}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
                      style={{ background: accentColor }}
                    >
                      {isSubmitting ? 'Speichern...' : selectedContact ? 'Speichern' : 'Erstellen'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
