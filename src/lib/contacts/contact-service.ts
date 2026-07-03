// ============================================
// contact-service.ts - Kontakt-Verwaltung
// 
// Zweck: Automatische Erstellung und Verwaltung von Kontakten
//        Erkennt beidseitigen Mailverkehr und erstellt Kontakte
// Verwendet von: API Routes, Sync-Prozesse
// ============================================

import { prisma } from '@/lib/db';
import { publishNotification } from '@/lib/notifications/notification-bus';

// --------------------------------------------
// Typen für den Contact-Service
// --------------------------------------------

export interface ContactData {
  email: string;
  name?: string | null;
  category?: 'private' | 'business' | 'unknown';
}

export interface ContactCreateResult {
  contact: {
    id: string;
    email: string | null;
    name: string | null;
    category: string;
    messageCount: number;
    isConfirmed: boolean;
  };
  isNew: boolean;
}

// --------------------------------------------
// Bekannte Business-Domains
// E-Mails von diesen Domains werden als "business" kategorisiert
// --------------------------------------------

const BUSINESS_DOMAINS = [
  // Newsletter/Marketing
  'newsletter', 'marketing', 'noreply', 'no-reply', 'info@',
  // Bekannte Business-Endungen
  '.com', '.de', '.io', '.co', '.org',
];

const PRIVATE_DOMAINS = [
  // Bekannte private E-Mail-Provider
  'gmail.com', 'googlemail.com',
  'yahoo.com', 'yahoo.de',
  'gmx.de', 'gmx.net', 'gmx.at', 'gmx.ch',
  'web.de',
  't-online.de',
  'outlook.com', 'hotmail.com', 'live.de', 'live.com',
  'icloud.com', 'me.com', 'mac.com',
  'posteo.de', 'mailbox.org',
  'protonmail.com', 'proton.me',
];

// --------------------------------------------
// Hilfsfunktionen
// --------------------------------------------

/**
 * Klassifiziert eine E-Mail-Adresse als privat oder geschäftlich
 * Basierend auf der Domain
 */
export function classifyEmailCategory(email: string): 'private' | 'business' | 'unknown' {
  const domain = email.split('@')[1]?.toLowerCase();
  
  if (!domain) return 'unknown';
  
  // Prüfe auf bekannte private Domains
  if (PRIVATE_DOMAINS.some(d => domain === d || domain.endsWith(`.${d}`))) {
    return 'private';
  }
  
  // Prüfe auf typische No-Reply/Marketing-Adressen
  const localPart = email.split('@')[0]?.toLowerCase();
  if (localPart && (
    localPart.includes('noreply') || 
    localPart.includes('no-reply') ||
    localPart.includes('newsletter') ||
    localPart.includes('marketing') ||
    localPart === 'info' ||
    localPart === 'support' ||
    localPart === 'service'
  )) {
    return 'business';
  }
  
  // Firmen-Domains (nicht-private) sind meist geschäftlich
  // Aber nur wenn es eine "echte" Domain ist (nicht gmail etc.)
  if (!PRIVATE_DOMAINS.includes(domain)) {
    return 'business';
  }
  
  return 'unknown';
}

/**
 * Extrahiert den Namen aus einer E-Mail-Adresse falls kein Name vorhanden
 * z.B. "max.mustermann@gmail.com" -> "Max Mustermann"
 */
