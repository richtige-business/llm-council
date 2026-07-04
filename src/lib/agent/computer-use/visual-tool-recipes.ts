// ============================================
// visual-tool-recipes.ts - Rezept-Registry fuer visuelle Tool-Ausfuehrung
//
// Zweck: Mappt Agent-Aktionen auf sichtbare UI-Schrittpfade
//        und entscheidet explizit zwischen abgeschlossen,
//        Fast-Fallback oder Fehler.
// Verwendet von: visual-executor.ts
// ============================================

import { createLogger } from '@/lib/logger';
import type { AgentAction } from '../types';
import {
  assertToastOrState,
  clickByAgentButton,
  clickElement,
  fillByAgentInput,
  openTabAndWait,
  setInputValue,
  showCursorWithMessage,
  typeInElement,
  wait,
  waitForElement,
  waitForElementToDisappear,
} from './dom-actions';

const log = createLogger('VisualToolRecipes');

// --------------------------------------------
// Ergebnis-Typen
// Das Statusmodell ersetzt das alte continueWithFastAction.
// --------------------------------------------

export type VisualExecutionStatus =
  | 'completed'
  | 'fallback_allowed'
  | 'fallback_required'
  | 'failed';

export interface VisualActionResult {
  success: boolean;
  status: VisualExecutionStatus;
  message: string;
  error?: string;
  fallbackReason?: string;
  steps: string[];
  executionMode: 'visual_only' | 'visual_then_fast_fallback' | 'fast_only_unavailable';
}

interface VisualToolRecipe {
  id: string;
  matches: (action: AgentAction) => boolean;
  run: (action: AgentAction) => Promise<VisualActionResult>;
}

// --------------------------------------------
// Grundlegende Hilfswerte
// --------------------------------------------

const MODULE_PANEL_SELECTORS: Record<string, string> = {
  calendar: '[data-agent-panel="calendar-root"]',
  inbox: '[data-agent-panel="inbox-root"]',
  browser: '[data-agent-panel="browser-root"]',
  agents: '[data-agent-panel="agents-root"]',
  lab: '[data-agent-panel="lab-root"]',
  settings: '[data-agent-panel="settings-root"]',
  library: '[data-agent-panel="library-root"]',
};

const MODULE_LABELS: Record<string, string> = {
  calendar: 'Kalender',
  inbox: 'Postfach',
  browser: 'Browser',
  agents: 'Agents',
  lab: 'Builder',
  settings: 'Einstellungen',
  library: 'Bibliothek',
};

// --------------------------------------------
// Ergebnis-Builder
// Halten die Rezepte kompakt und konsistent.
// --------------------------------------------

function completed(message: string, steps: string[]): VisualActionResult {
  return {
    success: true,
    status: 'completed',
    message,
    steps,
    executionMode: 'visual_only',
  };
}

function fallback(
  status: 'fallback_allowed' | 'fallback_required',
  message: string,
  fallbackReason: string,
  steps: string[],
  error?: string
): VisualActionResult {
  return {
    success: false,
    status,
    message,
    error,
    fallbackReason,
    steps,
    executionMode: 'fast_only_unavailable',
  };
}

function failed(message: string, steps: string[], error?: string): VisualActionResult {
  return {
    success: false,
    status: 'failed',
    message,
    error,
    steps,
    executionMode: 'fast_only_unavailable',
  };
}

// --------------------------------------------
// Allgemeine UI-Helfer
// --------------------------------------------

async function announceStep(steps: string[], message: string, y = 140, duration = 320) {
  steps.push(message);
  await showCursorWithMessage(message, window.innerWidth / 2, y, duration);
}

function getString(
  payload: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    if (typeof payload[key] === 'string' && String(payload[key]).trim()) {
      return String(payload[key]).trim();
    }
  }
  return undefined;
}

function getBoolean(payload: Record<string, unknown>, key: string): boolean | undefined {
  return typeof payload[key] === 'boolean' ? Boolean(payload[key]) : undefined;
}

function resolveActionModuleId(action: AgentAction): string | null {
  if (action.type.startsWith('marketplace.')) return 'library';
  if (action.type.startsWith('settings.')) return 'settings';
  if (action.type.startsWith('calendar.')) return 'calendar';
  if (action.type.startsWith('inbox.')) return 'inbox';
  if (action.type.startsWith('browser.')) return 'browser';
  if (action.type.startsWith('agents.')) return 'agents';
  if (action.type.startsWith('builder.') || action.type.startsWith('lab.')) return 'lab';
  if (action.type.startsWith('app.')) {
    const moduleId = getString(action.payload as Record<string, unknown>, 'moduleId');
    return moduleId || null;
  }
  return action.module || null;
}

async function openModuleWorkspace(
  moduleId: string,
  steps: string[],
  buttonLabel?: string
): Promise<boolean> {
  const panelSelector = MODULE_PANEL_SELECTORS[moduleId] || `[data-agent-panel="${moduleId}-root"]`;
  await announceStep(steps, `Öffne ${MODULE_LABELS[moduleId] || moduleId}...`);
  const panel = await openTabAndWait(moduleId, {
    panelSelector,
    allowStoreFallback: false,
    buttonLabel,
  });
  return Boolean(panel);
}

