// ============================================
// constants.ts - Konstanten für das Inbox-Modul
// 
// Zweck: Zentrale Definition aller Konstanten
// Verwendet von: Modul-Registration, Komponenten
// ============================================

import type { ModuleCategory } from '@/types';

// --------------------------------------------
// Modul-Informationen
// Werden bei der Registration verwendet
// --------------------------------------------

export const INBOX_MODULE_INFO = {
  id: 'inbox',
  name: 'Postfach',
  description: 'Universelles Postfach für E-Mails und System-Benachrichtigungen',
  version: '1.0.0',
  icon: 'Mail',
  category: 'communication' as ModuleCategory,
  color: '#3B82F6',  // Blau
} as const;

// --------------------------------------------
// Ordner-Definitionen
// Die verfügbaren Ordner mit Icons und Labels
// --------------------------------------------

export const FOLDERS = [
  { id: 'inbox', name: 'Posteingang', icon: 'Inbox' },
  { id: 'sent', name: 'Gesendet', icon: 'Send' },
  { id: 'drafts', name: 'Entwürfe', icon: 'FileEdit' },
  { id: 'archive', name: 'Archiv', icon: 'Archive' },
  { id: 'trash', name: 'Papierkorb', icon: 'Trash2' },
  { id: 'spam', name: 'Spam', icon: 'AlertTriangle' },
] as const;

// --------------------------------------------
// Provider-Informationen
// Für die Account-Setup UI
// --------------------------------------------

export const PROVIDERS = [
  {
    id: 'gmail',
    name: 'Gmail',
    icon: 'Mail',
    color: '#EA4335',
    description: 'Google Gmail über OAuth verbinden',
    authUrl: '/api/inbox/oauth/gmail',
  },
  {
    id: 'outlook',
    name: 'Outlook',
    icon: 'Mail',
    color: '#0078D4',
    description: 'Microsoft Outlook/Hotmail über OAuth verbinden',
    authUrl: '/api/inbox/oauth/outlook',
  },
  {
    id: 'imap',
    name: 'Andere (IMAP)',
    icon: 'Server',
    color: '#6B7280',
    description: 'GMX, Web.de, T-Online und andere IMAP-Provider',
    authUrl: null,  // Verwendet Formular statt OAuth
  },
] as const;

// --------------------------------------------
// Prioritäts-Farben
// --------------------------------------------

export const PRIORITY_COLORS = {
  low: '#9CA3AF',    // Grau
  normal: '#3B82F6', // Blau
  high: '#EF4444',   // Rot
} as const;

// --------------------------------------------
// System-Nachrichten Quellen
// Module die System-Benachrichtigungen senden können
// --------------------------------------------

export const SYSTEM_SOURCES = [
  { id: 'calendar', name: 'Kalender', icon: 'Calendar', color: '#10B981' },
  { id: 'tasks', name: 'Aufgaben', icon: 'CheckSquare', color: '#F59E0B' },
  { id: 'notes', name: 'Notizen', icon: 'StickyNote', color: '#8B5CF6' },
  { id: 'system', name: 'System', icon: 'Settings', color: '#6B7280' },
] as const;

// --------------------------------------------
// Default-Werte
// --------------------------------------------

export const DEFAULT_FOLDER = 'inbox';
export const MESSAGES_PER_PAGE = 50;
export const SYNC_INTERVAL_MS = 5 * 60 * 1000;  // 5 Minuten
export const MESSAGE_SNIPPET_LENGTH = 150;

// --------------------------------------------
// Keyboard Shortcuts
// --------------------------------------------

export const KEYBOARD_SHORTCUTS = {
  compose: 'c',          // Neue E-Mail
  reply: 'r',            // Antworten
  archive: 'e',          // Archivieren
  delete: '#',           // Löschen
  star: 's',             // Markieren
  markRead: 'Shift+i',   // Als gelesen
  markUnread: 'Shift+u', // Als ungelesen
  refresh: 'Shift+n',    // Aktualisieren
  search: '/',           // Suche fokussieren
} as const;

// --------------------------------------------
// API Endpoints
// --------------------------------------------

export const API_ENDPOINTS = {
  accounts: '/api/inbox/accounts',
  messages: '/api/inbox/messages',
  sync: '/api/inbox/sync',
  oauth: {
    gmail: '/api/inbox/oauth/gmail',
    outlook: '/api/inbox/oauth/outlook',
    imap: '/api/inbox/oauth/imap',
  },
} as const;