export function extractNameFromEmail(email: string): string | null {
  const localPart = email.split('@')[0];
  
  if (!localPart) return null;
  
  // Versuche Namen aus lokalem Teil zu extrahieren
  // Entferne Zahlen und ersetze Trennzeichen
  const nameParts = localPart
    .replace(/[0-9]/g, '')
    .replace(/[._-]/g, ' ')
    .trim()
    .split(' ')
    .filter(part => part.length > 1);
  
  if (nameParts.length === 0) return null;
  
  // Kapitalisiere jeden Teil
  return nameParts
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

// --------------------------------------------
// Haupt-Service-Funktionen
// --------------------------------------------

/**
 * Findet oder erstellt einen Kontakt für eine E-Mail-Adresse
 * Inkrementiert automatisch den Nachrichten-Zähler
 */
export async function findOrCreateContact(
  data: ContactData
): Promise<ContactCreateResult> {
  const email = data.email.toLowerCase().trim();
  
  // Versuche existierenden Kontakt zu finden
  const existingContact = await prisma.contact.findFirst({
    where: { email },
  });
  
  if (existingContact) {
    // Kontakt existiert - Zähler erhöhen
    const updatedContact = await prisma.contact.update({
      where: { id: existingContact.id },
      data: {
        messageCount: { increment: 1 },
        // Name aktualisieren falls wir jetzt einen haben und vorher nicht
        ...(data.name && !existingContact.name && { name: data.name }),
      },
    });
    
    return {
      contact: updatedContact,
      isNew: false,
    };
  }
  
  // Neuen Kontakt erstellen
  const category = data.category || classifyEmailCategory(email);
  const name = data.name || extractNameFromEmail(email);
  
  const newContact = await prisma.contact.create({
    data: {
      email,
      name,
      category,
      messageCount: 1,
      isConfirmed: false,
    },
  });
  
  return {
    contact: newContact,
    isNew: true,
  };
}

/**
 * Prüft ob beidseitiger Mailverkehr mit einer Adresse existiert
 * und erstellt ggf. einen Kontakt mit Benachrichtigung
 */
export async function checkAndCreateContactForBidirectionalMail(
  email: string,
  name?: string | null,
  userEmails?: string[]
): Promise<ContactCreateResult | null> {
  const normalizedEmail = email.toLowerCase().trim();
  
  // Prüfe ob es sich um eine der eigenen Adressen handelt
  if (userEmails?.some(e => e.toLowerCase() === normalizedEmail)) {
    return null;
  }
  
  // Prüfe ob wir schon Nachrichten AN diese Adresse gesendet haben
  const sentToThisAddress = await prisma.message.findFirst({
    where: {
      folder: 'sent',
      OR: [
        { recipients: { contains: normalizedEmail } },
        { cc: { contains: normalizedEmail } },
      ],
    },
  });
  
  // Prüfe ob wir Nachrichten VON dieser Adresse empfangen haben
  const receivedFromThisAddress = await prisma.message.findFirst({
    where: {
      folder: 'inbox',
      sender: normalizedEmail,
    },
  });
  
  // Nur wenn beidseitiger Verkehr existiert
  if (!sentToThisAddress || !receivedFromThisAddress) {
    return null;
  }
  
  // Prüfe ob Kontakt bereits existiert
  const existingContact = await prisma.contact.findFirst({
    where: { email: normalizedEmail },
  });
  
  if (existingContact) {
    return {
      contact: existingContact,
      isNew: false,
    };
  }
  
  // Neuen Kontakt erstellen
  const result = await findOrCreateContact({
    email: normalizedEmail,
    name,
    category: classifyEmailCategory(normalizedEmail),
  });
  
  // Benachrichtigung senden wenn neuer Kontakt
  if (result.isNew) {
    const displayName = result.contact.name || result.contact.email;
    const categoryText = result.contact.category === 'business' 
      ? '(Geschäftlich)' 
      : result.contact.category === 'private'
        ? '(Privat)'
        : '';
    
    publishNotification({
      source: 'contacts',
      title: 'Neuer Kontakt erstellt',
      body: `${displayName} ${categoryText} wurde automatisch als Kontakt hinzugefügt, da ihr regelmäßig kommuniziert.`,
      priority: 'low',
      actionUrl: `/settings?tab=contacts&id=${result.contact.id}`,
      metadata: {
        contactId: result.contact.id,
        contactEmail: result.contact.email,
      },
    });
  }
  
  return result;
}

/**
 * Aktualisiert die Kategorie eines Kontakts
 */
export async function updateContactCategory(
  contactId: string,
  category: 'private' | 'business' | 'unknown'
): Promise<void> {
  await prisma.contact.update({
    where: { id: contactId },
    data: { 
      category,
      isConfirmed: true, // User hat manuell kategorisiert
    },
  });
}

/**
 * Holt alle Kontakte mit optionalen Filtern
 */
export async function getContacts(options: {
  category?: 'private' | 'business' | 'unknown';
  search?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const { category, search, limit = 50, offset = 0 } = options;
  
  const where: Record<string, unknown> = {};
  
  if (category) {
    where.category = category;
  }
  
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ];
  }
  
  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { messageCount: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.contact.count({ where }),
  ]);
  
  return { contacts, total };
}

/**
 * Löscht einen Kontakt
 */
export async function deleteContact(contactId: string): Promise<void> {
  await prisma.contact.delete({
    where: { id: contactId },
  });
}

/**
 * Verknüpft eine Nachricht mit einem Kontakt
 */
export async function linkMessageToContact(
  messageId: string,
  contactId: string
): Promise<void> {
  await prisma.message.update({
    where: { id: messageId },
    data: { contactId },
  });
}

/**
 * Bulk-Operation: Verknüpft alle Nachrichten eines Absenders mit einem Kontakt
 */
export async function linkAllMessagesFromSender(
  senderEmail: string,
  contactId: string
): Promise<number> {
  const result = await prisma.message.updateMany({
    where: {
      sender: senderEmail.toLowerCase(),
      contactId: null,
    },
    data: { contactId },
  });
  
  return result.count;
}
