// ============================================
// orchestrator.ts - Master-Orchestrator für Dashboard-Agent
// 
// Zweck: Der "Über-Agent" im Dashboard kann alle Modul-Agenten
//        orchestrieren und Cross-Modul-Aktionen ausführen
// Verwendet von: Dashboard ChatWidget, API Route
// ============================================

import { toolRegistry } from './registry';
import { 
  useAgentConfigStore, 
  SYSTEM_PROMPT_TEMPLATES,
  type AgentConfig,
} from './stores/agent-config-store';
import { getScopedToolsForAgent } from './tools/tool-scope';

// --------------------------------------------
// Modul-Erkennung Patterns
// Hilft bei der Identifizierung welches Modul 
// angesprochen werden soll
// --------------------------------------------

const MODULE_PATTERNS: Record<string, RegExp[]> = {
  calendar: [
    /termin/i,
    /kalender/i,
    /event/i,
    /meeting/i,
    /besprechung/i,
    /datum/i,
    /uhrzeit/i,
    /schedule/i,
    /appointment/i,
    /wann.*statt/i,
    /morgen|übermorgen|nächste woche/i,
  ],
  inbox: [
    /e-?mail/i,
    /postfach/i,
    /nachricht/i,
    /mail/i,
    /inbox/i,
    /senden|schicken|schreiben.*an/i,
    /antworten/i,
    /reply/i,
    /betreff/i,
  ],
  browser: [
    /browser/i,
    /web/i,
    /website/i,
    /seite|page/i,
    /öffne.*url/i,
    /such.*google/i,
    /navigier/i,
    /internet/i,
    /link/i,
  ],
  'todo-list': [
    /aufgabe/i,
    /todo/i,
    /to-?do/i,
    /task/i,
    /erledigen/i,
    /abhaken/i,
    /checklist/i,
    /liste/i,
  ],
  agents: [
    /chat/i,
    /agent/i,
    /gespräch/i,
    /konversation/i,
    /unterhaltung/i,
  ],
  training: [
    /training/i,
    /fine-?tune/i,
    /modell.*trainieren/i,
    /dataset/i,
    /sandbox/i,
  ],
  lab: [
    /lab/i,
    /builder/i,
    /module builder/i,
    /modul bauen/i,
    /modul erstellen/i,
    /publish/i,
  ],
};

// --------------------------------------------
// Harte Delegationsziele fuer Intelligence
// Nur diese Module werden vom Master direkt delegiert.
// --------------------------------------------

const MASTER_DELEGATION_TARGETS = ['calendar', 'inbox', 'lab'] as const;
type MasterDelegationTarget = (typeof MASTER_DELEGATION_TARGETS)[number];

// --------------------------------------------
// Orchestrator Klasse
// --------------------------------------------

export class AgentOrchestrator {
  private static instance: AgentOrchestrator;
  
  // Singleton Pattern
  static getInstance(): AgentOrchestrator {
    if (!AgentOrchestrator.instance) {
      AgentOrchestrator.instance = new AgentOrchestrator();
    }
    return AgentOrchestrator.instance;
  }
  
  // ----------------------------------------
  // Modul aus Benutzeranfrage erkennen
  // ----------------------------------------
  detectModule(userMessage: string): string | null {
    // Prüfe jeden Modul-Pattern
    for (const [moduleId, patterns] of Object.entries(MODULE_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(userMessage)) {
          console.log(`🎯 Modul erkannt: ${moduleId} (Pattern: ${pattern})`);
          return moduleId;
        }
      }
    }
    
