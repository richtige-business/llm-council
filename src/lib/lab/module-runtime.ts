// ============================================
// module-runtime.ts - Inter-Modul-Kommunikation
// 
// Zweck: Ermöglicht Modulen, Actions zu registrieren
//        und andere Module aufzurufen
// Verwendet von: Sandbox, Module, Agents
// ============================================

import type { ModuleAction, ModuleEvent, JSONSchema } from './types';

// --------------------------------------------
// Types
// --------------------------------------------

type ActionHandler = (input: unknown) => Promise<unknown> | unknown;
type EventListener = (payload: unknown) => void;

interface RegisteredAction {
  moduleId: string;
  action: ModuleAction;
  handler: ActionHandler;
}

interface RegisteredEvent {
  moduleId: string;
  event: ModuleEvent;
  listeners: Set<EventListener>;
}

// --------------------------------------------
// Module Registry (Singleton)
// Verwaltet alle registrierten Actions und Events
// --------------------------------------------

class ModuleRegistry {
  private actions = new Map<string, RegisteredAction>();
  private events = new Map<string, RegisteredEvent>();
  private moduleActions = new Map<string, Set<string>>(); // moduleId -> actionNames
  
  // ========================================
  // Action Registration
  // ========================================
  
  /**
   * Registriert eine Action für ein Modul
   * @param moduleId - ID des Moduls
   * @param action - Action-Definition mit Schema
   * @param handler - Funktion die aufgerufen wird
   */
  registerAction(
    moduleId: string,
    action: ModuleAction,
    handler: ActionHandler
  ): void {
    const actionKey = `${moduleId}:${action.name}`;
    
    this.actions.set(actionKey, {
      moduleId,
      action,
      handler,
    });
    
    // Track actions per module
    if (!this.moduleActions.has(moduleId)) {
      this.moduleActions.set(moduleId, new Set());
    }
    this.moduleActions.get(moduleId)!.add(action.name);
    
    console.log(`[ModuleRegistry] Action registriert: ${actionKey}`);
  }
  
  /**
   * Entfernt alle Actions eines Moduls
   */
  unregisterModule(moduleId: string): void {
    const moduleActionNames = this.moduleActions.get(moduleId);
    if (moduleActionNames) {
      for (const actionName of moduleActionNames) {
        this.actions.delete(`${moduleId}:${actionName}`);
      }
      this.moduleActions.delete(moduleId);
    }
    
    // Entferne auch Events
    for (const [key, registered] of this.events) {
      if (registered.moduleId === moduleId) {
        this.events.delete(key);
      }
    }
    
    console.log(`[ModuleRegistry] Modul entfernt: ${moduleId}`);
  }
  
  // ========================================
  // Action Invocation
  // ========================================
  
  /**
   * Ruft eine Action eines Moduls auf
   * @param moduleId - Ziel-Modul ID
   * @param actionName - Name der Action
   * @param input - Input-Daten
   * @returns Promise mit dem Ergebnis
   */
  async callAction(
    moduleId: string,
    actionName: string,
    input: unknown
  ): Promise<unknown> {
    const actionKey = `${moduleId}:${actionName}`;
    const registered = this.actions.get(actionKey);
    
    if (!registered) {
      throw new Error(`Action nicht gefunden: ${actionKey}`);
    }
    
    // Validiere Input gegen Schema (optional, für Performance)
    const validationError = this.validateAgainstSchema(input, registered.action.input);
    if (validationError) {
      throw new Error(`Input-Validierung fehlgeschlagen: ${validationError}`);
    }
    
    // Führe Action aus
    try {
      const result = await registered.handler(input);
      
      // Validiere Output gegen Schema (optional)
      const outputError = this.validateAgainstSchema(result, registered.action.output);
      if (outputError) {
        console.warn(`[ModuleRegistry] Output-Validierung fehlgeschlagen: ${outputError}`);
      }
      
      return result;
    } catch (error) {
      console.error(`[ModuleRegistry] Action-Fehler in ${actionKey}:`, error);
      throw error;
    }
  }
  
  // ========================================
  // Event Registration
  // ========================================
  
