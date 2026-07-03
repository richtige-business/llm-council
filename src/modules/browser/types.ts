// ============================================
// types.ts - TypeScript Interfaces für Browser-Modul
// 
// Zweck: Definiert alle Typen für Browser-Funktionalität
//        (Tabs, Verlauf, Lesezeichen, Session, etc.)
// Verwendet von: store.ts, BrowserPage.tsx, BrowserTab.tsx
// ============================================

// --------------------------------------------
// Browser Tab Interface
// Repräsentiert einen einzelnen Browser-Tab
// --------------------------------------------

export interface BrowserTabData {
  id: string;                    // Eindeutige ID des Tabs (lokale ID)
  serviceTabId?: string;         // Tab-ID im Browser Service
  title: string;                 // Titel der aktuellen Seite
  url: string;                   // Aktuelle URL
  favicon?: string;              // Favicon-URL (optional)
  screenshot?: string;           // Aktueller Screenshot (Base64)
  canGoBack: boolean;            // Kann zurück navigieren?
  canGoForward: boolean;         // Kann vorwärts navigieren?
  isLoading: boolean;            // Lädt die Seite gerade?
  hasError?: boolean;            // Hat einen Fehler?
  errorMessage?: string;         // Fehlermeldung
  createdAt: number;             // Zeitstempel der Erstellung
  lastScreenshotAt?: number;     // Zeitstempel des letzten Screenshots
}

// --------------------------------------------
// Browser Session Interface
// Verbindung zum externen Browser Service
// --------------------------------------------

export interface BrowserSession {
  sessionId: string;             // Session-ID vom Browser Service
  userId: string;                // Zugehöriger User
  isConnected: boolean;          // Verbindung aktiv?
  createdAt: number;             // Zeitstempel der Erstellung
  lastActivityAt: number;        // Letzte Aktivität
}

// --------------------------------------------
// Browser History Entry
// Ein Eintrag im Browser-Verlauf
// --------------------------------------------

export interface BrowserHistoryEntry {
  id: string;                    // Eindeutige ID
  url: string;                   // Besuchte URL
  title: string;                 // Titel der Seite
  visitedAt: number;             // Zeitstempel des Besuchs
  visitCount: number;            // Wie oft wurde diese Seite besucht?
}

// --------------------------------------------
// Browser Bookmark
// Ein Lesezeichen
// --------------------------------------------

export interface BrowserBookmark {
  id: string;                    // Eindeutige ID
  url: string;                   // URL des Lesezeichens
  title: string;                 // Titel des Lesezeichens
  favicon?: string;              // Favicon-URL (optional)
  folderId?: string;             // ID des Ordners (optional)
  createdAt: number;            // Zeitstempel der Erstellung
}

// --------------------------------------------
// Browser Bookmark Folder
// Ein Ordner für Lesezeichen
// --------------------------------------------

export interface BrowserBookmarkFolder {
  id: string;                    // Eindeutige ID
  name: string;                  // Name des Ordners
  bookmarkIds: string[];        // IDs der Lesezeichen in diesem Ordner
  createdAt: number;            // Zeitstempel der Erstellung
}

// --------------------------------------------
// Browser State Interface
// Der komplette Zustand des Browsers
// --------------------------------------------

export interface BrowserState {
  // Session mit Browser Service
  session: BrowserSession | null;    // Aktive Browser-Session
  isServiceAvailable: boolean;       // Ist Browser Service erreichbar?
  
  // Tabs
  tabs: BrowserTabData[];            // Alle offenen Tabs
  activeTabId: string | null;        // ID des aktiven Tabs
  
  // History & Bookmarks
  history: BrowserHistoryEntry[];    // Browser-Verlauf
  bookmarks: BrowserBookmark[];      // Alle Lesezeichen
  bookmarkFolders: BrowserBookmarkFolder[]; // Ordner für Lesezeichen
}

// --------------------------------------------
// Browser Actions Interface
// Alle Aktionen die im Browser ausgeführt werden können
// --------------------------------------------

export interface BrowserActions {
  // Session Management
  initSession: () => Promise<void>;           // Browser-Session initialisieren
  destroySession: () => Promise<void>;        // Browser-Session beenden
  checkServiceHealth: () => Promise<boolean>; // Service-Verfügbarkeit prüfen
  
  // Tab-Management
  createTab: (url?: string) => Promise<void>; // Neuen Tab erstellen
  closeTab: (tabId: string) => Promise<void>; // Tab schließen
  switchTab: (tabId: string) => void;         // Zu anderem Tab wechseln
  updateTab: (tabId: string, updates: Partial<BrowserTabData>) => void; // Tab aktualisieren
  
  // Navigation
  navigate: (tabId: string, url: string) => Promise<void>; // Zu URL navigieren
  goBack: (tabId: string) => Promise<void>;   // Zurück navigieren
  goForward: (tabId: string) => Promise<void>;// Vorwärts navigieren
  reload: (tabId: string) => Promise<void>;   // Seite neu laden
  
  // Interaktion (NEU)
  handleClick: (tabId: string, x: number, y: number) => Promise<void>;  // Klick
  handleType: (tabId: string, text: string) => Promise<void>;           // Texteingabe
  handleScroll: (tabId: string, deltaX: number, deltaY: number) => Promise<void>; // Scroll
  handleKeypress: (tabId: string, key: string) => Promise<void>;        // Tastendruck
  
  // Screenshot
  refreshScreenshot: (tabId: string) => Promise<void>; // Screenshot aktualisieren
  
  // History
  addToHistory: (url: string, title: string) => void; // Zu Verlauf hinzufügen
  clearHistory: () => void;                // Verlauf löschen
  removeHistoryEntry: (entryId: string) => void; // Eintrag aus Verlauf entfernen
  
  // Bookmarks
  addBookmark: (url: string, title: string, folderId?: string) => void; // Lesezeichen hinzufügen
  removeBookmark: (bookmarkId: string) => void; // Lesezeichen entfernen
  updateBookmark: (bookmarkId: string, updates: Partial<BrowserBookmark>) => void; // Lesezeichen aktualisieren
  createBookmarkFolder: (name: string) => void; // Ordner erstellen
  removeBookmarkFolder: (folderId: string) => void; // Ordner entfernen
}

// --------------------------------------------
// Kombinierter Browser Store Type
// State + Actions zusammen
// --------------------------------------------

export type BrowserStore = BrowserState & BrowserActions;

