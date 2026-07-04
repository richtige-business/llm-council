// ============================================
// client-tool-catalog.ts - Client-sicherer Tool-Katalog
//
// Zweck: Liefert Tool-Metadaten fuer Settings-UI ohne Server-Registry
// Verwendet von: AgentSettingsBehaviorTab
// ============================================

import { getAllowedToolIdsForAgent } from './tool-scope';
import { AGENTS_TOOL_SPECS } from './agents-tool-specs';
import { BUILDER_TOOL_SPECS } from './builder-tool-specs';
import type { ToolEffect } from '@/lib/agent/types';

// --------------------------------------------
// Tool-Metadaten fuer UI
// Enthalten nur Anzeigefelder, keine execute-Logik.
// --------------------------------------------

export interface ClientToolCatalogEntry {
  id: string;
  name: string;
  description: string;
  module: string;
  effects: ToolEffect[];
  requiresConfirmation: boolean;
}

const MANUAL_TOOL_CATALOG_MAP: Record<string, ClientToolCatalogEntry> = {
  // Basic / App / Memory
  'app.openModule': {
    id: 'app.openModule',
    name: 'Modul öffnen',
    description: 'Öffnet ein Modul in LLM Council.',
    module: 'app',
    effects: ['ui'],
    requiresConfirmation: false,
  },
  'app.navigate': {
    id: 'app.navigate',
    name: 'Navigieren',
    description: 'Navigiert zu einem App-Pfad.',
    module: 'app',
    effects: ['ui'],
    requiresConfirmation: false,
  },
  'app.changeBackground': {
    id: 'app.changeBackground',
    name: 'Hintergrund ändern',
    description: 'Ändert den Dashboard-Hintergrund.',
    module: 'app',
    effects: ['ui', 'storage'],
    requiresConfirmation: false,
  },
  'app.toggleSidebar': {
    id: 'app.toggleSidebar',
    name: 'Sidebar umschalten',
    description: 'Öffnet oder schließt die Sidebar.',
    module: 'app',
    effects: ['ui'],
    requiresConfirmation: false,
  },
  'app.switchTab': {
    id: 'app.switchTab',
    name: 'Tab wechseln',
    description: 'Wechselt zu einem bereits offenen Tab oder Modul.',
    module: 'app',
    effects: ['ui'],
    requiresConfirmation: false,
  },
  'app.closeTab': {
    id: 'app.closeTab',
    name: 'Tab schließen',
    description: 'Schließt einen offenen Tab oder ein Modul.',
    module: 'app',
    effects: ['ui'],
    requiresConfirmation: false,
  },
  'app.searchGlobal': {
    id: 'app.searchGlobal',
    name: 'Global suchen',
    description: 'Startet eine globale Suche in der App.',
    module: 'app',
    effects: ['ui'],
    requiresConfirmation: false,
  },
  'app.help': {
    id: 'app.help',
    name: 'Hilfe anzeigen',
    description: 'Zeigt Hilfetexte für Themen oder Module.',
    module: 'app',
    effects: [],
    requiresConfirmation: false,
  },
  'memory.recall': {
    id: 'memory.recall',
    name: 'Memory abrufen',
    description: 'Sucht relevante gespeicherte Erinnerungen.',
    module: 'memory',
    effects: ['storage'],
    requiresConfirmation: false,
  },
  'memory.list': {
    id: 'memory.list',
    name: 'Memories auflisten',
    description: 'Listet gespeicherte Memories auf.',
    module: 'memory',
    effects: ['storage'],
    requiresConfirmation: false,
  },
  'memory.save': {
    id: 'memory.save',
    name: 'Memory speichern',
    description: 'Speichert Präferenzen, Fakten oder Instruktionen.',
    module: 'memory',
    effects: ['storage'],
    requiresConfirmation: false,
  },
  'memory.update': {
    id: 'memory.update',
    name: 'Memory aktualisieren',
    description: 'Aktualisiert einen bestehenden Memory-Eintrag.',
    module: 'memory',
    effects: ['storage'],
    requiresConfirmation: false,
  },
  'memory.delete': {
    id: 'memory.delete',
    name: 'Memory löschen',
    description: 'Löscht einen einzelnen Memory-Eintrag.',
    module: 'memory',
    effects: ['storage'],
    requiresConfirmation: true,
  },
  'memory.clearCategory': {
    id: 'memory.clearCategory',
    name: 'Memory-Kategorie leeren',
    description: 'Löscht alle Memories einer Kategorie.',
    module: 'memory',
    effects: ['storage'],
    requiresConfirmation: true,
  },
  'memory.export': {
    id: 'memory.export',
    name: 'Memories exportieren',
    description: 'Exportiert gespeicherte Memories.',
    module: 'memory',
    effects: ['storage'],
    requiresConfirmation: false,
  },
  'memory.import': {
    id: 'memory.import',
    name: 'Memories importieren',
    description: 'Importiert gespeicherte Memories aus einer Payload.',
    module: 'memory',
    effects: ['storage'],
    requiresConfirmation: true,
  },

  // Calendar
  'calendar.createEvent': {
    id: 'calendar.createEvent',
    name: 'Termin erstellen',
    description: 'Erstellt ein Kalender-Event.',
    module: 'calendar',
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
  },
  'calendar.listEvents': {
    id: 'calendar.listEvents',
    name: 'Termine anzeigen',
    description: 'Listet Termine für einen Zeitraum.',
    module: 'calendar',
    effects: ['ui'],
    requiresConfirmation: false,
  },
  'calendar.deleteEvent': {
    id: 'calendar.deleteEvent',
    name: 'Termin löschen',
    description: 'Löscht ein Event aus dem Kalender.',
    module: 'calendar',
    effects: ['storage', 'ui'],
    requiresConfirmation: true,
  },
  'calendar.open': {
    id: 'calendar.open',
    name: 'Kalender öffnen',
    description: 'Öffnet die Kalenderansicht.',
    module: 'calendar',
    effects: ['ui'],
    requiresConfirmation: false,
  },
  'calendar.getStatus': {
    id: 'calendar.getStatus',
    name: 'Kalender-Status',
    description: 'Liefert Statusinfos zum Kalender.',
    module: 'calendar',
    effects: [],
    requiresConfirmation: false,
  },
  'calendar.updateEvent': {
    id: 'calendar.updateEvent',
    name: 'Termin aktualisieren',
    description: 'Aktualisiert einen bestehenden Termin.',
    module: 'calendar',
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
  },

  // Inbox
  'inbox.sendEmail': {
    id: 'inbox.sendEmail',
    name: 'E-Mail senden',
    description: 'Bereitet E-Mail-Versand vor.',
    module: 'inbox',
    effects: ['ui'],
    requiresConfirmation: false,
  },
  'inbox.searchEmails': {
    id: 'inbox.searchEmails',
    name: 'E-Mails suchen',
    description: 'Durchsucht E-Mails nach Kriterien.',
    module: 'inbox',
    effects: ['storage'],
    requiresConfirmation: false,
  },
  'inbox.open': {
    id: 'inbox.open',
    name: 'Postfach öffnen',
    description: 'Öffnet Inbox-Ordner.',
    module: 'inbox',
    effects: ['ui'],
    requiresConfirmation: false,
  },
  'inbox.markEmail': {
    id: 'inbox.markEmail',
    name: 'E-Mail markieren',
    description: 'Markiert, archiviert oder löscht E-Mails.',
    module: 'inbox',
    effects: ['storage'],
    requiresConfirmation: false,
  },
  'inbox.composeEmail': {
    id: 'inbox.composeEmail',
    name: 'E-Mail verfassen',
    description: 'Öffnet Compose mit Vorbelegung.',
    module: 'inbox',
    effects: ['ui'],
    requiresConfirmation: false,
  },
  'inbox.getStatus': {
    id: 'inbox.getStatus',
    name: 'Postfach-Status',
    description: 'Liefert Metriken zum Postfach.',
    module: 'inbox',
    effects: ['storage'],
    requiresConfirmation: false,
  },
  'inbox.filterEmails': {
    id: 'inbox.filterEmails',
    name: 'E-Mails filtern',
    description: 'Setzt Inbox-Filter (Provider, Dringlichkeit etc.).',
    module: 'inbox',
    effects: ['ui'],
    requiresConfirmation: false,
  },

  // Browser
  'browser.navigate': {
    id: 'browser.navigate',
    name: 'URL öffnen',
    description: 'Öffnet eine URL im Browser.',
    module: 'browser',
    effects: ['ui', 'network'],
    requiresConfirmation: false,
  },
  'browser.search': {
    id: 'browser.search',
    name: 'Web-Suche',
    description: 'Startet eine Websuche.',
    module: 'browser',
    effects: ['ui', 'network'],
    requiresConfirmation: false,
  },
  'browser.addBookmark': {
    id: 'browser.addBookmark',
    name: 'Lesezeichen hinzufügen',
    description: 'Speichert ein Lesezeichen.',
    module: 'browser',
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
  },
  'browser.open': {
    id: 'browser.open',
    name: 'Browser öffnen',
    description: 'Öffnet den Browser-Tab.',
    module: 'browser',
    effects: ['ui'],
    requiresConfirmation: false,
  },
  'browser.getStatus': {
    id: 'browser.getStatus',
    name: 'Browser-Status',
    description: 'Liefert Browser-Statusinfos.',
    module: 'browser',
    effects: [],
    requiresConfirmation: false,
  },
  'browser.extractPage': {
    id: 'browser.extractPage',
    name: 'Seiteninhalt extrahieren',
    description: 'Extrahiert lesbaren Inhalt aus der aktuellen Seite.',
    module: 'browser',
    effects: ['ui'],
    requiresConfirmation: false,
  },
  'browser.summarizePage': {
    id: 'browser.summarizePage',
    name: 'Seite zusammenfassen',
    description: 'Erstellt eine Zusammenfassung der aktuellen Seite.',
    module: 'browser',
    effects: ['ui'],
    requiresConfirmation: false,
  },
  'browser.readSelection': {
    id: 'browser.readSelection',
    name: 'Auswahl lesen',
    description: 'Liest die aktuelle Auswahl aus dem Browser.',
    module: 'browser',
    effects: ['ui'],
    requiresConfirmation: false,
  },
  'browser.downloadFile': {
    id: 'browser.downloadFile',
    name: 'Datei herunterladen',
    description: 'Startet einen Datei-Download im Browser.',
    module: 'browser',
    effects: ['network', 'storage', 'ui'],
    requiresConfirmation: false,
  },

  // Agents
  'agents.openWorkspace': {
    id: 'agents.openWorkspace',
    name: 'Agents Workspace öffnen',
    description: 'Öffnet den Agents-Workspace.',
    module: 'agents',
    effects: ['ui'],
    requiresConfirmation: false,
  },
  'agents.createAgent': {
    id: 'agents.createAgent',
    name: 'Agent erstellen',
    description: 'Erstellt einen neuen Agenten.',
    module: 'agents',
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
  },
  'agents.updateAgent': {
    id: 'agents.updateAgent',
    name: 'Agent aktualisieren',
    description: 'Aktualisiert Agent-Einstellungen.',
    module: 'agents',
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
  },
  'agents.deleteAgent': {
    id: 'agents.deleteAgent',
    name: 'Agent löschen',
    description: 'Löscht einen Agenten.',
    module: 'agents',
    effects: ['storage', 'ui'],
    requiresConfirmation: true,
  },
  'agents.createGroup': {
    id: 'agents.createGroup',
    name: 'Gruppe erstellen',
    description: 'Erstellt eine Agent-Gruppe.',
    module: 'agents',
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
  },
  'agents.runCouncil': {
    id: 'agents.runCouncil',
    name: 'Run council',
    description: 'Starts a council deliberation.',
    module: 'agents',
    effects: ['ui'],
    requiresConfirmation: false,
  },

  // Settings
  'settings.open': {
    id: 'settings.open',
    name: 'Einstellungen öffnen',
    description: 'Öffnet den Settings-Bereich.',
    module: 'settings',
    effects: ['ui'],
    requiresConfirmation: false,
  },
  'settings.search': {
    id: 'settings.search',
    name: 'Einstellungen durchsuchen',
    description: 'Sucht nach Settings-Bereichen.',
    module: 'settings',
    effects: ['ui'],
    requiresConfirmation: false,
  },
  'settings.updatePreference': {
    id: 'settings.updatePreference',
    name: 'Präferenz setzen',
    description: 'Setzt eine User-Präferenz.',
    module: 'settings',
    effects: ['storage'],
    requiresConfirmation: false,
  },
  'settings.getPreference': {
    id: 'settings.getPreference',
    name: 'Präferenz abrufen',
    description: 'Lädt eine gespeicherte User-Präferenz.',
    module: 'settings',
    effects: ['storage'],
    requiresConfirmation: false,
  },
  'settings.listSections': {
    id: 'settings.listSections',
    name: 'Sektionen auflisten',
    description: 'Listet verfügbare Settings-Sektionen.',
    module: 'settings',
    effects: ['ui'],
    requiresConfirmation: false,
  },
  'settings.export': {
    id: 'settings.export',
    name: 'Settings exportieren',
    description: 'Exportiert Einstellungen oder eine Sektion.',
    module: 'settings',
    effects: ['storage'],
    requiresConfirmation: false,
  },
  'settings.import': {
    id: 'settings.import',
    name: 'Settings importieren',
    description: 'Importiert Einstellungen aus einer Payload.',
    module: 'settings',
    effects: ['storage'],
    requiresConfirmation: true,
  },
  'settings.setTheme': {
    id: 'settings.setTheme',
    name: 'Theme setzen',
    description: 'Setzt das globale App-Theme.',
    module: 'settings',
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
  },
  'settings.setLanguage': {
    id: 'settings.setLanguage',
    name: 'Sprache setzen',
    description: 'Setzt die Sprache der App.',
    module: 'settings',
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
  },
  'settings.setPrivacyMode': {
    id: 'settings.setPrivacyMode',
    name: 'Privacy-Mode setzen',
    description: 'Aktiviert oder deaktiviert Datenschutzmodi.',
    module: 'settings',
    effects: ['storage'],
    requiresConfirmation: false,
  },
  'settings.resetPreference': {
    id: 'settings.resetPreference',
    name: 'Präferenz zurücksetzen',
    description: 'Setzt eine Präferenz auf Standard zurück.',
    module: 'settings',
    effects: ['storage'],
    requiresConfirmation: true,
  },

  // Marketplace
  'marketplace.open': {
    id: 'marketplace.open',
    name: 'Marketplace öffnen',
    description: 'Öffnet die Modul-Bibliothek.',
    module: 'marketplace',
    effects: ['ui'],
    requiresConfirmation: false,
  },
  'marketplace.search': {
    id: 'marketplace.search',
    name: 'Marketplace durchsuchen',
    description: 'Sucht Module im Marketplace.',
    module: 'marketplace',
    effects: ['ui'],
    requiresConfirmation: false,
  },
  'marketplace.getModule': {
    id: 'marketplace.getModule',
    name: 'Marketplace-Modul laden',
    description: 'Lädt Details eines Marketplace-Moduls.',
    module: 'marketplace',
    effects: ['ui'],
    requiresConfirmation: false,
  },
  'marketplace.listInstalled': {
    id: 'marketplace.listInstalled',
    name: 'Installierte Module',
    description: 'Listet installierte Module auf.',
    module: 'marketplace',
    effects: ['storage'],
    requiresConfirmation: false,
  },
  'marketplace.install': {
    id: 'marketplace.install',
    name: 'Modul installieren',
    description: 'Installiert ein Modul.',
    module: 'marketplace',
    effects: ['storage', 'ui'],
    requiresConfirmation: true,
  },
  'marketplace.updateModule': {
    id: 'marketplace.updateModule',
    name: 'Modul aktualisieren',
    description: 'Aktualisiert ein installiertes Modul.',
    module: 'marketplace',
    effects: ['storage', 'network', 'ui'],
    requiresConfirmation: true,
  },
  'marketplace.openModuleDetails': {
    id: 'marketplace.openModuleDetails',
    name: 'Moduldetails öffnen',
    description: 'Öffnet die Detailansicht eines Moduls.',
    module: 'marketplace',
    effects: ['ui'],
    requiresConfirmation: false,
  },
  'marketplace.rateModule': {
    id: 'marketplace.rateModule',
    name: 'Modul bewerten',
    description: 'Bewertet ein Modul im Marketplace.',
    module: 'marketplace',
    effects: ['network'],
    requiresConfirmation: false,
  },
  'marketplace.uninstall': {
    id: 'marketplace.uninstall',
    name: 'Modul deinstallieren',
    description: 'Deinstalliert ein Modul.',
    module: 'marketplace',
    effects: ['storage', 'ui'],
    requiresConfirmation: true,
  },

  // Lab
  'lab.runDebugCommand': {
    id: 'lab.runDebugCommand',
    name: 'Debug Command ausführen',
    description: 'Führt sichere Lab-Debugbefehle aus.',
    module: 'lab',
    effects: ['storage'],
    requiresConfirmation: false,
  },
  'lab.openBuilder': {
    id: 'lab.openBuilder',
    name: 'Builder öffnen',
    description: 'Öffnet den Module Builder.',
    module: 'lab',
    effects: ['ui'],
    requiresConfirmation: false,
  },
  'lab.createProject': {
    id: 'lab.createProject',
    name: 'Builder-Projekt erstellen',
    description: 'Erstellt ein neues Lab-Projekt.',
    module: 'lab',
    effects: ['storage'],
    requiresConfirmation: false,
  },
  'lab.generateModule': {
    id: 'lab.generateModule',
    name: 'Modul generieren',
    description: 'Startet Modul-Generierung im Builder.',
    module: 'lab',
    effects: ['storage', 'network'],
    requiresConfirmation: false,
  },
  'lab.previewModule': {
    id: 'lab.previewModule',
    name: 'Modul previewen',
    description: 'Erzeugt eine Vorschau für das Modul.',
    module: 'lab',
    effects: ['ui'],
    requiresConfirmation: false,
  },
  'lab.publishModule': {
    id: 'lab.publishModule',
    name: 'Modul publizieren',
    description: 'Publiziert ein generiertes Modul.',
    module: 'lab',
    effects: ['storage', 'network', 'ui'],
    requiresConfirmation: true,
  },
};

