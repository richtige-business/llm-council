// ============================================
// google.ts - Google OAuth2 Utilities
// 
// Zweck: Hilfsfunktionen für den Gmail OAuth2-Flow
// Verwendet von: API Routes für Gmail-Integration
// ============================================

// --------------------------------------------
// Konfiguration
// Diese Werte kommen aus der Google Cloud Console
// --------------------------------------------

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

// Scopes für Gmail-Zugriff
// - gmail.readonly: E-Mails lesen
// - gmail.send: E-Mails senden
// - gmail.modify: Labels ändern, als gelesen markieren etc.
// - userinfo.email: E-Mail-Adresse des Nutzers
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

// --------------------------------------------
// Environment Variables holen
// --------------------------------------------

function getGoogleCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  if (!clientId || !clientSecret) {
    throw new Error(
      'Google OAuth Credentials fehlen. Bitte GOOGLE_CLIENT_ID und ' +
      'GOOGLE_CLIENT_SECRET in der .env Datei setzen.'
    );
  }
  
  return {
    clientId,
    clientSecret,
    redirectUri: `${appUrl}/api/inbox/oauth/gmail/callback`,
  };
}

// --------------------------------------------
// Authorization URL generieren
// Der Nutzer wird zu dieser URL weitergeleitet
// --------------------------------------------

export function getGoogleAuthUrl(state?: string): string {
  const { clientId, redirectUri } = getGoogleCredentials();
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',  // Für Refresh Token
    prompt: 'consent',       // Immer Consent-Screen zeigen
    ...(state && { state }),  // Optional: State für CSRF-Schutz
  });
  
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

// --------------------------------------------
// Authorization Code gegen Tokens tauschen
// --------------------------------------------

export interface GoogleTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
  tokenType: string;
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const { clientId, clientSecret, redirectUri } = getGoogleCredentials();
  
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange fehlgeschlagen: ${error}`);
  }
  
  const data = await response.json();
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || null,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
  };
}

// --------------------------------------------
// Access Token mit Refresh Token erneuern
// --------------------------------------------

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const { clientId, clientSecret } = getGoogleCredentials();
  
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh fehlgeschlagen: ${error}`);
  }
  
  const data = await response.json();
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken, // Behalte alten Refresh Token
    expiresIn: data.expires_in,
    tokenType: data.token_type,
  };
}

// --------------------------------------------
// User-Info von Google holen
// --------------------------------------------

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Fehler beim Abrufen der User-Info');
  }
  
  return response.json();
}

// --------------------------------------------
// Gmail API Hilfsfunktionen
// --------------------------------------------

const GMAIL_API_URL = 'https://gmail.googleapis.com/gmail/v1';

/**
 * Gmail-Nachrichten abrufen
 */
export async function fetchGmailMessages(
  accessToken: string,
  options: {
    maxResults?: number;
    labelIds?: string[];
    q?: string;  // Suchquery
    pageToken?: string;
  } = {}
) {
  const { maxResults = 20, labelIds, q, pageToken } = options;
  
  const params = new URLSearchParams({
    maxResults: maxResults.toString(),
    ...(pageToken && { pageToken }),
    ...(q && { q }),
  });
  
  // Label-Filter hinzufügen
  if (labelIds && labelIds.length > 0) {
    labelIds.forEach(id => params.append('labelIds', id));
  }
  
  const response = await fetch(
    `${GMAIL_API_URL}/users/me/messages?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error('Fehler beim Abrufen der Gmail-Nachrichten');
  }
  
  return response.json();
}

/**
 * Einzelne Gmail-Nachricht mit Details abrufen
 */
export async function fetchGmailMessage(
  accessToken: string,
  messageId: string,
  format: 'minimal' | 'full' | 'metadata' = 'full'
) {
  const response = await fetch(
    `${GMAIL_API_URL}/users/me/messages/${messageId}?format=${format}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Fehler beim Abrufen der Nachricht ${messageId}`);
  }
  
  return response.json();
}

/**
 * Gmail-Nachricht als gelesen/ungelesen markieren
 */
export async function modifyGmailMessage(
  accessToken: string,
  messageId: string,
  addLabels: string[] = [],
  removeLabels: string[] = []
) {
  const response = await fetch(
    `${GMAIL_API_URL}/users/me/messages/${messageId}/modify`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        addLabelIds: addLabels,
        removeLabelIds: removeLabels,
      }),
    }
  );
  
  if (!response.ok) {
    throw new Error(`Fehler beim Ändern der Nachricht ${messageId}`);
  }
  
  return response.json();
}

/**
 * E-Mail senden via Gmail
 */
export async function sendGmailMessage(
  accessToken: string,
  rawMessage: string  // Base64-encoded RFC 2822 Message
) {
  console.log('📧 Sende Email via Gmail API...');
  
  const response = await fetch(
    `${GMAIL_API_URL}/users/me/messages/send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: rawMessage,
      }),
    }
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Gmail API Fehler:', response.status, errorText);
    throw new Error(`Gmail API Fehler (${response.status}): ${errorText}`);
  }
  
  const result = await response.json();
  console.log('✅ Email erfolgreich gesendet! Message ID:', result.id);
  return result;
}

