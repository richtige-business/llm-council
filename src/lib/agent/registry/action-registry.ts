// ============================================
// action-registry.ts - Frontend Action Handler Registry
// 
// Zweck: Verwaltet alle Module Action Handler für Frontend-Ausführung
// Verwendet von: useAgentExecutor, Module Handlers
// ============================================

'use client';

import type { AgentAction, ActionHandler, ActionResult } from '../types';

// --------------------------------------------
// Action Registry Klasse
// Verwaltet alle registrierten Action Handler
// --------------------------------------------

class ActionRegistry {
  // Map von moduleId zu Handler
  private handlers: Map<string, ActionHandler> = new Map();
  
  // Map von actionType zu moduleId (für schnelle Lookups)
  private actionTypeToModule: Map<string, string> = new Map();

  // ========================================
  // REGISTRIERUNG
  // ========================================

  /**
   * Registriert einen Action Handler
   * @param handler - ActionHandler-Objekt mit moduleId und execute-Funktion
   */
  register(handler: ActionHandler): void {
    // Handler registrieren
    if (this.handlers.has(handler.moduleId)) {
      console.warn(`Handler für Modul "${handler.moduleId}" wird überschrieben`);
    }
    
    this.handlers.set(handler.moduleId, handler);
    
    // Action-Types mappen
    for (const actionType of handler.supportedActions) {
      this.actionTypeToModule.set(actionType, handler.moduleId);
    }
    
    console.log(`✅ Action Handler registriert: ${handler.moduleId} (${handler.supportedActions.length} Actions)`);
  }

  /**
   * Registriert mehrere Handler auf einmal
   * @param handlers - Array von ActionHandler-Objekten
   */
  registerAll(handlers: ActionHandler[]): void {
    for (const handler of handlers) {
      this.register(handler);
    }
  }

  /**
   * Entfernt einen Handler
   * @param moduleId - ID des Moduls
   */
  unregister(moduleId: string): boolean {
    const handler = this.handlers.get(moduleId);
    
    if (handler) {
      // Action-Types entfernen
      for (const actionType of handler.supportedActions) {
        this.actionTypeToModule.delete(actionType);
      }
    }
    
    return this.handlers.delete(moduleId);
  }

  // ========================================
  // ABFRAGEN
  // ========================================

  /**
   * Holt einen Handler nach Modul-ID
   * @param moduleId - ID des Moduls
   */
  getHandler(moduleId: string): ActionHandler | undefined {
    return this.handlers.get(moduleId);
  }

  /**
   * Findet den Handler für einen Action-Type
   * @param actionType - Type der Action (z.B. "inbox.openTab")
   */
  getHandlerForAction(actionType: string): ActionHandler | undefined {
    // Zuerst im direkten Mapping suchen
    const moduleId = this.actionTypeToModule.get(actionType);
    if (moduleId) {
      return this.handlers.get(moduleId);
    }
    
    // Fallback: Aus dem Action-Type das Modul extrahieren
    const [module] = actionType.split('.');
    return this.handlers.get(module);
  }

  /**
   * Prüft ob eine Action unterstützt wird
   * @param actionType - Type der Action
   */
  supportsAction(actionType: string): boolean {
    return this.getHandlerForAction(actionType) !== undefined;
  }

  /**
   * Listet alle registrierten Module auf
   */
  getRegisteredModules(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Listet alle unterstützten Action-Types auf
   */
  getSupportedActions(): string[] {
    return Array.from(this.actionTypeToModule.keys());
  }

  // ========================================
  // AUSFÜHRUNG
  // ========================================

  /**
   * Führt eine Action aus
   * @param action - Die auszuführende AgentAction
   */
  async execute(action: AgentAction): Promise<ActionResult> {
    const handler = this.getHandlerForAction(action.type);
    
    if (!handler) {
      console.warn(`⚠️ Kein Handler für Action "${action.type}" gefunden`);
      return {
        success: false,
        error: `Kein Handler für Action-Type "${action.type}" registriert`,
      };
    }

    try {
      console.log(`🎬 Führe Action aus: ${action.type}`, action.payload);
      
      const startTime = Date.now();
      const result = await handler.execute(action);
      const duration = Date.now() - startTime;
      
      console.log(`✅ Action ${action.type} abgeschlossen in ${duration}ms`, { 
        success: result.success,
        error: result.error,
      });
      
      return result;
      
    } catch (error) {
      console.error(`❌ Action ${action.type} fehlgeschlagen:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler bei Action-Ausführung',
      };
    }
  }

  /**
   * Führt mehrere Actions sequentiell aus
   * @param actions - Array von Actions
   * @param delayBetween - Optionale Verzögerung zwischen Actions (ms)
   */
  async executeAll(
    actions: AgentAction[],
    delayBetween: number = 0
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = [];
    
    for (let i = 0; i < actions.length; i++) {
      const result = await this.execute(actions[i]);
      results.push(result);
      
      // Verzögerung zwischen Actions (wenn gewünscht)
      if (delayBetween > 0 && i < actions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetween));
      }
    }
    
    return results;
  }

  // ========================================
  // UTILITY
  // ========================================

  /**
   * Setzt die Registry zurück (für Tests)
   */
  clear(): void {
    this.handlers.clear();
    this.actionTypeToModule.clear();
  }

  /**
   * Debug: Gibt Informationen über die Registry aus
   */
  debug(): { modules: string[]; actions: string[] } {
    return {
      modules: this.getRegisteredModules(),
      actions: this.getSupportedActions(),
    };
  }
}

// --------------------------------------------
// Singleton-Instanz exportieren
// --------------------------------------------

export const actionRegistry = new ActionRegistry();

// --------------------------------------------
// Convenience-Funktionen
// --------------------------------------------

/**
 * Registriert einen Handler in der globalen Registry
 */
export function registerActionHandler(handler: ActionHandler): void {
  actionRegistry.register(handler);
}

/**
 * Führt eine Action über die globale Registry aus
 */
export async function executeAction(action: AgentAction): Promise<ActionResult> {
  return actionRegistry.execute(action);
}