const GENERATED_TOOL_CATALOG_MAP: Record<string, ClientToolCatalogEntry> = Object.fromEntries(
  [...AGENTS_TOOL_SPECS, ...BUILDER_TOOL_SPECS].map((tool) => [
    tool.id,
    {
      id: tool.id,
      name: tool.name,
      description: tool.description,
      module: tool.module,
      effects: tool.effects,
      requiresConfirmation: tool.requiresConfirmation,
    },
  ])
);

const TOOL_CATALOG_MAP: Record<string, ClientToolCatalogEntry> = {
  ...MANUAL_TOOL_CATALOG_MAP,
  ...GENERATED_TOOL_CATALOG_MAP,
};

// --------------------------------------------
// Scope-basierte Liste fuer einen Agent
// Liefert nur die in den Scopes erlaubten Eintraege.
// --------------------------------------------

export function getClientToolsForAgent(agentId: string): ClientToolCatalogEntry[] {
  const allowedToolIds = getAllowedToolIdsForAgent(agentId);
  return allowedToolIds.map((toolId) => {
    const entry = TOOL_CATALOG_MAP[toolId];
    if (entry) return entry;

    // Fallback für IDs, die noch nicht katalogisiert sind.
    const moduleIdPart = toolId.split('.')[0] || 'internal';
    return {
      id: toolId,
      name: toolId,
      description: 'Tool-Metadaten fehlen im Client-Katalog.',
      module: moduleIdPart,
      effects: [],
      requiresConfirmation: false,
    };
  });
}