  /**
   * Registriert ein Event für ein Modul
   */
  registerEvent(moduleId: string, event: ModuleEvent): void {
    const eventKey = `${moduleId}:${event.name}`;
    
    this.events.set(eventKey, {
      moduleId,
      event,
      listeners: new Set(),
    });
    
    console.log(`[ModuleRegistry] Event registriert: ${eventKey}`);
  }
  
  /**
   * Abonniert ein Event
   */
  subscribe(
    moduleId: string,
    eventName: string,
    listener: EventListener
  ): () => void {
    const eventKey = `${moduleId}:${eventName}`;
    const registered = this.events.get(eventKey);
    
    if (!registered) {
      console.warn(`[ModuleRegistry] Event nicht gefunden: ${eventKey}`);
      return () => {};
    }
    
    registered.listeners.add(listener);
    
    // Unsubscribe-Funktion zurückgeben
    return () => {
      registered.listeners.delete(listener);
    };
  }
  
  /**
   * Emittiert ein Event
   */
  emit(moduleId: string, eventName: string, payload: unknown): void {
    const eventKey = `${moduleId}:${eventName}`;
    const registered = this.events.get(eventKey);
    
    if (!registered) {
      console.warn(`[ModuleRegistry] Event nicht gefunden: ${eventKey}`);
      return;
    }
    
    // Validiere Payload
    const validationError = this.validateAgainstSchema(payload, registered.event.payload);
    if (validationError) {
      console.warn(`[ModuleRegistry] Event-Payload ungültig: ${validationError}`);
    }
    
    // Benachrichtige alle Listener
    for (const listener of registered.listeners) {
      try {
        listener(payload);
      } catch (error) {
        console.error(`[ModuleRegistry] Event-Listener-Fehler:`, error);
      }
    }
  }
  
  // ========================================
  // Discovery
  // ========================================
  
  /**
   * Gibt alle registrierten Actions eines Moduls zurück
   */
  getModuleActions(moduleId: string): ModuleAction[] {
    const actionNames = this.moduleActions.get(moduleId);
    if (!actionNames) return [];
    
    return Array.from(actionNames)
      .map(name => this.actions.get(`${moduleId}:${name}`)?.action)
      .filter((a): a is ModuleAction => a !== undefined);
  }
  
  /**
   * Gibt alle registrierten Actions ALLER Module zurück
   * Nützlich für Agent-Discovery
   */
  getAllActions(): Array<{ moduleId: string; action: ModuleAction }> {
    return Array.from(this.actions.values()).map(({ moduleId, action }) => ({
      moduleId,
      action,
    }));
  }
  
  /**
   * Gibt alle Events eines Moduls zurück
   */
  getModuleEvents(moduleId: string): ModuleEvent[] {
    return Array.from(this.events.values())
      .filter(e => e.moduleId === moduleId)
      .map(e => e.event);
  }
  
  // ========================================
  // Validation (Simplified JSONSchema)
  // ========================================
  
  private validateAgainstSchema(data: unknown, schema: JSONSchema): string | null {
    if (schema.type === 'object' && typeof data !== 'object') {
      return `Erwartet object, bekommen ${typeof data}`;
    }
    if (schema.type === 'string' && typeof data !== 'string') {
      return `Erwartet string, bekommen ${typeof data}`;
    }
    if (schema.type === 'number' && typeof data !== 'number') {
      return `Erwartet number, bekommen ${typeof data}`;
    }
    if (schema.type === 'boolean' && typeof data !== 'boolean') {
      return `Erwartet boolean, bekommen ${typeof data}`;
    }
    if (schema.type === 'array' && !Array.isArray(data)) {
      return `Erwartet array, bekommen ${typeof data}`;
    }
    
    // Check required fields for objects
    if (schema.type === 'object' && schema.required && typeof data === 'object' && data !== null) {
      for (const field of schema.required) {
        if (!(field in data)) {
          return `Pflichtfeld fehlt: ${field}`;
        }
      }
    }
    
    return null;
  }
}

// --------------------------------------------
// Singleton Export
// --------------------------------------------

export const moduleRegistry = new ModuleRegistry();

