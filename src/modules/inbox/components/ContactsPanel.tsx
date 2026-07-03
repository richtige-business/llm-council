// ============================================
// ContactsPanel.tsx - Kontaktverwaltung Sidebar
// 
// Zweck: Zeigt alle Kontakte in einer durchsuchbaren Liste
//        Mit Favoriten, Kategorien und Schnellaktionen
// Verwendet von: FolderList.tsx (als Tab)
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInboxStore } from '../store';
import { useThemeStyles } from '@/lib/theme';
import type { Contact, MessageCategory } from '../types';

// --------------------------------------------
// Hilfsfunktion: Initiale aus Name/E-Mail
// --------------------------------------------

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
}

// --------------------------------------------
// Hilfsfunktion: Kategorie-Farbe
// --------------------------------------------

function getCategoryColor(category: MessageCategory | string): string {
  switch (category) {
    case 'private': return '#10B981';    // Grün
    case 'business': return '#6366F1';   // Indigo
    default: return '#9CA3AF';           // Grau
  }
}

function getCategoryLabel(category: MessageCategory | string): string {
  switch (category) {
    case 'private': return 'Privat';
    case 'business': return 'Business';
    default: return 'Unbekannt';
  }
}

// --------------------------------------------
// Komponente: ContactsPanel
// --------------------------------------------

export function ContactsPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<MessageCategory | 'all'>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  
  // Store
  const contacts = useInboxStore((state) => state.contacts);
  const fetchContacts = useInboxStore((state) => state.fetchContacts);
  const toggleContactFavorite = useInboxStore((state) => state.toggleContactFavorite);
  const openContactModal = useInboxStore((state) => state.openContactModal);
  const setFilter = useInboxStore((state) => state.setFilter);
  
  // Theme
  const { surface, accentColor, designStyle, surfaceColor, textColor } = useThemeStyles();

  // Kontakte beim Mounten laden
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Gefilterte Kontakte
  const filteredContacts = contacts.filter((contact) => {
    // Suchfilter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = contact.name?.toLowerCase().includes(query);
      const matchesEmail = contact.email.toLowerCase().includes(query);
      const matchesCompany = contact.company?.toLowerCase().includes(query);
      if (!matchesName && !matchesEmail && !matchesCompany) return false;
    }
    
    // Kategorie-Filter
    if (categoryFilter !== 'all' && contact.category !== categoryFilter) {
      return false;
    }
    
    // Favoriten-Filter
    if (showFavoritesOnly && !contact.isFavorite) {
      return false;
    }
    
    return true;
  });

  // Nach Kontakt filtern (Nachrichten)
  const handleContactFilter = (contactId: string) => {
    setFilter('contactId', contactId);
  };

  return (
    <div 
      className="flex h-full flex-col overflow-hidden rounded-2xl"
      style={surface.base}
    >
      {/* Header */}
      <div className="shrink-0 border-b border-white/10 p-3">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: textColor }}>
            Kontakte
          </h3>
          <button
            onClick={() => openContactModal()}
            className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
            style={{ color: accentColor }}
            title="Neuen Kontakt anlegen"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>

        {/* Suchfeld */}
        <div 
          className="flex items-center gap-2 rounded-lg px-2 py-1.5"
          style={{ background: surfaceColor }}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: textColor, opacity: 0.4 }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Kontakt suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs focus:outline-none"
            style={{ color: textColor }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="rounded p-0.5 transition-colors hover:bg-white/10"
              style={{ color: textColor, opacity: 0.4 }}
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter-Chips */}
        <div className="mt-2 flex flex-wrap gap-1">
          <FilterChip
            label="Alle"
            isActive={categoryFilter === 'all' && !showFavoritesOnly}
            onClick={() => { setCategoryFilter('all'); setShowFavoritesOnly(false); }}
            accentColor={accentColor}
            surfaceColor={surfaceColor}
            textColor={textColor}
            designStyle={designStyle}
          />
          <FilterChip
            label="⭐ Favoriten"
            isActive={showFavoritesOnly}
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            accentColor={accentColor}
            surfaceColor={surfaceColor}
            textColor={textColor}
            designStyle={designStyle}
          />
          <FilterChip
            label="Privat"
            isActive={categoryFilter === 'private'}
            onClick={() => setCategoryFilter(categoryFilter === 'private' ? 'all' : 'private')}
            color="#10B981"
            accentColor={accentColor}
            surfaceColor={surfaceColor}
            textColor={textColor}
            designStyle={designStyle}
          />
          <FilterChip
            label="Business"
            isActive={categoryFilter === 'business'}
            onClick={() => setCategoryFilter(categoryFilter === 'business' ? 'all' : 'business')}
            color="#6366F1"
            accentColor={accentColor}
            surfaceColor={surfaceColor}
            textColor={textColor}
            designStyle={designStyle}
          />
        </div>
      </div>

      {/* Kontaktliste */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <svg className="mb-2 h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: textColor, opacity: 0.2 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-xs" style={{ color: textColor, opacity: 0.4 }}>
              {searchQuery ? 'Keine Kontakte gefunden' : 'Noch keine Kontakte'}
            </p>
            <button
              onClick={() => openContactModal()}
              className="mt-2 text-xs font-medium"
              style={{ color: accentColor }}
            >
              + Kontakt anlegen
            </button>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredContacts.map((contact) => (
              <ContactItem
                key={contact.id}
                contact={contact}
                onFilter={() => handleContactFilter(contact.id)}
                onEdit={() => openContactModal(contact)}
                onToggleFavorite={() => toggleContactFavorite(contact.id)}
                accentColor={accentColor}
                surfaceColor={surfaceColor}
                textColor={textColor}
                designStyle={designStyle}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Footer mit Statistik */}
      <div 
        className="shrink-0 border-t border-white/10 px-3 py-2 text-center text-xs"
        style={{ color: textColor, opacity: 0.4 }}
      >
        {filteredContacts.length} von {contacts.length} Kontakten
      </div>
    </div>
  );
}