async function submitFormInput(input: HTMLInputElement | HTMLTextAreaElement): Promise<boolean> {
  const form = input.form;
  if (!form) {
    return false;
  }

  form.requestSubmit();
  await wait(350);
  return true;
}

async function clickAgentButtonOrFallback(
  buttonId: string,
  label: string,
  steps: string[]
): Promise<boolean> {
  await announceStep(steps, label);
  const button = await clickByAgentButton(buttonId, label, 1800);
  return Boolean(button);
}

// --------------------------------------------
// Spezifische Rezepte: Kalender
// --------------------------------------------

async function runCalendarCreateEvent(action: AgentAction): Promise<VisualActionResult> {
  const steps: string[] = [];
  const payload = action.payload as Record<string, unknown>;
  const title = getString(payload, 'title') || 'Neues Event';
  const startDate = getString(payload, 'startDate') || '';
  const endDate = getString(payload, 'endDate') || startDate;

  if (!(await openModuleWorkspace('calendar', steps, 'Öffne Kalender'))) {
    return fallback(
      'fallback_required',
      `Kalender-UI für "${title}" konnte nicht geöffnet werden`,
      'Kalender-Workspace nicht sichtbar',
      steps
    );
  }

  const addButton = await clickByAgentButton('new-event', 'Neues Event öffnen', 2200);
  if (!addButton) {
    return fallback(
      'fallback_required',
      `Kalenderformular für "${title}" konnte nicht geöffnet werden`,
      'Button "Neues Event" nicht gefunden',
      steps
    );
  }

  await announceStep(steps, 'Warte auf Event-Dialog...');
  const titleInput = await waitForElement({ selector: '[data-agent-input="title"]' }, 2500);
  if (!(titleInput instanceof HTMLInputElement)) {
    return fallback(
      'fallback_required',
      `Event-Dialog für "${title}" ist nicht erschienen`,
      'Event-Modal nicht sichtbar',
      steps
    );
  }

  await typeInElement(titleInput, title, `Titel: ${title}`);

  const startDateInput = await waitForElement({ selector: '[data-agent-input="startDate"]' }, 900);
  if (startDateInput instanceof HTMLInputElement && startDate) {
    setInputValue(startDateInput, startDate.split('T')[0] || startDate);
  }

  const endDateInput = await waitForElement({ selector: '[data-agent-input="endDate"]' }, 900);
  if (endDateInput instanceof HTMLInputElement && endDate) {
    setInputValue(endDateInput, endDate.split('T')[0] || endDate);
  }

  const startTimeInput = await waitForElement({ selector: '[data-agent-input="startTime"]' }, 900);
  if (startTimeInput instanceof HTMLInputElement && startDate.includes('T')) {
    setInputValue(startTimeInput, startDate.split('T')[1]?.slice(0, 5) || '09:00');
  }

  const endTimeInput = await waitForElement({ selector: '[data-agent-input="endTime"]' }, 900);
  if (endTimeInput instanceof HTMLInputElement && endDate.includes('T')) {
    setInputValue(endTimeInput, endDate.split('T')[1]?.slice(0, 5) || '10:00');
  }

  const submitButton = await clickByAgentButton('submit', 'Event speichern', 1800);
  if (!submitButton) {
    return fallback(
      'fallback_required',
      `Event "${title}" wurde vorbereitet, aber nicht abgesendet`,
      'Submit-Button im Kalenderformular fehlt',
      steps
    );
  }

  await waitForElementToDisappear('[data-agent-input="title"]', 2200);
  return completed(`Event "${title}" wurde visuell erstellt`, steps);
}

// --------------------------------------------
// Spezifische Rezepte: Inbox
// --------------------------------------------

