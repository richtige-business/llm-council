// ============================================
// app-handler.ts - App Action Handler
// 
// Zweck: Führt App-weite Agent-Actions im Frontend aus
// Verwendet von: Action Registry, useAgentExecutor
// ============================================

'use client';

import { useAppStore } from '@/lib/store/app-store';
import type { AgentAction, ActionHandler, ActionResult } from '../types';

// --------------------------------------------
// Hintergrund-URLs
// --------------------------------------------

const BACKGROUNDS: Record<string, string> = {
  'mountains-lake': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
  'northern-lights': 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1920&q=80',
  'forest-mist': 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80',
  'ocean-sunset': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80',
  'city-night': 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1920&q=80',
  'desert-dunes': 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1920&q=80',
};

// --------------------------------------------
// App Action Handler
// --------------------------------------------

export const appActionHandler: ActionHandler = {
  moduleId: 'app',

  supportedActions: [
    'app.openModule',
    'app.navigate',
    'app.changeBackground',
    'app.toggleSidebar',
    'app.switchTab',
    'app.closeTab',
    'app.searchGlobal',
  ],

  execute: async (action: AgentAction): Promise<ActionResult> => {
    // Store abrufen (außerhalb von React-Kontext)
    const appStore = useAppStore.getState();

    try {
      switch (action.type) {
        // ========================================
        // Modul öffnen
        // ========================================
        case 'app.openModule': {
          const { moduleId, toggleSidebar, open } = action.payload as { 
            moduleId?: string;
            toggleSidebar?: boolean;
            open?: boolean;
          };
          
          // Sidebar toggle
          if (toggleSidebar) {
            if (open !== undefined) {
              appStore.setSidebarOpen(open);
            } else {
              appStore.toggleSidebar();
            }
            return { success: true };
          }
          
          // Modul öffnen
          if (moduleId) {
            appStore.openTab(moduleId);
          }
          
          return { success: true };
        }

        // ========================================
        // Navigieren
        // ========================================
        case 'app.navigate': {
          const { path } = action.payload as { path: string };
          
          // Router.push ist hier nicht verfügbar
          // Wir müssen das über window.location machen
          // oder über einen anderen Mechanismus
          if (typeof window !== 'undefined') {
            window.location.href = path;
          }
          
          return { success: true };
        }

        // ========================================
        // Hintergrund ändern
        // ========================================
        case 'app.changeBackground': {
          const { backgroundId, customUrl } = action.payload as { 
            backgroundId?: string; 
            customUrl?: string;
          };
          
          const url = customUrl || (backgroundId ? BACKGROUNDS[backgroundId] : null);
          
          if (url) {
            appStore.setBackgroundImage(url);
            return { success: true };
          }
          
          return { 
            success: false, 
            error: 'Keine gültige Hintergrund-URL',
          };
        }

        // ========================================
        // Sidebar toggle (Legacy)
        // ========================================
        case 'app.toggleSidebar': {
          const { open } = action.payload as { open?: boolean };
          
          if (open !== undefined) {
            appStore.setSidebarOpen(open);
          } else {
            appStore.toggleSidebar();
          }
          
          return { success: true };
        }

        // ========================================
        // Zu bestehendem Modul-Tab wechseln
        // ========================================
        case 'app.switchTab': {
          const { moduleId } = action.payload as { moduleId?: string };

          if (!moduleId) {
            return { success: false, error: 'moduleId fehlt' };
          }

          appStore.openTab(moduleId);
          return { success: true };
        }

        // ========================================
        // Modul-Tab schließen
        // ========================================
        case 'app.closeTab': {
          const { moduleId } = action.payload as { moduleId?: string };

          if (!moduleId) {
            return { success: false, error: 'moduleId fehlt' };
          }

          const targetWindow = appStore.openTabs.find((windowEntry) =>
            windowEntry.tabs.some((tab) => tab.moduleId === moduleId)
          );

          if (!targetWindow) {
            return { success: false, error: `Kein offener Tab fuer ${moduleId} gefunden` };
          }

          appStore.closeTab(targetWindow.id);
          return { success: true };
        }

        // ========================================
        // Globale Suche vorbereiten
        // MVP: Fokus auf den Master-Chat mit Query-Kontext
        // ========================================
        case 'app.searchGlobal': {
          const { query } = action.payload as { query?: string };

          if (!query?.trim()) {
            return { success: false, error: 'Suchbegriff fehlt' };
          }

          appStore.openChatTab('master');
          appStore.setActiveModule('agents');
          appStore.setActiveTool(`global-search:${query.trim()}`);
          return { success: true };
        }

        default:
          return { 
            success: false, 
            error: `Unbekannte App-Action: ${action.type}`,
          };
      }
    } catch (error) {
      console.error(`App Action Handler Fehler:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      };
    }
  },
};
