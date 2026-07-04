// ============================================
// user-service.ts - Zentraler User-Service
// 
// Zweck: CRUD-Operationen für User und Preferences
// Verwendet von: /api/user/profile, /api/user/preferences, Agent
// ============================================

import { prisma } from '@/lib/db';

// --------------------------------------------
// Typen für den Service
// --------------------------------------------

export interface UpdateUserData {
  name?: string;
  email?: string | null;
  avatar?: string | null;
  bio?: string | null;
  status?: string;
  timezone?: string;
  language?: string;
}

// --------------------------------------------
// Default User ID
// LLM Council ist aktuell ein Single-User System
// Alle Operationen nutzen diese ID
// --------------------------------------------

export const DEFAULT_USER_ID = 'default-user';

// --------------------------------------------
// User-Operationen
// --------------------------------------------

/**
 * Holt den Default-User oder erstellt ihn falls nicht vorhanden.
 * Wird bei jedem API-Request aufgerufen um sicherzustellen,
 * dass ein User existiert.
 */
export async function getOrCreateDefaultUser() {
  return prisma.user.upsert({
    where: { id: DEFAULT_USER_ID },
    update: {},
    create: {
      id: DEFAULT_USER_ID,
      name: 'User',
      status: 'online',
      timezone: 'Europe/Berlin',
      language: 'de',
    },
    include: { preferences: true },
  });
}

/**
 * Holt den User ohne ihn zu erstellen.
 * Gibt null zurück wenn nicht gefunden.
 */
export async function getUser(userId: string = DEFAULT_USER_ID) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { preferences: true },
  });
}

/**
 * Aktualisiert die Profil-Daten des Users.
 * Nur die übergebenen Felder werden geändert.
 */
export async function updateUser(userId: string, data: UpdateUserData) {
  return prisma.user.update({
    where: { id: userId },
    data,
    include: { preferences: true },
  });
}

// --------------------------------------------
// Präferenz-Operationen
// --------------------------------------------

/**
 * Lädt alle Präferenzen eines Users.
 * Optional nach Domain gefiltert.
 */
export async function getPreferences(userId: string, domain?: string) {
  return prisma.userPreference.findMany({
    where: {
      userId,
      ...(domain ? { domain } : {}),
    },
    orderBy: [{ domain: 'asc' }, { key: 'asc' }],
  });
}

/**
 * Setzt eine einzelne Präferenz (Upsert).
 * Erstellt die Präferenz falls nicht vorhanden,
 * aktualisiert den Wert falls vorhanden.
 */
export async function setPreference(
  userId: string,
  domain: string,
  key: string,
  value: unknown
) {
  return prisma.userPreference.upsert({
    where: {
      userId_domain_key: { userId, domain, key },
    },
    update: { value: value as never },
    create: {
      userId,
      domain,
      key,
      value: value as never,
    },
  });
}

/**
 * Löscht eine einzelne Präferenz.
 */
export async function deletePreference(userId: string, domain: string, key: string) {
  return prisma.userPreference.delete({
    where: {
      userId_domain_key: { userId, domain, key },
    },
  });
}

/**
 * Formatiert Präferenzen als strukturiertes Objekt
 * gruppiert nach Domain.
 * z.B. { communication: { language: "de" }, scheduling: { meeting_duration: 30 } }
 */
export async function getPreferencesGrouped(userId: string) {
  const prefs = await getPreferences(userId);
  
  const grouped: Record<string, Record<string, unknown>> = {};
  
  for (const pref of prefs) {
    if (!grouped[pref.domain]) {
      grouped[pref.domain] = {};
    }
    grouped[pref.domain][pref.key] = pref.value;
  }
  
  return grouped;
}
