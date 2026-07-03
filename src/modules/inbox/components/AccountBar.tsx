// ============================================
// AccountBar.tsx - Konto-Übersicht in der Header-Leiste
// 
// Zweck: Zeigt alle verbundenen E-Mail-Konten als kleine Avatare
//        Mit Konto-Labels (Privat, Business, Education)
//        Klick öffnet Dropdown mit Label-Zuweisung und Entfernen-Option
// Verwendet von: InboxPage.tsx
// ============================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { useInboxStore } from '../store';
import { useThemeStyles } from '@/lib/theme';
import type { EmailAccount, AccountLabel } from '../types';

// --------------------------------------------
// Hilfsfunktion: Initiale aus E-Mail extrahieren
// --------------------------------------------

function getInitials(email: string, displayName: string | null): string {
  if (displayName) {
    const parts = displayName.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return displayName.substring(0, 2).toUpperCase();
  }
  // Aus E-Mail: erster Teil vor @
  const local = email.split('@')[0];
  return local.substring(0, 2).toUpperCase();
}

// --------------------------------------------
// Hilfsfunktion: Provider-Icon
// --------------------------------------------

function getProviderIcon(provider: string): string {
  switch (provider) {
    case 'gmail': return '📧';
    case 'outlook': return '📨';
    case 'imap': return '✉️';
    default: return '📬';
  }
}

// --------------------------------------------
// Komponente: AccountBar
// --------------------------------------------