// --------------------------------------------
// Komponente: FilterChip
// --------------------------------------------

interface FilterChipProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  color?: string;
  accentColor: string;
  surfaceColor: string;
  textColor: string;
  designStyle: 'glass' | 'brutal' | 'neo';
}

function FilterChip({
  label,
  isActive,
  onClick,
  color,
  accentColor,
  surfaceColor,
  textColor,
  designStyle,
}: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className="rounded-md px-2 py-0.5 text-[10px] font-medium transition-all"
      style={{
        background: isActive ? (color || accentColor) : surfaceColor,
        color: isActive ? '#fff' : textColor,
        opacity: isActive ? 1 : 0.6,
        border: designStyle === 'brutal' ? '1px solid #000' : 'none',
      }}
    >
      {label}
    </button>
  );
}

// --------------------------------------------
// Komponente: ContactItem
// --------------------------------------------

interface ContactItemProps {
  contact: Contact;
  onFilter: () => void;
  onEdit: () => void;
  onToggleFavorite: () => void;
  accentColor: string;
  surfaceColor: string;
  textColor: string;
  designStyle: 'glass' | 'brutal' | 'neo';
}

function ContactItem({
  contact,
  onFilter,
  onEdit,
  onToggleFavorite,
  accentColor,
  surfaceColor,
  textColor,
  designStyle,
}: ContactItemProps) {
  const initials = getInitials(contact.name, contact.email);
  const categoryColor = getCategoryColor(contact.category);
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group mb-1 flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-white/5"
    >
      {/* Avatar */}
      <div 
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ background: categoryColor }}
      >
        {initials}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span 
            className="truncate text-xs font-medium"
            style={{ color: textColor }}
          >
            {contact.name || contact.email.split('@')[0]}
          </span>
          {contact.isFavorite && (
            <span className="text-[10px]">⭐</span>
          )}
        </div>
        <p 
          className="truncate text-[10px]"
          style={{ color: textColor, opacity: 0.5 }}
        >
          {contact.email}
        </p>
      </div>

      {/* Aktionen (on hover) */}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={onFilter}
          className="rounded p-1 transition-colors hover:bg-white/10"
          style={{ color: textColor, opacity: 0.6 }}
          title="Nach diesem Kontakt filtern"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </button>
        <button
          onClick={onToggleFavorite}
          className="rounded p-1 transition-colors hover:bg-white/10"
          style={{ color: contact.isFavorite ? '#F59E0B' : textColor, opacity: contact.isFavorite ? 1 : 0.6 }}
          title={contact.isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
        >
          <svg className="h-3 w-3" fill={contact.isFavorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
        <button
          onClick={onEdit}
          className="rounded p-1 transition-colors hover:bg-white/10"
          style={{ color: textColor, opacity: 0.6 }}
          title="Kontakt bearbeiten"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </div>

      {/* Message Count Badge */}
      {contact.messageCount > 0 && (
        <span 
          className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium"
          style={{ background: `${accentColor}20`, color: accentColor }}
        >
          {contact.messageCount}
        </span>
      )}
    </motion.div>
  );
}








