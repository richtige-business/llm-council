// ============================================
// route.ts - Sync API
// 
// Zweck: E-Mails von allen verbundenen Konten synchronisieren
// Route: POST /api/inbox/sync
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { fetchGmailMessages, fetchGmailMessage, refreshAccessToken as refreshGoogleToken } from '@/lib/oauth/google';
import { fetchOutlookMessages, refreshAccessToken as refreshMicrosoftToken } from '@/lib/oauth/microsoft';
import { fetchImapMessages, type ImapConfig } from '@/lib/email/imap';

// --------------------------------------------
// POST Handler
// Synchronisiert alle aktiven E-Mail-Konten
// --------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const accountId = body.accountId;  // Optional: Nur bestimmtes Konto sync

    // Aktive Konten abrufen
    const where = accountId 
      ? { id: accountId, isActive: true }
      : { isActive: true };

    const accounts = await prisma.emailAccount.findMany({ where });

    if (accounts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Keine aktiven Konten zum Synchronisieren',
        syncedCount: 0,
      });
    }

    const results = {
      total: accounts.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Jedes Konto synchronisieren
    for (const account of accounts) {
      try {
        switch (account.provider) {
          case 'gmail':
            await syncGmailAccount(account);
            break;
          case 'outlook':
            await syncOutlookAccount(account);
            break;
          case 'imap':
            await syncImapAccount(account);
            break;
        }

        // Letzte Sync-Zeit aktualisieren
        await prisma.emailAccount.update({
          where: { id: account.id },
          data: {
            lastSyncAt: new Date(),
            syncError: null,
          },
        });

        results.success++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
        results.failed++;
        results.errors.push(`${account.email}: ${errorMessage}`);

        // Fehler im Konto speichern
        await prisma.emailAccount.update({
          where: { id: account.id },
          data: { syncError: errorMessage },
        });
      }
    }

    return NextResponse.json({
      success: true,
      syncedCount: results.success,
      failedCount: results.failed,
      errors: results.errors.length > 0 ? results.errors : undefined,
    });

  } catch (error) {
    console.error('Sync Fehler:', error);
    return NextResponse.json(
      { error: 'Fehler beim Synchronisieren' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// Gmail Sync
// --------------------------------------------

async function syncGmailAccount(account: {
  id: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiry: Date | null;
}) {
  if (!account.accessToken || !account.refreshToken) {
    throw new Error('Keine OAuth-Tokens vorhanden');
  }

  let accessToken = decrypt(account.accessToken);

  // Token erneuern wenn abgelaufen
  if (account.tokenExpiry && new Date() > account.tokenExpiry) {
    const refreshToken = decrypt(account.refreshToken);
    const newTokens = await refreshGoogleToken(refreshToken);
    accessToken = newTokens.accessToken;

    // Neue Tokens speichern
    const { encrypt } = await import('@/lib/crypto');
    await prisma.emailAccount.update({
      where: { id: account.id },
      data: {
        accessToken: encrypt(newTokens.accessToken),
        tokenExpiry: new Date(Date.now() + newTokens.expiresIn * 1000),
      },
    });
  }

  // --------------------------------------------
  // Alle Ordner synchronisieren
  // --------------------------------------------
  
  const foldersToSync = [
    { label: 'INBOX', folder: 'inbox' as const },
    { label: 'SENT', folder: 'sent' as const },
    { label: 'DRAFT', folder: 'drafts' as const },
    { label: 'SPAM', folder: 'spam' as const },
    { label: 'TRASH', folder: 'trash' as const },
  ];

  for (const { label, folder } of foldersToSync) {
    try {
      const response = await fetchGmailMessages(accessToken, {
        maxResults: folder === 'inbox' ? 200 : 50, // Inbox bekommt mehr
        labelIds: [label],
      });

      if (!response.messages) continue;

      // Details für jede Nachricht abrufen und speichern
      for (const msg of response.messages) {
        const details = await fetchGmailMessage(accessToken, msg.id);
        await saveGmailMessage(account.id, details, folder);
      }
    } catch (error) {
      console.error(`Fehler beim Sync von ${folder}:`, error);
      // Weitermachen mit nächstem Ordner
    }
  }
}

// --------------------------------------------
// Hilfsfunktion: Rekursive Part-Extraktion für Gmail
// Durchsucht alle verschachtelten MIME-Parts nach Text/HTML-Inhalten
// --------------------------------------------

interface GmailPart {
  mimeType: string;
  body?: { data?: string };
  parts?: GmailPart[];
}

function extractBodyFromParts(parts: GmailPart[]): { body: string; bodyHtml: string } {
  let body = '';
  let bodyHtml = '';

  for (const part of parts) {
    // Direkter Text/HTML-Content
    if (part.mimeType === 'text/plain' && part.body?.data && !body) {
      body = Buffer.from(part.body.data, 'base64').toString('utf-8');
    } else if (part.mimeType === 'text/html' && part.body?.data && !bodyHtml) {
      bodyHtml = Buffer.from(part.body.data, 'base64').toString('utf-8');
    }
    
    // Rekursiv in verschachtelte Parts schauen (z.B. multipart/alternative)
    if (part.parts && part.parts.length > 0) {
      const nested = extractBodyFromParts(part.parts);
      if (!body && nested.body) body = nested.body;
      if (!bodyHtml && nested.bodyHtml) bodyHtml = nested.bodyHtml;
    }
  }

  return { body, bodyHtml };
}

async function saveGmailMessage(
  accountId: string, 
  gmailMsg: Record<string, unknown>,
  folder: 'inbox' | 'sent' | 'drafts' | 'spam' | 'trash' = 'inbox'
) {
  const payload = gmailMsg.payload as { 
    headers?: Array<{ name: string; value: string }>;
    body?: { data?: string };
    mimeType?: string;
    parts?: GmailPart[];
  } | undefined;
  
  const headers = payload?.headers || [];
  const getHeader = (name: string) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  // --------------------------------------------
  // Hilfsfunktion: Prüft ob ein String HTML-Inhalt ist
  // --------------------------------------------
  const isHtmlContent = (content: string): boolean => {
    const trimmed = content.trim();
    return trimmed.startsWith('<!DOCTYPE') || 
           trimmed.startsWith('<html') ||
           trimmed.startsWith('<HTML') ||
           (trimmed.includes('<table') && trimmed.includes('</table>')) ||
           (trimmed.includes('<div') && trimmed.includes('</div>'));
  };

  // --------------------------------------------
  // Body extrahieren - mit rekursiver Suche in allen Parts
  // --------------------------------------------
  let body = '';
  let bodyHtml = '';
  
  // Fall 1: Direkter Body im Payload (einfache Text-E-Mail)
  if (payload?.body?.data) {
    const content = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    // Prüfe mimeType ODER ob Inhalt HTML ist (manche E-Mails haben falschen mimeType)
    if (payload.mimeType === 'text/html' || isHtmlContent(content)) {
      bodyHtml = content;
    } else {
      body = content;
    }
  }
  
  // Fall 2: Multipart-Nachricht - rekursiv durchsuchen
  if (payload?.parts && payload.parts.length > 0) {
    const extracted = extractBodyFromParts(payload.parts);
    if (!body && extracted.body) body = extracted.body;
    if (!bodyHtml && extracted.bodyHtml) bodyHtml = extracted.bodyHtml;
  }
  
  // Fall 3: Wenn body HTML enthält, in bodyHtml verschieben
  if (body && !bodyHtml && isHtmlContent(body)) {
    bodyHtml = body;
    body = '';
  }
  
  // Fall 4: Wenn nur HTML vorhanden, daraus Plain-Text ableiten
  if (!body && bodyHtml) {
    // Einfache HTML-zu-Text Konvertierung
    body = bodyHtml
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  // Prüfen ob Nachricht bereits existiert
  const existingMessage = await prisma.message.findFirst({
    where: { externalId: gmailMsg.id as string, accountId },
  });

  if (existingMessage) {
    // --------------------------------------------
    // Update: Korrigiere existierende Nachrichten
    // - Wenn kein Body vorhanden → Body aktualisieren
    // - Wenn HTML im body-Feld statt bodyHtml → korrigieren
    // --------------------------------------------
    const needsUpdate = 
      // Kein Body vorhanden
      (!existingMessage.body && (body || bodyHtml)) ||
      // HTML im body-Feld aber kein bodyHtml
      (!existingMessage.bodyHtml && existingMessage.body && isHtmlContent(existingMessage.body));
    
    if (needsUpdate) {
      // Wenn existierender body HTML enthält, korrigieren
      let updateBody = body;
      let updateBodyHtml = bodyHtml;
      
      if (!existingMessage.bodyHtml && existingMessage.body && isHtmlContent(existingMessage.body)) {
        updateBodyHtml = existingMessage.body;
        // Plain-Text aus HTML ableiten
        updateBody = existingMessage.body
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim();
      }
      
      await prisma.message.update({
        where: { id: existingMessage.id },
        data: {
          body: updateBody,
          bodyHtml: updateBodyHtml || null,
          snippet: gmailMsg.snippet as string || updateBody.slice(0, 150),
        },
      });
    }
    return;  // Nachricht existiert bereits (mit oder ohne Update)
  }

  // --------------------------------------------
  // Neue Nachricht erstellen
  // --------------------------------------------
  await prisma.message.create({
    data: {
      accountId,
      type: 'email',
      subject: getHeader('Subject') || '(Kein Betreff)',
      body,
      bodyHtml: bodyHtml || null,
      snippet: gmailMsg.snippet as string || body.slice(0, 150),
      sender: getHeader('From'),
      senderName: getHeader('From').split('<')[0].trim().replace(/"/g, ''),
      recipients: JSON.stringify([getHeader('To')]),
      cc: JSON.stringify(getHeader('Cc') ? [getHeader('Cc')] : []),
      bcc: JSON.stringify([]),
      isRead: (gmailMsg.labelIds as string[])?.includes('UNREAD') === false,
      isStarred: (gmailMsg.labelIds as string[])?.includes('STARRED') || false,
      folder,  // Verwende den übergebenen Ordner
      externalId: gmailMsg.id as string,
      threadId: gmailMsg.threadId as string,
      receivedAt: new Date(parseInt(gmailMsg.internalDate as string)),
    },
  });
}

// --------------------------------------------
// Outlook Sync
// --------------------------------------------

async function syncOutlookAccount(account: {
  id: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiry: Date | null;
}) {
  if (!account.accessToken || !account.refreshToken) {
    throw new Error('Keine OAuth-Tokens vorhanden');
  }

  let accessToken = decrypt(account.accessToken);

  // Token erneuern wenn abgelaufen
  if (account.tokenExpiry && new Date() > account.tokenExpiry) {
    const refreshToken = decrypt(account.refreshToken);
    const newTokens = await refreshMicrosoftToken(refreshToken);
    accessToken = newTokens.accessToken;

    const { encrypt } = await import('@/lib/crypto');
    await prisma.emailAccount.update({
      where: { id: account.id },
      data: {
        accessToken: encrypt(newTokens.accessToken),
        tokenExpiry: new Date(Date.now() + newTokens.expiresIn * 1000),
      },
    });
  }

  // Nachrichten abrufen
  const response = await fetchOutlookMessages(accessToken, { top: 50 });

  if (!response.value) return;

  // Nachrichten speichern
  for (const msg of response.value) {
    await saveOutlookMessage(account.id, msg);
  }
}

async function saveOutlookMessage(accountId: string, outlookMsg: Record<string, unknown>) {
  const existingMessage = await prisma.message.findFirst({
    where: { externalId: outlookMsg.id as string, accountId },
  });

  if (existingMessage) return;

  const from = outlookMsg.from as { emailAddress?: { address?: string; name?: string } };
  const toRecipients = outlookMsg.toRecipients as Array<{ emailAddress?: { address?: string } }> || [];

  await prisma.message.create({
    data: {
      accountId,
      type: 'email',
      subject: outlookMsg.subject as string || '(Kein Betreff)',
      body: (outlookMsg.body as { content?: string })?.content || '',
      bodyHtml: (outlookMsg.body as { contentType?: string; content?: string })?.contentType === 'html' 
        ? (outlookMsg.body as { content?: string })?.content 
        : null,
      snippet: outlookMsg.bodyPreview as string || '',
      sender: from?.emailAddress?.address || '',
      senderName: from?.emailAddress?.name || null,
      recipients: JSON.stringify(toRecipients.map(r => r.emailAddress?.address)),
      cc: JSON.stringify([]),
      bcc: JSON.stringify([]),
      isRead: outlookMsg.isRead as boolean || false,
      isStarred: false,
      folder: 'inbox',
      externalId: outlookMsg.id as string,
      hasAttachments: outlookMsg.hasAttachments as boolean || false,
      receivedAt: new Date(outlookMsg.receivedDateTime as string),
    },
  });
}

// --------------------------------------------
// IMAP Sync
// --------------------------------------------

async function syncImapAccount(account: {
  id: string;
  email: string;
  imapHost: string | null;
  imapPort: number | null;
  imapPassword: string | null;
}) {
  if (!account.imapHost || !account.imapPassword) {
    throw new Error('IMAP-Konfiguration unvollständig');
  }

  const config: ImapConfig = {
    host: account.imapHost,
    port: account.imapPort || 993,
    user: account.email,
    password: decrypt(account.imapPassword),
  };

  // Nachrichten abrufen
  const messages = await fetchImapMessages(config, { limit: 50 });

  // Nachrichten speichern
  for (const msg of messages) {
    const existingMessage = await prisma.message.findFirst({
      where: { 
        externalId: msg.messageId || `imap-${msg.uid}`, 
        accountId: account.id 
      },
    });

    if (existingMessage) {
      // --------------------------------------------
      // Update: Wenn existierende Nachricht keinen Body hat, aktualisieren
      // --------------------------------------------
      if (!existingMessage.body && (msg.bodyText || msg.bodyHtml)) {
        await prisma.message.update({
          where: { id: existingMessage.id },
          data: {
            body: msg.bodyText || '',
            bodyHtml: msg.bodyHtml,
            snippet: msg.snippet || (msg.bodyText || '').slice(0, 150),
          },
        });
      }
      continue;  // Nachricht existiert bereits
    }

    // --------------------------------------------
    // Neue Nachricht erstellen
    // --------------------------------------------
    await prisma.message.create({
      data: {
        accountId: account.id,
        type: 'email',
        subject: msg.subject,
        body: msg.bodyText || '',
        bodyHtml: msg.bodyHtml,
        snippet: msg.snippet,
        sender: msg.from,
        senderName: msg.fromName,
        recipients: JSON.stringify(msg.to),
        cc: JSON.stringify(msg.cc),
        bcc: JSON.stringify([]),
        isRead: msg.flags.includes('\\Seen'),
        isStarred: msg.flags.includes('\\Flagged'),
        folder: 'inbox',
        externalId: msg.messageId || `imap-${msg.uid}`,
        hasAttachments: msg.hasAttachments,
        receivedAt: msg.date,
      },
    });
  }
}

