// ============================================
// index.ts - Haupt-Export für das Agents-Modul
// 
// Zweck: Zentraler Einstiegspunkt für alle Exports des Moduls
//        Registriert das Modul bei der Registry
//        Ersetzt das alte Chat-Modul mit erweiterter Agent-Funktionalität
// Verwendet von: App-Layout, Sidebar, ModuleProvider, andere Module
// ============================================

// --------------------------------------------
// Re-Exports: Types
// --------------------------------------------

export type {
  ChatMessageData,
  ChatConversation,
  ChatFolderData,
  AgentsState,
  AgentsActions,
  AgentsStore,
  AgentNode,
  AttachedImage,
  AttachedFile,
  ContextWindowConfig,
  AgentUsageEvent,
  AgentUsageSummary,
  ScheduledAgentTask,
  ScheduledAgentTaskRun,
} from './types';
export type { AgentsSpatialMode, SpatialGraph, SpatialNode } from './spatial-types';

// --------------------------------------------
// Re-Exports: Store und Hooks
// --------------------------------------------

export {
  useAgentsStore,
  useAgentsConversations,
  useActiveAgentsConversation,
  useAgentsFolders,
  useAgentsIsLoading,
  useSelectedAgentId,
  useAgentSidebarCollapsed,
  useHistorySidebarCollapsed,
  migrateFromChatStore,
} from './store';
export { useScheduledTasksStore } from './tasks-store';
export { useAgentsSpatialStore } from './spatial-store';

// --------------------------------------------
// Re-Exports: Konstanten
// --------------------------------------------

export {
  FOLDER_COLORS,
  MAX_CONVERSATIONS,
  MAX_MESSAGES_PER_CONVERSATION,
  DEFAULT_CONVERSATION_TITLE,
  AGENTS_MODULE_INFO,
  CONTEXT_WINDOWS,
  DEFAULT_CONTEXT_WINDOW,
  CHARS_PER_TOKEN,
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_FILE_TYPES,
  MAX_FILE_SIZE,
  MAX_IMAGE_SIZE,
} from './constants';

// --------------------------------------------
// Re-Exports: Komponenten
// --------------------------------------------

export {
  AgentsPage,
  AgentSettingsPage,
  AgentHierarchySidebar,
  ChatHistorySidebar,
  AgentChatBar,
  ChatMessage,
  ChatFolder,
  ModelSelector,
  ContextIndicator,
  SuggestedActions,
  SlashCommands,
  ToolCallCard,
  ScheduledTasksPage,
} from './components';

// --------------------------------------------
// Backward-Compatibility Exports
// Damit bestehender Code, der ChatPage/ChatSidebar etc. importiert,
// weiterhin funktioniert
// --------------------------------------------

export { AgentsPage as ChatPage } from './components';
export { ChatHistorySidebar as ChatSidebar } from './components';
export { AgentChatBar as ChatInput } from './components';

// --------------------------------------------
// Modul-Registration Funktion
// Wird beim App-Start aufgerufen um das Modul zu registrieren
// --------------------------------------------

import { AGENTS_MODULE_INFO } from './constants';
import type { Module, Tool } from '@/types';

/**
 * Erstellt das vollständige Modul-Objekt für die Registry
 * Dieses Objekt enthält alle Metadaten und Komponenten
 */
export function createAgentsModule(): Module {
  const moduleDefinition: Module = {
    ...AGENTS_MODULE_INFO,
    
    // Tools sind vollständige Anwendungen innerhalb des Moduls
    tools: [
      {
        id: 'agents-main',
        moduleId: 'agents',
        name: 'Agents',
        description: 'KI-Agenten mit Chat, Web Research, Memory und Multi-Modell-Support',
        version: '2.0.0',
        icon: 'BotMessageSquare',
        capabilities: ['chat', 'agents', 'research', 'memory', 'vision', 'files'],
        inputs: { fields: [] },
        outputs: { fields: [] },
        events: [
          {
            name: 'messageSent',
            description: 'Wird ausgelöst wenn eine Nachricht gesendet wurde',
            payload: { fields: [{ name: 'message', type: 'string', required: true }] },
          },
          {
            name: 'agentChanged',
            description: 'Wird ausgelöst wenn der Agent gewechselt wurde',
            payload: { fields: [{ name: 'agentId', type: 'string', required: true }] },
          },
        ],
        component: () => null,
        widgets: [],
      } as Tool,
    ],
    
    widgets: [],
    isActive: true,
    order: 0,
  };

  return moduleDefinition;
}

// Backward-Compatibility: Alter Name
export const createChatModule = createAgentsModule;