async function runInboxRecipe(action: AgentAction): Promise<VisualActionResult> {
  const steps: string[] = [];
  const payload = action.payload as Record<string, unknown>;

  if (!(await openModuleWorkspace('inbox', steps, 'Öffne Postfach'))) {
    return fallback(
      'fallback_required',
      'Inbox-Workspace konnte nicht geöffnet werden',
      'Inbox-Panel nicht sichtbar',
      steps
    );
  }

  if (action.type === 'inbox.searchEmails') {
    const query = getString(payload, 'query');
    if (!query) {
      return completed('Inbox wurde geöffnet', steps);
    }

    const searchInput = await fillByAgentInput('inbox-search', query, 'Suche E-Mails', 1800);
    if (searchInput) {
      return completed(`Inbox-Suche nach "${query}" wurde visuell gestartet`, steps);
    }

    return fallback(
      'fallback_required',
      `Inbox-Suche nach "${query}" wird per Fallback ausgeführt`,
      'Suchfeld im Inbox-Header fehlt',
      steps
    );
  }

  if (action.type === 'inbox.openCompose' || action.type === 'inbox.composeAndSend') {
    const composeOpened = await clickAgentButtonOrFallback(
      'inbox-compose',
      'Öffne Compose-Dialog',
      steps
    );

    if (!composeOpened) {
      return fallback(
        'fallback_required',
        'Compose-Dialog konnte nicht visuell geöffnet werden',
        'Compose-Button nicht gefunden',
        steps
      );
    }

    await announceStep(steps, 'Warte auf Compose-Dialog...');
    const composeDialog = await waitForElement({ selector: '[data-agent-panel="inbox-compose"]' }, 2200);
    if (!composeDialog) {
      return fallback(
        'fallback_required',
        'Compose-Dialog ist nicht sichtbar geworden',
        'Inbox-Modal fehlgeschlagen',
        steps
      );
    }

    if (action.type === 'inbox.openCompose') {
      return completed('Inbox-Compose wurde visuell geöffnet', steps);
    }

    const to = getString(payload, 'to');
    const subject = getString(payload, 'subject');
    const body = getString(payload, 'body');

    if (to) {
      await fillByAgentInput('inbox-compose-to', to, 'Empfänger eintragen', 1800);
    }
    if (subject) {
      await fillByAgentInput('inbox-compose-subject', subject, 'Betreff eintragen', 1800);
    }
    if (body) {
      await fillByAgentInput('inbox-compose-body', body, 'Nachricht schreiben', 2200);
    }

    const sendClicked = await clickAgentButtonOrFallback(
      'inbox-compose-send',
      'Sende E-Mail',
      steps
    );

    if (!sendClicked) {
      return fallback(
        'fallback_required',
        'E-Mail wurde vorbereitet, aber nicht visuell gesendet',
        'Senden-Button im Compose-Dialog fehlt',
        steps
      );
    }

    await assertToastOrState(
      [
        '[data-agent-state="inbox-compose-sent"]',
        '[data-agent-panel="inbox-root"]',
      ],
      2400
    );

    return completed('E-Mail wurde visuell vorbereitet und abgesendet', steps);
  }

  return fallback(
    'fallback_required',
    `${action.type} wird im Postfach per Fast-Fallback abgeschlossen`,
    'Für diese Inbox-Aktion existiert noch kein vollständiger UI-Pfad',
    steps
  );
}

// --------------------------------------------
// Spezifische Rezepte: Browser
// --------------------------------------------

async function runBrowserRecipe(action: AgentAction): Promise<VisualActionResult> {
  const steps: string[] = [];
  const payload = action.payload as Record<string, unknown>;

  if (!(await openModuleWorkspace('browser', steps, 'Öffne Browser'))) {
    return fallback(
      'fallback_required',
      'Browser-Workspace konnte nicht geöffnet werden',
      'Browser-Panel nicht sichtbar',
      steps
    );
  }

  if (action.type === 'browser.openTab') {
    return completed('Browser wurde visuell geöffnet', steps);
  }

  if (action.type === 'browser.navigate') {
    const url = getString(payload, 'url');
    if (!url) {
      return fallback(
        'fallback_required',
        'Browser-Navigation wird per Fallback ausgeführt',
        'URL fehlt im Action-Payload',
        steps
      );
    }

    if (getBoolean(payload, 'newTab')) {
      await clickAgentButtonOrFallback('browser-new-tab', 'Öffne neuen Browser-Tab', steps);
      await wait(350);
    }

    const urlInput = await waitForElement({ selector: '[data-agent-input="browser-url"]' }, 1800);
    if (!(urlInput instanceof HTMLInputElement)) {
      return fallback(
        'fallback_required',
        `Browser-Navigation nach ${url} wird per Fallback fortgesetzt`,
        'Adressleiste nicht gefunden',
        steps
      );
    }

    await typeInElement(urlInput, url, `URL: ${url}`);
    await announceStep(steps, 'Bestätige Navigation...');

    if (!(await submitFormInput(urlInput))) {
      return fallback(
        'fallback_required',
        `Browser-Navigation nach ${url} wird per Fallback abgeschlossen`,
        'Adressformular konnte nicht abgesendet werden',
        steps
      );
    }

    await wait(700);
    return completed(`Browser navigiert sichtbar zu ${url}`, steps);
  }

  if (action.type === 'browser.addBookmark') {
    return fallback(
      'fallback_required',
      'Lesezeichen-Aktion wird per Fast-Fallback ausgeführt',
      'Im Browser-Toolbar existiert noch kein dedizierter Bookmark-Button',
      steps
    );
  }

  return fallback(
    'fallback_required',
    `${action.type} wird im Browser per Fast-Fallback abgeschlossen`,
    'Noch kein vollständiges Browser-Rezept vorhanden',
    steps
  );
}

// --------------------------------------------
// Spezifische Rezepte: App
// --------------------------------------------

