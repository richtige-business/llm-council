// ============================================
// settings-handler.ts - Frontend-Handler fuer Settings-Actions
//
// Zweck: Fuehrt Settings-Tools im Client aus und synchronisiert
//        lokale UI-States mit der Praeferenzen-API.
// Verwendet von: useAgentExecutor, Settings-Tools
// ============================================

'use client';

import { useAppStore } from '@/lib/store/app-store';
import type { AgentAction, ActionHandler, ActionResult } from '@/lib/agent/types';

type PreferenceDomain = 'communication' | 'scheduling' | 'ui' | 'agent' | 'privacy';

// --------------------------------------------
// Key-Normalisierung fuer flexible Settings-Inputs
// Akzeptiert einfache Keys wie "theme" oder Domains wie "ui.theme".
// --------------------------------------------

function parsePreferenceKey(rawKey: string): { domain: PreferenceDomain; key: string } {
  const normalizedKey = rawKey.trim();
  const [domainCandidate, ...rest] = normalizedKey.split('.');

  const knownDomains = new Set<PreferenceDomain>([
    'communication',
    'scheduling',
    'ui',
    'agent',
    'privacy',
  ]);

  if (knownDomains.has(domainCandidate as PreferenceDomain) && rest.length > 0) {
    return {
      domain: domainCandidate as PreferenceDomain,
      key: rest.join('.'),
    };
  }

  switch (normalizedKey) {
    case 'theme':
    case 'locale':
    case 'language':
    case 'designStyle':
    case 'accentColor':
    case 'surfaceColor':
    case 'textColor':
    case 'buttonTextColor':
    case 'appFont':
    case 'backgroundImage':
    case 'backgroundType':
    case 'solidBackground':
      return { domain: 'ui', key: normalizedKey };
    case 'privacyMode':
      return { domain: 'privacy', key: normalizedKey };
    default:
      return { domain: 'agent', key: normalizedKey };
  }
}

// --------------------------------------------
// Primitive Werte in passende Typen umwandeln
// Viele Tools liefern Strings; die UI braucht aber teils Booleans.
// --------------------------------------------

function coercePreferenceValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

// --------------------------------------------
// Lokalen App-State sofort spiegeln
// Damit der User Settings-Aenderungen direkt sieht.
// --------------------------------------------

function applyLocalPreference(key: string, value: unknown): void {
  const appStore = useAppStore.getState();

  switch (key) {
    case 'theme':
      if (value === 'dark' || value === 'light' || value === 'system') {
        appStore.setTheme(value);
      }
      break;
    case 'locale':
    case 'language':
      if (value === 'de' || value === 'en') {
        appStore.setLocale(value);
      }
      break;
    case 'designStyle':
      if (value === 'glass' || value === 'brutal' || value === 'neo') {
        appStore.setDesignStyle(value);
      }
      break;
    case 'accentColor':
      if (typeof value === 'string') appStore.setAccentColor(value);
      break;
    case 'surfaceColor':
      if (typeof value === 'string') appStore.setSurfaceColor(value);
      break;
    case 'textColor':
      if (typeof value === 'string') appStore.setTextColor(value);
      break;
    case 'buttonTextColor':
      if (typeof value === 'string') appStore.setButtonTextColor(value);
      break;
    case 'appFont':
      if (typeof value === 'string') appStore.setAppFont(value);
      break;
    case 'backgroundImage':
      if (typeof value === 'string') appStore.setBackgroundImage(value);
      break;
    case 'backgroundType':
      if (value === 'image' || value === 'solid') appStore.setBackgroundType(value);
      break;
    case 'solidBackground':
      if (typeof value === 'string') appStore.setSolidBackground(value);
      break;
    case 'privacyMode':
      window.localStorage.setItem('lifeos-privacy-mode', String(Boolean(value)));
      break;
    default:
      break;
  }
}

async function putPreference(key: string, value: unknown): Promise<void> {
  const parsed = parsePreferenceKey(key);
  const normalizedValue = coercePreferenceValue(value);

  await fetch('/api/user/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      domain: parsed.domain,
      key: parsed.key,
      value: normalizedValue,
    }),
  });

  applyLocalPreference(parsed.key, normalizedValue);
}

async function deletePreferenceByKey(key: string): Promise<void> {
  const parsed = parsePreferenceKey(key);

  await fetch('/api/user/preferences', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      domain: parsed.domain,
      key: parsed.key,
    }),
  });
}

// --------------------------------------------
// Settings Action Handler
// Reagiert auf Settings-Tools mit API-Sync und UI-Feedback.
// --------------------------------------------

export const settingsActionHandler: ActionHandler = {
  moduleId: 'settings',
  supportedActions: [
    'settings.search',
    'settings.updatePreference',
    'settings.getPreference',
    'settings.listSections',
    'settings.export',
    'settings.import',
    'settings.setTheme',
    'settings.setLanguage',
    'settings.setPrivacyMode',
    'settings.resetPreference',
  ],
  execute: async (action: AgentAction): Promise<ActionResult> => {
    const appStore = useAppStore.getState();
    appStore.openTab('settings');

    try {
      switch (action.type) {
        case 'settings.search': {
          const { query } = action.payload as { query?: string };
          appStore.setActiveTool(query?.trim() ? `settings-search:${query.trim()}` : 'settings-search');
          return { success: true };
        }

        case 'settings.updatePreference': {
          const { key, value } = action.payload as { key?: string; value?: unknown };
          if (!key?.trim()) {
            return { success: false, error: 'Preference-Key fehlt' };
          }
          await putPreference(key, value);
          return { success: true };
        }

        case 'settings.setTheme': {
          const { theme } = action.payload as { theme?: unknown };
          await putPreference('theme', theme);
          return { success: true };
        }

        case 'settings.setLanguage': {
          const { locale } = action.payload as { locale?: unknown };
          await putPreference('locale', locale);
          return { success: true };
        }

        case 'settings.setPrivacyMode': {
          const { enabled } = action.payload as { enabled?: unknown };
          await putPreference('privacyMode', enabled);
          return { success: true };
        }

        case 'settings.import': {
          const { payload } = action.payload as { payload?: Record<string, unknown> };
          if (!payload || typeof payload !== 'object') {
            return { success: false, error: 'Import-Payload fehlt' };
          }

          const entries = Object.entries(payload);
          for (const [key, value] of entries) {
            await putPreference(key, value);
          }

          return { success: true };
        }

        case 'settings.resetPreference': {
          const { key } = action.payload as { key?: string };
          if (!key?.trim()) {
            return { success: false, error: 'Preference-Key fehlt' };
          }

          await deletePreferenceByKey(key);
          return { success: true };
        }

        case 'settings.getPreference':
        case 'settings.listSections':
        case 'settings.export':
          return { success: true };

        default:
          return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Settings-Aktion fehlgeschlagen',
      };
    }
  },
};
