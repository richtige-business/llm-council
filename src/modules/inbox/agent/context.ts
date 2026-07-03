// ============================================
// context.ts - Inbox Context Provider
// 
// Zweck: Liefert Kontext-Informationen über das Inbox-Modul für den Agent
// Verwendet von: Context Collector
// ============================================

import { prisma } from '@/lib/db';
import type { ModuleContext } from '@/lib/agent/types';

// --------------------------------------------
// Inbox Context Provider (Server-Side)
// Wird in der API-Route aufgerufen
// --------------------------------------------

export async function getInboxContext(): Promise<ModuleContext> {
  try {
    // Statistiken aus DB laden
    const [unreadCount, totalInbox, totalSent, accounts, recentContacts] = await Promise.all([
      prisma.message.count({ where: { isRead: false, folder: 'inbox' } }),
      prisma.message.count({ where: { folder: 'inbox' } }),
      prisma.message.count({ where: { folder: 'sent' } }),
      prisma.emailAccount.findMany({ 
        where: { isActive: true },
        select: {
          id: true,
          email: true,
          provider: true,
          displayName: true,
          lastSyncAt: true,
        },
      }),
      prisma.contact.findMany({
        where: {
          OR: [
            { email: { not: null } },
            { emails: { some: {} } },
          ],
        },
        take: 15,
        orderBy: { messageCount: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          category: true,
          emails: {
            select: { email: true },
            take: 1,
          },
        },
      }),
    ]);

    // Dringende Nachrichten zählen
    const urgentCount = await prisma.message.count({
      where: {
        isRead: false,
        folder: 'inbox',
        urgency: { gte: 4 },
      },
    });

    return {
      moduleId: 'inbox',
      
      state: {
        // Hinweis: UI-State (selectedFolder, etc.) ist nur im Frontend verfügbar
        // Hier liefern wir nur Server-seitige Daten
      },
      
      stats: {
        unreadCount,
        totalInbox,
        totalSent,
        urgentCount,
        accountCount: accounts.length,
        contactCount: recentContacts.length,
      },
      
      relevantData: {
        // Verbundene Konten
        accounts: accounts.map(a => ({
          email: a.email,
          provider: a.provider,
          displayName: a.displayName,
          lastSync: a.lastSyncAt?.toISOString() || null,
        })),
        
        // Häufige Kontakte (für E-Mail-Vervollständigung)
        contacts: recentContacts.map(c => ({
          name: c.name || 'Unbekannt',
          email: c.email || c.emails?.[0]?.email || '',
          category: c.category,
        })).filter(c => c.email),
      },
    };
  } catch (error) {
    console.error('Fehler beim Laden des Inbox-Kontexts:', error);
    
    // Fallback bei Fehler
    return {
      moduleId: 'inbox',
      state: {},
      stats: {
        unreadCount: 0,
        totalInbox: 0,
        totalSent: 0,
        urgentCount: 0,
        accountCount: 0,
        contactCount: 0,
      },
      relevantData: {
        accounts: [],
        contacts: [],
      },
    };
  }
}

// --------------------------------------------
// Inbox Context als Text für System-Prompt
// --------------------------------------------

export async function getInboxContextPrompt(): Promise<string> {
  const ctx = await getInboxContext();
  
  // Typisiere relevantData für Type-Safety
  const relevantData = ctx.relevantData as {
    accounts?: Array<{ email: string; provider: string; displayName?: string }>;
    contacts?: Array<{ name: string; email: string; category: string }>;
  } | undefined;
  
  const accounts = relevantData?.accounts || [];
  const contacts = relevantData?.contacts || [];
  
  let prompt = `INBOX STATUS:
- Ungelesene E-Mails: ${ctx.stats.unreadCount}
- Dringende E-Mails: ${ctx.stats.urgentCount}
- Gesamt im Posteingang: ${ctx.stats.totalInbox}`;

  if (accounts.length > 0) {
    prompt += `\n- Verbundene Konten: ${accounts.map(a => `${a.email} (${a.provider})`).join(', ')}`;
  }

  // WICHTIG: Agent darf an JEDE beliebige E-Mail-Adresse senden!
  prompt += `\n\nE-MAIL VERSAND:
- Du kannst E-Mails an JEDE beliebige E-Mail-Adresse senden
- Du brauchst KEINE vordefinierten Kontakte
- Wenn der User eine Adresse nennt (z.B. "luc@sippin.eu"), nutze sie direkt
- Frage NICHT nach ob die Adresse bekannt ist - sende einfach!`;

  if (contacts.length > 0) {
    prompt += `\n\nHÄUFIGE KONTAKTE (nur als Referenz, falls User einen Namen statt E-Mail nennt):`;
    for (const c of contacts.slice(0, 10)) {
      prompt += `\n- "${c.name}" → ${c.email}`;
    }
  }

  return prompt;
}