async function runAppRecipe(action: AgentAction): Promise<VisualActionResult> {
  const steps: string[] = [];
  const payload = action.payload as Record<string, unknown>;

  if (action.type === 'app.toggleSidebar') {
    const clicked = await clickAgentButtonOrFallback('open-sidebar', 'Öffne Sidebar', steps);
    if (clicked) {
      return completed('Sidebar wurde sichtbar umgeschaltet', steps);
    }
    return fallback(
      'fallback_required',
      'Sidebar wird per Fast-Fallback umgeschaltet',
      'Sidebar-Trigger nicht gefunden',
      steps
    );
  }

  if (action.type === 'app.openModule' || action.type === 'app.switchTab') {
    const moduleId = getString(payload, 'moduleId');
    if (!moduleId) {
      return failed('Zielmodul fehlt', steps, 'moduleId fehlt');
    }

    const opened = await openModuleWorkspace(moduleId, steps, `Öffne ${moduleId}`);
    if (opened) {
      return completed(`${MODULE_LABELS[moduleId] || moduleId} wurde sichtbar geöffnet`, steps);
    }

    return fallback(
      'fallback_required',
      `${MODULE_LABELS[moduleId] || moduleId} wird per Fast-Fallback geöffnet`,
      'Modul-Panel wurde nicht sichtbar',
      steps
    );
  }

  if (action.type === 'app.closeTab') {
    const moduleId = getString(payload, 'moduleId');
    if (!moduleId) {
      return failed('Zu schließender Tab fehlt', steps, 'moduleId fehlt');
    }

    const closeButton = await clickByAgentButton(
      `window-close-${moduleId}`,
      `Schließe ${moduleId}`,
      1800
    );
    if (closeButton) {
      return completed(`${moduleId} wurde sichtbar geschlossen`, steps);
    }

    return fallback(
      'fallback_required',
      `${moduleId} wird per Fast-Fallback geschlossen`,
      'Kein sichtbarer Window-Close-Button gefunden',
      steps
    );
  }

  if (action.type === 'app.changeBackground') {
    if (!(await openModuleWorkspace('settings', steps, 'Öffne Einstellungen'))) {
      return fallback(
        'fallback_required',
        'Hintergrund wird per Fast-Fallback geändert',
        'Settings-Panel nicht sichtbar',
        steps
      );
    }

    const backgroundId = getString(payload, 'backgroundId');
    const customUrl = getString(payload, 'customUrl');

    if (backgroundId) {
      const clicked = await clickByAgentButton(
        `settings-background-${backgroundId}`,
        `Wähle Hintergrund ${backgroundId}`,
        1800
      );
      if (clicked) {
        return completed(`Hintergrund ${backgroundId} wurde sichtbar gesetzt`, steps);
      }
    }

    if (customUrl) {
      await clickAgentButtonOrFallback('settings-background-type-image', 'Aktiviere Bild-Hintergrund', steps);
      const urlInput = await fillByAgentInput(
        'settings-background-custom-url',
        customUrl,
        'Setze Bild-URL',
        1800
      );
      if (urlInput) {
        await clickAgentButtonOrFallback('settings-background-custom-apply', 'Übernehme Bild-URL', steps);
        return completed('Benutzerdefinierter Hintergrund wurde sichtbar gesetzt', steps);
      }
    }

    return fallback(
      'fallback_required',
      'Hintergrund wird per Fast-Fallback geändert',
      'Kein passender Hintergrund-Selector gefunden',
      steps
    );
  }

  if (action.type === 'app.searchGlobal') {
    const query = getString(payload, 'query');
    if (!(await openModuleWorkspace('agents', steps, 'Öffne globalen Such-Chat'))) {
      return fallback(
        'fallback_required',
        'Globale Suche wird per Fast-Fallback ausgeführt',
        'Agents-Workspace nicht sichtbar',
        steps
      );
    }

    if (query) {
      const input = await fillByAgentInput('agents-chat-input', query, 'Fülle globale Suche vor', 1800);
      if (input) {
        return fallback(
          'fallback_required',
          `Globale Suche nach "${query}" wurde vorbereitet`,
          'Chat wurde visuell vorbefüllt, die eigentliche Suche bleibt headless',
          steps
        );
      }
    }

    return fallback(
      'fallback_required',
      'Globale Suche wird per Fast-Fallback ausgeführt',
      'Kein sichtbares Such-/Chat-Feld gefunden',
      steps
    );
  }

  if (action.type === 'app.navigate') {
    const path = getString(payload, 'path');
    if (!path) {
      return failed('Navigationsziel fehlt', steps, 'path fehlt');
    }

    await announceStep(steps, `Navigiere zu ${path}...`);
    window.location.href = path;
    return completed(`Navigation zu ${path} wurde ausgelöst`, steps);
  }

  return fallback(
    'fallback_required',
    `${action.type} wird per Fast-Fallback abgeschlossen`,
    'Kein spezifisches App-Rezept vorhanden',
    steps
  );
}

// --------------------------------------------
// Spezifische Rezepte: Settings
// --------------------------------------------