/**
 * Gmail-Nachricht in Papierkorb verschieben
 */
export async function trashGmailMessage(
  accessToken: string,
  messageId: string
) {
  const response = await fetch(
    `${GMAIL_API_URL}/users/me/messages/${messageId}/trash`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Fehler beim Löschen der Nachricht ${messageId}`);
  }
  
  return response.json();
}

/**
 * Gmail-Nachricht aus Papierkorb wiederherstellen
 */
export async function untrashGmailMessage(
  accessToken: string,
  messageId: string
) {
  const response = await fetch(
    `${GMAIL_API_URL}/users/me/messages/${messageId}/untrash`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Fehler beim Wiederherstellen der Nachricht ${messageId}`);
  }
  
  return response.json();
}

// --------------------------------------------
// Gmail Label IDs (Konstanten)
// --------------------------------------------

export const GMAIL_LABELS = {
  INBOX: 'INBOX',
  SENT: 'SENT',
  DRAFTS: 'DRAFT',
  TRASH: 'TRASH',
  SPAM: 'SPAM',
  STARRED: 'STARRED',
  UNREAD: 'UNREAD',
  IMPORTANT: 'IMPORTANT',
} as const;

// ============================================
// ENTWÜRFE (DRAFTS)
// ============================================

/**
 * Entwurf erstellen
 * @param rawMessage - Base64url-encoded RFC 2822 Message
 */
export async function createGmailDraft(
  accessToken: string,
  rawMessage: string
) {
  const response = await fetch(
    `${GMAIL_API_URL}/users/me/drafts`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: { raw: rawMessage },
      }),
    }
  );
  
  if (!response.ok) {
    throw new Error('Fehler beim Erstellen des Entwurfs');
  }
  
  return response.json();
}

/**
 * Entwurf aktualisieren
 */
export async function updateGmailDraft(
  accessToken: string,
  draftId: string,
  rawMessage: string
) {
  const response = await fetch(
    `${GMAIL_API_URL}/users/me/drafts/${draftId}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: { raw: rawMessage },
      }),
    }
  );
  
  if (!response.ok) {
    throw new Error(`Fehler beim Aktualisieren des Entwurfs ${draftId}`);
  }
  
  return response.json();
}

/**
 * Entwurf löschen
 */
export async function deleteGmailDraft(
  accessToken: string,
  draftId: string
) {
  const response = await fetch(
    `${GMAIL_API_URL}/users/me/drafts/${draftId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Fehler beim Löschen des Entwurfs ${draftId}`);
  }
  
  return true;
}

/**
 * Alle Entwürfe abrufen
 */
export async function fetchGmailDrafts(
  accessToken: string,
  maxResults: number = 50
) {
  const response = await fetch(
    `${GMAIL_API_URL}/users/me/drafts?maxResults=${maxResults}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error('Fehler beim Abrufen der Entwürfe');
  }
  
  return response.json();
}

/**
 * Entwurf senden (wird zu gesendeter Mail)
 */
export async function sendGmailDraft(
  accessToken: string,
  draftId: string
) {
  const response = await fetch(
    `${GMAIL_API_URL}/users/me/drafts/send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: draftId }),
    }
  );
  
  if (!response.ok) {
    throw new Error(`Fehler beim Senden des Entwurfs ${draftId}`);
  }
  
  return response.json();
}

// ============================================
// PERMANENT LÖSCHEN
// ============================================

/**
 * Nachricht permanent löschen (nicht wiederherstellbar!)
 */
export async function deleteGmailMessagePermanently(
  accessToken: string,
  messageId: string
) {
  const response = await fetch(
    `${GMAIL_API_URL}/users/me/messages/${messageId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Fehler beim permanenten Löschen der Nachricht ${messageId}`);
  }
  
  return true;
}

// ============================================
// SPAM
// ============================================

/**
 * Als Spam markieren (verschiebt in Spam-Ordner)
 */
export async function markAsSpam(
  accessToken: string,
  messageId: string
) {
  return modifyGmailMessage(accessToken, messageId, [GMAIL_LABELS.SPAM], [GMAIL_LABELS.INBOX]);
}

/**
 * Spam-Markierung entfernen (zurück in Inbox)
 */
export async function unmarkAsSpam(
  accessToken: string,
  messageId: string
) {
  return modifyGmailMessage(accessToken, messageId, [GMAIL_LABELS.INBOX], [GMAIL_LABELS.SPAM]);
}

// ============================================
// GESENDETE MAILS
// ============================================

/**
 * Gesendete Mails abrufen
 */
export async function fetchGmailSentMessages(
  accessToken: string,
  maxResults: number = 50
) {
  return fetchGmailMessages(accessToken, {
    maxResults,
    labelIds: [GMAIL_LABELS.SENT],
  });
}




