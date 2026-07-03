// ============================================
// tool-registry.ts - Zentrale Tool-Registrierung
// 
// Zweck: Verwaltet alle Module-Tools und deren Ausführung
// Verwendet von: API Route, Module Tools
// ============================================

import { createLogger } from '@/lib/logger';
import type { 
  ModuleTool, 
  ModuleToolResult, 
  ToolExecutionContext,
  ClaudeModuleToolDefinition,
  ToolErrorCode,
} from '../types';

const log = createLogger('ToolRegistry');

// --------------------------------------------
// Tool Registry Klasse
// Singleton für globale Tool-Verwaltung
// --------------------------------------------

class ToolRegistry {
  // Map von Tool-ID zu Tool-Definition
  private tools: Map<string, ModuleTool> = new Map();
  
  // Flag ob Registry initialisiert wurde
  private initialized: boolean = false;

  // ========================================
  // REGISTRIERUNG
  // ========================================

  /**
   * Registriert ein oder mehrere Tools
   * @param tools - Array von ModuleTool-Definitionen
   */
  register(tools: ModuleTool[]): void {
    for (const tool of tools) {
      // Validiere Tool-ID Format
      if (!tool.id.includes('.')) {
        log.warn(`Tool-ID "${tool.id}" sollte Format "moduleId.toolName" haben`);
      }
      
      // Prüfe ob bereits registriert
      if (this.tools.has(tool.id)) {
        log.warn(`Tool "${tool.id}" wird überschrieben`);
      }
      
      this.tools.set(tool.id, tool);
    }
    
    log.debug(`${tools.length} Tools registriert. Gesamt: ${this.tools.size}`);
  }

  /**
   * Entfernt ein Tool aus der Registry
   * @param toolId - ID des zu entfernenden Tools
   */
  unregister(toolId: string): boolean {
    return this.tools.delete(toolId);
  }

  // ========================================
  // ABFRAGEN
  // ========================================

  /**
   * Holt ein Tool nach ID
   * @param toolId - Globale Tool-ID (z.B. "inbox.sendEmail")
   */
  get(toolId: string): ModuleTool | undefined {
    return this.tools.get(toolId);
  }

  /**
   * Prüft ob ein Tool existiert
   * @param toolId - Globale Tool-ID
   */
  has(toolId: string): boolean {
    return this.tools.has(toolId);
  }

  /**
   * Listet alle registrierten Tools auf
   */
  list(): ModuleTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Filtert Tools nach Modul
   * @param moduleId - ID des Moduls (z.B. "inbox", "calendar")
   */
  getByModule(moduleId: string): ModuleTool[] {
    return this.list().filter(tool => tool.module === moduleId);
  }

  /**
   * Gibt die Anzahl registrierter Tools zurück
   */
  get size(): number {
    return this.tools.size;
  }

  // ========================================
  // CLAUDE API FORMAT
  // ========================================

  /**
   * Konvertiert Tool-ID zu Claude-kompatiblem Namen
   * Claude erlaubt nur ^[a-zA-Z0-9_-]{1,128}$
   * Wir ersetzen Punkte durch Unterstriche
   */
  private toClaudeName(toolId: string): string {
    return toolId.replace(/\./g, '_');
  }

  /**
   * Konvertiert Claude-Namen zurück zur Tool-ID
   */
  fromClaudeName(claudeName: string): string {
    // Finde das passende Tool anhand des konvertierten Namens
    for (const tool of this.tools.values()) {
      if (this.toClaudeName(tool.id) === claudeName) {
        return tool.id;
      }
    }
    // Fallback: Unterstrich zu Punkt (für einfache Fälle)
    return claudeName.replace(/_/, '.');
  }

  /**
   * Konvertiert alle Tools ins Claude-API-Format
   * Wird für den tools-Parameter der Anthropic-API verwendet
   */
  getClaudeTools(): ClaudeModuleToolDefinition[] {
    return this.list().map(tool => ({
      name: this.toClaudeName(tool.id),
      description: tool.description,
      input_schema: tool.inputSchema,
    }));
  }