async function runSettingsRecipe(action: AgentAction): Promise<VisualActionResult> {
  const steps: string[] = [];
  const payload = action.payload as Record<string, unknown>;

  if (!(await openModuleWorkspace('settings', steps, 'Öffne Einstellungen'))) {
    return fallback(
      'fallback_required',
      'Einstellungen werden per Fast-Fallback geöffnet',
      'Settings-Panel nicht sichtbar',
      steps
    );
  }

  if (action.type === 'settings.setLanguage') {
    const locale = getString(payload, 'locale');
    if (!locale) {
      return failed('Sprache fehlt', steps, 'locale fehlt');
    }

    const clicked = await clickByAgentButton(
      `settings-language-${locale}`,
      `Setze Sprache ${locale}`,
      1800
    );
    if (clicked) {
      return completed(`Sprache ${locale} wurde sichtbar gesetzt`, steps);
    }

    return fallback(
      'fallback_required',
      `Sprache ${locale} wird per Fast-Fallback gesetzt`,
      'Sprach-Button nicht gefunden',
      steps
    );
  }

  if (action.type === 'settings.setTheme') {
    const theme = getString(payload, 'theme');
    if (!theme) {
      return failed('Theme fehlt', steps, 'theme fehlt');
    }

    const themeButton =
      (await clickByAgentButton(`settings-theme-${theme}`, `Setze Theme ${theme}`, 1500))
      || (await clickByAgentButton(`settings-design-${theme}`, `Setze Design ${theme}`, 1500));

    if (themeButton) {
      return completed(`Theme ${theme} wurde sichtbar gesetzt`, steps);
    }

    return fallback(
      'fallback_required',
      `Theme ${theme} wird per Fast-Fallback gesetzt`,
      'Kein passender Theme-/Design-Button gefunden',
      steps
    );
  }

  if (action.type === 'settings.setPrivacyMode') {
    const enabled = getBoolean(payload, 'enabled');
    if (enabled === undefined) {
      return failed('Privacy-Wert fehlt', steps, 'enabled fehlt');
    }

    const clicked = await clickByAgentButton(
      enabled ? 'settings-privacy-on' : 'settings-privacy-off',
      enabled ? 'Aktiviere Privacy Mode' : 'Deaktiviere Privacy Mode',
      1800
    );

    if (clicked) {
      return completed(`Privacy Mode wurde sichtbar ${enabled ? 'aktiviert' : 'deaktiviert'}`, steps);
    }

    return fallback(
      'fallback_required',
      'Privacy Mode wird per Fast-Fallback geändert',
      'Privacy-Toggle nicht gefunden',
      steps
    );
  }

  if (action.type === 'settings.search') {
    const query = getString(payload, 'query');
    if (!query) {
      return completed('Settings wurden geöffnet', steps);
    }

    const searchInput = await fillByAgentInput('settings-search', query, 'Durchsuche Settings', 1800);
    if (searchInput) {
      return fallback(
        'fallback_required',
        `Settings-Suche nach "${query}" wurde sichtbar vorbereitet`,
        'Lokale Settings-Suche ist nur eine UI-Vorbereitung',
        steps
      );
    }

    return fallback(
      'fallback_required',
      `Settings-Suche nach "${query}" wird per Fast-Fallback ausgeführt`,
      'Settings-Suchfeld nicht gefunden',
      steps
    );
  }

  if (action.type === 'settings.listSections') {
    return completed('Settings-Sektionen wurden sichtbar geöffnet', steps);
  }

  const key = getString(payload, 'key');
  if (key) {
    const searchInput = await fillByAgentInput('settings-search', key, `Fokussiere Präferenz ${key}`, 1200);
    if (searchInput) {
      return fallback(
        'fallback_required',
        `Präferenz ${key} wurde visuell fokussiert`,
        'Die konkrete Mutation erfolgt kontrolliert im Fast-Fallback',
        steps
      );
    }
  }

  return fallback(
    'fallback_required',
    `${action.type} wird in den Einstellungen per Fast-Fallback abgeschlossen`,
    'Für diese Settings-Aktion existiert noch kein vollständig sichtbarer UI-Pfad',
    steps
  );
}

// --------------------------------------------
// Spezifische Rezepte: Marketplace / Library
// --------------------------------------------

async function runMarketplaceRecipe(action: AgentAction): Promise<VisualActionResult> {
  const steps: string[] = [];
  const payload = action.payload as Record<string, unknown>;

  if (!(await openModuleWorkspace('library', steps, 'Öffne Bibliothek'))) {
    return fallback(
      'fallback_required',
      'Bibliothek wird per Fast-Fallback geöffnet',
      'Library-Panel nicht sichtbar',
      steps
    );
  }

  const query = getString(payload, 'query');
  const moduleId = getString(payload, 'moduleId');

  if (action.type === 'marketplace.search') {
    await clickAgentButtonOrFallback('library-tab-apps', 'Wechsle zu Apps', steps);
    if (query) {
      const searchInput = await fillByAgentInput('library-search', query, 'Suche im Marketplace', 1800);
      if (searchInput) {
        return completed(`Marketplace-Suche nach "${query}" wurde visuell gestartet`, steps);
      }
    }
    return fallback(
      'fallback_required',
      `Marketplace-Suche${query ? ` nach "${query}"` : ''} wird per Fast-Fallback ausgeführt`,
      'Library-Suchfeld nicht gefunden',
      steps
    );
  }

  if (action.type === 'marketplace.listInstalled') {
    await clickAgentButtonOrFallback('library-tab-my-system', 'Öffne "Mein System"', steps);
    return completed('Installierte Module wurden sichtbar geöffnet', steps);
  }

  if (moduleId && query !== moduleId) {
    await fillByAgentInput('library-search', moduleId, 'Suche Zielmodul', 1400);
    await wait(250);
  }

  if (action.type === 'marketplace.openModuleDetails' || action.type === 'marketplace.getModule') {
    if (!moduleId) {
      return failed('moduleId fehlt für Moduldetails', steps, 'moduleId fehlt');
    }

    const card = await waitForElement({ selector: `[data-agent-card="${moduleId}"]` }, 1800);
    if (card) {
      await clickElement(card, `Öffne Modul ${moduleId}`);
      return completed(`Moduldetails für ${moduleId} wurden sichtbar geöffnet`, steps);
    }

    return fallback(
      'fallback_required',
      `Moduldetails für ${moduleId} werden per Fast-Fallback geöffnet`,
      'Kein passendes Marketplace-Card-Element gefunden',
      steps
    );
  }

  if (
    action.type === 'marketplace.install'
    || action.type === 'marketplace.uninstall'
    || action.type === 'marketplace.updateModule'
  ) {
    if (!moduleId) {
      return failed('moduleId fehlt für Installation', steps, 'moduleId fehlt');
    }

    const installButton = await clickByAgentButton(
      `marketplace-install-${moduleId}`,
      `Führe Marketplace-Aktion für ${moduleId} aus`,
      2000
    );

    if (installButton) {
      return completed(`Marketplace-Aktion für ${moduleId} wurde sichtbar ausgeführt`, steps);
    }

    return fallback(
      'fallback_required',
      `${action.type} für ${moduleId} wird per Fast-Fallback ausgeführt`,
      'Install-/Uninstall-Button nicht gefunden',
      steps
    );
  }

  if (action.type === 'marketplace.rateModule') {
    return fallback(
      'fallback_required',
      'Marketplace-Bewertung wird per Fast-Fallback ausgeführt',
      'Bewertungs-UI ist noch nicht visuell verdrahtet',
      steps
    );
  }

  return fallback(
    'fallback_required',
    `${action.type} wird in der Bibliothek per Fast-Fallback abgeschlossen`,
    'Kein spezifisches Marketplace-Rezept vorhanden',
    steps
  );
}

