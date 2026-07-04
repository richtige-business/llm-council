// ============================================
// encryption.ts - Verschlüsselungs-Utilities
// 
// Zweck: AES-256-GCM Verschlüsselung für sensible Daten
//        wie OAuth-Tokens und IMAP-Passwörter
// Verwendet von: API Routes für Account-Management
// ============================================

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// --------------------------------------------
// Konfiguration
// AES-256-GCM ist ein sicherer, authentifizierter Verschlüsselungsmodus
// --------------------------------------------

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;        // 16 Bytes für IV (Initialisierungsvektor)
const AUTH_TAG_LENGTH = 16;  // 16 Bytes für Authentication Tag

// --------------------------------------------
// Encryption Key aus Umgebungsvariable holen
// Der Key muss 32 Bytes (64 Hex-Zeichen) lang sein
// --------------------------------------------

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY Umgebungsvariable ist nicht gesetzt. ' +
      'Generiere einen Key mit: openssl rand -hex 32'
    );
  }
  
  // Key als Hex-String interpretieren
  const keyBuffer = Buffer.from(key, 'hex');
  
  if (keyBuffer.length !== 32) {
    throw new Error(
      'ENCRYPTION_KEY muss 32 Bytes (64 Hex-Zeichen) lang sein. ' +
      `Aktuell: ${keyBuffer.length} Bytes`
    );
  }
  
  return keyBuffer;
}

// --------------------------------------------
// Daten verschlüsseln
// Gibt einen Base64-String zurück: iv:authTag:encryptedData
// --------------------------------------------

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  
  // Zufälligen IV generieren (wichtig für Sicherheit!)
  const iv = randomBytes(IV_LENGTH);
  
  // Cipher erstellen
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  // Daten verschlüsseln
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  // Authentication Tag holen (für Integritätsprüfung)
  const authTag = cipher.getAuthTag();
  
  // Alle Teile als Base64 kombinieren
  // Format: iv:authTag:encryptedData
  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted,
  ].join(':');
}

// --------------------------------------------
// Daten entschlüsseln
// Erwartet den String im Format: iv:authTag:encryptedData
// --------------------------------------------

export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();
  
  // Teile extrahieren
  const parts = encryptedData.split(':');
  
  if (parts.length !== 3) {
    throw new Error(
      'Ungültiges verschlüsseltes Datenformat. ' +
      'Erwartet: iv:authTag:encryptedData'
    );
  }
  
  const [ivBase64, authTagBase64, encrypted] = parts;
  
  // Von Base64 zurück zu Buffer
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  
  // Decipher erstellen
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  // Daten entschlüsseln
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// --------------------------------------------
// Hilfsfunktion: Sicher vergleichen
// Verhindert Timing-Attacks bei String-Vergleichen
// --------------------------------------------

export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

// --------------------------------------------
// Token-spezifische Funktionen
// Wrapper für OAuth-Token-Verschlüsselung
// --------------------------------------------

export interface EncryptedTokens {
  accessToken: string | null;
  refreshToken: string | null;
}

/**
 * OAuth-Tokens verschlüsseln
 * Gibt verschlüsselte Versionen zurück, die in der DB gespeichert werden können
 */
export function encryptTokens(
  accessToken: string | null,
  refreshToken: string | null
): EncryptedTokens {
  return {
    accessToken: accessToken ? encrypt(accessToken) : null,
    refreshToken: refreshToken ? encrypt(refreshToken) : null,
  };
}

/**
 * OAuth-Tokens entschlüsseln
 * Entschlüsselt die aus der DB geladenen Tokens
 */
export function decryptTokens(
  encryptedAccessToken: string | null,
  encryptedRefreshToken: string | null
): EncryptedTokens {
  return {
    accessToken: encryptedAccessToken ? decrypt(encryptedAccessToken) : null,
    refreshToken: encryptedRefreshToken ? decrypt(encryptedRefreshToken) : null,
  };
}