  /**
   * Konvertiert Tools eines Moduls ins Claude-Format
   * @param moduleId - Modul-ID zum Filtern
   */
  getClaudeToolsForModule(moduleId: string): ClaudeModuleToolDefinition[] {
    return this.getByModule(moduleId).map(tool => ({
      name: tool.id,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));
  }

  // ========================================
  // AUSFÜHRUNG
  // ========================================

  /**
   * Führt ein Tool aus
   * @param toolId - ID des auszuführenden Tools (kann Claude-Name mit _ oder Original mit . sein)
   * @param input - Input-Parameter für das Tool
   * @param context - Ausführungs-Kontext
   */
  async execute(
    toolId: string,
    input: unknown,
    context: ToolExecutionContext
  ): Promise<ModuleToolResult> {
    // 1. Tool finden (versuche erst direkt, dann Claude-Namen konvertieren)
    let tool = this.get(toolId);
    
    // Falls nicht gefunden, versuche Claude-Namen zu konvertieren
    if (!tool && toolId.includes('_')) {
      const originalId = this.fromClaudeName(toolId);
      tool = this.get(originalId);
    }
    
    if (!tool) {
      return {
        success: false,
        error: {
          code: 'TOOL_NOT_FOUND' as ToolErrorCode,
          message: `Tool "${toolId}" wurde nicht gefunden`,
        },
      };
    }

    // 2. Input validieren (TODO: JSON Schema Validierung)
    // Für jetzt: Basis-Validierung
    if (tool.inputSchema.required) {
      const inputObj = input as Record<string, unknown>;
      for (const required of tool.inputSchema.required) {
        if (!(required in inputObj) || inputObj[required] === undefined) {
          return {
            success: false,
            error: {
              code: 'VALIDATION_ERROR' as ToolErrorCode,
              message: `Pflichtfeld "${required}" fehlt`,
            },
          };
        }
      }
    }

    // 3. Tool ausführen
    try {
      log.debug(`Führe Tool aus: ${toolId}`);
      
      const startTime = Date.now();
      const result = await tool.execute(input, context);
      const duration = Date.now() - startTime;
      
      log.debug(`Tool ${toolId} abgeschlossen in ${duration}ms`, { success: result.success });
      
      return result;
      
    } catch (error) {
      log.error(`Tool ${toolId} fehlgeschlagen`, error);
      
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR' as ToolErrorCode,
          message: error instanceof Error ? error.message : 'Unbekannter Fehler bei Tool-Ausführung',
        },
      };
    }
  }

  // ========================================
  // UTILITY
  // ========================================

  /**
   * Setzt die Registry zurück (für Tests)
   */
  clear(): void {
    this.tools.clear();
    this.initialized = false;
  }

  /**
   * Markiert die Registry als initialisiert
   */
  markInitialized(): void {
    this.initialized = true;
  }

  /**
   * Prüft ob die Registry initialisiert wurde
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Debug: Gibt alle registrierten Tool-IDs aus
   */
  getToolIds(): string[] {
    return Array.from(this.tools.keys());
  }
}

// --------------------------------------------
// Singleton-Instanz exportieren
// --------------------------------------------

export const toolRegistry = new ToolRegistry();

// --------------------------------------------
// Convenience-Funktionen
// --------------------------------------------

/**
 * Registriert Tools in der globalen Registry
 */
export function registerTools(tools: ModuleTool[]): void {
  toolRegistry.register(tools);
}

/**
 * Führt ein Tool über die globale Registry aus
 */
export async function executeTool(
  toolId: string,
  input: unknown,
  context: ToolExecutionContext
): Promise<ModuleToolResult> {
  return toolRegistry.execute(toolId, input, context);
}

/**
 * Holt Claude-Tool-Definitionen aus der globalen Registry
 */
export function getClaudeToolDefinitions(): ClaudeModuleToolDefinition[] {
  return toolRegistry.getClaudeTools();
}