// --------------------------------------------
// Spezifische Rezepte: Agents
// --------------------------------------------

async function runAgentsRecipe(action: AgentAction): Promise<VisualActionResult> {
  const steps: string[] = [];
  const payload = action.payload as Record<string, unknown>;

  if (!(await openModuleWorkspace('agents', steps, 'Öffne Agents'))) {
    return fallback(
      'fallback_required',
      'Agents-Workspace wird per Fast-Fallback geöffnet',
      'Agents-Panel nicht sichtbar',
      steps
    );
  }

  if (action.type === 'agents.createAgent') {
    const name = getString(payload, 'name') || 'Neuer Agent';
    const description = getString(payload, 'description', 'objective') || '';

    const openCreateModal = await clickAgentButtonOrFallback(
      'agents-open-create-agent',
      'Öffne den Agent-Erstellen-Dialog',
      steps
    );
    if (!openCreateModal) {
      return fallback(
        'fallback_required',
        `Agent ${name} konnte nicht visuell erstellt werden`,
        'Launcher für Agent-Erstellung nicht gefunden',
        steps
      );
    }

    await announceStep(steps, 'Warte auf Agent-Dialog...');
    const createModal = await waitForElement({ selector: '[data-agent-panel="agents-create-modal"]' }, 2000);
    if (!createModal) {
      return fallback(
        'fallback_required',
        `Agent ${name} konnte nicht visuell erstellt werden`,
        'Agent-Modal nicht sichtbar',
        steps
      );
    }

    const agentModeButton = await clickAgentButtonOrFallback(
      'agents-create-agent',
      'Aktiviere den Agent-Modus',
      steps
    );
    if (!agentModeButton) {
      return fallback(
        'fallback_required',
        `Agent ${name} konnte nicht visuell erstellt werden`,
        'Agent-Modus-Button im Modal fehlt',
        steps
      );
    }

    const nameInput = await fillByAgentInput('agents-create-agent-name', name, 'Setze Agent-Name', 1800);
    if (!nameInput) {
      return fallback(
        'fallback_required',
        `Agent ${name} konnte nicht visuell erstellt werden`,
        'Agent-Name-Input im Modal fehlt',
        steps
      );
    }

    if (description) {
      await fillByAgentInput('agents-create-agent-description', description, 'Setze Agent-Beschreibung', 1800);
    }

    const submitButton = await clickAgentButtonOrFallback(
      'agents-create-agent-submit',
      'Erstelle Agent',
      steps
    );
    if (!submitButton) {
      return fallback(
        'fallback_required',
        `Agent ${name} konnte nicht visuell erstellt werden`,
        'Agent-Submit-Button im Modal fehlt',
        steps
      );
    }

    return completed(`Agent "${name}" wurde sichtbar erstellt`, steps);
  }

  if (action.type === 'agents.createGroup') {
    const name = getString(payload, 'name') || 'Neue Gruppe';

    const createButton = await clickAgentButtonOrFallback('agents-create-group', 'Starte Gruppen-Erstellung', steps);
    if (!createButton) {
      return fallback(
        'fallback_required',
        `Gruppe ${name} wird per Fast-Fallback erstellt`,
        'Gruppen-Create-Button nicht gefunden',
        steps
      );
    }

    await fillByAgentInput('agents-create-group-name', name, 'Setze Gruppenname', 1800);
    return fallback(
      'fallback_required',
      `Gruppe "${name}" wurde sichtbar vorbereitet`,
      'Die restliche Gruppen-Konfiguration benötigt weiterhin den headless Fallback',
      steps
    );
  }

  if (action.type === 'agents.conversation.create') {
    const created = await clickAgentButtonOrFallback('agents-new-conversation', 'Erstelle neuen Chat', steps);
    if (created) {
      return completed('Neue Agents-Konversation wurde sichtbar erstellt', steps);
    }
  }

  if (action.type === 'agents.folder.create') {
    const name = getString(payload, 'name') || 'Neuer Ordner';
    const openDialog = await clickAgentButtonOrFallback('agents-new-folder', 'Öffne Ordner-Dialog', steps);
    if (!openDialog) {
      return fallback(
        'fallback_required',
        `Ordner ${name} wird per Fast-Fallback erstellt`,
        'Folder-Button nicht gefunden',
        steps
      );
    }

    const folderInput = await fillByAgentInput('agents-folder-name', name, 'Setze Ordnername', 1800);
    if (!folderInput) {
      return fallback(
        'fallback_required',
        `Ordner ${name} wird per Fast-Fallback erstellt`,
        'Folder-Input im Modal fehlt',
        steps
      );
    }

    const submit = await clickAgentButtonOrFallback('agents-folder-submit', 'Erstelle Ordner', steps);
    if (submit) {
      return completed(`Ordner "${name}" wurde sichtbar erstellt`, steps);
    }
  }

  if (action.type === 'agents.message.add') {
    const content = getString(payload, 'content');
    if (content) {
      const input = await fillByAgentInput('agents-chat-input', content, 'Tippe Agents-Nachricht', 1800);
      if (input) {
        const sent = await clickAgentButtonOrFallback('agents-chat-send', 'Sende Nachricht', steps);
        if (sent) {
          return completed('Agents-Nachricht wurde sichtbar gesendet', steps);
        }
      }
    }
  }

  if (action.type.includes('.task.')) {
    await clickAgentButtonOrFallback('agents-control-tasks', 'Wechsle in Tasks', steps);
    if (action.type.endsWith('.create')) {
      const created = await clickAgentButtonOrFallback('agents-task-create', 'Lege neue Task an', steps);
      if (created) {
        return fallback(
          'fallback_required',
          'Scheduled Task wurde sichtbar angelegt und wird nun befüllt',
          'Das vollständige Ausfüllen der Task erfolgt kontrolliert im Fast-Fallback',
          steps
        );
      }
    }
  }

  if (action.type === 'agents.runCouncil') {
    await clickAgentButtonOrFallback('agents-view-councils', 'Switch to councils', steps);
    const created = await clickAgentButtonOrFallback('agents-council-create', 'Create new council', steps);
    if (created) {
      return fallback(
        'fallback_required',
        'Council UI was prepared visibly',
        'The actual council run still completes headless for now',
        steps
      );
    }
  }

  return fallback(
    'fallback_required',
    `${action.type} wird in Agents per Fast-Fallback abgeschlossen`,
    'Für diese Agents-Untergruppe existiert noch kein vollständiger UI-Pfad',
    steps
  );
}