export function AccountBar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Store
  const accounts = useInboxStore((state) => state.accounts);
  const accountLabels = useInboxStore((state) => state.accountLabels);
  const filters = useInboxStore((state) => state.filters);
  const setFilter = useInboxStore((state) => state.setFilter);
  const fetchAccountLabels = useInboxStore((state) => state.fetchAccountLabels);
  const updateAccountLabel = useInboxStore((state) => state.updateAccountLabel);
  const createAccountLabel = useInboxStore((state) => state.createAccountLabel);
  const removeAccount = useInboxStore((state) => state.removeAccount);
  
  // Theme
  const { surface, accentColor, designStyle, surfaceColor, textColor } = useThemeStyles();
  
  // Labels beim Mounten laden
  useEffect(() => {
    fetchAccountLabels();
  }, [fetchAccountLabels]);

  // Klick außerhalb schließt Dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setSelectedAccountId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Konto-Auswahl für Filterung
  const handleAccountClick = (accountId: string) => {
    // Wenn bereits ausgewählt, Filter zurücksetzen
    if (filters.provider === accountId) {
      setFilter('provider', 'all');
    } else {
      // Filter auf dieses Konto setzen (wir nutzen accountId als temporären Workaround)
      // In der Praxis würde man einen separaten Filter für accountId haben
      setSelectedAccountId(accountId);
      setIsDropdownOpen(true);
    }
  };

  // Label zu Konto zuweisen
  const handleAssignLabel = async (accountId: string, labelId: string | null) => {
    await updateAccountLabel(accountId, labelId);
    setSelectedAccountId(null);
    setIsDropdownOpen(false);
  };

  // Neues Label erstellen
  const handleCreateLabel = async () => {
    const name = window.prompt('Name des neuen Labels:');
    if (name && name.trim()) {
      try {
        await createAccountLabel(name.trim(), '#6366f1');
      } catch {
        // Fehler wird im Store geloggt
      }
    }
  };

  // Konto entfernen
  const handleRemoveAccount = async (accountId: string, email: string) => {
    if (!confirm(`Möchtest du das Konto "${email}" wirklich entfernen?\n\nAlle zugehörigen Nachrichten werden gelöscht.`)) {
      return;
    }

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/inbox/accounts?id=${accountId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Konto aus dem Store entfernen
        removeAccount(accountId);
        setSelectedAccountId(null);
        setIsDropdownOpen(false);
      } else {
        const error = await response.json();
        alert(`Fehler: ${error.error || 'Konto konnte nicht entfernt werden'}`);
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      alert('Fehler beim Entfernen des Kontos');
    } finally {
      setIsDeleting(false);
    }
  };

  if (accounts.length === 0) {
    return null; // Nichts anzeigen wenn keine Konten
  }

  return (
    <div ref={dropdownRef} className="relative flex items-center gap-1">
      {/* Konto-Avatare */}
      {accounts.map((account) => (
        <AccountAvatar
          key={account.id}
          account={account}
          isSelected={selectedAccountId === account.id}
          onClick={() => handleAccountClick(account.id)}
          designStyle={designStyle}
          surfaceColor={surfaceColor}
          textColor={textColor}
          accentColor={accentColor}
        />
      ))}

      {/* Dropdown für Label-Zuweisung */}
      <AnimatePresence>
        {isDropdownOpen && selectedAccountId && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full z-50 mt-2 min-w-48 p-3 shadow-xl"
            style={{
              background: designStyle === 'glass' 
                ? 'rgba(15, 23, 42, 0.92)' 
                : surfaceColor,
              backdropFilter: 'blur(24px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
            }}
          >
            {/* Account Info */}
            <div className="mb-3 border-b border-white/10 pb-3">
              <p className="text-sm font-medium" style={{ color: textColor }}>
                {accounts.find(a => a.id === selectedAccountId)?.email}
              </p>
              <p className="text-xs opacity-50" style={{ color: textColor }}>
                Label zuweisen
              </p>
            </div>

            {/* Label-Liste */}
            <div className="flex flex-col gap-1">
              {/* Kein Label Option */}
              <LabelOption
                label={null}
                isSelected={!accounts.find(a => a.id === selectedAccountId)?.labelId}
                onClick={() => handleAssignLabel(selectedAccountId, null)}
                designStyle={designStyle}
                surfaceColor={surfaceColor}
                textColor={textColor}
                accentColor={accentColor}
              />
              
              {/* Vorhandene Labels */}
              {accountLabels.map((label) => (
                <LabelOption
                  key={label.id}
                  label={label}
                  isSelected={accounts.find(a => a.id === selectedAccountId)?.labelId === label.id}
                  onClick={() => handleAssignLabel(selectedAccountId, label.id)}
                  designStyle={designStyle}
                  surfaceColor={surfaceColor}
                  textColor={textColor}
                  accentColor={accentColor}
                />
              ))}
            </div>

            {/* Neues Label erstellen */}
            <button
              onClick={handleCreateLabel}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg p-2 text-xs font-medium transition-colors hover:bg-white/10"
              style={{ color: accentColor }}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Neues Label
            </button>

            {/* Sync-Fehler Hinweis */}
            {(() => {
              const selectedAccount = accounts.find(a => a.id === selectedAccountId);
              if (selectedAccount?.syncError) {
                return (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-500/10 p-2 text-xs text-amber-400 border border-amber-500/20">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Sync-Fehler – Konto neu verbinden empfohlen</span>
                  </div>
                );
              }
              return null;
            })()}

            {/* Konto entfernen */}
            <div className="mt-3 border-t border-white/10 pt-3">
              <button
                onClick={() => {
                  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
                  if (selectedAccount) {
                    handleRemoveAccount(selectedAccount.id, selectedAccount.email);
                  }
                }}
                disabled={isDeleting}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg p-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
              >
                {isDeleting ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Konto entfernen
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --------------------------------------------
// Komponente: AccountAvatar
// Einzelner Account-Avatar mit Label-Farbe
// --------------------------------------------

interface AccountAvatarProps {
  account: EmailAccount;
  isSelected: boolean;
  onClick: () => void;
  designStyle: 'glass' | 'brutal' | 'neo';
  surfaceColor: string;
  textColor: string;
  accentColor: string;
}

function AccountAvatar({
  account,
  isSelected,
  onClick,
  designStyle,
  surfaceColor,
  textColor,
  accentColor,
}: AccountAvatarProps) {
  const initials = getInitials(account.email, account.displayName);
  const labelColor = account.label?.color || surfaceColor;
  
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="group relative flex h-8 w-8 items-center justify-center text-xs font-semibold transition-all"
      style={{
        background: labelColor,
        color: '#fff',
        borderRadius: designStyle === 'brutal' ? '0.25rem' : '9999px',
        border: isSelected ? `2px solid ${accentColor}` : designStyle === 'brutal' ? '2px solid #000' : 'none',
        boxShadow: isSelected 
          ? `0 0 0 2px ${accentColor}40` 
          : designStyle === 'brutal' 
            ? '2px 2px 0 #000' 
            : '0 2px 8px rgba(0,0,0,0.15)',
      }}
      title={`${account.email}${account.label ? ` (${account.label.name})` : ''}`}
    >
      {initials}
      
      {/* Provider-Indikator */}
      <span 
        className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px]"
        style={{ 
          background: surfaceColor,
          border: '1px solid rgba(255,255,255,0.2)',
        }}
      >
        {getProviderIcon(account.provider)}
      </span>

      {/* Tooltip on hover */}
      <div 
        className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-2 py-1 text-[10px] opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          background: surfaceColor,
          color: textColor,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        {account.email}
      </div>
    </motion.button>
  );
}

// --------------------------------------------
// Komponente: LabelOption
// Label-Auswahl im Dropdown
// --------------------------------------------

interface LabelOptionProps {
  label: AccountLabel | null;
  isSelected: boolean;
  onClick: () => void;
  designStyle: 'glass' | 'brutal' | 'neo';
  surfaceColor: string;
  textColor: string;
  accentColor: string;
}

function LabelOption({
  label,
  isSelected,
  onClick,
  designStyle,
  surfaceColor,
  textColor,
  accentColor,
}: LabelOptionProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: designStyle === 'brutal' ? 1 : 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors"
      style={{
        background: isSelected ? `${accentColor}20` : 'transparent',
        color: textColor,
      }}
    >
      {/* Farb-Indikator */}
      <span 
        className="h-3 w-3 rounded-full"
        style={{ 
          background: label?.color || 'rgba(255,255,255,0.2)',
          border: !label ? '1px dashed rgba(255,255,255,0.3)' : 'none',
        }}
      />
      
      {/* Icon + Name */}
      <span className="flex items-center gap-1.5">
        {label?.icon && <span className="text-xs">{label.icon}</span>}
        <span>{label?.name || 'Kein Label'}</span>
      </span>
      
      {/* Checkmark wenn ausgewählt */}
      {isSelected && (
        <svg 
          className="ml-auto h-4 w-4" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
          style={{ color: accentColor }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </motion.button>
  );
}