// --------------------------------------------
// Module API Factory
// Wird in Module injiziert für einfache Nutzung
// --------------------------------------------

export interface ModuleRuntimeAPI {
  // Actions registrieren
  registerAction: (
    action: Omit<ModuleAction, 'input' | 'output'> & {
      input?: JSONSchema;
      output?: JSONSchema;
      handler: ActionHandler;
    }
  ) => void;
  
  // Events registrieren und emittieren
  registerEvent: (event: ModuleEvent) => void;
  emit: (eventName: string, payload: unknown) => void;
  
  // Andere Module aufrufen
  callModule: (moduleId: string, actionName: string, input: unknown) => Promise<unknown>;
  
  // Events anderer Module abonnieren
  subscribe: (moduleId: string, eventName: string, listener: EventListener) => () => void;
}

/**
 * Erstellt eine Module Runtime API für ein spezifisches Modul
 * Wird vom DynamicModuleLoader für jedes Modul erstellt
 */
export function createModuleAPI(moduleId: string): ModuleRuntimeAPI {
  return {
    registerAction: ({ name, description, input, output, handler }) => {
      moduleRegistry.registerAction(
        moduleId,
        {
          name,
          description,
          input: input || { type: 'object', properties: {} },
          output: output || { type: 'object', properties: {} },
        },
        handler
      );
    },
    
    registerEvent: (event) => {
      moduleRegistry.registerEvent(moduleId, event);
    },
    
    emit: (eventName, payload) => {
      moduleRegistry.emit(moduleId, eventName, payload);
    },
    
    callModule: (targetModuleId, actionName, input) => {
      return moduleRegistry.callAction(targetModuleId, actionName, input);
    },
    
    subscribe: (targetModuleId, eventName, listener) => {
      return moduleRegistry.subscribe(targetModuleId, eventName, listener);
    },
  };
}

// --------------------------------------------
// Helper: Schema aus Manifest extrahieren
// --------------------------------------------

export function extractAPIFromManifest(manifest: {
  api?: { actions?: ModuleAction[]; events?: ModuleEvent[] };
}): { actions: ModuleAction[]; events: ModuleEvent[] } {
  return {
    actions: manifest.api?.actions || [],
    events: manifest.api?.events || [],
  };
}

// --------------------------------------------
// Helper: Validiere Manifest API
// --------------------------------------------

export function validateModuleAPI(api: unknown): string[] {
  const errors: string[] = [];
  
  if (!api || typeof api !== 'object') {
    return ['api muss ein Object sein'];
  }
  
  const { actions, events } = api as { actions?: unknown[]; events?: unknown[] };
  
  if (actions) {
    if (!Array.isArray(actions)) {
      errors.push('api.actions muss ein Array sein');
    } else {
      actions.forEach((action, i) => {
        if (!action || typeof action !== 'object') {
          errors.push(`api.actions[${i}] muss ein Object sein`);
          return;
        }
        const { name, description, input, output } = action as Record<string, unknown>;
        if (!name || typeof name !== 'string') {
          errors.push(`api.actions[${i}].name ist required`);
        }
        if (!description || typeof description !== 'string') {
          errors.push(`api.actions[${i}].description ist required`);
        }
        if (!input || typeof input !== 'object') {
          errors.push(`api.actions[${i}].input ist required`);
        }
        if (!output || typeof output !== 'object') {
          errors.push(`api.actions[${i}].output ist required`);
        }
      });
    }
  }
  
  if (events) {
    if (!Array.isArray(events)) {
      errors.push('api.events muss ein Array sein');
    } else {
      events.forEach((event, i) => {
        if (!event || typeof event !== 'object') {
          errors.push(`api.events[${i}] muss ein Object sein`);
          return;
        }
        const { name, description, payload } = event as Record<string, unknown>;
        if (!name || typeof name !== 'string') {
          errors.push(`api.events[${i}].name ist required`);
        }
        if (!description || typeof description !== 'string') {
          errors.push(`api.events[${i}].description ist required`);
        }
        if (!payload || typeof payload !== 'object') {
          errors.push(`api.events[${i}].payload ist required`);
        }
      });
    }
  }
  
  return errors;
}

