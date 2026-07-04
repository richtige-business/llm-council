// ============================================
// runtime.ts - Laufzeit-Helfer für Locale & Fallbacks
//
// Zweck: Unterstützt clientseitige Übersetzung, Cookie-
//        Sync und formatierungsnahe Hilfsfunktionen.
// Verwendet von: I18nProvider, Marketplace, UI-Utilities
// ============================================

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  normalizeLocale,
  type AppLocale,
} from './config';
import { legacyPhrasePairs } from './legacy-phrases';
import { messages } from './messages';

// --------------------------------------------
// createPhraseMap - Baut exakte Phrase-Mappings aus
// Dictionaries und Legacy-Fallbacks auf.
// --------------------------------------------

function flattenMessages(
  value: Record<string, unknown>,
  target: string[] = []
): string[] {
  for (const entry of Object.values(value)) {
    if (typeof entry === 'string') {
      target.push(entry);
      continue;
    }

    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      flattenMessages(entry as Record<string, unknown>, target);
    }
  }

  return target;
}

const flattenedDeMessages = flattenMessages(messages.de);
const flattenedEnMessages = flattenMessages(messages.en);

const phrasePairs = [
  ...legacyPhrasePairs,
  ...flattenedDeMessages.map((deValue, index) => ({
    de: deValue,
    en: flattenedEnMessages[index] || deValue,
  })),
];

const ownedSystemReplacements: Array<{ de: RegExp; en: string }> = [
  { de: /\bVerwalte\b/g, en: 'Manage' },
  { de: /\bTrainiere\b/g, en: 'Train' },
  { de: /\bErstelle\b/g, en: 'Create' },
  { de: /\bDein\b/g, en: 'Your' },
  { de: /\bdein\b/g, en: 'your' },
  { de: /\bdeine\b/g, en: 'your' },
  { de: /\bdeinen\b/g, en: 'your' },
  { de: /\bdeiner\b/g, en: 'your' },
  { de: /\bmit\b/g, en: 'with' },
  { de: /\bund\b/g, en: 'and' },
  { de: /\bfür\b/g, en: 'for' },
  { de: /\bFinde\b/g, en: 'Find' },
  { de: /\bVerbessere\b/g, en: 'Improve' },
  { de: /\bpersönlicher\b/g, en: 'personal' },
  { de: /\bpersoenlicher\b/g, en: 'personal' },
  { de: /\bPosteingang\b/g, en: 'inbox' },
  { de: /\bKalender\b/g, en: 'calendar' },
  { de: /\bNachrichten\b/g, en: 'messages' },
  { de: /\bTermine\b/g, en: 'appointments' },
  { de: /\bErinnerungen\b/g, en: 'reminders' },
  { de: /\bModul\b/g, en: 'module' },
  { de: /\bModule\b/g, en: 'modules' },
  { de: /\bWeb-App\b/g, en: 'web app' },
  { de: /\bintegrierte\b/g, en: 'integrated' },
  { de: /\bIntegrierter\b/g, en: 'Integrated' },
  { de: /\bVereinheitlichter\b/g, en: 'Unified' },
  { de: /\bTermine, Events und Erinnerungen\b/g, en: 'appointments, events, and reminders' },
  { de: /\bTrainiere eigene KI-Modelle\b/g, en: 'Train your own AI models' },
  { de: /\bErstelle eigene Module mit KI\b/g, en: 'Create your own modules with AI' },
];

function buildMap(targetLocale: AppLocale) {
  const map = new Map<string, string>();

  for (const pair of phrasePairs) {
    map.set(pair.de.trim(), targetLocale === 'en' ? pair.en : pair.de);
    map.set(pair.en.trim(), targetLocale === 'de' ? pair.de : pair.en);
  }

  return map;
}

const phraseMaps: Record<AppLocale, Map<string, string>> = {
  de: buildMap('de'),
  en: buildMap('en'),
};

// --------------------------------------------
// getCookieLocale - Liest Locale im Browser aus Cookie
// --------------------------------------------

export function getCookieLocale(): AppLocale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE;

  const rawCookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${LOCALE_COOKIE_NAME}=`))
    ?.split('=')[1];

  return normalizeLocale(rawCookie);
}

// --------------------------------------------
// setCookieLocale - Schreibt Locale mit langer Laufzeit
// --------------------------------------------

export function setCookieLocale(locale: AppLocale) {
  if (typeof document === 'undefined') return;
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
}

// --------------------------------------------
// translateRuntimeText - Übersetzt exakte Systemtexte
// ohne Nutzereingaben zu verändern.
// --------------------------------------------

export function translateRuntimeText(
  value: string,
  locale: AppLocale
): string {
  const trimmed = value.trim();
  if (!trimmed) return value;

  const map = phraseMaps[locale];
  const direct = map.get(trimmed);
  if (direct) {
    return value.replace(trimmed, direct);
  }

  return value;
}

// --------------------------------------------
// translateOwnedSystemText - Aggressiverer Übersetzer
// Nur für systemeigene statische Inhalte wie Kataloge,
// Mock-Daten oder hinterlegte Beschreibungen.
// --------------------------------------------

export function translateOwnedSystemText(
  value: string,
  locale: AppLocale
): string {
  if (locale === 'de') return value;

  let translated = translateRuntimeText(value, locale);
  for (const replacement of ownedSystemReplacements) {
    translated = translated.replace(replacement.de, replacement.en);
  }

  return translated;
}

// --------------------------------------------
// formatRelativeTime - Locale-bewusster Fallback
// --------------------------------------------

export function formatRelativeTime(
  dateString: string,
  locale: AppLocale
): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return locale === 'en' ? 'Today' : 'Heute';
  }

  if (diffDays === 1) {
    return locale === 'en' ? 'Yesterday' : 'Gestern';
  }

  if (diffDays < 7) {
    return locale === 'en' ? `${diffDays} days ago` : `vor ${diffDays} Tagen`;
  }

  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return locale === 'en' ? `${weeks} weeks ago` : `vor ${weeks} Wochen`;
  }

  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return locale === 'en' ? `${months} months ago` : `vor ${months} Monaten`;
  }

  const years = Math.floor(diffDays / 365);
  return locale === 'en' ? `${years} years ago` : `vor ${years} Jahren`;
}