// --------------------------------------------
// Spezifische Rezepte: Lab / Builder
// --------------------------------------------

async function runLabRecipe(action: AgentAction): Promise<VisualActionResult> {
  const steps: string[] = [];
  const payload = action.payload as Record<string, unknown>;

  if (!(await openModuleWorkspace('lab', steps, 'Öffne Builder'))) {
    return fallback(
      'fallback_required',
      'Builder wird per Fast-Fallback geöffnet',
      'Lab-Panel nicht sichtbar',
      steps
    );
  }

  if (action.type === 'lab.openBuilder') {
    return completed('Builder wurde sichtbar geöffnet', steps);
  }

  if (
    action.type === 'lab.generateModule'
    || action.type === 'builder.prompt.submit'
    || action.type === 'builder.generate.run'
    || action.type === 'builder.prompt.refine'
    || action.type === 'builder.prompt.suggest'
  ) {
    const prompt = getString(payload, 'prompt', 'goal', 'instruction');
    if (!prompt) {
      return fallback(
        'fallback_required',
        'Builder-Prompt wird per Fast-Fallback ausgeführt',
        'Kein sichtbarer Prompt-Inhalt vorhanden',
        steps
      );
    }

    const input = await fillByAgentInput('builder-chat-input', prompt, 'Tippe Builder-Prompt', 2000);
    if (!input) {
      return fallback(
        'fallback_required',
        'Builder-Prompt wird per Fast-Fallback ausgeführt',
        'Builder-Chatinput nicht gefunden',
        steps
      );
    }

    const send = await clickAgentButtonOrFallback('builder-chat-send', 'Sende Builder-Prompt', steps);
    if (send) {
      return completed('Builder-Prompt wurde sichtbar gesendet', steps);
    }
  }

  if (action.type === 'lab.publishModule') {
    const publish = await clickAgentButtonOrFallback('builder-publish', 'Öffne Publish-Dialog', steps);
    if (publish) {
      return fallback(
        'fallback_required',
        'Publish-Dialog wurde sichtbar geöffnet',
        'Das eigentliche Veröffentlichen bleibt kontrolliert im Fast-Fallback',
        steps
      );
    }
  }

  if (action.type === 'lab.previewModule' || action.type === 'builder.preview.render') {
    const preview = await clickAgentButtonOrFallback('builder-preview-toggle', 'Öffne Builder-Preview', steps);
    if (preview) {
      return completed('Builder-Preview wurde sichtbar geöffnet', steps);
    }
  }

  if (action.type === 'builder.project.list') {
    const opened = await clickAgentButtonOrFallback('builder-open-projects', 'Öffne Projektübersicht', steps);
    if (opened) {
      return completed('Builder-Projektübersicht wurde sichtbar geöffnet', steps);
    }

    return fallback(
      'fallback_required',
      'Builder-Projektübersicht wird per Fast-Fallback geöffnet',
      'Button für die Projektübersicht nicht gefunden',
      steps
    );
  }

  if (action.type === 'builder.project.create' || action.type === 'lab.createProject') {
    const name = getString(payload, 'name') || 'Neues Modul';
    const openedProjects = await clickAgentButtonOrFallback(
      'builder-open-projects',
      'Öffne zuerst die Projektübersicht',
      steps
    );

    if (openedProjects) {
      await wait(250);
      const openedCreateFlow = await clickAgentButtonOrFallback(
        'builder-new-project',
        'Öffne den sichtbaren Projekt-Start',
        steps
      );

      if (openedCreateFlow) {
        return fallback(
          'fallback_required',
          `Builder-Projekt "${name}" wurde sichtbar angestoßen`,
          'Die eigentliche Projekterstellung wird danach kontrolliert im Fast-Fallback abgeschlossen',
          steps
        );
      }
    }

    const input = await fillByAgentInput(
      'builder-chat-input',
      `Erstelle ein Modul namens ${name}`,
      'Starte neues Builder-Projekt',
      1800
    );

    if (input) {
      return fallback(
        'fallback_allowed',
        `Builder-Projekt "${name}" wurde visuell vorbereitet`,
        'Die dedizierte Projektanlage bleibt aktuell im Fast-Fallback; der Builder-Prompt wurde sichtbar vorbereitet',
        steps
      );
    }
  }

  return fallback(
    'fallback_required',
    `${action.type} wird im Builder per Fast-Fallback abgeschlossen`,
    'Für diese Builder-Untergruppe existiert noch kein vollständiger UI-Pfad',
    steps
  );
}

