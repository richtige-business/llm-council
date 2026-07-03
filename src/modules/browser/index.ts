// ============================================
// index.ts - Haupt-Export für das Browser-Modul
// 
// Zweck: Zentraler Einstiegspunkt für alle Exports des Moduls
//        Hier wird auch das Modul bei der Registry angemeldet
// Verwendet von: App-Layout, Sidebar, andere Module
// ============================================

// --------------------------------------------
// Re-Exports
// Alles was andere Teile der App brauchen könnten
// --------------------------------------------

// Types exportieren
export type {
  BrowserTabData,
  BrowserHistoryEntry,
  BrowserBookmark,
  BrowserBookmarkFolder,
  BrowserState,
  BrowserActions,
  BrowserStore,
} from './types';

// Store und Hooks exportieren
export {
  useBrowserStore,
  useBrowserTabs,
  useActiveBrowserTab,
  useBrowserHistory,
  useBrowserBookmarks,
} from './store';

// Konstanten exportieren
export {
  DEFAULT_HOME_PAGE,
  DEFAULT_SEARCH_ENGINE,
  MAX_TABS,
  MAX_HISTORY_ENTRIES,
  DEFAULT_FAVICON,
  BROWSER_MODULE_INFO,
} from './constants';

// Komponenten exportieren
export {
  BrowserPage,
  BrowserTab,
  BrowserToolbar,
} from './components';

// --------------------------------------------
// Modul-Registration Funktion
// Wird beim App-Start aufgerufen um das Modul zu registrieren
// --------------------------------------------

import { BROWSER_MODULE_INFO } from './constants';
import type { Module, Tool, Widget } from '@/types';

/**
 * Erstellt das vollständige Modul-Objekt für die Registry
 * Dieses Objekt enthält alle Metadaten und Komponenten
 */
export function createBrowserModule(): Module {
  // Basis-Modul aus den Konstanten
  const module: Module = {
    ...BROWSER_MODULE_INFO,
    
    // Tools sind vollständige Anwendungen innerhalb des Moduls
    // Der Browser hat ein Haupt-Tool: die Browser-Ansicht
    tools: [
      {
        id: 'browser-main',
        moduleId: 'browser',
        name: 'Browser',
        description: 'Web-Browser mit Tabs, Verlauf und Lesezeichen',
        version: '1.0.0',
        icon: 'Globe',
        capabilities: ['view', 'navigate', 'bookmark'],
        inputs: { fields: [] },
        outputs: { fields: [] },
        events: [
          {
            name: 'pageLoaded',
            description: 'Wird ausgelöst wenn eine Seite geladen wurde',
            payload: { fields: [{ name: 'url', type: 'string', required: true }] },
          },
        ],
        // Component wird dynamisch geladen
        component: () => null,
        widgets: [],
      } as Tool,
    ],
    
    // Widgets sind kleine Vorschau-Komponenten für das Dashboard
    // Browser hat keine Widgets (kann später hinzugefügt werden)
    widgets: [],
    
    // Modul ist standardmäßig aktiv
    isActive: true,
    
    // Reihenfolge in der Sidebar (niedrig = weiter oben)
    order: 3,
  };
  
  return module;
}

