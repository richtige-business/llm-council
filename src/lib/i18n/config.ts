// ============================================
// config.ts - Zentrale Locale-Konfiguration
//
// Zweck: Definiert verfügbare Sprachen, Cookie-Namen und
//        gemeinsame Hilfsfunktionen für die appweite Sprachumschaltung.
// Verwendet von: Layout, Locale-Provider, Settings, Server-Utils
// ============================================

// --------------------------------------------
// Unterstützte Sprachen der App
// Aktuell bewusst auf Deutsch und Englisch begrenzt.
// --------------------------------------------

export const APP_LOCALES = ['de', 'en'] as const;

// Alias für ältere Imports im Repo.
export const SUPPORTED_LOCALES = APP_LOCALES;

export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = 'de';
export const LOCALE_COOKIE_NAME = 'llm-council-locale';

// --------------------------------------------
// Zeitzone für next-intl (SSR/CSR konsistent)
// Ohne globale timeZone wirft next-intl ENVIRONMENT_FALLBACK bei useTranslations().
// Optional: NEXT_PUBLIC_APP_TIME_ZONE (IANA, z. B. Europe/Vienna).
// --------------------------------------------

export const DEFAULT_APP_TIME_ZONE: string = (() => {
  const raw = process.env.NEXT_PUBLIC_APP_TIME_ZONE;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed) return trimmed;
  }
  return 'Europe/Berlin';
})();

// --------------------------------------------
// Locale-Normalisierung
// Akzeptiert auch Browser-/API-Werte wie de-DE oder en-US.
// --------------------------------------------

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return value === 'de' || value === 'en';
}

// Alias für ältere Aufrufer.
export function isSupportedLocale(value: string): value is AppLocale {
  return isAppLocale(value);
}

export function resolveAppLocale(value: string | null | undefined): AppLocale {
  if (!value) return DEFAULT_LOCALE;

  const normalized = value.toLowerCase();

  if (normalized.startsWith('de')) return 'de';
  if (normalized.startsWith('en')) return 'en';

  return DEFAULT_LOCALE;
}

// Alias für bestehende Server-/Runtime-Aufrufer.
export function normalizeLocale(value: string | null | undefined): AppLocale {
  return resolveAppLocale(value);
}

// --------------------------------------------
// Hilfsfunktion für Intl-Kompatibilität
// Manche Altstellen nutzen fest verdrahtet de-DE.
// --------------------------------------------

export function getIntlLocale(locale: AppLocale): string {
  return locale === 'en' ? 'en-US' : 'de-DE';
}