// --------------------------------------------
// Generischer Fallback
// Wird fuer unbekannte Produkt-Tools genutzt.
// --------------------------------------------

async function runGenericRecipe(action: AgentAction): Promise<VisualActionResult> {
  const steps: string[] = [];
  const moduleId = resolveActionModuleId(action);

  if (moduleId) {
    await openModuleWorkspace(moduleId, steps, `Öffne ${moduleId}`);
  } else {
    await announceStep(steps, `Bereite ${action.type} vor...`);
  }

  return fallback(
    'fallback_required',
    `${action.type} wird sichtbar vorbereitet und danach headless abgeschlossen`,
    'Kein spezifisches Visual-Rezept vorhanden',
    steps
  );
}

// --------------------------------------------
// Rezept-Registry
// Reihenfolge ist wichtig: erst spezifische, dann Familien.
// --------------------------------------------

const VISUAL_TOOL_RECIPES: VisualToolRecipe[] = [
  {
    id: 'calendar.createEvent',
    matches: (action) => action.type === 'calendar.createEvent',
    run: runCalendarCreateEvent,
  },
  {
    id: 'inbox.family',
    matches: (action) => action.type.startsWith('inbox.'),
    run: runInboxRecipe,
  },
  {
    id: 'browser.family',
    matches: (action) => action.type.startsWith('browser.'),
    run: runBrowserRecipe,
  },
  {
    id: 'app.family',
    matches: (action) => action.type.startsWith('app.'),
    run: runAppRecipe,
  },
  {
    id: 'settings.family',
    matches: (action) => action.type.startsWith('settings.'),
    run: runSettingsRecipe,
  },
  {
    id: 'marketplace.family',
    matches: (action) => action.type.startsWith('marketplace.'),
    run: runMarketplaceRecipe,
  },
  {
    id: 'agents.family',
    matches: (action) => action.type.startsWith('agents.'),
    run: runAgentsRecipe,
  },
  {
    id: 'lab.family',
    matches: (action) => action.type.startsWith('lab.') || action.type.startsWith('builder.'),
    run: runLabRecipe,
  },
];

// --------------------------------------------
// Oeffentlicher Einstiegspunkt
// --------------------------------------------

export async function runVisualToolRecipe(action: AgentAction): Promise<VisualActionResult> {
  const recipe = VISUAL_TOOL_RECIPES.find((candidate) => candidate.matches(action));

  if (!recipe) {
    log.debug('Kein spezifisches Rezept gefunden, nutze generischen Fallback', { type: action.type });
    return runGenericRecipe(action);
  }

  log.debug('Starte visuelles Rezept', { recipeId: recipe.id, actionType: action.type });

  try {
    return await recipe.run(action);
  } catch (error) {
    log.error('Visual-Rezept ist fehlgeschlagen', {
      recipeId: recipe.id,
      actionType: action.type,
      error,
    });
    return failed(
      `Visuelle Ausführung für ${action.type} ist fehlgeschlagen`,
      [],
      error instanceof Error ? error.message : 'Unbekannter Visual-Rezept-Fehler'
    );
  }
}
