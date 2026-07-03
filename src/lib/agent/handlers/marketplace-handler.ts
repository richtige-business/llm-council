// ============================================
// marketplace-handler.ts - Frontend-Handler fuer Marketplace-Actions
//
// Zweck: Fuehrt Marketplace-/Library-Tools im Client aus,
//        damit Installationen und Discovery direkt sichtbar sind.
// Verwendet von: useAgentExecutor, Marketplace-Tools
// ============================================

'use client';

import { useMarketplaceStore } from '@/lib/marketplace/store';
import { useAppStore } from '@/lib/store/app-store';
import type { AgentAction, ActionHandler, ActionResult } from '@/lib/agent/types';

// --------------------------------------------
// Marketplace Handler
// Oeffnet immer die Bibliothek, damit der User die Aktion sieht.
// --------------------------------------------

export const marketplaceActionHandler: ActionHandler = {
  moduleId: 'marketplace',
  supportedActions: [
    'marketplace.search',
    'marketplace.install',
    'marketplace.getModule',
    'marketplace.listInstalled',
    'marketplace.updateModule',
    'marketplace.openModuleDetails',
    'marketplace.rateModule',
    'marketplace.uninstall',
  ],
  execute: async (action: AgentAction): Promise<ActionResult> => {
    const appStore = useAppStore.getState();
    const marketplaceStore = useMarketplaceStore.getState();

    appStore.openTab('library');

    try {
      switch (action.type) {
        case 'marketplace.search': {
          const { query, category } = action.payload as { query?: string; category?: string };
          marketplaceStore.setSearchQuery(query?.trim() || '');
          if (category?.trim()) {
            marketplaceStore.setCategory(category as Parameters<typeof marketplaceStore.setCategory>[0]);
          }
          return { success: true };
        }

        case 'marketplace.install': {
          const { moduleId } = action.payload as { moduleId?: string };
          if (!moduleId?.trim()) {
            return { success: false, error: 'moduleId fehlt' };
          }
          marketplaceStore.installModule(moduleId);
          return { success: true };
        }

        case 'marketplace.uninstall': {
          const { moduleId } = action.payload as { moduleId?: string };
          if (!moduleId?.trim()) {
            return { success: false, error: 'moduleId fehlt' };
          }
          marketplaceStore.uninstallModule(moduleId);
          return { success: true };
        }

        case 'marketplace.updateModule': {
          const { moduleId } = action.payload as { moduleId?: string };
          if (!moduleId?.trim()) {
            return { success: false, error: 'moduleId fehlt' };
          }
          marketplaceStore.installModule(moduleId);
          return { success: true };
        }

        case 'marketplace.openModuleDetails':
        case 'marketplace.getModule': {
          const { moduleId } = action.payload as { moduleId?: string };
          if (!moduleId?.trim()) {
            return { success: false, error: 'moduleId fehlt' };
          }
          if (typeof window !== 'undefined') {
            window.location.href = `/library/${moduleId}`;
          }
          return { success: true };
        }

        case 'marketplace.rateModule': {
          const { moduleId, rating, review } = action.payload as {
            moduleId?: string;
            rating?: number;
            review?: string;
          };

          if (!moduleId?.trim() || typeof rating !== 'number') {
            return { success: false, error: 'moduleId oder rating fehlt' };
          }

          marketplaceStore.addReview(moduleId, {
            rating,
            title: `Agent-Bewertung ${rating}/5`,
            content: review?.trim() || '',
            createdAt: new Date().toISOString(),
          });
          return { success: true };
        }

        case 'marketplace.listInstalled':
          return { success: true };

        default:
          return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Marketplace-Aktion fehlgeschlagen',
      };
    }
  },
};
