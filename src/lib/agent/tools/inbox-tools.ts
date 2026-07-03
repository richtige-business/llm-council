// ============================================
// inbox-tools.ts - Postfach-spezifische Agent Tools
// 
// DEPRECATED: Diese Datei wird nur noch für Rückwärtskompatibilität verwendet.
// Nutze stattdessen: @/modules/inbox/agent/tools.ts
// 
// Die neuen Tools haben eingebettete Ausführungslogik und werden
// über die Tool Registry (@/lib/agent/registry) verwaltet.
// ============================================

import type { AgentTool } from '../types';

// --------------------------------------------
// Inbox Tools
// Diese Tools ermöglichen dem Agent E-Mail-Aktionen
// --------------------------------------------

export const inboxTools: AgentTool[] = [
  // ----------------------------------------
  // send_email - E-Mail SOFORT senden (BEVORZUGT!)
  // ----------------------------------------
  {
    name: 'send_email',
    description: `WICHTIG: Verwende dieses Tool wenn der User eine E-Mail SENDEN, SCHREIBEN oder SCHICKEN möchte!
Dieses Tool sendet die E-Mail SOFORT und direkt.
Schlüsselwörter: "sende", "schick", "mail an", "email an", "schreibe an", "nachricht an"

BEISPIELE wann send_email verwenden:
- "Sende eine Email an max@example.com"
- "Schick eine Mail an karol@sippin.eu"  
- "Schreib eine Nachricht an chef@firma.de"
- "Email an test@test.de mit Betreff Hallo"
- "Mail an xy sagen dass ich später komme"

NICHT verwenden für: "Suche Mails", "Zeig mir Mails", "Finde Email von..."`,
    parameters: {
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
    module: 'inbox',
  },

  // ----------------------------------------
  // compose_email - E-Mail-Fenster öffnen (ohne sofort zu senden)
  // ----------------------------------------
  {
    name: 'compose_email',
    description: `Öffnet NUR das Compose-Fenster zum manuellen Bearbeiten.
Verwende dieses Tool NUR wenn der User explizit das Fenster öffnen will OHNE sofort zu senden.
Beispiele: "Öffne Email-Fenster", "Ich will eine Mail tippen"

NICHT verwenden wenn User "sende", "schick", "an xyz" sagt - dann send_email nutzen!`,
    parameters: {
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
    module: 'inbox',
  },

  // ----------------------------------------
  // search_emails - E-Mails durchsuchen (NUR SUCHE!)
  // ----------------------------------------
  {
    name: 'search_emails',
    description: `Durchsucht BESTEHENDE E-Mails im Postfach.
NUR verwenden wenn User nach Mails SUCHEN will!
Schlüsselwörter: "suche", "finde", "zeig mir mails von", "wo ist die mail"

BEISPIELE:
- "Suche Mails von Max"
- "Finde die Rechnung von Amazon"
- "Zeig mir Mails von gestern"

NICHT verwenden wenn User eine Mail SENDEN will!`,
    parameters: {
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
    module: 'inbox',
  },

  // ----------------------------------------
  // open_inbox - Postfach öffnen
  // ----------------------------------------
  {
    name: 'open_inbox',
    description: `Öffnet das Postfach als Tab.
Verwende dieses Tool wenn der User seine E-Mails sehen oder das Postfach öffnen möchte.
Beispiele: "Öffne mein Postfach", "Zeig mir meine Mails", "Geh zur Inbox"`,
    parameters: {
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
    module: 'inbox',
  },

  // ----------------------------------------
  // mark_email - E-Mail markieren
  // ----------------------------------------
  {
    name: 'mark_email',
    description: `Markiert eine E-Mail als gelesen/ungelesen oder mit Stern.
Verwende dieses Tool wenn der User eine E-Mail markieren möchte.
Beispiele: "Markiere als gelesen", "Stern auf die Mail von Max"`,
    parameters: {
      type: 'object',
      properties: {
        emailId: {
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
    module: 'inbox',
  },
];











