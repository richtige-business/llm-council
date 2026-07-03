// ============================================
// FolderList.tsx - Ordner-Sidebar mit Labels
// 
// Zweck: Navigation zwischen Posteingang, Gesendet, etc.
//        + Benutzerdefinierte LifeOS-Labels
// Verwendet von: InboxPage.tsx
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInboxStore, useUnreadCount } from '../store';
import { FOLDERS } from '../constants';
import type { MessageFolder } from '../types';
import { useThemeStyles } from '@/lib/theme';

// --------------------------------------------
// Typen für Labels
// --------------------------------------------

interface InboxLabel {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  messageCount: number;
  isSystem: boolean;
}

// --------------------------------------------
// Icon-Komponenten für jeden Ordner
// --------------------------------------------

const FolderIcons: Record<string, React.ReactNode> = {
  Inbox: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  ),
  Send: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  ),
  FileEdit: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  Archive: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  ),
  Trash2: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  AlertTriangle: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
};

// --------------------------------------------
// Komponente: FolderList
// --------------------------------------------

export function FolderList() {
  const selectedFolder = useInboxStore((state) => state.selectedFolder);
  const setSelectedFolder = useInboxStore((state) => state.setSelectedFolder);
  const selectedLabelId = useInboxStore((state) => state.selectedLabelId);
  const setSelectedLabelId = useInboxStore((state) => state.setSelectedLabelId);
  const contacts = useInboxStore((state) => state.contacts);
  const openContactModal = useInboxStore((state) => state.openContactModal);
  const { surface, accentColor, designStyle, textColor } = useThemeStyles();
  
  // Labels aus API laden
  const [labels, setLabels] = useState<InboxLabel[]>([]);
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#6366f1');

  useEffect(() => {
    fetchLabels();
  }, []);

  const fetchLabels = async () => {
    try {
      const res = await fetch('/api/inbox/labels');
      if (res.ok) {
        const data = await res.json();
        setLabels(data.labels || []);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Labels:', error);
    }
  };

  const createLabel = async () => {
    if (!newLabelName.trim()) return;
    
    try {
      const res = await fetch('/api/inbox/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLabelName, color: newLabelColor }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setLabels([...labels, data.label]);
        setNewLabelName('');
        setIsCreatingLabel(false);
      }
    } catch (error) {
      console.error('Fehler beim Erstellen des Labels:', error);
    }
  };

  const deleteLabel = async (labelId: string) => {
    try {
      const res = await fetch(`/api/inbox/labels?id=${labelId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setLabels(labels.filter(l => l.id !== labelId));
        if (selectedLabelId === labelId) {
          setSelectedLabelId(null);
        }
      }
    } catch (error) {
      console.error('Fehler beim Löschen des Labels:', error);
    }
  };

  const handleFolderClick = (folderId: MessageFolder) => {
    setSelectedFolder(folderId);
    setSelectedLabelId(null); // Label-Auswahl aufheben
  };

  const handleLabelClick = (labelId: string) => {
    setSelectedLabelId(labelId);
    // Optional: Ordner-Auswahl beibehalten oder auf 'inbox' setzen
  };

  return (
    <div 
      className="flex h-full flex-col overflow-hidden p-3"
      style={{
        ...surface.base,
        borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
      }}
    >
      {/* Ordner-Sektion */}
      <h3 
        className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider"
        style={{ color: textColor, opacity: 0.5 }}
      >
        Ordner
      </h3>
      
      <nav className="flex flex-col gap-1">
        {FOLDERS.map((folder) => (
          <FolderItem
            key={folder.id}
            folder={folder}
            isSelected={selectedFolder === folder.id && !selectedLabelId}
            onClick={() => handleFolderClick(folder.id as MessageFolder)}
            accentColor={accentColor}
            designStyle={designStyle}
            textColor={textColor}
          />
        ))}
      </nav>

      {/* Trennlinie */}
      <div 
        className="my-4 border-t"
        style={{ borderColor: `${textColor}15` }}
      />

      {/* Kontakte-Sektion */}
      <div className="mb-4">
        <div className="flex items-center justify-between px-2 mb-2">
          <h3 
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: textColor, opacity: 0.5 }}
          >
            Kontakte
          </h3>
          <button
            onClick={() => openContactModal()}
            className="p-1 transition-colors hover:opacity-80"
            style={{ color: accentColor }}
            title="Neuen Kontakt anlegen"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        
        {/* Kontakte-Schnellzugriff */}
        <button
          onClick={() => openContactModal()}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/5"
          style={{ color: textColor }}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ opacity: 0.6 }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>Alle Kontakte</span>
          {contacts.length > 0 && (
            <span 
              className="ml-auto rounded-full px-2 py-0.5 text-xs"
              style={{ background: `${accentColor}20`, color: accentColor }}
            >
              {contacts.length}
            </span>
          )}
        </button>
        
        {/* Favoriten-Schnellzugriff */}
        {contacts.filter(c => c.isFavorite).length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1 px-2">
            {contacts.filter(c => c.isFavorite).slice(0, 5).map((contact) => (
              <button
                key={contact.id}
                onClick={() => openContactModal(contact)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium text-white transition-transform hover:scale-110"
                style={{ 
                  background: contact.category === 'business' ? '#6366F1' : '#10B981',
                }}
                title={contact.name || contact.email}
              >
                {(contact.name || contact.email).substring(0, 1).toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Trennlinie */}
      <div 
        className="mb-4 border-t"
        style={{ borderColor: `${textColor}15` }}
      />

      {/* Labels-Sektion */}
      <div className="flex items-center justify-between px-2 mb-2">
        <h3 
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: textColor, opacity: 0.5 }}
        >
          Labels
        </h3>
        <button
          onClick={() => setIsCreatingLabel(!isCreatingLabel)}
          className="p-1 transition-colors hover:opacity-80"
          style={{ color: accentColor }}
          title="Neues Label erstellen"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Neues Label erstellen */}
      <AnimatePresence>
        {isCreatingLabel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-2 overflow-hidden px-2"
          >
            <div className="flex flex-col gap-3 p-3 rounded-lg" style={{ background: `${textColor}10` }}>
              {/* Label-Name Input */}
              <input
                type="text"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder="Label-Name..."
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ 
                  background: `${textColor}10`, 
                  color: textColor,
                  border: `2px solid ${newLabelColor}`,
                }}
                onKeyDown={(e) => e.key === 'Enter' && createLabel()}
                autoFocus
              />
              
              {/* Farbauswahl - Grid Layout */}
              <div className="flex flex-col gap-2">
                <span className="text-xs" style={{ color: textColor, opacity: 0.5 }}>
                  Farbe wählen
                </span>
                <div className="flex items-center gap-2">
                  {/* Vordefinierte Farben als Grid */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981',
                      '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'
                    ].map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewLabelColor(color)}
                        className="h-6 w-6 rounded-md transition-all hover:scale-110"
                        style={{ 
                          background: color,
                          outline: newLabelColor === color ? `2px solid ${color}` : 'none',
                          outlineOffset: '2px',
                        }}
                        title={color}
                      />
                    ))}
                  </div>
                  
                  {/* Custom Color Picker (Farbrad) */}
                  <div className="relative ml-auto">
                    <input
                      type="color"
                      value={newLabelColor}
                      onChange={(e) => setNewLabelColor(e.target.value)}
                      className="absolute inset-0 h-8 w-8 cursor-pointer opacity-0"
                      title="Eigene Farbe wählen"
                    />
                    <div 
                      className="h-8 w-8 rounded-lg cursor-pointer flex items-center justify-center border-2 border-dashed transition-colors hover:border-solid"
                      style={{ 
                        borderColor: `${textColor}40`,
                        background: `conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)`,
                      }}
                      title="Eigene Farbe wählen"
                    >
                      <div 
                        className="h-4 w-4 rounded-full"
                        style={{ background: newLabelColor, border: '2px solid white' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Aktionen */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t" style={{ borderColor: `${textColor}15` }}>
                <button
                  onClick={() => setIsCreatingLabel(false)}
                  className="px-3 py-1.5 text-xs rounded-lg transition-colors hover:opacity-80"
                  style={{ color: textColor, opacity: 0.6 }}
                >
                  Abbrechen
                </button>
                <button
                  onClick={createLabel}
                  disabled={!newLabelName.trim()}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all disabled:opacity-50"
                  style={{ background: accentColor, color: '#fff' }}
                >
                  Erstellen
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Label-Liste */}
      <nav className="flex flex-col gap-1 overflow-y-auto">
        {labels.length > 0 ? (
          labels.map((label) => (
            <LabelItem
              key={label.id}
              label={label}
              isSelected={selectedLabelId === label.id}
              onClick={() => handleLabelClick(label.id)}
              onDelete={() => deleteLabel(label.id)}
              designStyle={designStyle}
              textColor={textColor}
            />
          ))
        ) : (
          <p 
            className="px-3 py-2 text-xs italic"
            style={{ color: textColor, opacity: 0.4 }}
          >
            Keine Labels erstellt
          </p>
        )}
      </nav>
    </div>
  );
}

// --------------------------------------------
// FolderItem Komponente
// Einzelner Ordner in der Liste
// --------------------------------------------

interface FolderItemProps {
  folder: typeof FOLDERS[number];
  isSelected: boolean;
  onClick: () => void;
  accentColor: string;
  designStyle: 'glass' | 'brutal' | 'neo';
  textColor: string;
}

function FolderItem({ folder, isSelected, onClick, accentColor, designStyle, textColor }: FolderItemProps) {
  const unreadCount = useUnreadCount(folder.id as MessageFolder);

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: designStyle === 'brutal' ? 0 : 4 }}
      whileTap={{ scale: 0.98 }}
      className="relative flex items-center justify-between px-3 py-2.5 text-left text-sm font-medium transition-colors"
      style={{
        background: isSelected ? accentColor : 'transparent',
        color: isSelected ? '#fff' : textColor,
        opacity: isSelected ? 1 : 0.7,
        borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
        border: isSelected && designStyle === 'brutal' ? '2px solid #000' : 'none',
        boxShadow: isSelected && designStyle === 'brutal' ? '2px 2px 0 #000' : 'none',
      }}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <span style={{ color: isSelected ? '#fff' : textColor, opacity: isSelected ? 1 : 0.5 }}>
          {FolderIcons[folder.icon]}
        </span>
        
        {/* Name */}
        <span>{folder.name}</span>
      </div>
      
      {/* Unread Badge */}
      {unreadCount > 0 && folder.id === 'inbox' && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex h-5 min-w-5 items-center justify-center px-1.5 text-xs font-semibold"
          style={{
            background: isSelected ? 'rgba(255, 255, 255, 0.2)' : accentColor,
            color: '#fff',
            borderRadius: designStyle === 'brutal' ? '0.25rem' : '9999px',
          }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </motion.span>
      )}
    </motion.button>
  );
}

// --------------------------------------------
// LabelItem Komponente
// Einzelnes Label in der Liste
// --------------------------------------------

interface LabelItemProps {
  label: InboxLabel;
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
  designStyle: 'glass' | 'brutal' | 'neo';
  textColor: string;
}

function LabelItem({ label, isSelected, onClick, onDelete, designStyle, textColor }: LabelItemProps) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <motion.div
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
      className="group relative"
    >
      <motion.button
        onClick={onClick}
        whileHover={{ x: designStyle === 'brutal' ? 0 : 4 }}
        whileTap={{ scale: 0.98 }}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium transition-colors"
        style={{
          background: isSelected ? `${label.color}20` : 'transparent',
          color: textColor,
          opacity: isSelected ? 1 : 0.7,
          borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
          borderLeft: `3px solid ${label.color}`,
        }}
      >
        <div className="flex items-center gap-3">
          {/* Farbpunkt */}
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: label.color }}
          />
          
          {/* Name */}
          <span className="truncate">{label.name}</span>
        </div>
        
        {/* Anzahl */}
        {label.messageCount > 0 && (
          <span 
            className="text-xs"
            style={{ color: textColor, opacity: 0.5 }}
          >
            {label.messageCount}
          </span>
        )}
      </motion.button>

      {/* Delete Button */}
      <AnimatePresence>
        {showDelete && !label.isSystem && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 transition-colors hover:text-red-500"
            style={{ color: textColor, opacity: 0.5 }}
            title="Label löschen"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

