// ============================================
// memory-tools.ts - Memory Module Agent Tools
// 
// Zweck: Definiert Agent-Tools für das persistente Gedächtnis
//        Der Agent kann Informationen speichern, abrufen und auflisten
// Verwendet von: Tool Registry, API Route (Intelligence Agent)
// ============================================

import type { ModuleTool, ModuleToolResult } from '@/lib/agent/types';
import { saveMemory, recallMemories, listMemories, deleteMemory } from '@/lib/services/memory-service';
import { DEFAULT_USER_ID } from '@/lib/services/user-service';

// --------------------------------------------
// Memory Module Tools
// Diese Tools werden dem Intelligence Agent (Master) bereitgestellt
// Sub-Agents sehen diese Tools NICHT (nur module: 'memory')
// --------------------------------------------

export const memoryModuleTools: ModuleTool[] = [
  // ========================================
  // SAVE - Speichert Präferenzen, Fakten, Instruktionen
  // ========================================
  {
    id: 'memory.save',
    name: 'Save Memory',
    description: 'Saves a user preference, fact, or instruction for future reference. Use when the user shares personal information, expresses a preference, or gives you an instruction to remember. Examples: "I prefer short emails", "My boss is called Max", "Always CC anna@company.de".',
    module: 'memory',
    
    inputSchema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'Unique identifier using snake_case, e.g. "preferred_email_style", "boss_name", "default_cc_address"',
        },
        value: {
          type: 'string',
          description: 'The information to remember, e.g. "short and direct", "Max Mueller", "anna@company.de"',
        },
        category: {
          type: 'string',
          enum: ['preference', 'fact', 'instruction'],
          description: 'Type of memory: preference (user likes/dislikes), fact (information about user/contacts), instruction (rules to follow)',
        },
      },
      required: ['key', 'value', 'category'],
    },
    
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
    
    execute: async (input, context): Promise<ModuleToolResult> => {
      try {
        const { key, value, category } = input as {
          key: string;
          value: string;
          category: string;
        };
        
        // Validierung
        if (!key || !value || !category) {
          return {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'key, value und category sind erforderlich',
            },
          };
        }
        
        const memory = await saveMemory({
          userId: context.userId || DEFAULT_USER_ID,
          category: category as 'preference' | 'fact' | 'instruction',
          key: key.toLowerCase().replace(/\s+/g, '_'),
          value,
          source: 'explicit',
          confidence: 1.0,
        });
        
        return {
          success: true,
          data: {
            id: memory.id,
            category: memory.category,
            key: memory.key,
            value: memory.value,
            message: `Memory gespeichert: [${category}] ${key} = ${value}`,
          },
        };
      } catch (error) {
        console.error('memory.save Fehler:', error);
        return {
          success: false,
          error: {
            code: 'EXECUTION_ERROR',
            message: `Fehler beim Speichern: ${error instanceof Error ? error.message : 'Unbekannt'}`,
          },
        };
      }
    },
  },
  {
    id: 'memory.update',
    name: 'Update Memory',
    description: 'Aktualisiert ein bestehendes Memory über denselben Upsert-Mechanismus wie memory.save.',
    module: 'memory',
    inputSchema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'Memory-Key',
        },
        value: {
          type: 'string',
          description: 'Neuer Wert',
        },
        category: {
          type: 'string',
          enum: ['preference', 'fact', 'instruction', 'entity', 'pattern'],
          description: 'Memory-Kategorie',
        },
      },
      required: ['key', 'value', 'category'],
    },
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
    execute: async (input, context): Promise<ModuleToolResult> => {
      try {
        const { key, value, category } = input as {
          key: string;
          value: string;
          category: string;
        };

        const memory = await saveMemory({
          userId: context.userId || DEFAULT_USER_ID,
          category: category as 'preference' | 'fact' | 'instruction' | 'entity' | 'pattern',
          key: key.toLowerCase().replace(/\s+/g, '_'),
          value,
          source: 'explicit',
          confidence: 1.0,
        });

        return {
          success: true,
          data: {
            id: memory.id,
            key: memory.key,
            value: memory.value,
            category: memory.category,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'EXECUTION_ERROR',
            message: `Fehler beim Aktualisieren: ${error instanceof Error ? error.message : 'Unbekannt'}`,
          },
        };
      }
    },
  },

  // ========================================
  // RECALL - Sucht relevante Memories
  // ========================================
  {
    id: 'memory.recall',
    name: 'Recall Memories',
    description: 'Searches stored memories by keyword. Use before performing tasks to check for relevant user preferences or facts. Example: before sending an email, recall "email" to check if the user has style preferences.',
    module: 'memory',
    
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search keyword to find relevant memories, e.g. "email", "meeting", "Max"',
        },
      },
      required: ['query'],
    },
    
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
    
    execute: async (input, context): Promise<ModuleToolResult> => {
      try {
        const { query } = input as { query: string };
        
        if (!query) {
          return {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'query ist erforderlich',
            },
          };
        }
        
        const memories = await recallMemories(
          context.userId || DEFAULT_USER_ID,
          query
        );
        
        if (memories.length === 0) {
          return {
            success: true,
            data: {
              memories: [],
              message: `Keine Memories gefunden für "${query}"`,
            },
          };
        }
        
        // Formatiere Ergebnisse kompakt für den Agent
        const formatted = memories.map(m => ({
          category: m.category,
          key: m.key,
          value: m.value,
          confidence: m.confidence,
        }));
        
        return {
          success: true,
          data: {
            memories: formatted,
            count: formatted.length,
            message: `${formatted.length} Memories gefunden für "${query}"`,
          },
        };
      } catch (error) {
        console.error('memory.recall Fehler:', error);
        return {
          success: false,
          error: {
            code: 'EXECUTION_ERROR',
            message: `Fehler beim Abrufen: ${error instanceof Error ? error.message : 'Unbekannt'}`,
          },
        };
      }
    },
  },

  // ========================================
  // LIST - Listet alle Memories auf
  // ========================================
  {
    id: 'memory.list',
    name: 'List Memories',
    description: 'Lists all stored memories, optionally filtered by category. Use to see what the system knows about the user.',
    module: 'memory',
    
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['preference', 'fact', 'instruction', 'entity', 'pattern'],
          description: 'Optional filter by category. Omit to list all.',
        },
      },
    },
    
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
    
    execute: async (input, context): Promise<ModuleToolResult> => {
      try {
        const { category } = (input || {}) as { category?: string };
        
        const memories = await listMemories(
          context.userId || DEFAULT_USER_ID,
          category
        );
        
        // Formatiere kompakt
        const formatted = memories.map(m => ({
          id: m.id,
          category: m.category,
          key: m.key,
          value: m.value,
          confidence: m.confidence,
          source: m.source,
        }));
        
        return {
          success: true,
          data: {
            memories: formatted,
            count: formatted.length,
            message: category
              ? `${formatted.length} Memories in Kategorie "${category}"`
              : `${formatted.length} Memories insgesamt`,
          },
        };
      } catch (error) {
        console.error('memory.list Fehler:', error);
        return {
          success: false,
          error: {
            code: 'EXECUTION_ERROR',
            message: `Fehler beim Auflisten: ${error instanceof Error ? error.message : 'Unbekannt'}`,
          },
        };
      }
    },
  },
  {
    id: 'memory.delete',
    name: 'Delete Memory',
    description: 'Löscht ein einzelnes Memory per ID.',
    module: 'memory',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Memory-ID',
        },
      },
      required: ['id'],
    },
    effects: ['storage'],
    requiresConfirmation: true,
    isIdempotent: true,
    execute: async (input): Promise<ModuleToolResult> => {
      try {
        const { id } = input as { id: string };
        await deleteMemory(id);
        return {
          success: true,
          data: { id },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'EXECUTION_ERROR',
            message: `Fehler beim Löschen: ${error instanceof Error ? error.message : 'Unbekannt'}`,
          },
        };
      }
    },
  },
  {
    id: 'memory.clearCategory',
    name: 'Memory-Kategorie leeren',
    description: 'Löscht alle Memories einer Kategorie für den aktuellen User.',
    module: 'memory',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['preference', 'fact', 'instruction', 'entity', 'pattern'],
          description: 'Zu leerende Kategorie',
        },
      },
      required: ['category'],
    },
    effects: ['storage'],
    requiresConfirmation: true,
    isIdempotent: true,
    execute: async (input, context): Promise<ModuleToolResult> => {
      try {
        const { category } = input as { category: string };
        const memories = await listMemories(context.userId || DEFAULT_USER_ID, category);
        await Promise.all(memories.map((memory) => deleteMemory(memory.id)));
        return {
          success: true,
          data: {
            category,
            cleared: memories.length,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'EXECUTION_ERROR',
            message: `Fehler beim Leeren: ${error instanceof Error ? error.message : 'Unbekannt'}`,
          },
        };
      }
    },
  },
  {
    id: 'memory.export',
    name: 'Memories exportieren',
    description: 'Exportiert Memories optional gefiltert nach Kategorie.',
    module: 'memory',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['preference', 'fact', 'instruction', 'entity', 'pattern'],
          description: 'Optionale Kategorie',
        },
      },
      required: [],
    },
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
    execute: async (input, context): Promise<ModuleToolResult> => {
      try {
        const { category } = (input || {}) as { category?: string };
        const memories = await listMemories(context.userId || DEFAULT_USER_ID, category);
        return {
          success: true,
          data: {
            category: category || null,
            memories,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'EXECUTION_ERROR',
            message: `Fehler beim Export: ${error instanceof Error ? error.message : 'Unbekannt'}`,
          },
        };
      }
    },
  },
  {
    id: 'memory.import',
    name: 'Memories importieren',
    description: 'Importiert ein Array von Memories in den Speicher.',
    module: 'memory',
    inputSchema: {
      type: 'object',
      properties: {
        memories: {
          type: 'array',
          description: 'Liste von Memory-Einträgen',
          items: { type: 'string' },
        },
      },
      required: ['memories'],
    },
    effects: ['storage'],
    requiresConfirmation: true,
    isIdempotent: false,
    execute: async (input, context): Promise<ModuleToolResult> => {
      try {
        const { memories } = input as {
          memories: Array<string | { key: string; value: string; category: string }>;
        };

        let imported = 0;
        for (const entry of memories) {
          if (typeof entry === 'string') continue;
          await saveMemory({
            userId: context.userId || DEFAULT_USER_ID,
            key: entry.key,
            value: entry.value,
            category: entry.category as 'preference' | 'fact' | 'instruction' | 'entity' | 'pattern',
            source: 'explicit',
            confidence: 1.0,
          });
          imported += 1;
        }

        return {
          success: true,
          data: { imported },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'EXECUTION_ERROR',
            message: `Fehler beim Import: ${error instanceof Error ? error.message : 'Unbekannt'}`,
          },
        };
      }
    },
  },
];