    // Kein spezifisches Modul erkannt
    return null;
  }
  
  // ----------------------------------------
  // Scope-Tools fuer einen Agent holen
  // Nutzt zentrale Scope-Policy statt "alle Tools".
  // ----------------------------------------
  getToolsForAgent(agentId: string): ReturnType<typeof toolRegistry.list> {
    return getScopedToolsForAgent(agentId, toolRegistry.list());
  }

  // ----------------------------------------
  // Delegationsziel fuer Master ermitteln
  // Nur calendar/inbox/lab werden hart delegiert.
  // ----------------------------------------
  detectMasterDelegationTarget(userMessage: string): MasterDelegationTarget | null {
    const detected = this.detectModule(userMessage);
    if (!detected) return null;
    if (MASTER_DELEGATION_TARGETS.includes(detected as MasterDelegationTarget)) {
      return detected as MasterDelegationTarget;
    }
    return null;
  }
  
  // ----------------------------------------
  // System-Prompt für den Master-Agent bauen
  // ----------------------------------------
  buildMasterSystemPrompt(
    detectedModule: string | null,
    customPrompt?: string
  ): string {
    // Basis: Master-Prompt
    let prompt = customPrompt?.trim() || SYSTEM_PROMPT_TEMPLATES.master;
    
    // Wenn ein Modul erkannt wurde, füge spezifischen Kontext hinzu
    if (detectedModule) {
      const moduleTemplateKey = detectedModule as keyof typeof SYSTEM_PROMPT_TEMPLATES;
      const modulePrompt = SYSTEM_PROMPT_TEMPLATES[moduleTemplateKey];
      
      if (modulePrompt) {
        prompt += `\n\n--- Aktueller Fokus: ${detectedModule.toUpperCase()} ---\n`;
        prompt += modulePrompt;
      }
    }
    
    // Verfügbare Tools auflisten
    const tools = this.getToolsForAgent('master');
    if (tools.length > 0) {
      prompt += '\n\n--- Verfügbare Tools ---\n';
      prompt += tools.map(t => `- ${t.id}: ${t.description}`).join('\n');
    }
    
    return prompt;
  }
  
  // ----------------------------------------
  // System-Prompt für modul-spezifischen Agent bauen
  // ----------------------------------------
  buildModuleSystemPrompt(
    moduleId: string,
    config: AgentConfig
  ): string {
    // Custom Prompt hat Priorität
    if (config.systemPrompt?.trim()) {
      return config.systemPrompt;
    }
    
    // Fallback zu Template
    const templateKey = moduleId as keyof typeof SYSTEM_PROMPT_TEMPLATES;
    let prompt = SYSTEM_PROMPT_TEMPLATES[templateKey] || SYSTEM_PROMPT_TEMPLATES.default;
    
    // Verfügbare Tools auflisten (gefiltert nach enabledTools)
    const allModuleTools = this.getToolsForAgent(moduleId);
    const enabledTools = config.enabledTools.length > 0
      ? allModuleTools.filter(t => config.enabledTools.includes(t.id))
      : allModuleTools;
    
    if (enabledTools.length > 0) {
      prompt += '\n\n--- Verfügbare Tools ---\n';
      prompt += enabledTools.map(t => `- ${t.id}: ${t.description}`).join('\n');
    }
    
    return prompt;
  }
  
  // ----------------------------------------
  // Orchestrierungs-Entscheidung treffen
  // Gibt zurück welches Modul/Config verwendet werden soll
  // ----------------------------------------
  orchestrate(
    userMessage: string,
    requestedModuleId?: string
  ): {
    moduleId: string;
    isSpecific: boolean;
    systemPrompt: string;
    tools: ReturnType<typeof toolRegistry.list>;
  } {
    // Wenn explizit ein Modul angefragt wurde (ausser Master)
    if (requestedModuleId && requestedModuleId !== 'master') {
      const config = useAgentConfigStore.getState().getConfig(requestedModuleId);
      const tools = this.getToolsForAgent(requestedModuleId);
      const filteredTools = config.enabledTools.length > 0
        ? tools.filter(t => config.enabledTools.includes(t.id))
        : tools;
      
      return {
        moduleId: requestedModuleId,
        isSpecific: true,
        systemPrompt: this.buildModuleSystemPrompt(requestedModuleId, config),
        tools: filteredTools,
      };
    }
    
    // Master-Agent: ggf. hart an Sub-Agent delegieren
    const delegationTarget = this.detectMasterDelegationTarget(userMessage);
    if (delegationTarget) {
      const config = useAgentConfigStore.getState().getConfig(delegationTarget);
      const tools = this.getToolsForAgent(delegationTarget);
      const filteredTools = config.enabledTools.length > 0
        ? tools.filter(t => config.enabledTools.includes(t.id))
        : tools;

      return {
        moduleId: delegationTarget,
        isSpecific: true,
        systemPrompt: this.buildModuleSystemPrompt(delegationTarget, config),
        tools: filteredTools,
      };
    }

    // Master bleibt Ausfuehrungs-Agent (inkl. browser/settings/marketplace/agents)
    const detectedModule = this.detectModule(userMessage);
    const masterConfig = useAgentConfigStore.getState().getConfig('master');
    const masterTools = this.getToolsForAgent('master');
    const filteredMasterTools = masterConfig.enabledTools.length > 0
      ? masterTools.filter(t => masterConfig.enabledTools.includes(t.id))
      : masterTools;
    
    return {
      moduleId: 'master',
      isSpecific: false,
      systemPrompt: this.buildMasterSystemPrompt(detectedModule, masterConfig.systemPrompt),
      tools: filteredMasterTools,
    };
  }
  
  // ----------------------------------------
  // Agent-Konfiguration für API-Route holen
  // ----------------------------------------
  getAgentConfig(moduleId: string): {
    model: string; // Kann Claude oder OpenAI Model ID sein
    temperature: number;
    maxTokens: number;
  } {
    const config = useAgentConfigStore.getState().getConfig(moduleId);
    
    return {
      model: config.llmModel,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
    };
  }
}

// --------------------------------------------
// Singleton-Instanz exportieren
// --------------------------------------------

export const orchestrator = AgentOrchestrator.getInstance();

// --------------------------------------------
// Convenience-Funktionen
// --------------------------------------------

/**
 * Erkennt welches Modul aus einer Benutzeranfrage angesprochen wird
 */
export function detectModuleFromMessage(message: string): string | null {
  return orchestrator.detectModule(message);
}

/**
 * Orchestriert eine Agent-Anfrage
 */
export function orchestrateAgentRequest(
  userMessage: string,
  moduleId?: string
) {
  return orchestrator.orchestrate(userMessage, moduleId);
}

/**
 * Holt die Agent-Konfiguration für ein Modul
 */
export function getModuleAgentConfig(moduleId: string) {
  return orchestrator.getAgentConfig(moduleId);
}
