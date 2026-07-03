// ============================================
// InboxHeader.tsx - Header des Postfachs
// 
// Zweck: Suche, Filter, Sync-Button, Neue E-Mail Button
// Verwendet von: InboxPage.tsx
// ============================================

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useInboxStore, usePendingSuggestionsCount, useUrgentMessagesCount } from '../store';
import { FilterDropdown } from './FilterDropdown';
import { useThemeStyles } from '@/lib/theme';

// --------------------------------------------
// Komponente: InboxHeader
// --------------------------------------------

export function InboxHeader() {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const searchQuery = useInboxStore((state) => state.searchQuery);
  const setSearchQuery = useInboxStore((state) => state.setSearchQuery);
  const isSyncing = useInboxStore((state) => state.isSyncing);
  const lastSyncAt = useInboxStore((state) => state.lastSyncAt);
  const syncAllFolders = useInboxStore((state) => state.syncAllFolders);
  const openCompose = useInboxStore((state) => state.openCompose);
  const openAccountSetup = useInboxStore((state) => state.openAccountSetup);
  const accounts = useInboxStore((state) => state.accounts);
  
  // Theme-Styles
  const { surface, input, accentColor, designStyle, surfaceColor, textColor } = useThemeStyles();
  
  // Zähler für Badges
  const pendingSuggestionsCount = usePendingSuggestionsCount();
  const urgentMessagesCount = useUrgentMessagesCount();

  // Formatiere letzte Sync-Zeit
  const formatLastSync = () => {
    if (!lastSyncAt) return 'Nie synchronisiert';
    const date = new Date(lastSyncAt);
    return `Zuletzt: ${date.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`;
  };

  return (
    <div className="mb-4 flex items-center justify-between">
      {/* ----------------------------------------
          Linke Seite: Titel, Badges und Suchfeld
          ---------------------------------------- */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold" style={{ color: textColor }}>
            Postfach
          </h1>
          
          {/* Dringende Nachrichten Badge */}
          {urgentMessagesCount > 0 && (
            <span className="flex h-6 items-center gap-1 rounded-full bg-red-500/20 px-2 text-xs font-medium text-red-400">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {urgentMessagesCount}
            </span>
          )}
          
          {/* Terminvorschläge Badge */}
          {pendingSuggestionsCount > 0 && (
            <span className="flex h-6 items-center gap-1 rounded-full bg-[var(--accent-primary)]/20 px-2 text-xs font-medium text-[var(--accent-primary)]">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {pendingSuggestionsCount} Termin{pendingSuggestionsCount > 1 ? 'e' : ''}
            </span>
          )}
        </div>
        
        {/* Suchfeld */}
        <div className="relative">
          <motion.div
            animate={{ 
              width: isSearchFocused ? 320 : 240,
              boxShadow: isSearchFocused 
                ? `0 0 0 2px ${accentColor}` 
                : '0 0 0 0px transparent'
            }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
            style={{ 
              ...input.base,
              borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
            }}
          >
            <div className="flex items-center px-3">
              {/* Search Icon */}
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ color: textColor, opacity: 0.4 }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              
              <input
                type="text"
                placeholder="Nachrichten durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                data-agent-input="inbox-search"
                className="w-full bg-transparent px-3 py-2 text-sm focus:outline-none"
                style={{ color: textColor }}
              />
              
              {/* Clear Button */}
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="rounded p-1"
                  style={{ color: textColor, opacity: 0.4 }}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ----------------------------------------
          Rechte Seite: Filter und Aktionen
          ---------------------------------------- */}
      <div className="flex items-center gap-3">
        {/* Filter Dropdown */}
        <FilterDropdown />
        
        {/* Sync Button - Klickbar zum manuellen Synchronisieren */}
        <button
          onClick={() => !isSyncing && syncAllFolders()}
          disabled={isSyncing}
          className="flex items-center gap-2 px-3 py-1.5 text-sm transition-all hover:opacity-80 disabled:cursor-not-allowed"
          style={{ 
            color: textColor, 
            opacity: isSyncing ? 0.3 : 0.6,
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
          }}
          title="Klicken zum Synchronisieren"
        >
          <motion.div
            animate={{ rotate: isSyncing ? 360 : 0 }}
            transition={{ duration: 1, repeat: isSyncing ? Infinity : 0, ease: 'linear' }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </motion.div>
          <span>{isSyncing ? 'Synchronisiere...' : formatLastSync()}</span>
        </button>

        {/* Konto hinzufügen */}
        <button
          onClick={openAccountSetup}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all"
          style={{ 
            background: surfaceColor,
            color: textColor,
            opacity: 0.7,
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
            border: designStyle === 'brutal' ? '2px solid #000' : 'none',
            boxShadow: designStyle === 'brutal' ? '2px 2px 0 #000' : 'none',
          }}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Konto ({accounts.length})</span>
        </button>

        {/* Neue E-Mail */}
        <button
          onClick={() => openCompose()}
          data-agent-button="inbox-compose"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-all"
          style={{
            background: accentColor,
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
            border: designStyle === 'brutal' ? '2px solid #000' : 'none',
            boxShadow: designStyle === 'brutal' ? '3px 3px 0 #000' : 'none',
          }}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <span>Verfassen</span>
        </button>
      </div>
    </div>
  );
}

