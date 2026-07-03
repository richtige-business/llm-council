// ============================================
// microsoft.ts - Microsoft OAuth2 Utilities
// 
// Zweck: Hilfsfunktionen für den Outlook OAuth2-Flow
//        Nutzt Microsoft Identity Platform (v2.0) und Graph API
// Verwendet von: API Routes für Outlook-Integration
// ============================================

// --------------------------------------------
// Konfiguration
// Diese Werte kommen aus dem Azure Portal
// --------------------------------------------

const MICROSOFT_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const GRAPH_API_URL = 'https://graph.microsoft.com/v1.0';

// Scopes für Mail-Zugriff
// - Mail.Read: E-Mails lesen
// - Mail.Send: E-Mails senden
// - Mail.ReadWrite: E-Mails bearbeiten (als gelesen markieren etc.)
// - User.Read: Benutzerinfo (E-Mail, Name)
// - offline_access: Für Refresh Token
const SCOPES = [
  'Mail.Read',
  'Mail.Send',
  'Mail.ReadWrite',
  'User.Read',
  'offline_access',
];

// --------------------------------------------
// Environment Variables holen
// --------------------------------------------

function getMicrosoftCredentials() {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  if (!clientId || !clientSecret) {
    throw new Error(
      'Microsoft OAuth Credentials fehlen. Bitte MICROSOFT_CLIENT_ID und ' +
      'MICROSOFT_CLIENT_SECRET in der .env Datei setzen.'
    );
  }
  
  return {
    clientId,
    clientSecret,
    redirectUri: `${appUrl}/api/inbox/oauth/outlook/callback`,
  };
}

// --------------------------------------------
// Authorization URL generieren
// Der Nutzer wird zu dieser URL weitergeleitet
// --------------------------------------------

export function getMicrosoftAuthUrl(state?: string): string {
  const { clientId, redirectUri } = getMicrosoftCredentials();
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    response_mode: 'query',
    ...(state && { state }),
  });
  
  return `${MICROSOFT_AUTH_URL}?${params.toString()}`;
}

// --------------------------------------------
// Authorization Code gegen Tokens tauschen
// --------------------------------------------

export interface MicrosoftTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
  tokenType: string;
}

export async function exchangeCodeForTokens(code: string): Promise<MicrosoftTokens> {
  const { clientId, clientSecret, redirectUri } = getMicrosoftCredentials();
  
  const response = await fetch(MICROSOFT_TOKEN_URL, {
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
      scope: SCOPES.join(' '),
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Microsoft Token Exchange fehlgeschlagen: ${error}`);
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

export async function refreshAccessToken(refreshToken: string): Promise<MicrosoftTokens> {
  const { clientId, clientSecret } = getMicrosoftCredentials();
  
  const response = await fetch(MICROSOFT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: SCOPES.join(' '),
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Microsoft Token Refresh fehlgeschlagen: ${error}`);
  }
  
  const data = await response.json();
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
  };
}

// --------------------------------------------
// User-Info von Microsoft holen
// --------------------------------------------

export interface MicrosoftUserInfo {
  id: string;
  email: string;
  displayName: string;
}

export async function getMicrosoftUserInfo(accessToken: string): Promise<MicrosoftUserInfo> {
  const response = await fetch(`${GRAPH_API_URL}/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Fehler beim Abrufen der Microsoft User-Info');
  }
  
  const data = await response.json();
  
  return {
    id: data.id,
    email: data.mail || data.userPrincipalName,
    displayName: data.displayName,
  };
}

// --------------------------------------------
// Microsoft Graph API - Mail Funktionen
// --------------------------------------------

/**
 * Outlook-Nachrichten abrufen
 */
export async function fetchOutlookMessages(
  accessToken: string,
  options: {
    top?: number;
    skip?: number;
    filter?: string;
    orderby?: string;
    folder?: string;  // 'inbox', 'sentitems', 'drafts', 'deleteditems'
  } = {}
) {
  const { top = 20, skip = 0, filter, orderby = 'receivedDateTime desc', folder = 'inbox' } = options;
  
  const params = new URLSearchParams({
    '$top': top.toString(),
    '$skip': skip.toString(),
    '$orderby': orderby,
    '$select': 'id,subject,bodyPreview,from,toRecipients,ccRecipients,receivedDateTime,isRead,hasAttachments,importance',
    ...(filter && { '$filter': filter }),
  });
  
  const response = await fetch(
    `${GRAPH_API_URL}/me/mailFolders/${folder}/messages?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error('Fehler beim Abrufen der Outlook-Nachrichten');
  }
  
  return response.json();
}

/**
 * Einzelne Outlook-Nachricht mit Details abrufen
 */
export async function fetchOutlookMessage(accessToken: string, messageId: string) {
  const response = await fetch(
    `${GRAPH_API_URL}/me/messages/${messageId}`,
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
 * Outlook-Nachricht aktualisieren (z.B. als gelesen markieren)
 */
export async function updateOutlookMessage(
  accessToken: string,
  messageId: string,
  updates: {
    isRead?: boolean;
    importance?: 'low' | 'normal' | 'high';
    categories?: string[];
  }
) {
  const response = await fetch(
    `${GRAPH_API_URL}/me/messages/${messageId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    }
  );
  
  if (!response.ok) {
    throw new Error(`Fehler beim Aktualisieren der Nachricht ${messageId}`);
  }
  
  return response.json();
}

/**
 * E-Mail senden via Outlook
 */
export async function sendOutlookMessage(
  accessToken: string,
  message: {
    subject: string;
    body: {
      contentType: 'text' | 'html';
      content: string;
    };
    toRecipients: Array<{ emailAddress: { address: string; name?: string } }>;
    ccRecipients?: Array<{ emailAddress: { address: string; name?: string } }>;
  }
) {
  const response = await fetch(
    `${GRAPH_API_URL}/me/sendMail`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    }
  );
  
  if (!response.ok) {
    throw new Error('Fehler beim Senden der E-Mail via Outlook');
  }
  
  // sendMail gibt 202 Accepted ohne Body zurück
  return { success: true };
}

/**
 * Outlook-Nachricht verschieben (z.B. in Papierkorb)
 */
export async function moveOutlookMessage(
  accessToken: string,
  messageId: string,
  destinationFolder: string  // 'deleteditems', 'archive', etc.
) {
  const response = await fetch(
    `${GRAPH_API_URL}/me/messages/${messageId}/move`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ destinationId: destinationFolder }),
    }
  );
  
  if (!response.ok) {
    throw new Error(`Fehler beim Verschieben der Nachricht ${messageId}`);
  }
  
  return response.json();
}











