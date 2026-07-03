// ============================================
// tools.ts - Inbox Module Agent Tools
// 
// Zweck: Definiert alle Agent-Tools für das Inbox-Modul
//        mit eingebetteter Ausführungslogik
// Verwendet von: Tool Registry, API Route
// ============================================

import type { ModuleTool, ModuleToolResult } from '@/lib/agent/types';
import { prisma } from '@/lib/db';

// --------------------------------------------
// Inbox Module Tools
// --------------------------------------------

export const inboxModuleTools: ModuleTool[] = [
  // ========================================
  // SEND EMAIL - E-Mail mit Generative UI senden
  // Das Tool sendet NICHT direkt, sondern gibt Daten ans Frontend
  // Das Frontend zeigt die Animation und sendet dann via API
  // ========================================
  {
    id: 'inbox.sendEmail',
    name: 'E-Mail senden',
    description: `WICHTIG: Verwende dieses Tool wenn der User eine E-Mail SENDEN, SCHREIBEN oder SCHICKEN möchte!
Dieses Tool bereitet die E-Mail vor und zeigt eine Animation im Frontend.
Schlüsselwörter: "sende", "schick", "mail an", "email an", "schreibe an", "nachricht an"

BEISPIELE wann send_email verwenden:
- "Sende eine Email an max@example.com"
- "Schick eine Mail an karol@sippin.eu"  
- "Schreib eine Nachricht an chef@firma.de"`,
    module: 'inbox',
    
    inputSchema: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'E-Mail-Adresse des Empfängers (PFLICHT). Format: name@domain.de',
        },
        subject: {
          type: 'string',
          description: 'Betreff der E-Mail (PFLICHT)',
        },
        body: {
          type: 'string',
          description: 'Text-Inhalt der E-Mail (PFLICHT)',
        },
        cc: {
          type: 'string',
          description: 'Optionale CC-Empfänger (kommagetrennt)',
        },
        fromAccountEmail: {
          type: 'string',
          description: 'Von welchem Konto senden? (E-Mail-Adresse, falls mehrere Konten)',
        },
      },
      required: ['to', 'subject', 'body'],
    },
    
    effects: ['ui'],
    requiresConfirmation: false, // Keine Bestätigung mehr nötig, Generative UI zeigt alles
    isIdempotent: false,
    
    execute: async (input, context): Promise<ModuleToolResult> => {
      const { to, subject, body, cc, fromAccountEmail } = input as {
        to: string;
        subject: string;
        body: string;
        cc?: string;
        fromAccountEmail?: string;
      };

      // Prüfe ob ein Account existiert (ohne Token-Validierung - das macht das Frontend)
      const account = await prisma.emailAccount.findFirst({
        where: fromAccountEmail 
          ? { email: fromAccountEmail, isActive: true }
          : { isActive: true },
        orderBy: { createdAt: 'asc' },
      });

      if (!account) {
        return {
          success: false,
          error: {
            code: 'NO_ACCOUNT',
            message: 'Kein E-Mail-Konto verbunden. Bitte zuerst ein Konto in den Einstellungen hinzufügen.',
          },
        };
      }

      // Erfolg - Daten ans Frontend geben
      // Das Frontend wird die Animation zeigen und dann via /api/inbox/send senden
      return {
        success: true,
        data: { 
          to, 
          subject, 
          body,
          cc,
          from: account.email,
          fromName: account.displayName || account.email,
          accountId: account.id,
        },
      };
    },
    
    createAction: (input, result) => {
      if (!result.success) return null;
      
      const inputData = input as { to: string; subject: string; body: string; cc?: string };
      const resultData = result.data as { from: string; fromName?: string; accountId?: string };
      
      // Action für Generative UI - Frontend zeigt Animation und sendet
      return {
        type: 'inbox.composeAndSend',
        module: 'inbox',
        payload: { 
          to: inputData.to,
          subject: inputData.subject,
          body: inputData.body,
          cc: inputData.cc,
          from: resultData?.from,
          fromName: resultData?.fromName,
          accountId: resultData?.accountId,
        },
        executed: false,
        timestamp: Date.now(),
      };
    },
  },

  // ========================================
  // SEARCH EMAILS - E-Mails durchsuchen
  // ========================================
  {
    id: 'inbox.searchEmails',
    name: 'E-Mails suchen',
    description: `Durchsucht BESTEHENDE E-Mails im Postfach.
NUR verwenden wenn User nach Mails SUCHEN will!
Schlüsselwörter: "suche", "finde", "zeig mir mails von", "wo ist die mail"

BEISPIELE:
- "Suche Mails von Max"
- "Finde die Rechnung von Amazon"
- "Zeig mir Mails von gestern"

NICHT verwenden wenn User eine Mail SENDEN will!`,
    module: 'inbox',
    
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Suchbegriff (Name, Betreff, Inhalt)',
        },
        folder: {
          type: 'string',
          description: 'In welchem Ordner suchen?',
          enum: ['inbox', 'sent', 'drafts', 'trash', 'spam', 'archive'],
        },
        unreadOnly: {
          type: 'boolean',
          description: 'Nur ungelesene E-Mails anzeigen?',
        },
      },
      required: ['query'],
    },
    
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
    
    execute: async (input): Promise<ModuleToolResult> => {
      const { query, folder, unreadOnly } = input as {
        query: string;
        folder?: string;
        unreadOnly?: boolean;
      };

      try {
        const messages = await prisma.message.findMany({
          where: {
            AND: [
              {
                OR: [
                  { subject: { contains: query, mode: 'insensitive' } },
                  { body: { contains: query, mode: 'insensitive' } },
                  { sender: { contains: query, mode: 'insensitive' } },
                ],
              },
              folder ? { folder } : {},
              unreadOnly ? { isRead: false } : {},
            ],
          },
          take: 20,
          orderBy: { receivedAt: 'desc' },
          select: {
            id: true,
            subject: true,
            sender: true,
            senderName: true,
            receivedAt: true,
            isRead: true,
            folder: true,
          },
        });

        return {
          success: true,
          data: {
            count: messages.length,
            messages: messages.map(m => ({
              id: m.id,
              subject: m.subject,
              sender: m.senderName || m.sender,
              date: m.receivedAt,
              isRead: m.isRead,
              folder: m.folder,
            })),
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'EXECUTION_ERROR',
            message: 'Suche fehlgeschlagen',
          },
        };
      }
    },
    
    createAction: (input, result) => ({
      type: 'inbox.searchEmails',
      module: 'inbox',
      payload: {
        query: (input as { query: string }).query,
        folder: (input as { folder?: string }).folder || 'inbox',
        results: result.data,
      },
      executed: false,
      timestamp: Date.now(),
    }),
  },

  // ========================================
  // OPEN INBOX - Postfach öffnen
  // ========================================
  {
    id: 'inbox.open',
    name: 'Postfach öffnen',
    description: `Öffnet das Postfach als Tab.
Verwende dieses Tool wenn der User seine E-Mails sehen oder das Postfach öffnen möchte.
Beispiele: "Öffne mein Postfach", "Zeig mir meine Mails", "Geh zur Inbox"`,
    module: 'inbox',
    
    inputSchema: {
      type: 'object',
      properties: {
        folder: {
          type: 'string',
          description: 'Welchen Ordner öffnen?',
          enum: ['inbox', 'sent', 'drafts', 'trash', 'spam', 'archive'],
        },
      },
      required: [],
    },
    
    effects: ['ui'],
    requiresConfirmation: false,
    isIdempotent: true,
    
    execute: async (input): Promise<ModuleToolResult> => {
      const { folder } = input as { folder?: string };
      
      return {
        success: true,
        data: { folder: folder || 'inbox' },
      };
    },
    
    createAction: (input) => ({
      type: 'inbox.openTab',
      module: 'inbox',
      payload: { folder: (input as { folder?: string }).folder || 'inbox' },
      executed: false,
      timestamp: Date.now(),
    }),
  },

  // ========================================
  // MARK EMAIL - E-Mail markieren
  // ========================================
  {
    id: 'inbox.markEmail',
    name: 'E-Mail markieren',
    description: `Markiert eine E-Mail als gelesen/ungelesen oder mit Stern.
Verwende dieses Tool wenn der User eine E-Mail markieren möchte.
Beispiele: "Markiere als gelesen", "Stern auf die Mail von Max"`,
    module: 'inbox',
    
    inputSchema: {
      type: 'object',
      properties: {
        messageId: {
          type: 'string',
          description: 'ID der E-Mail (falls bekannt)',
        },
        searchQuery: {
          type: 'string',
          description: 'Alternativ: Suchbegriff um die E-Mail zu finden',
        },
        action: {
          type: 'string',
          description: 'Was soll gemacht werden?',
          enum: ['markAsRead', 'markAsUnread', 'toggleStar', 'archive', 'delete'],
        },
      },
      required: ['action'],
    },
    
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
    
    execute: async (input): Promise<ModuleToolResult> => {
      const { messageId, searchQuery, action } = input as {
        messageId?: string;
        searchQuery?: string;
        action: string;
      };

      try {
        // Nachricht finden (per ID oder Suche)
        let targetMessageId = messageId;
        
        if (!targetMessageId && searchQuery) {
          const message = await prisma.message.findFirst({
            where: {
              OR: [
                { subject: { contains: searchQuery, mode: 'insensitive' } },
                { sender: { contains: searchQuery, mode: 'insensitive' } },
              ],
            },
            orderBy: { receivedAt: 'desc' },
          });
          
          if (message) {
            targetMessageId = message.id;
          }
        }
        
        if (!targetMessageId) {
          return {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Keine E-Mail gefunden. Bitte gib eine Message-ID oder einen Suchbegriff an.',
            },
          };
        }

        // Aktion ausführen
        let updateData: Record<string, unknown> = {};
        
        switch (action) {
          case 'markAsRead':
            updateData = { isRead: true };
            break;
          case 'markAsUnread':
            updateData = { isRead: false };
            break;
          case 'toggleStar':
            const msg = await prisma.message.findUnique({ where: { id: targetMessageId } });
            updateData = { isStarred: !msg?.isStarred };
            break;
          case 'archive':
            updateData = { folder: 'archive' };
            break;
          case 'delete':
            updateData = { folder: 'trash', isDeleted: true };
            break;
          default:
            return {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: `Unbekannte Aktion: ${action}`,
              },
            };
        }

        await prisma.message.update({
          where: { id: targetMessageId },
          data: updateData,
        });

        return {
          success: true,
          data: { messageId: targetMessageId, action },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'EXECUTION_ERROR',
            message: 'Markierung fehlgeschlagen',
          },
        };
      }
    },
    
    createAction: (input, result) => {
      if (!result.success) return null;
      
      return {
        type: 'inbox.markEmail',
        module: 'inbox',
        payload: {
          messageId: (result.data as { messageId: string }).messageId,
          action: (input as { action: string }).action,
        },
        executed: false,
        timestamp: Date.now(),
      };
    },
  },

  // ========================================
  // COMPOSE EMAIL - E-Mail-Fenster öffnen
  // ========================================
  {
    id: 'inbox.composeEmail',
    name: 'E-Mail verfassen',
    description: `Öffnet NUR das Compose-Fenster zum manuellen Bearbeiten.
Verwende dieses Tool NUR wenn der User explizit das Fenster öffnen will OHNE sofort zu senden.
Beispiele: "Öffne Email-Fenster", "Ich will eine Mail tippen"

NICHT verwenden wenn User "sende", "schick", "an xyz" sagt - dann inbox.sendEmail nutzen!`,
    module: 'inbox',
    
    inputSchema: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Empfänger der E-Mail (Name oder E-Mail-Adresse)',
        },
        subject: {
          type: 'string',
          description: 'Betreff der E-Mail',
        },
        body: {
          type: 'string',
          description: 'Optionaler Vorschlag für den E-Mail-Text',
        },
        cc: {
          type: 'string',
          description: 'Optionale CC-Empfänger',
        },
      },
      required: [],
    },
    
    effects: ['ui'],
    requiresConfirmation: false,
    isIdempotent: true,
    
    execute: async (input): Promise<ModuleToolResult> => {
      const { to, subject, body, cc } = input as {
        to?: string;
        subject?: string;
        body?: string;
        cc?: string;
      };
      
      return {
        success: true,
        data: { to, subject, body, cc },
      };
    },
    
    createAction: (input) => ({
      type: 'inbox.openCompose',
      module: 'inbox',
      payload: input as Record<string, unknown>,
      executed: false,
      timestamp: Date.now(),
    }),
  },

  // ========================================
  // GET STATUS - Postfach-Status abfragen
  // ========================================
  {
    id: 'inbox.getStatus',
    name: 'Postfach-Status',
    description: `Liefert aktuelle Informationen über das Postfach.
Verwende dieses Tool wenn der User wissen will wie viele ungelesene Mails er hat.
Beispiele: "Wie viele ungelesene Mails habe ich?", "Postfach-Status"`,
    module: 'inbox',
    
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
    
    execute: async (): Promise<ModuleToolResult> => {
      try {
        const [unreadCount, totalCount, accounts] = await Promise.all([
          prisma.message.count({ where: { isRead: false, folder: 'inbox' } }),
          prisma.message.count({ where: { folder: 'inbox' } }),
          prisma.emailAccount.findMany({ where: { isActive: true } }),
        ]);

        return {
          success: true,
          data: {
            unreadCount,
            totalCount,
            connectedAccounts: accounts.map(a => ({
              email: a.email,
              provider: a.provider,
              lastSync: a.lastSyncAt,
            })),
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'EXECUTION_ERROR',
            message: 'Status konnte nicht abgerufen werden',
          },
        };
      }
    },
    
    createAction: () => null, // Keine UI-Action nötig
  },

  // ========================================
  // FILTER EMAILS - Erweiterte Filterung
  // ========================================
  {
    id: 'inbox.filterEmails',
    name: 'E-Mails filtern',
    description: `Filtert E-Mails nach verschiedenen Kriterien.
Verwende wenn User nach bestimmten E-Mail-Kategorien fragt.
Beispiele: "Zeig nur dringende Mails", "Filter nach Business-Mails"`,
    module: 'inbox',
    
    inputSchema: {
      type: 'object',
      properties: {
        provider: { 
          type: 'string', 
          enum: ['gmail', 'outlook', 'imap', 'all'],
          description: 'Nach Provider filtern',
        },
        category: { 
          type: 'string', 
          enum: ['private', 'business', 'all'],
          description: 'Nach Kategorie filtern',
        },
        urgency: { 
          type: 'string', 
          enum: ['high', 'normal', 'low', 'all'],
          description: 'Nach Dringlichkeit filtern',
        },
        datePreset: {
          type: 'string',
          enum: ['today', 'yesterday', 'last7days', 'last30days', 'all'],
          description: 'Zeitraum-Voreinstellung',
        },
        hasCalendarAction: {
          type: 'boolean',
          description: 'Nur Mails mit Terminvorschlägen',
        },
      },
      required: [],
    },
    
    effects: ['ui'],
    requiresConfirmation: false,
    isIdempotent: true,
    
    execute: async (input): Promise<ModuleToolResult> => {
      return {
        success: true,
        data: { filters: input },
      };
    },
    
    createAction: (input) => ({
      type: 'inbox.setFilters',
      module: 'inbox',
      payload: { filters: input },
      executed: false,
      timestamp: Date.now(),
    }),
  },
];
