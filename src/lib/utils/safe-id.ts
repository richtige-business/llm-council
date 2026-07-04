// ============================================
// safe-id.ts - Sichere ID-Erzeugung fuer Browser und Server
// 
// Zweck: Liefert stabile IDs auch dann, wenn randomUUID im Browser
//        auf unsicheren Origins (z. B. rohe IP per HTTP) fehlt
// Verwendet von: Client-Stores, globale Browser-Initialisierung
// ============================================

// --------------------------------------------
// Native UUID-Funktion einmalig sichern
// Damit createSafeId nicht auf das nachtraeglich gesetzte Polyfill zeigt
// --------------------------------------------

const nativeRandomUuid =
  typeof globalThis !== 'undefined' &&
  typeof globalThis.crypto !== 'undefined' &&
  typeof globalThis.crypto.randomUUID === 'function'
    ? globalThis.crypto.randomUUID.bind(globalThis.crypto)
    : null;

// --------------------------------------------
// UUID-Fallback erzeugen
// Nutzt nach Moeglichkeit getRandomValues fuer bessere Entropie
// --------------------------------------------

function createUuidFromRandomValues(): string | null {
  if (typeof globalThis === 'undefined') return null;
  if (typeof globalThis.crypto === 'undefined') return null;
  if (typeof globalThis.crypto.getRandomValues !== 'function') return null;

  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));

  // RFC-4122 Variant + Version 4 setzen
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}

// --------------------------------------------
// Oeffentliche Hilfsfunktion fuer sichere IDs
// Faellt zuletzt auf Zeitstempel + Math.random zurueck
// --------------------------------------------

export function createSafeId(): string {
  if (nativeRandomUuid) {
    return nativeRandomUuid();
  }

  const cryptoUuid = createUuidFromRandomValues();
  if (cryptoUuid) {
    return cryptoUuid;
  }

  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

// --------------------------------------------
// Browser-Polyfill setzen
// Damit bestehender Code mit crypto.randomUUID weiter funktioniert
// --------------------------------------------

export function ensureRandomUuidSupport(): void {
  if (typeof globalThis === 'undefined') return;

  const globalScope = globalThis as typeof globalThis & {
    crypto?: Crypto & { randomUUID?: () => string };
  };

  if (typeof globalScope.crypto === 'undefined') {
    try {
      Object.defineProperty(globalScope, 'crypto', {
        value: {
          randomUUID: () => createSafeId(),
        },
        configurable: true,
      });
      return;
    } catch {
      return;
    }
  }

  if (typeof globalScope.crypto.randomUUID === 'function') return;

  try {
    Object.defineProperty(globalScope.crypto, 'randomUUID', {
      value: () => createSafeId(),
      configurable: true,
    });
    return;
  } catch {
    globalScope.crypto.randomUUID = () => createSafeId();
  }
}

ensureRandomUuidSupport();
