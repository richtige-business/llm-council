// ============================================
// handler.ts - Browser Action Handler
// 
// Zweck: Führt Browser-spezifische Agent-Actions im Frontend aus
// Verwendet von: Action Registry, useAgentExecutor
// ============================================

'use client';

import { useBrowserStore } from '../store';
import { useAppStore } from '@/lib/store/app-store';
import type { AgentAction, ActionHandler, ActionResult } from '@/lib/agent/types';

// --------------------------------------------
// Browser Action Handler
// --------------------------------------------

export const browserActionHandler: ActionHandler = {
  moduleId: 'browser',

  supportedActions: [
    'browser.openTab',
    'browser.navigate',
    'browser.addBookmark',
    'browser.downloadFile',
  ],

  execute: async (action: AgentAction): Promise<ActionResult> => {
    // Stores abrufen (außerhalb von React-Kontext)
    const browserStore = useBrowserStore.getState();
    const appStore = useAppStore.getState();

    try {
      switch (action.type) {
        // ========================================
        // Browser öffnen
        // ========================================
        case 'browser.openTab': {
          // Tab öffnen
          appStore.openTab('browser');
          
          return { success: true };
        }

        // ========================================
        // URL navigieren
        // ========================================
        case 'browser.navigate': {
          const { url, newTab } = action.payload as { 
            url: string; 
            newTab?: boolean;
          };
          
          // Browser öffnen
          appStore.openTab('browser');
          
          // Kurz warten, dann navigieren
          setTimeout(async () => {
            try {
              if (newTab) {
                // Neuen Tab erstellen
                await browserStore.createTab(url);
              } else {
                // Im aktiven Tab navigieren
                const activeTabId = browserStore.activeTabId;
                if (activeTabId) {
                  await browserStore.navigate(activeTabId, url);
                } else {
                  // Kein aktiver Tab, neuen erstellen
                  await browserStore.createTab(url);
                }
              }
            } catch (error) {
              console.error('Browser Navigation fehlgeschlagen:', error);
            }
          }, 100);
          
          return { success: true };
        }

        // ========================================
        // Lesezeichen hinzufügen
        // ========================================
        case 'browser.addBookmark': {
          const { url, title, folder } = action.payload as { 
            url?: string; 
            title?: string;
            folder?: string;
          };
          
          // Aktuelle Seite verwenden falls keine URL angegeben
          let bookmarkUrl = url;
          let bookmarkTitle = title;
          
          if (!bookmarkUrl) {
            // Versuche aktuelle Tab-URL zu verwenden
            const activeTab = browserStore.tabs.find(
              t => t.id === browserStore.activeTabId
            );
            
            if (activeTab) {
              bookmarkUrl = activeTab.url;
              bookmarkTitle = bookmarkTitle || activeTab.title;
            } else {
              return { 
                success: false, 
                error: 'Keine URL angegeben und kein aktiver Tab',
              };
            }
          }
          
          // Lesezeichen hinzufügen
          browserStore.addBookmark(
            bookmarkUrl,
            bookmarkTitle || bookmarkUrl,
            folder
          );
          
          return { success: true };
        }

        // ========================================
        // Datei herunterladen
        // ========================================
        case 'browser.downloadFile': {
          const { url, fileName } = action.payload as {
            url?: string;
            fileName?: string;
          };

          if (!url) {
            return { success: false, error: 'Keine Download-URL angegeben' };
          }

          appStore.openTab('browser');

          if (typeof document !== 'undefined') {
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName || '';
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.click();
          }

          return { success: true };
        }

        default:
          return { 
            success: false, 
            error: `Unbekannte Browser-Action: ${action.type}`,
          };
      }
    } catch (error) {
      console.error(`Browser Action Handler Fehler:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      };
    }
  },
};
