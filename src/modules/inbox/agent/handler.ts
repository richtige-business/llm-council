// ============================================
// handler.ts - Inbox Action Handler
// 
// Zweck: Führt Inbox-spezifische Agent-Actions im Frontend aus
//        Mit Generative UI für E-Mail-Komposition
// Verwendet von: Action Registry, useAgentExecutor
// ============================================

'use client';

import { useInboxStore } from '../store';
import { useAppStore } from '@/lib/store/app-store';
import type { AgentAction, ActionHandler, ActionResult } from '@/lib/agent/types';
import type { MessageFolder } from '../types';

// --------------------------------------------
// Hilfsfunktion: Typing-Animation simulieren
// --------------------------------------------

async function typeText(
  text: string,
  onUpdate: (partialText: string) => void,
  delayPerChar: number = 30
): Promise<void> {
  let current = '';
  for (const char of text) {
    current += char;
    onUpdate(current);
    await new Promise(resolve => setTimeout(resolve, delayPerChar));
  }
}

// --------------------------------------------
// Inbox Action Handler
// --------------------------------------------

export const inboxActionHandler: ActionHandler = {
  moduleId: 'inbox',

  supportedActions: [
    'inbox.openTab',
    'inbox.emailSent',
    'inbox.searchEmails',
    'inbox.markEmail',
    'inbox.setFilters',
    'inbox.openCompose',
    'inbox.composeAndSend', // NEU: Generative UI E-Mail Animation
  ],

  execute: async (action: AgentAction): Promise<ActionResult> => {
    // Stores abrufen (außerhalb von React-Kontext)
    const inboxStore = useInboxStore.getState();
    const appStore = useAppStore.getState();

    try {
      switch (action.type) {
        // ========================================
        // Postfach öffnen
        // ========================================
        case 'inbox.openTab': {
          const { folder } = action.payload as { folder?: string };
          
          // Tab öffnen
          appStore.openTab('inbox');
          
          // Falls Ordner angegeben, wechseln
          if (folder) {
            inboxStore.setSelectedFolder(folder as MessageFolder);
          }
          
          return { success: true };
        }

        // ========================================
        // COMPOSE AND SEND - Generative UI E-Mail Animation + Versand
        // Das ist die Haupt-Action für E-Mail-Versand mit visueller Animation
        // ========================================
        case 'inbox.composeAndSend': {
          const { to, subject, body, cc, from, fromName } = action.payload as { 
            to: string;
            subject: string;
            body: string;
            cc?: string;
            from?: string;
            fromName?: string;
          };
          
          console.log('🎬 Starte Generative UI E-Mail Animation...');
          
          // Postfach öffnen
          appStore.openTab('inbox');
          
          // Starte Agent Compose Modus
          inboxStore.startAgentCompose();
          
          // Typing-Animation für jedes Feld
          try {
            // 1. "An" Feld tippen
            await typeText(to, (text) => {
              inboxStore.updateAgentCompose({ to: text, status: 'typing-to' });
            }, 30);
            
            await new Promise(r => setTimeout(r, 400));
            
            // 2. "Betreff" Feld tippen
            await typeText(subject, (text) => {
              inboxStore.updateAgentCompose({ subject: text, status: 'typing-subject' });
            }, 30);
            
            await new Promise(r => setTimeout(r, 400));
            
            // 3. "Nachricht" Feld tippen (etwas schneller für langen Text)
            await typeText(body, (text) => {
              inboxStore.updateAgentCompose({ body: text, status: 'typing-body' });
            }, 20);
            
            await new Promise(r => setTimeout(r, 600));
            
            // 4. Senden-Status zeigen
            inboxStore.updateAgentCompose({ status: 'sending' });
            
            // 5. JETZT die E-Mail wirklich senden via API
            console.log('📧 Sende E-Mail via API...');
            const response = await fetch('/api/inbox/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ to, subject, body, cc }),
            });
            
            const result = await response.json();
            
            if (result.success) {
              console.log('✅ E-Mail erfolgreich gesendet!');
              
              // 6. Erfolg zeigen
              inboxStore.finishAgentCompose(true);
              
              // Nach kurzer Verzögerung Sent-Ordner aktualisieren
              setTimeout(async () => {
                try {
                  inboxStore.setSelectedFolder('sent');
                  await inboxStore.fetchMessages('sent');
                  console.log('✅ Sent-Ordner aktualisiert');
                } catch (err) {
                  console.error('Fehler beim Aktualisieren des Sent-Ordners:', err);
                }
              }, 2000);
              
              return { 
                success: true,
                data: { to, subject, body, from },
              };
            } else {
              console.error('❌ E-Mail-Versand fehlgeschlagen:', result.error);
              inboxStore.finishAgentCompose(false);
              
              return {
                success: false,
                error: result.error || 'E-Mail konnte nicht gesendet werden',
              };
            }
            
          } catch (error) {
            console.error('❌ Fehler bei Generative UI:', error);
            inboxStore.finishAgentCompose(false);
            
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unbekannter Fehler',
            };
          }
        }
        
        // ========================================
        // Legacy: Nach E-Mail-Versand (für Rückwärts-Kompatibilität)
        // ========================================
        case 'inbox.emailSent': {
          const { navigateToSent, to, subject, body } = action.payload as { 
            navigateToSent?: boolean;
            to?: string;
            subject?: string;
            body?: string;
          };
          
          // Postfach öffnen
          appStore.openTab('inbox');
          
          // Zum Sent-Ordner wechseln
          if (navigateToSent) {
            inboxStore.setSelectedFolder('sent');
            
            setTimeout(async () => {
              try {
                await inboxStore.fetchMessages('sent');
              } catch (err) {
                console.error('Fehler beim Aktualisieren des Sent-Ordners:', err);
              }
            }, 500);
          }
          
          return { 
            success: true,
            data: { to, subject, body },
          };
        }

        // ========================================
        // Suchergebnisse anzeigen
        // ========================================
        case 'inbox.searchEmails': {
          const { query, folder } = action.payload as {
            query: string;
            folder?: string;
          };
          
          // Postfach öffnen
          appStore.openTab('inbox');
          
          // Ordner wechseln falls angegeben
          if (folder) {
            inboxStore.setSelectedFolder(folder as MessageFolder);
          }
          
          // Suchquery setzen
          inboxStore.setSearchQuery(query);
          
          return { success: true };
        }

        // ========================================
        // E-Mail markieren
        // ========================================
        case 'inbox.markEmail': {
          const { messageId, action: markAction } = action.payload as {
            messageId: string;
            action: string;
          };
          
          if (!messageId) {
            return { success: false, error: 'Keine Message-ID angegeben' };
          }
          
          switch (markAction) {
            case 'markAsRead':
              inboxStore.markAsRead(messageId);
              break;
            case 'markAsUnread':
              inboxStore.markAsUnread(messageId);
              break;
            case 'toggleStar':
              inboxStore.toggleStar(messageId);
              break;
            case 'archive':
              inboxStore.moveToFolder(messageId, 'archive');
              break;
            case 'delete':
              inboxStore.deleteMessage(messageId);
              break;
            default:
              return { success: false, error: `Unbekannte Aktion: ${markAction}` };
          }
          
          return { success: true };
        }

        // ========================================
        // Filter setzen
        // ========================================
        case 'inbox.setFilters': {
          const { filters } = action.payload as { 
            filters: {
              provider?: string;
              category?: string;
              urgency?: string;
              datePreset?: string;
              hasCalendarAction?: boolean;
            };
          };
          
          // Postfach öffnen
          appStore.openTab('inbox');
          
          // Filter anwenden
          if (filters) {
            if (filters.provider) {
              inboxStore.setFilter('provider', filters.provider as 'gmail' | 'outlook' | 'imap' | 'all');
            }
            if (filters.category) {
              inboxStore.setFilter('category', filters.category as 'private' | 'business' | 'all');
            }
            if (filters.urgency) {
              inboxStore.setFilter('urgency', filters.urgency as 'high' | 'normal' | 'low' | 'all');
            }
            if (filters.datePreset) {
              inboxStore.setDateFilter(filters.datePreset as 'today' | 'yesterday' | 'last7days' | 'last30days' | 'all');
            }
            if (filters.hasCalendarAction !== undefined) {
              inboxStore.setFilter('hasCalendarAction', filters.hasCalendarAction);
            }
          }
          
          return { success: true };
        }

        // ========================================
        // Compose-Modal öffnen
        // ========================================
        case 'inbox.openCompose': {
          const { to, subject, body } = action.payload as {
            to?: string;
            subject?: string;
            body?: string;
          };
          
          // Postfach öffnen
          appStore.openTab('inbox');
          
          // Kurz warten, dann Compose öffnen
          // (Gibt dem Tab Zeit, sich zu öffnen)
          setTimeout(() => {
            inboxStore.openCompose();
            // TODO: Pre-fill Felder mit to, subject, body
            // Das erfordert eine Erweiterung des InboxStore
          }, 150);
          
          return { success: true };
        }

        default:
          return { 
            success: false, 
            error: `Unbekannte Inbox-Action: ${action.type}`,
          };
      }
    } catch (error) {
      console.error(`Inbox Action Handler Fehler:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      };
    }
  },
};
