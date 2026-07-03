// ============================================
// use-agent-executor.ts - Hook für Agent-Aktionen im Frontend
// 
// Zweck: Führt Agent-Aktionen aus, die vom Backend kommen
//        Nutzt Action Registry für modulare Ausführung
// Verwendet von: ChatWidget, ChatPage
// ============================================

'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { actionRegistry } from './registry/action-registry';
import { useAgentStore } from './agent-store';
import { useAgentConfigStore } from './stores/agent-config-store';
import { executeVisualAction, hideCursor } from './computer-use';
import { createLogger } from '@/lib/logger';
import type { AgentAction, AgentResponse } from './types';

const log = createLogger('AgentExecutor');

// --------------------------------------------
// Human in the Loop Pending Action Interface
// Speichert Action die auf Bestätigung wartet
// --------------------------------------------
interface PendingHumanConfirmation {
  action: AgentAction;
  resolve: (approved: boolean) => void;
}

// Module Action Handlers
import { appActionHandler } from './handlers/app-handler';
import { agentsActionHandler } from './handlers/agents-handler';
import { settingsActionHandler } from './handlers/settings-handler';
import { marketplaceActionHandler } from './handlers/marketplace-handler';

// --------------------------------------------
// useAgentExecutor Hook
// Führt Aktionen aus und aktualisiert den Status
// --------------------------------------------

