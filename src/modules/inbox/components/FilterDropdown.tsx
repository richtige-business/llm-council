// ============================================
// FilterDropdown.tsx - Erweiterte Filter für das Postfach
// 
// Zweck: Dropdown-Menü zum Filtern nach:
//        - Zeitraum (Heute, Gestern, Letzte X Tage, Kalender)
//        - Provider (Gmail, Outlook, IMAP)
//        - Kategorie (Privat, Geschäftlich)
//        - Dringlichkeit (Hoch, Normal, Niedrig)
//        - Terminvorschläge
//        - Kontakte (mit Suchfunktion)
// Verwendet von: InboxHeader.tsx
// ============================================

'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  useInboxStore, 
  useInboxFilters, 
  useHasActiveFilters,
  useInboxContacts,
  usePendingSuggestionsCount,
} from '../store';
import type { DatePreset } from '../types';
import { useThemeStyles } from '@/lib/theme';
import { DateFilterPopover } from './DateFilterPopover';

// --------------------------------------------
// Konstanten: Datums-Presets für Schnellanzeige
// --------------------------------------------

const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  today: 'Heute',
  yesterday: 'Gestern',
  last3days: 'Letzte 3 Tage',
  last7days: 'Letzte 7 Tage',
  last14days: 'Letzte 14 Tage',
  last30days: 'Letzte 30 Tage',
  thisMonth: 'Dieser Monat',
  lastMonth: 'Letzter Monat',
  all: 'Alle',
};

// --------------------------------------------
// Komponente: FilterDropdown
// --------------------------------------------

