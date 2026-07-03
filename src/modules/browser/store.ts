// ============================================
// store.ts - Browser State Management
// 
// Zweck: Verwaltet alle Browser-Daten (Session, Tabs, Verlauf, Lesezeichen)
//        Kommuniziert mit dem externen Browser Service (Puppeteer)
// Verwendet von: BrowserPage.tsx, BrowserTab.tsx, BrowserToolbar.tsx
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  BrowserStore, 
  BrowserTabData, 
  BrowserHistoryEntry, 
  BrowserBookmark, 
  BrowserBookmarkFolder,
  BrowserSession 
} from './types';
import { DEFAULT_HOME_PAGE, MAX_TABS, MAX_HISTORY_ENTRIES } from './constants';
import * as browserApi from './services/browser-api';

// --------------------------------------------
// Browser Store erstellen
// Verwaltet Session, Tabs, Verlauf und Lesezeichen
// --------------------------------------------

export const useBrowserStore = create<BrowserStore>()(
  persist(
    (set, get) => ({
      // ----------------------------------------
      // Initial State
      // Startwerte für den Browser
      // ----------------------------------------
      
      session: null,
      isServiceAvailable: false,
      tabs: [],
      activeTabId: null,
      history: [],
      bookmarks: [],
      bookmarkFolders: [],

      // ----------------------------------------
      // Session Management Actions
      // Verbindung zum Browser Service
      // ----------------------------------------

      // Browser Service Health Check
      checkServiceHealth: async () => {
        const isAvailable = await browserApi.checkServiceHealth();
        set({ isServiceAvailable: isAvailable });
        return isAvailable;
      },

      // Session initialisieren
      // Erstellt neue Session beim Browser Service
      initSession: async () => {
        const state = get();
        
        // Prüfe ob Service verfügbar
        const isAvailable = await browserApi.checkServiceHealth();
        set({ isServiceAvailable: isAvailable });
        
        if (!isAvailable) {
          console.warn('Browser Service nicht erreichbar');
          return;
        }

        // Wenn bereits Session existiert, prüfen ob noch gültig
        if (state.session?.sessionId) {
          const existingSession = await browserApi.getSession(state.session.sessionId);
          if (existingSession) {
            // Session ist noch gültig - prüfen ob Tab existiert
            // Wenn Tabs vorhanden sind aber keine serviceTabId haben, müssen wir neu erstellen
            const needsNewTabs = state.tabs.some(t => !t.serviceTabId);
            if (!needsNewTabs) {
              set({
                session: {
                  ...state.session,
                  isConnected: true,
                  lastActivityAt: Date.now(),
                },
              });
              return;
            }
          }
          // Session existiert nicht mehr oder Tabs fehlen - alles neu erstellen
          console.log('Alte Session ungültig, erstelle neue...');
        }

        try {
          // Alte Tabs löschen (sie sind nicht mehr gültig)
          set({ tabs: [], activeTabId: null, session: null });
          
          // Neue Session erstellen
          const userId = 'local-user';
          const response = await browserApi.createSession(userId);
          
          const session: BrowserSession = {
            sessionId: response.sessionId,
            userId,
            isConnected: true,
            createdAt: Date.now(),
            lastActivityAt: Date.now(),
          };

          // Session setzen
          set({ session });
          console.log('Browser Session erstellt:', response.sessionId);
          
          // Ersten Tab mit Daten aus der Response erstellen
          if (response.tabs && response.tabs.length > 0) {
            const firstTab = response.tabs[0];
            const newTab: BrowserTabData = {
              id: crypto.randomUUID(),
              serviceTabId: firstTab.tabId,
              title: firstTab.title,
              url: firstTab.url,
              canGoBack: false,
              canGoForward: false,
              isLoading: false,
              createdAt: Date.now(),
            };
            
            set({ 
              tabs: [newTab], 
              activeTabId: newTab.id 
            });
            
            // Screenshot holen
            try {
              const screenshot = await browserApi.getScreenshot(response.sessionId, firstTab.tabId);
              get().updateTab(newTab.id, {
                screenshot: screenshot.screenshot,
                lastScreenshotAt: Date.now(),
              });
            } catch (e) {
              console.error('Screenshot fehlgeschlagen:', e);
            }
          }
          
        } catch (error) {
          console.error('Fehler beim Erstellen der Browser Session:', error);
          set({ isServiceAvailable: false });
        }
      },

      // Session beenden
      destroySession: async () => {
        const state = get();
        if (state.session?.sessionId) {
          try {
            await browserApi.destroySession(state.session.sessionId);
          } catch (error) {
            console.error('Fehler beim Beenden der Session:', error);
          }
        }
        set({ 
          session: null, 
          tabs: [], 
          activeTabId: null 
        });
      },

      // ----------------------------------------
      // Tab-Management Actions
      // Erstellen, Schließen, Wechseln von Tabs
      // ----------------------------------------

      // Neuen Tab erstellen
      createTab: async (url) => {
        const state = get();
        
        // Prüfen ob maximale Anzahl von Tabs erreicht
        if (state.tabs.length >= MAX_TABS) {
          console.warn(`Maximale Anzahl von Tabs (${MAX_TABS}) erreicht`);
          return;
        }

        // Wenn keine Session, zuerst Session erstellen
        if (!state.session?.sessionId || !state.isServiceAvailable) {
          console.log('Keine Session, initialisiere zuerst...');
          await get().initSession();
          // Nach initSession sollten Tabs schon erstellt sein
          return;
        }

        // Lokalen Tab erstellen (für sofortige UI-Reaktion)
        const localTabId = crypto.randomUUID();
        const targetUrl = url || DEFAULT_HOME_PAGE;
        
        const newTab: BrowserTabData = {
          id: localTabId,
          title: 'Lädt...',
          url: targetUrl,
          canGoBack: false,
          canGoForward: false,
          isLoading: true,
          createdAt: Date.now(),
        };

        // Sofort zum State hinzufügen
        set({
          tabs: [...state.tabs, newTab],
          activeTabId: localTabId,
        });

        try {
          const response = await browserApi.createTab(state.session.sessionId, targetUrl);
          
          // Tab mit Service-Daten aktualisieren
          get().updateTab(localTabId, {
            serviceTabId: response.tabId,
            url: response.url,
            title: response.title,
            screenshot: response.screenshot,
            isLoading: false,
          });

          // Zu Verlauf hinzufügen
          get().addToHistory(response.url, response.title);
          
        } catch (error) {
          console.error('Fehler beim Erstellen des Tabs im Service:', error);
          // Bei Fehler: Session könnte ungültig sein - neu initialisieren
          set({ session: null, tabs: [], activeTabId: null });
          await get().initSession();
        }
      },

      // Tab schließen
      closeTab: async (tabId) => {
        const state = get();
        const tab = state.tabs.find(t => t.id === tabId);
        
        // Im Service schließen wenn verbunden
        if (state.session?.sessionId && tab?.serviceTabId && state.tabs.length > 1) {
          try {
            await browserApi.closeTab(state.session.sessionId, tab.serviceTabId);
          } catch (error) {
            console.error('Fehler beim Schließen des Tabs im Service:', error);
          }
        }

        const newTabs = state.tabs.filter(t => t.id !== tabId);
        
        // Wenn der geschlossene Tab aktiv war, aktiven Tab neu setzen
        let newActiveTabId = state.activeTabId;
        if (state.activeTabId === tabId) {
          newActiveTabId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
        }

        set({
          tabs: newTabs,
          activeTabId: newActiveTabId,
        });
      },

      // Zu anderem Tab wechseln
      switchTab: (tabId) => {
        const state = get();
        const tab = state.tabs.find(t => t.id === tabId);
        
        if (tab && state.session?.sessionId && tab.serviceTabId) {
          // Im Service aktivieren
          browserApi.activateTab(state.session.sessionId, tab.serviceTabId).catch(console.error);
        }
        
        set({ activeTabId: tabId });
      },

      // Tab aktualisieren
      updateTab: (tabId, updates) => {
        set((state) => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId ? { ...tab, ...updates } : tab
          ),
        }));
      },

      // ----------------------------------------
      // Navigation Actions
      // Navigieren, Zurück, Vorwärts, Neu laden
      // ----------------------------------------

      // Zu URL navigieren
      navigate: async (tabId, url) => {
        const state = get();
        const tab = state.tabs.find(t => t.id === tabId);
        if (!tab) return;

        // URL normalisieren
        let normalizedUrl = url.trim();
        if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
          if (normalizedUrl.includes('.') && !normalizedUrl.includes(' ')) {
            normalizedUrl = 'https://' + normalizedUrl;
          } else {
            normalizedUrl = `https://www.google.com/search?q=${encodeURIComponent(normalizedUrl)}`;
          }
        }

        // Tab als "lädt" markieren
        get().updateTab(tabId, {
          url: normalizedUrl,
          isLoading: true,
          hasError: false,
          errorMessage: undefined,
        });

        // Prüfen ob Session und Tab gültig sind
        if (!state.session?.sessionId || !state.isServiceAvailable || !tab.serviceTabId) {
          console.log('Session oder Tab ungültig, initialisiere neu...');
          // Session neu erstellen
          set({ session: null, tabs: [], activeTabId: null });
          await get().initSession();
          
          // Nach neuer Session, zur URL navigieren
          const newState = get();
          const newTab = newState.tabs[0];
          if (newTab && newState.session?.sessionId) {
            try {
              const response = await browserApi.navigateToUrl(
                newState.session.sessionId,
                normalizedUrl,
                newTab.serviceTabId
              );
              get().updateTab(newTab.id, {
                url: response.url,
                title: response.title,
                screenshot: response.screenshot,
                isLoading: false,
                canGoBack: true,
                lastScreenshotAt: Date.now(),
              });
              get().addToHistory(response.url, response.title);
            } catch (e) {
              console.error('Navigation nach Session-Reset fehlgeschlagen:', e);
            }
          }
          return;
        }

        // Im Service navigieren
        try {
          const response = await browserApi.navigateToUrl(
            state.session.sessionId,
            normalizedUrl,
            tab.serviceTabId
          );

          get().updateTab(tabId, {
            url: response.url,
            title: response.title,
            screenshot: response.screenshot,
            isLoading: false,
            canGoBack: true,
            lastScreenshotAt: Date.now(),
          });

          get().addToHistory(response.url, response.title);
          
        } catch (error) {
          console.error('Navigation fehlgeschlagen:', error);
          // Bei Fehler könnte Session ungültig sein - neu versuchen
          const errorMsg = error instanceof Error ? error.message : '';
          if (errorMsg.includes('nicht gefunden') || errorMsg.includes('not found')) {
            // Session ist ungültig - neu initialisieren
            set({ session: null, tabs: [], activeTabId: null });
            await get().initSession();
          } else {
            get().updateTab(tabId, {
              isLoading: false,
              hasError: true,
              errorMessage: error instanceof Error ? error.message : 'Navigation fehlgeschlagen',
            });
          }
        }
      },

      // Zurück navigieren
      goBack: async (tabId) => {
        const state = get();
        const tab = state.tabs.find(t => t.id === tabId);
        if (!tab?.canGoBack || !state.session?.sessionId) return;

        get().updateTab(tabId, { isLoading: true });

        try {
          const response = await browserApi.navigateBack(
            state.session.sessionId,
            tab.serviceTabId
          );

          get().updateTab(tabId, {
            url: response.url,
            title: response.title,
            screenshot: response.screenshot,
            isLoading: false,
            lastScreenshotAt: Date.now(),
          });
        } catch (error) {
          console.error('Zurück-Navigation fehlgeschlagen:', error);
          get().updateTab(tabId, { isLoading: false });
        }
      },

      // Vorwärts navigieren
      goForward: async (tabId) => {
        const state = get();
        const tab = state.tabs.find(t => t.id === tabId);
        if (!tab?.canGoForward || !state.session?.sessionId) return;

        get().updateTab(tabId, { isLoading: true });

        try {
          const response = await browserApi.navigateForward(
            state.session.sessionId,
            tab.serviceTabId
          );

          get().updateTab(tabId, {
            url: response.url,
            title: response.title,
            screenshot: response.screenshot,
            isLoading: false,
            lastScreenshotAt: Date.now(),
          });
        } catch (error) {
          console.error('Vorwärts-Navigation fehlgeschlagen:', error);
          get().updateTab(tabId, { isLoading: false });
        }
      },

      // Seite neu laden
      reload: async (tabId) => {
        const state = get();
        const tab = state.tabs.find(t => t.id === tabId);
        if (!tab || !state.session?.sessionId) return;

        get().updateTab(tabId, { isLoading: true });

        try {
          const response = await browserApi.refreshPage(
            state.session.sessionId,
            tab.serviceTabId
          );

          get().updateTab(tabId, {
            url: response.url,
            title: response.title,
            screenshot: response.screenshot,
            isLoading: false,
            lastScreenshotAt: Date.now(),
          });
        } catch (error) {
          console.error('Seite neu laden fehlgeschlagen:', error);
          get().updateTab(tabId, { isLoading: false });
        }
      },

      // ----------------------------------------
      // Interaktion Actions (NEU)
      // Klicks, Texteingabe, Scroll
      // ----------------------------------------

      // Klick auf Koordinaten
      handleClick: async (tabId, x, y) => {
        const state = get();
        const tab = state.tabs.find(t => t.id === tabId);
        if (!tab || !state.session?.sessionId) return;

        try {
          const response = await browserApi.click(
            state.session.sessionId,
            x,
            y,
            'left',
            tab.serviceTabId
          );

          get().updateTab(tabId, {
            screenshot: response.screenshot,
            url: response.url || tab.url,
            title: response.title || tab.title,
            lastScreenshotAt: Date.now(),
          });
        } catch (error) {
          console.error('Klick fehlgeschlagen:', error);
        }
      },

      // Text eingeben
      handleType: async (tabId, text) => {
        const state = get();
        const tab = state.tabs.find(t => t.id === tabId);
        if (!tab || !state.session?.sessionId) return;

        try {
          const response = await browserApi.type(
            state.session.sessionId,
            text,
            undefined,
            tab.serviceTabId
          );

          get().updateTab(tabId, {
            screenshot: response.screenshot,
            lastScreenshotAt: Date.now(),
          });
        } catch (error) {
          console.error('Texteingabe fehlgeschlagen:', error);
        }
      },

      // Scrollen
      handleScroll: async (tabId, deltaX, deltaY) => {
        const state = get();
        const tab = state.tabs.find(t => t.id === tabId);
        if (!tab || !state.session?.sessionId) return;

        try {
          const response = await browserApi.scroll(
            state.session.sessionId,
            deltaX,
            deltaY,
            tab.serviceTabId
          );

          get().updateTab(tabId, {
            screenshot: response.screenshot,
            lastScreenshotAt: Date.now(),
          });
        } catch (error) {
          console.error('Scroll fehlgeschlagen:', error);
        }
      },

      // Taste drücken
      handleKeypress: async (tabId, key) => {
        const state = get();
        const tab = state.tabs.find(t => t.id === tabId);
        if (!tab || !state.session?.sessionId) return;

        try {
          const response = await browserApi.keypress(
            state.session.sessionId,
            key,
            undefined,
            tab.serviceTabId
          );

          get().updateTab(tabId, {
            screenshot: response.screenshot,
            url: response.url || tab.url,
            title: response.title || tab.title,
            lastScreenshotAt: Date.now(),
          });
        } catch (error) {
          console.error('Tastendruck fehlgeschlagen:', error);
        }
      },

      // Screenshot aktualisieren
      refreshScreenshot: async (tabId) => {
        const state = get();
        const tab = state.tabs.find(t => t.id === tabId);
        if (!tab || !state.session?.sessionId) return;

        try {
          const response = await browserApi.getScreenshot(
            state.session.sessionId,
            tab.serviceTabId
          );

          get().updateTab(tabId, {
            screenshot: response.screenshot,
            url: response.url,
            title: response.title,
            lastScreenshotAt: Date.now(),
          });
        } catch (error) {
          console.error('Screenshot-Aktualisierung fehlgeschlagen:', error);
        }
      },

      // ----------------------------------------
      // History Actions
      // Verlauf verwalten
      // ----------------------------------------

      addToHistory: (url, title) => {
        set((state) => {
          const existingEntry = state.history.find(entry => entry.url === url);
          
          if (existingEntry) {
            return {
              history: state.history.map(entry =>
                entry.id === existingEntry.id
                  ? {
                      ...entry,
                      title,
                      visitedAt: Date.now(),
                      visitCount: entry.visitCount + 1,
                    }
                  : entry
              ),
            };
          } else {
            const newEntry: BrowserHistoryEntry = {
              id: crypto.randomUUID(),
              url,
              title,
              visitedAt: Date.now(),
              visitCount: 1,
            };

            const newHistory = [newEntry, ...state.history].slice(0, MAX_HISTORY_ENTRIES);
            return { history: newHistory };
          }
        });
      },

      clearHistory: () => {
        set({ history: [] });
      },

      removeHistoryEntry: (entryId) => {
        set((state) => ({
          history: state.history.filter(entry => entry.id !== entryId),
        }));
      },

      // ----------------------------------------
      // Bookmark Actions
      // Lesezeichen verwalten
      // ----------------------------------------

      addBookmark: (url, title, folderId) => {
        const newBookmark: BrowserBookmark = {
          id: crypto.randomUUID(),
          url,
          title,
          folderId,
          createdAt: Date.now(),
        };

        set((state) => ({
          bookmarks: [...state.bookmarks, newBookmark],
        }));
      },

      removeBookmark: (bookmarkId) => {
        set((state) => ({
          bookmarks: state.bookmarks.filter(bookmark => bookmark.id !== bookmarkId),
        }));
      },

      updateBookmark: (bookmarkId, updates) => {
        set((state) => ({
          bookmarks: state.bookmarks.map(bookmark =>
            bookmark.id === bookmarkId ? { ...bookmark, ...updates } : bookmark
          ),
        }));
      },

      createBookmarkFolder: (name) => {
        const newFolder: BrowserBookmarkFolder = {
          id: crypto.randomUUID(),
          name,
          bookmarkIds: [],
          createdAt: Date.now(),
        };

        set((state) => ({
          bookmarkFolders: [...state.bookmarkFolders, newFolder],
        }));
      },

      removeBookmarkFolder: (folderId) => {
        set((state) => {
          const updatedBookmarks = state.bookmarks.map(bookmark =>
            bookmark.folderId === folderId ? { ...bookmark, folderId: undefined } : bookmark
          );

          return {
            bookmarks: updatedBookmarks,
            bookmarkFolders: state.bookmarkFolders.filter(folder => folder.id !== folderId),
          };
        });
      },
    }),
    {
      name: 'llm-council-browser-state',
      partialize: (state) => ({
        // Session NICHT persistieren (wird neu erstellt)
        tabs: state.tabs.map(tab => ({
          ...tab,
          // Screenshot nicht persistieren (zu groß)
          screenshot: undefined,
          serviceTabId: undefined,
          isLoading: false,
        })),
        activeTabId: state.activeTabId,
        history: state.history,
        bookmarks: state.bookmarks,
        bookmarkFolders: state.bookmarkFolders,
      }),
    }
  )
);

// --------------------------------------------
// Selectors für optimierte Re-Renders
// Nur die benötigten Teile des Stores abonnieren
// --------------------------------------------

export const useBrowserTabs = () => 
  useBrowserStore((state) => state.tabs);

export const useActiveBrowserTab = () => 
  useBrowserStore((state) => state.tabs.find(tab => tab.id === state.activeTabId));

export const useBrowserHistory = () => 
  useBrowserStore((state) => state.history);

export const useBrowserBookmarks = () => 
  useBrowserStore((state) => state.bookmarks);

export const useBrowserSession = () =>
  useBrowserStore((state) => state.session);

export const useIsBrowserServiceAvailable = () =>
  useBrowserStore((state) => state.isServiceAvailable);