export function useAgentExecutor() {
  // Ref um sicherzustellen, dass Handler nur einmal registriert werden
  const handlersRegistered = useRef(false);
  
  // Agent Store
  const {
    setExecuting,
    setCurrentAction,
    addToHistory,
    addPendingAction,
    removePendingAction,
    markActionExecuted,
  } = useAgentStore();
  
  // Config Store (für Visual Mode und Human in the Loop)
  const getConfig = useAgentConfigStore((state) => state.getConfig);
  
  // Human in the Loop State
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingHumanConfirmation | null>(null);
  
  // ----------------------------------------
  // Hilfsfunktion: Config für Modul-Aktion holen
  // ----------------------------------------
  const getConfigForAction = useCallback((action: AgentAction) => {
    // Extrahiere Modul aus Action-Typ (z.B. 'calendar.createEvent' -> 'calendar')
    const moduleId = action.module || action.type.split('.')[0] || 'master';
    return getConfig(moduleId);
  }, [getConfig]);

  // ----------------------------------------
  // Prüfen ob Action fuer dieses Tool visuell laufen soll
  // Globaler Visual Mode + optionales Per-Tool-Override
  // ----------------------------------------
  const shouldUseVisualModeForAction = useCallback((action: AgentAction): boolean => {
    const config = getConfigForAction(action);
    const visualModeEnabled = config.visualModeEnabled ?? true;
    const visualTools = config.visualTools || [];
    const toolVisualEnabled = visualTools.length === 0 || visualTools.includes(action.type);
    return visualModeEnabled && toolVisualEnabled;
  }, [getConfigForAction]);
  
  // ----------------------------------------
  // Prüfen ob Action Human in the Loop braucht
  // ----------------------------------------
  const needsHumanConfirmation = useCallback((action: AgentAction): boolean => {
    const config = getConfigForAction(action);
    const hitlTools = config.humanInTheLoopTools || [];
    
    // Tool-ID ist der Action-Typ (z.B. 'calendar.createEvent')
    return hitlTools.includes(action.type);
  }, [getConfigForAction]);
  
  // ----------------------------------------
  // Human in the Loop: Bestätigung anfordern
  // ----------------------------------------
  const requestHumanConfirmation = useCallback((action: AgentAction): Promise<boolean> => {
    return new Promise((resolve) => {
      log.info('Human in the Loop: Warte auf Bestätigung für', action.type);
      setPendingConfirmation({ action, resolve });
    });
  }, []);
  
  // ----------------------------------------
  // Human in the Loop: Bestätigung geben/ablehnen
  // ----------------------------------------
  const confirmAction = useCallback((approved: boolean) => {
    if (pendingConfirmation) {
      log.info(approved ? 'Action bestätigt' : 'Action abgelehnt');
      pendingConfirmation.resolve(approved);
      setPendingConfirmation(null);
    }
  }, [pendingConfirmation]);

  // ----------------------------------------
  // Action Handler registrieren (einmalig)
  // ----------------------------------------
  useEffect(() => {
    if (!handlersRegistered.current) {
      log.debug('Registriere Action Handler...');
      
      // Registriere alle Handler
      actionRegistry.register(appActionHandler);
      actionRegistry.register(agentsActionHandler);
      actionRegistry.register(settingsActionHandler);
      actionRegistry.register(marketplaceActionHandler);
      
      handlersRegistered.current = true;
      
      // Debug-Info ausgeben
      const modules = actionRegistry.getRegisteredModules();
      const actions = actionRegistry.getSupportedActions();
      log.debug('Action Handler registriert', { modules, actionCount: actions.length });
    }
  }, []);

  // ----------------------------------------
  // Einzelne Aktion ausführen (über Registry)
  // ----------------------------------------
  const executeFastAction = useCallback(async (action: AgentAction): Promise<boolean> => {
    log.debug('executeFastAction', action.type);
    
    try {
      // Prüfen ob Handler registriert ist
      const hasHandler = actionRegistry.supportsAction(action.type);
      
      if (!hasHandler) {
        log.error('Kein Handler für Action', action.type);
        return false;
      }
      
      // Über Action Registry ausführen
      const result = await actionRegistry.execute(action);
      
      if (result.success) {
        log.debug('Action erfolgreich', action.type);
        return true;
      } else {
        log.warn('Action fehlgeschlagen', { type: action.type, error: result.error });
        return false;
      }
    } catch (error) {
      log.error('Fehler bei Action', { type: action.type, error });
      return false;
    }
  }, []);

  // ----------------------------------------
  // Einzelne Aktion ausführen
  // Nutzt Config für Visual Mode und Human in the Loop
  // ----------------------------------------
  const executeAction = useCallback(async (action: AgentAction): Promise<boolean> => {
    // Config für dieses Modul holen
    const useVisualMode = shouldUseVisualModeForAction(action);
    
    setCurrentAction(action);
    log.debug('Starte Aktion', { type: action.type, visualMode: useVisualMode });
    
    try {
      // =====================================
      // Human in the Loop: Bestätigung prüfen
      // =====================================
      if (needsHumanConfirmation(action)) {
        log.info('Action benötigt Human in the Loop Bestätigung');
        const approved = await requestHumanConfirmation(action);
        
        if (!approved) {
          log.info('Action wurde vom User abgelehnt');
          return false;
        }
        log.info('Action wurde vom User bestätigt');
      }
      
      let success = false;

      if (useVisualMode) {
        // =====================================
        // Visueller Modus - Generative UI
        // =====================================
        log.debug('Starte visuelle Ausführung (Generative UI)...');
        
        const visualResult = await executeVisualAction(action);
        log.debug('Visuelle Ausführung beendet', {
          type: action.type,
          status: visualResult.status,
          executionMode: visualResult.executionMode,
          steps: visualResult.steps,
          fallbackReason: visualResult.fallbackReason,
          error: visualResult.error,
        });
        
        if (visualResult.status === 'completed') {
          success = true;
          log.debug('Aktion visuell abgeschlossen');
        } else {
          // Im strikten Visual Mode gibt es keinen Fast-Fallback mehr.
          log.warn('Visuelle Ausführung fehlgeschlagen', {
            type: action.type,
            status: visualResult.status,
            message: visualResult.message,
            error: visualResult.error,
            executionMode: visualResult.executionMode,
            fallbackReason: visualResult.fallbackReason,
            steps: visualResult.steps,
          });
        }
        
        // Am Ende Cursor verstecken
        hideCursor();
      } else {
        // =====================================
        // Schnelle Ausführung (Hintergrund)
        // =====================================
        log.debug('Schnelle Ausführung im Hintergrund...');
        success = await executeFastAction(action);
      }

      if (success) {
        addToHistory(action);
      }

      return success;

    } catch (error) {
      log.error('Fehler bei Aktion', { type: action.type, error });
      hideCursor();
      return false;

    } finally {
      setCurrentAction(null);
    }
  }, [needsHumanConfirmation, requestHumanConfirmation, executeFastAction, setCurrentAction, addToHistory, shouldUseVisualModeForAction]);

  // ----------------------------------------
  // Alle Aktionen aus einer Response ausführen
  // ----------------------------------------
  const executeActions = useCallback(async (actions: AgentAction[]): Promise<void> => {
    if (actions.length === 0) return;

    setExecuting(true);

    for (const action of actions) {
      // Prüfe Visual Mode für Pause-Länge
      const config = getConfigForAction(action);
      const visualTools = config.visualTools || [];
      const useVisualMode = (config.visualModeEnabled ?? true)
        && (visualTools.length === 0 || visualTools.includes(action.type));
      
      addPendingAction(action);
      const success = await executeAction(action);
      if (success) {
        markActionExecuted(action.timestamp);
      } else {
        removePendingAction(action.timestamp);
        log.warn('Aktionskette nach fehlgeschlagener Aktion abgebrochen', {
          type: action.type,
          visualMode: useVisualMode,
        });
        break;
      }
      
      // Pause zwischen Aktionen (länger im visuellen Modus)
      await new Promise(resolve => setTimeout(resolve, useVisualMode ? 300 : 100));
    }

    // Cursor am Ende verstecken
    hideCursor();
    setExecuting(false);
  }, [executeAction, setExecuting, addPendingAction, markActionExecuted, removePendingAction, getConfigForAction]);

  // ----------------------------------------
  // Agent-Anfrage senden und Aktionen ausführen
  // ----------------------------------------
  const sendAgentRequest = useCallback(async (
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<{ message: string; actions: AgentAction[]; toolCalls?: AgentResponse['toolCalls'] }> => {
    setExecuting(true);

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const errorMessage = errorBody.details || errorBody.error || `API Fehler (${response.status})`;
        throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
      }

      const data: AgentResponse = await response.json();
      log.debug('API Response erhalten', {
        messageLength: data.message?.length || 0,
        actions: data.actions?.length || 0,
        toolCalls: data.toolCalls?.length || 0,
      });

      // Aktionen ausführen
      if (data.actions && data.actions.length > 0) {
        log.info(`Führe ${data.actions.length} Aktionen aus`);
        await executeActions(data.actions);
        log.info('Alle Aktionen ausgeführt');
      }

      return {
        message: data.message,
        actions: data.actions || [],
        toolCalls: data.toolCalls,
      };

    } catch (error) {
      log.error('Agent Request Fehler', error);
      hideCursor();
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      return {
        message: `Entschuldigung, es ist ein Fehler aufgetreten: ${errorMessage}`,
        actions: [],
      };

    } finally {
      setExecuting(false);
    }
  }, [executeActions, setExecuting]);

  return {
    executeAction,
    executeActions,
    sendAgentRequest,
    // Human in the Loop
    pendingConfirmation,
    confirmAction,
  };
}