export function FilterDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const filters = useInboxFilters();
  const hasActiveFilters = useHasActiveFilters();
  const contacts = useInboxContacts();
  const pendingSuggestionsCount = usePendingSuggestionsCount();
  const accounts = useInboxStore((state) => state.accounts);
  
  const setFilter = useInboxStore((state) => state.setFilter);
  const resetFilters = useInboxStore((state) => state.resetFilters);
  const setDateFilter = useInboxStore((state) => state.setDateFilter);
  
  // Theme-Styles
  const { surface, accentColor, designStyle, surfaceColor, textColor } = useThemeStyles();
  
  // Gefilterte Kontakte (nach Suchbegriff)
  const filteredContacts = useMemo(() => {
    if (!contactSearchQuery.trim()) {
      // Ohne Suche: Favoriten zuerst, dann Top 5 nach Nachrichtenanzahl
      return [...contacts]
        .sort((a, b) => {
          if (a.isFavorite !== b.isFavorite) return b.isFavorite ? 1 : -1;
          return b.messageCount - a.messageCount;
        })
        .slice(0, 8);
    }
    
    // Mit Suche: Filter nach Name und E-Mail
    const query = contactSearchQuery.toLowerCase();
    return contacts
      .filter(c => 
        c.name?.toLowerCase().includes(query) || 
        c.email.toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [contacts, contactSearchQuery]);
  
  // Klick außerhalb schließt Dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Anzahl aktiver Filter berechnen
  const activeFilterCount = [
    filters.provider !== 'all',
    filters.category !== 'all',
    filters.contactId !== null,
    filters.urgency !== 'all',
    filters.hasCalendarAction !== null,
    filters.datePreset !== 'all' || filters.dateFrom !== null,
    filters.accountLabelId !== null,
  ].filter(Boolean).length;

  return (
    <div ref={dropdownRef} className="relative">
      {/* Filter-Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all"
        style={{
          background: hasActiveFilters 
            ? `${accentColor}30` 
            : 'rgba(255, 255, 255, 0.15)',
          color: hasActiveFilters ? 'rgba(255, 255, 255, 1)' : textColor,
          border: '1px solid rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" 
          />
        </svg>
        <span>Filter</span>
        {activeFilterCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-primary)] text-xs text-white">
            {activeFilterCount}
          </span>
        )}
      </motion.button>

      {/* Dropdown-Menü */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-72 p-4 shadow-xl"
            style={{
              background: designStyle === 'glass' 
                ? 'rgba(15, 23, 42, 0.92)' 
                : surfaceColor,
              backdropFilter: 'blur(24px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
            }}
          >
            {/* Header mit Reset */}
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-semibold" style={{ color: textColor }}>Filter</h4>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="text-xs hover:underline"
                  style={{ color: 'rgba(255, 255, 255, 1)' }}
                >
                  Zurücksetzen
                </button>
              )}
            </div>

            {/* ========================================
                ZEITRAUM FILTER (NEU)
                ======================================== */}
            <div className="mb-4">
              <h5 
                className="mb-2 text-xs font-medium uppercase tracking-wider"
                style={{ color: textColor, opacity: 0.4 }}
              >
                Zeitraum
              </h5>
              <div className="relative">
                <button
                  onClick={() => setIsDatePopoverOpen(!isDatePopoverOpen)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-all"
                  style={{
                    background: filters.datePreset !== 'all' || filters.dateFrom 
                      ? `${accentColor}20` 
                      : surfaceColor,
                    color: textColor,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ opacity: 0.6 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>
                      {filters.datePreset !== 'all' 
                        ? DATE_PRESET_LABELS[filters.datePreset]
                        : filters.dateFrom 
                          ? 'Benutzerdefiniert'
                          : 'Alle Zeiträume'
                      }
                    </span>
                  </div>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ opacity: 0.4 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* DateFilterPopover */}
                <DateFilterPopover 
                  isOpen={isDatePopoverOpen} 
                  onClose={() => setIsDatePopoverOpen(false)} 
                />
              </div>
              
              {/* Schnell-Reset für Zeitraum */}
              {(filters.datePreset !== 'all' || filters.dateFrom) && (
                <button
                  onClick={() => setDateFilter('all')}
                  className="mt-1.5 text-xs hover:underline"
                  style={{ color: 'rgba(255, 255, 255, 1)' }}
                >
                  Zeitraum zurücksetzen
                </button>
              )}
            </div>

            {/* ========================================
                PROVIDER FILTER
                ======================================== */}
            <FilterSection title="E-Mail-Provider" textColor={textColor}>
              <FilterOption
                label="Alle"
                isActive={filters.provider === 'all'}
                onClick={() => setFilter('provider', 'all')}
                accentColor={accentColor}
                designStyle={designStyle}
                surfaceColor={surfaceColor}
                textColor={textColor}
              />
              {accounts.some(a => a.provider === 'gmail') && (
                <FilterOption
                  label="Gmail"
                  isActive={filters.provider === 'gmail'}
                  onClick={() => setFilter('provider', 'gmail')}
                  color="#EA4335"
                  accentColor={accentColor}
                  designStyle={designStyle}
                  surfaceColor={surfaceColor}
                  textColor={textColor}
                />
              )}
              {accounts.some(a => a.provider === 'outlook') && (
                <FilterOption
                  label="Outlook"
                  isActive={filters.provider === 'outlook'}
                  onClick={() => setFilter('provider', 'outlook')}
                  color="#0078D4"
                  accentColor={accentColor}
                  designStyle={designStyle}
                  surfaceColor={surfaceColor}
                  textColor={textColor}
                />
              )}
              {accounts.some(a => a.provider === 'imap') && (
                <FilterOption
                  label="IMAP (GMX, Web.de...)"
                  isActive={filters.provider === 'imap'}
                  onClick={() => setFilter('provider', 'imap')}
                  color="#10B981"
                  accentColor={accentColor}
                  designStyle={designStyle}
                  surfaceColor={surfaceColor}
                  textColor={textColor}
                />
              )}
            </FilterSection>

            {/* ========================================
                KATEGORIE FILTER
                ======================================== */}
            <FilterSection title="Kategorie" textColor={textColor}>
              <FilterOption
                label="Alle"
                isActive={filters.category === 'all'}
                onClick={() => setFilter('category', 'all')}
                accentColor={accentColor}
                designStyle={designStyle}
                surfaceColor={surfaceColor}
                textColor={textColor}
              />
              <FilterOption
                label="Privat"
                isActive={filters.category === 'private'}
                onClick={() => setFilter('category', 'private')}
                icon="👤"
                accentColor={accentColor}
                designStyle={designStyle}
                surfaceColor={surfaceColor}
                textColor={textColor}
              />
              <FilterOption
                label="Geschäftlich"
                isActive={filters.category === 'business'}
                onClick={() => setFilter('category', 'business')}
                icon="💼"
                accentColor={accentColor}
                designStyle={designStyle}
                surfaceColor={surfaceColor}
                textColor={textColor}
              />
            </FilterSection>

            {/* ========================================
                DRINGLICHKEIT FILTER
                ======================================== */}
            <FilterSection title="Dringlichkeit" textColor={textColor}>
              <FilterOption
                label="Alle"
                isActive={filters.urgency === 'all'}
                onClick={() => setFilter('urgency', 'all')}
                accentColor={accentColor}
                designStyle={designStyle}
                surfaceColor={surfaceColor}
                textColor={textColor}
              />
              <FilterOption
                label="Dringend"
                isActive={filters.urgency === 'high'}
                onClick={() => setFilter('urgency', 'high')}
                color="#EF4444"
                accentColor={accentColor}
                designStyle={designStyle}
                surfaceColor={surfaceColor}
                textColor={textColor}
              />
              <FilterOption
                label="Normal"
                isActive={filters.urgency === 'normal'}
                onClick={() => setFilter('urgency', 'normal')}
                color="#F59E0B"
                accentColor={accentColor}
                designStyle={designStyle}
                surfaceColor={surfaceColor}
                textColor={textColor}
              />
              <FilterOption
                label="Niedrig"
                isActive={filters.urgency === 'low'}
                onClick={() => setFilter('urgency', 'low')}
                color="#10B981"
                accentColor={accentColor}
                designStyle={designStyle}
                surfaceColor={surfaceColor}
                textColor={textColor}
              />
            </FilterSection>

            {/* ========================================
                TERMINVORSCHLÄGE FILTER
                ======================================== */}
            <FilterSection title="Terminvorschläge" textColor={textColor}>
              <FilterOption
                label="Alle Nachrichten"
                isActive={filters.hasCalendarAction === null}
                onClick={() => setFilter('hasCalendarAction', null)}
                accentColor={accentColor}
                designStyle={designStyle}
                surfaceColor={surfaceColor}
                textColor={textColor}
              />
              <FilterOption
                label={`Mit Terminvorschlag ${pendingSuggestionsCount > 0 ? `(${pendingSuggestionsCount})` : ''}`}
                isActive={filters.hasCalendarAction === true}
                onClick={() => setFilter('hasCalendarAction', true)}
                icon="📅"
                accentColor={accentColor}
                designStyle={designStyle}
                surfaceColor={surfaceColor}
                textColor={textColor}
              />
            </FilterSection>

            {/* ========================================
                KONTAKT FILTER (mit Suchfunktion)
                ======================================== */}
            {contacts.length > 0 && (
              <div className="mb-4">
                <h5 
                  className="mb-2 text-xs font-medium uppercase tracking-wider"
                  style={{ color: textColor, opacity: 0.4 }}
                >
                  Nach Kontakt
                </h5>
                
                {/* Kontakt-Suchfeld */}
                <div 
                  className="mb-2 flex items-center gap-2 rounded-lg px-2 py-1.5"
                  style={{ background: surfaceColor }}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: textColor, opacity: 0.4 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Kontakt suchen..."
                    value={contactSearchQuery}
                    onChange={(e) => setContactSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent text-xs focus:outline-none"
                    style={{ color: textColor }}
                  />
                  {contactSearchQuery && (
                    <button
                      onClick={() => setContactSearchQuery('')}
                      className="rounded p-0.5 transition-colors hover:bg-white/10"
                      style={{ color: textColor, opacity: 0.4 }}
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                
                {/* Kontakt-Liste */}
                <div className="flex flex-wrap gap-2">
                  {!contactSearchQuery && (
                    <FilterOption
                      label="Alle"
                      isActive={filters.contactId === null}
                      onClick={() => setFilter('contactId', null)}
                      accentColor={accentColor}
                      designStyle={designStyle}
                      surfaceColor={surfaceColor}
                      textColor={textColor}
                    />
                  )}
                  {filteredContacts.map(contact => (
                    <FilterOption
                      key={contact.id}
                      label={contact.name || contact.email.split('@')[0]}
                      isActive={filters.contactId === contact.id}
                      onClick={() => {
                        setFilter('contactId', contact.id);
                        setContactSearchQuery('');
                      }}
                      icon={contact.isFavorite ? '⭐' : undefined}
                      accentColor={accentColor}
                      designStyle={designStyle}
                      surfaceColor={surfaceColor}
                      textColor={textColor}
                    />
                  ))}
                </div>
                
                {/* Aktiver Kontakt-Filter anzeigen */}
                {filters.contactId && (
                  <div 
                    className="mt-2 flex items-center justify-between rounded-lg px-2 py-1.5 text-xs"
                    style={{ background: `${accentColor}15`, color: textColor }}
                  >
                    <span>
                      Filter: {contacts.find(c => c.id === filters.contactId)?.name || 
                               contacts.find(c => c.id === filters.contactId)?.email}
                    </span>
                    <button
                      onClick={() => setFilter('contactId', null)}
                      className="rounded p-0.5 transition-colors hover:bg-white/10"
                      style={{ color: accentColor }}
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                
                {filteredContacts.length === 0 && contactSearchQuery && (
                  <p className="text-xs" style={{ color: textColor, opacity: 0.4 }}>
                    Keine Kontakte gefunden
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --------------------------------------------
// FilterSection Komponente
// Gruppiert Filter-Optionen
// --------------------------------------------

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  textColor: string;
}

function FilterSection({ title, children, textColor }: FilterSectionProps) {
  return (
    <div className="mb-4 last:mb-0">
      <h5 
        className="mb-2 text-xs font-medium uppercase tracking-wider"
        style={{ color: textColor, opacity: 0.4 }}
      >
        {title}
      </h5>
      <div className="flex flex-wrap gap-2">
        {children}
      </div>
    </div>
  );
}

// --------------------------------------------
// FilterOption Komponente
// Einzelne Filter-Option (Chip)
// --------------------------------------------

interface FilterOptionProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon?: string;
  color?: string;
  subtitle?: string;
  accentColor: string;
  designStyle: 'glass' | 'brutal' | 'neo';
  surfaceColor: string;
  textColor: string;
}

function FilterOption({ label, isActive, onClick, icon, color, subtitle, accentColor, designStyle, surfaceColor, textColor }: FilterOptionProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: designStyle === 'brutal' ? 1 : 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-all"
      style={{
        background: isActive ? (color || accentColor) : surfaceColor,
        color: isActive ? '#fff' : textColor,
        opacity: isActive ? 1 : 0.7,
        borderRadius: designStyle === 'brutal' ? '0.25rem' : '0.5rem',
        border: designStyle === 'brutal' ? '2px solid #000' : 'none',
        boxShadow: designStyle === 'brutal' ? '2px 2px 0 #000' : 'none',
      }}
    >
      {icon && <span>{icon}</span>}
      {color && !isActive && (
        <span 
          className="h-2 w-2 rounded-full" 
          style={{ backgroundColor: color }}
        />
      )}
      <span className="flex flex-col items-start">
        <span>{label}</span>
        {subtitle && (
          <span className="text-[10px] opacity-60">{subtitle}</span>
        )}
      </span>
    </motion.button>
  );
}
