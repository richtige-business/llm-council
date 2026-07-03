// ============================================
// constants.ts - Konstanten für Browser-Modul
// 
// Zweck: Definiert Standardwerte und Konfigurationen
//        für das Browser-Modul
// Verwendet von: store.ts, BrowserPage.tsx, BrowserToolbar.tsx
// ============================================

import type { Module } from '@/types';

// --------------------------------------------
// Browser Service URL
// URL zum externen Puppeteer-basierten Browser Service
// --------------------------------------------

export const BROWSER_SERVICE_URL = process.env.NEXT_PUBLIC_BROWSER_SERVICE_URL || 'http://localhost:3001';

// --------------------------------------------
// Standard-Startseite
// Die URL die beim Öffnen eines neuen Tabs geladen wird
// --------------------------------------------

export const DEFAULT_HOME_PAGE = 'https://www.google.com';

// --------------------------------------------
// Standard-Suchmaschine
// Wird verwendet wenn der User eine Suche eingibt
// --------------------------------------------

export const DEFAULT_SEARCH_ENGINE = 'https://www.google.com/search?q=';

// --------------------------------------------
// Maximale Anzahl von Tabs
// Verhindert dass zu viele Tabs gleichzeitig offen sind
// --------------------------------------------

export const MAX_TABS = 20;

// --------------------------------------------
// Maximale Anzahl von History-Einträgen
// Ältere Einträge werden automatisch gelöscht
// --------------------------------------------

export const MAX_HISTORY_ENTRIES = 1000;

// --------------------------------------------
// Standard-Favicon
// Wird angezeigt wenn kein Favicon gefunden wird
// --------------------------------------------

export const DEFAULT_FAVICON = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';

// --------------------------------------------
// Browser Modul Info
// Metadaten für die Modul-Registry
// --------------------------------------------

export const BROWSER_MODULE_INFO: Omit<Module, 'tools' | 'widgets' | 'isActive' | 'order'> & { color: string } = {
  id: 'browser',
  name: 'Browser',
  description: 'Web-Browser mit Tabs, Verlauf und Lesezeichen',
  version: '1.0.0',
  icon: 'Globe',
  category: 'system',
  author: 'LifeOS',
  color: '#8B5CF6',  // Lila - für Agent Orb und Widgets
};











