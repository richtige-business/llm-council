// ============================================
// server.ts - Serverseitige Locale-Helfer
//
// Zweck: Liest die aktive Sprache aus Cookies/Headers
//        und liefert passende Server-Daten dafür.
// Verwendet von: Root-Layout, Metadata
// ============================================

import { cookies, headers } from 'next/headers';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  normalizeLocale,
  type AppLocale,
} from './config';
import { getMessages } from './messages';

// --------------------------------------------
// getServerLocale - Liest Locale aus Cookie oder Header
// Cookie hat Vorrang, danach Accept-Language.
// --------------------------------------------

export async function getServerLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;

  if (cookieLocale) {
    return normalizeLocale(cookieLocale);
  }

  const headerStore = await headers();
  const acceptLanguage = headerStore.get('accept-language');
  return normalizeLocale(acceptLanguage || DEFAULT_LOCALE);
}

// --------------------------------------------
// getServerMessages - Liefert Server-Dictionary
// --------------------------------------------

export async function getServerMessages() {
  const locale = await getServerLocale();
  return getMessages(locale);
}
