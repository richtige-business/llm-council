// ============================================
// imap.ts - IMAP/SMTP Email Utilities (Server-only!)
// 
// Zweck: E-Mail-Abruf und -Versand über IMAP/SMTP
//        Für Provider wie GMX, Web.de, T-Online, etc.
// Verwendet von: API Routes für IMAP-Konten (NUR SERVER!)
// 
// WICHTIG: Diese Datei NUR in API Routes / Server Components verwenden!
//          Nicht in Client Components importieren!
// ============================================

// Server-only Importe
import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';
import { simpleParser, type ParsedMail } from 'mailparser';

// --------------------------------------------
// IMAP-Verbindung herstellen und Nachrichten abrufen
// --------------------------------------------

export interface ImapConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

export interface FetchedMessage {
  uid: number;
  messageId: string | null;
  subject: string;
  from: string;
  fromName: string | null;
  to: string[];
  cc: string[];
  date: Date;
  flags: string[];
  bodyText: string | null;
  bodyHtml: string | null;
  snippet: string;
  hasAttachments: boolean;
}

/**
 * IMAP-Verbindung testen
 * Gibt true zurück wenn die Verbindung erfolgreich ist
 * Mit Timeout-Konfiguration um endloses Warten zu verhindern
 */
export async function testImapConnection(config: ImapConfig): Promise<boolean> {
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: true,
    auth: {
      user: config.user,
      pass: config.password,
    },
    logger: false,
    // Timeouts um endloses Warten zu verhindern (z.B. bei GMX)
    connectionTimeout: 10000,  // 10 Sekunden für Verbindungsaufbau
    greetingTimeout: 10000,    // 10 Sekunden für Server-Greeting
    socketTimeout: 30000,      // 30 Sekunden für Socket-Operationen
  });
  
  try {
    await client.connect();
    await client.logout();
    return true;
  } catch (error) {
    console.error('IMAP-Verbindungstest fehlgeschlagen:', error);
    return false;
  }
}

/**
 * E-Mails aus einem IMAP-Postfach abrufen
 */
export async function fetchImapMessages(
  config: ImapConfig,
  options: {
    folder?: string;
    limit?: number;
    since?: Date;
  } = {}
): Promise<FetchedMessage[]> {
  const { folder = 'INBOX', limit = 50, since } = options;
  
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: true,
    auth: {
      user: config.user,
      pass: config.password,
    },
    logger: false,
    // Timeouts um endloses Warten zu verhindern
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
  });
  
  const messages: FetchedMessage[] = [];
  
  try {
    await client.connect();
    
    // Mailbox öffnen
    const lock = await client.getMailboxLock(folder);
    
    try {
      // Suchkriterien erstellen
      const searchCriteria: Record<string, unknown> = { all: true };
      if (since) {
        searchCriteria.since = since;
      }
      
      // --------------------------------------------
      // Nachrichten abrufen und mit mailparser parsen
      // mailparser dekodiert automatisch Base64, quoted-printable, etc.
      // --------------------------------------------
      let count = 0;
      for await (const message of client.fetch(searchCriteria, {
        uid: true,
        envelope: true,
        flags: true,
        bodyStructure: true,
        source: true,
      })) {
        if (count >= limit) break;
        
        // Body-Text mit mailparser extrahieren
        let bodyText: string | null = null;
        let bodyHtml: string | null = null;
        let hasAttachments = false;
        
        if (message.source) {
          try {
            // mailparser parst die komplette E-Mail korrekt
            // inkl. Base64-Dekodierung, Zeichensätze, verschachtelte MIME-Parts
            const parsed: ParsedMail = await simpleParser(message.source);
            
            // Text-Body (automatisch dekodiert)
            bodyText = parsed.text || null;
            
            // HTML-Body (automatisch dekodiert)
            bodyHtml = parsed.html || null;
            
            // Prüfen ob Anhänge vorhanden
            hasAttachments = (parsed.attachments && parsed.attachments.length > 0) || false;
            
            // Falls nur HTML vorhanden, daraus Plain-Text ableiten
            if (!bodyText && bodyHtml) {
              bodyText = bodyHtml
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
          } catch (parseError) {
            console.error('Fehler beim Parsen der E-Mail:', parseError);
            // Fallback: Envelope-Daten verwenden
          }
        }
        
        // Snippet erstellen (erste 150 Zeichen des Textes)
        const snippet = (bodyText || '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 150);
        
        messages.push({
          uid: message.uid,
          messageId: message.envelope?.messageId || null,
          subject: message.envelope?.subject || '(Kein Betreff)',
          from: message.envelope?.from?.[0]?.address || '',
          fromName: message.envelope?.from?.[0]?.name || null,
          to: message.envelope?.to?.map((t: { address?: string }) => t.address || '') || [],
          cc: message.envelope?.cc?.map((c: { address?: string }) => c.address || '') || [],
          date: message.envelope?.date || new Date(),
          flags: Array.from(message.flags || []),
          bodyText,
          bodyHtml,
          snippet,
          hasAttachments,
        });
        
        count++;
      }
    } finally {
      lock.release();
    }
    
    await client.logout();
  } catch (error) {
    console.error('IMAP Fetch Fehler:', error);
    throw error;
  }
  
  return messages;
}

/**
 * Nachricht als gelesen/ungelesen markieren
 */
export async function setMessageFlags(
  config: ImapConfig,
  uid: number,
  flags: { seen?: boolean; flagged?: boolean },
  folder = 'INBOX'
): Promise<void> {
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: true,
    auth: {
      user: config.user,
      pass: config.password,
    },
    logger: false,
    // Timeouts um endloses Warten zu verhindern
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
  });
  
  try {
    await client.connect();
    
    const lock = await client.getMailboxLock(folder);
    
    try {
      if (flags.seen !== undefined) {
        if (flags.seen) {
          await client.messageFlagsAdd({ uid }, ['\\Seen']);
        } else {
          await client.messageFlagsRemove({ uid }, ['\\Seen']);
        }
      }
      
      if (flags.flagged !== undefined) {
        if (flags.flagged) {
          await client.messageFlagsAdd({ uid }, ['\\Flagged']);
        } else {
          await client.messageFlagsRemove({ uid }, ['\\Flagged']);
        }
      }
    } finally {
      lock.release();
    }
    
    await client.logout();
  } catch (error) {
    console.error('IMAP Flag Update Fehler:', error);
    throw error;
  }
}

// --------------------------------------------
// SMTP - E-Mails versenden
// --------------------------------------------

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

export interface EmailMessage {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

/**
 * E-Mail über SMTP versenden
 */
export async function sendSmtpEmail(
  config: SmtpConfig,
  message: EmailMessage
): Promise<{ messageId: string }> {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465, // true für Port 465, false für andere
    auth: {
      user: config.user,
      pass: config.password,
    },
  });
  
  const result = await transporter.sendMail({
    from: config.user,
    to: message.to,
    cc: message.cc,
    bcc: message.bcc,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
  
  return { messageId: result.messageId };
}

/**
 * SMTP-Verbindung testen
 * Mit Timeout um endloses Warten zu verhindern
 */
export async function testSmtpConnection(config: SmtpConfig): Promise<boolean> {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.password,
    },
    // Timeout für SMTP-Verbindung
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
  });
  
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('SMTP-Verbindungstest fehlgeschlagen:', error);
    return false;
  }
}

