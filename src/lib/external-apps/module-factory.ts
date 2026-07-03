// ============================================
// module-factory.ts - Modul-Factory fuer Web- und Cloud-Apps
//
// Zweck: Erzeugt dynamische Module fuer manuell hinzugefuegte Web-Apps
//        und fuer externe Apps aus dem Katalog (Cloud-Browser-Streaming).
// Verwendet von: ModuleProvider, Library, ModuleCard, BaseManager, page.tsx
// ============================================

import type { Module } from '@/types';
import type { ExternalAppCatalogEntry } from './catalog';
import { EXTERNAL_APP_PREFIX } from './constants';

// --------------------------------------------
// createWebAppModule
// Modul aus Library-Eintrag (Prefix webapp-*)
// --------------------------------------------

export function createWebAppModule(appName: string, url: string, iconUrl?: string): Module {
  const moduleId = `webapp-${appName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return {
    id: moduleId,
    name: appName,
    description: `Web-App: ${appName}`,
    version: '1.0.0',
    icon: iconUrl || 'Globe',
    category: 'productivity',
    route: url,
    tools: [],
    widgets: [],
    isActive: true,
    order: 50,
  };
}

// --------------------------------------------
// createExternalAppModule
// Cloud-gestreamte externe App (Prefix extapp-*)
// --------------------------------------------

export function createExternalAppModule(
  catalogEntry: ExternalAppCatalogEntry,
  userUrl?: string
): Module {
  return {
    id: `${EXTERNAL_APP_PREFIX}${catalogEntry.id}`,
    name: catalogEntry.name,
    description: `Externe App: ${catalogEntry.description}`,
    version: '1.0.0',
    icon: catalogEntry.icon,
    category: 'productivity',
    route: catalogEntry.url,
    externalApp: {
      url: catalogEntry.url,
      catalogId: catalogEntry.id,
      userUrl,
      sessionPersist: true,
    },
    tools: [],
    widgets: [],
    isActive: true,
    order: 60,
  };
}

// --------------------------------------------
// Hilfsfunktionen: Modul-Typ erkennen
// --------------------------------------------

export function isWebAppModule(moduleId: string): boolean {
  return moduleId.startsWith('webapp-');
}

export function isExternalAppModule(moduleId: string): boolean {
  return moduleId.startsWith(EXTERNAL_APP_PREFIX);
}

/** Legacy: frueher „Native“-Webapps, heute gleichbedeutend mit webapp-* */
export function isNativeAppModule(moduleId: string): boolean {
  return moduleId.startsWith('webapp-');
}

export const createNativeAppModule = createWebAppModule;
