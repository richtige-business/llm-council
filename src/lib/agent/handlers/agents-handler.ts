// ============================================
// agents-handler.ts - Frontend-Handler fuer Agents-Actions
//
// Zweck: Fuehrt die neuen Agents-Tools im Client aus und verbindet
//        sie mit Chat-, Gruppen-, Council- und Task-Stores.
// Verwendet von: useAgentExecutor, Agents-Tools
// ============================================

'use client';

import { AGENTS_TOOL_SPECS } from '@/lib/agent/tools/agents-tool-specs';
import { useAgentConfigStore } from '@/lib/agent/stores/agent-config-store';
import { useIntegrationStatusStore } from '@/lib/agent/stores/integration-status-store';
import { useAppStore } from '@/lib/store/app-store';
import { useAgentsStore } from '@/modules/agents/store';
import { useScheduledTasksStore } from '@/modules/agents/tasks-store';
import type { AgentAction, ActionHandler, ActionResult } from '@/lib/agent/types';

const AGENTS_ACTION_IDS = AGENTS_TOOL_SPECS.map((spec) => spec.id);
const AGENTS_LEGACY_ACTION_IDS = [
  'agents.createAgent',
  'agents.updateAgent',
  'agents.deleteAgent',
  'agents.createGroup',
  'agents.runCouncil',
] as const;

function openAgentsWorkspace(agentId?: string | null): void {
  const appStore = useAppStore.getState();
  const agentsStore = useAgentsStore.getState();
  appStore.openTab('agents');

  if (agentId) {
    agentsStore.setSelectedAgent(agentId);
  }
}

function resolveConversationId(payload: Record<string, unknown>): string | null {
  const agentsStore = useAgentsStore.getState();
  if (typeof payload.conversationId === 'string' && payload.conversationId.trim()) {
    return payload.conversationId;
  }
  return agentsStore.activeConversationId || null;
}

function buildAgentConfigUpdates(payload: Record<string, unknown>): Record<string, unknown> {
  const configUpdates: Record<string, unknown> = {};

  if (typeof payload.llmProvider === 'string') configUpdates.llmProvider = payload.llmProvider;
  if (typeof payload.llmModel === 'string') configUpdates.llmModel = payload.llmModel;
  if (typeof payload.systemPrompt === 'string') configUpdates.systemPrompt = payload.systemPrompt;
  if (Array.isArray(payload.enabledTools)) configUpdates.enabledTools = payload.enabledTools;
  if (Array.isArray(payload.visualTools)) configUpdates.visualTools = payload.visualTools;
  if (Array.isArray(payload.enabledSkills)) configUpdates.enabledSkills = payload.enabledSkills;
  if (Array.isArray(payload.allowedIntegrations)) configUpdates.allowedIntegrations = payload.allowedIntegrations;
  if (typeof payload.temperature === 'number') configUpdates.temperature = payload.temperature;
  if (typeof payload.maxTokens === 'number') configUpdates.maxTokens = payload.maxTokens;
  if (typeof payload.visualModeEnabled === 'boolean') configUpdates.visualModeEnabled = payload.visualModeEnabled;
  if (Array.isArray(payload.humanInTheLoopTools)) configUpdates.humanInTheLoopTools = payload.humanInTheLoopTools;
  if (payload.multimodal && typeof payload.multimodal === 'object') configUpdates.multimodal = payload.multimodal;

  return configUpdates;
}

// --------------------------------------------
// Agents Action Handler
// Deckt Chats, Agenten, Gruppen, Councils und Tasks ab.
// --------------------------------------------

export const agentsActionHandler: ActionHandler = {
  moduleId: 'agents',
  supportedActions: [...AGENTS_ACTION_IDS, ...AGENTS_LEGACY_ACTION_IDS],
  execute: async (action: AgentAction): Promise<ActionResult> => {
    const agentsStore = useAgentsStore.getState();
    const tasksStore = useScheduledTasksStore.getState();
    const configStore = useAgentConfigStore.getState();
    const integrationStore = useIntegrationStatusStore.getState();
    const payload = action.payload as Record<string, unknown>;

    try {
      switch (action.type) {
        case 'agents.conversation.create': {
          const agentId = typeof payload.agentId === 'string' ? payload.agentId : undefined;
          openAgentsWorkspace(agentId || null);
          agentsStore.createConversation(agentId);
          return { success: true };
        }

        case 'agents.conversation.delete': {
          const conversationId = resolveConversationId(payload);
          if (!conversationId) return { success: false, error: 'conversationId fehlt' };
          openAgentsWorkspace();
          agentsStore.deleteConversation(conversationId);
          return { success: true };
        }

        case 'agents.conversation.setActive': {
          const conversationId = resolveConversationId(payload);
          if (!conversationId) return { success: false, error: 'conversationId fehlt' };
          openAgentsWorkspace();
          agentsStore.setActiveConversation(conversationId);
          return { success: true };
        }

        case 'agents.conversation.rename': {
          const conversationId = resolveConversationId(payload);
          const title = typeof payload.title === 'string' ? payload.title : '';
          if (!conversationId || !title.trim()) {
            return { success: false, error: 'conversationId oder title fehlt' };
          }
          openAgentsWorkspace();
          agentsStore.updateConversationTitle(conversationId, title);
          return { success: true };
        }

        case 'agents.conversation.pinToggle': {
          const conversationId = resolveConversationId(payload);
          if (!conversationId) return { success: false, error: 'conversationId fehlt' };
          openAgentsWorkspace();
          agentsStore.togglePinConversation(conversationId);
          return { success: true };
        }

        case 'agents.message.add': {
          const conversationId = resolveConversationId(payload);
          const content = typeof payload.content === 'string' ? payload.content : '';
          const role = payload.role === 'assistant' || payload.role === 'system' ? payload.role : 'user';
          if (!conversationId || !content.trim()) {
            return { success: false, error: 'conversationId oder content fehlt' };
          }

          openAgentsWorkspace();
          agentsStore.addMessage(conversationId, {
            role,
            content,
            agentId: typeof payload.agentId === 'string' ? payload.agentId : undefined,
            agentName: typeof payload.agentName === 'string' ? payload.agentName : undefined,
            agentColor: typeof payload.agentColor === 'string' ? payload.agentColor : undefined,
          });
          return { success: true };
        }

        case 'agents.message.update': {
          const conversationId = resolveConversationId(payload);
          const messageId = typeof payload.messageId === 'string' ? payload.messageId : '';
          const updates = payload.updates && typeof payload.updates === 'object'
            ? payload.updates as Record<string, unknown>
            : {};
          if (!conversationId || !messageId.trim()) {
            return { success: false, error: 'conversationId oder messageId fehlt' };
          }
          openAgentsWorkspace();
          agentsStore.updateMessage(conversationId, messageId, updates);
          return { success: true };
        }

        case 'agents.message.delete': {
          const conversationId = resolveConversationId(payload);
          const messageId = typeof payload.messageId === 'string' ? payload.messageId : '';
          if (!conversationId || !messageId.trim()) {
            return { success: false, error: 'conversationId oder messageId fehlt' };
          }
          openAgentsWorkspace();
          agentsStore.deleteMessage(conversationId, messageId);
          return { success: true };
        }

        case 'agents.conversation.updateParticipants': {
          const conversationId = resolveConversationId(payload);
          const participants = Array.isArray(payload.participants) ? payload.participants : [];
          if (!conversationId) return { success: false, error: 'conversationId fehlt' };
          openAgentsWorkspace();
          agentsStore.updateConversationParticipants(conversationId, participants);
          return { success: true };
        }

        case 'agents.folder.create': {
          const name = typeof payload.name === 'string' ? payload.name : 'Neuer Ordner';
          const color = typeof payload.color === 'string' ? payload.color : undefined;
          openAgentsWorkspace();
          agentsStore.createFolder(name, color);
          return { success: true };
        }

        case 'agents.folder.update': {
          const folderId = typeof payload.folderId === 'string' ? payload.folderId : '';
          const updates = payload.updates && typeof payload.updates === 'object'
            ? payload.updates as Record<string, unknown>
            : {};
          if (!folderId.trim()) return { success: false, error: 'folderId fehlt' };
          openAgentsWorkspace();
          agentsStore.updateFolder(folderId, updates);
          return { success: true };
        }

        case 'agents.folder.delete': {
          const folderId = typeof payload.folderId === 'string' ? payload.folderId : '';
          if (!folderId.trim()) return { success: false, error: 'folderId fehlt' };
          openAgentsWorkspace();
          agentsStore.deleteFolder(folderId);
          return { success: true };
        }

        case 'agents.folder.moveConversation': {
          const folderId = typeof payload.folderId === 'string' ? payload.folderId : null;
          const conversationId = resolveConversationId(payload);
          if (!conversationId) return { success: false, error: 'conversationId fehlt' };
          openAgentsWorkspace();
          agentsStore.moveConversationToFolder(conversationId, folderId);
          return { success: true };
        }

        case 'agents.groupFileFolder.create':
        case 'agents.orchestration.folder.create': {
          const groupId = typeof payload.groupId === 'string' ? payload.groupId : '';
          const name = typeof payload.name === 'string' ? payload.name : 'Neuer Ordner';
          const color = typeof payload.color === 'string' ? payload.color : undefined;
          if (!groupId.trim()) return { success: false, error: 'groupId fehlt' };
          openAgentsWorkspace(groupId);
          agentsStore.createGroupFileFolder(groupId, name, color);
          return { success: true };
        }

        case 'agents.groupFile.add':
        case 'agents.orchestration.artifact.save': {
          const groupId = typeof payload.groupId === 'string' ? payload.groupId : '';
          const name = typeof payload.name === 'string' ? payload.name : 'Artefakt';
          const content = typeof payload.content === 'string' ? payload.content : '';
          const folderId = typeof payload.folderId === 'string' ? payload.folderId : null;
          if (!groupId.trim()) return { success: false, error: 'groupId fehlt' };
          openAgentsWorkspace(groupId);
          agentsStore.addGroupFile(groupId, {
            id: crypto.randomUUID(),
            name,
            type: 'text/plain',
            size: content.length,
            content,
          }, folderId);
          return { success: true };
        }

        case 'agents.groupFile.move': {
          const fileId = typeof payload.fileId === 'string' ? payload.fileId : '';
          const folderId = typeof payload.folderId === 'string' ? payload.folderId : null;
          if (!fileId.trim()) return { success: false, error: 'fileId fehlt' };
          openAgentsWorkspace();
          agentsStore.moveGroupFileToFolder(fileId, folderId);
          return { success: true };
        }

        case 'agents.groupFile.delete': {
          const fileId = typeof payload.fileId === 'string' ? payload.fileId : '';
          if (!fileId.trim()) return { success: false, error: 'fileId fehlt' };
          openAgentsWorkspace();
          agentsStore.deleteGroupFile(fileId);
          return { success: true };
        }

        case 'agents.orchestration.artifact.update': {
          const artifactId = typeof payload.artifactId === 'string' ? payload.artifactId : '';
          const content = typeof payload.content === 'string' ? payload.content : '';
          if (!artifactId.trim()) return { success: false, error: 'artifactId fehlt' };
          openAgentsWorkspace();
          useAgentsStore.setState((state) => ({
            groupFiles: state.groupFiles.map((file) =>
              file.id === artifactId
                ? {
                    ...file,
                    content,
                    size: content.length,
                  }
                : file
            ),
          }));
          return { success: true };
        }

        case 'agents.groupMainConversation.ensure': {
          const groupId = typeof payload.groupId === 'string' ? payload.groupId : '';
          if (!groupId.trim()) return { success: false, error: 'groupId fehlt' };
          openAgentsWorkspace(groupId);
          agentsStore.ensureGroupMainConversation(groupId);
          return { success: true };
        }

        case 'agents.groupParticipantChats.ensure': {
          const groupId = typeof payload.groupId === 'string' ? payload.groupId : '';
          if (!groupId.trim()) return { success: false, error: 'groupId fehlt' };
          openAgentsWorkspace(groupId);
          agentsStore.ensureGroupParticipantChats(groupId);
          return { success: true };
        }

        case 'agents.agent.select': {
          const agentId = typeof payload.agentId === 'string' ? payload.agentId : '';
          if (!agentId.trim()) return { success: false, error: 'agentId fehlt' };
          openAgentsWorkspace(agentId);
          agentsStore.setSelectedAgent(agentId);
          return { success: true };
        }

        case 'agents.agent.createCustom':
        case 'agents.createAgent': {
          const name = typeof payload.name === 'string' ? payload.name : 'Neuer Agent';
          const description = typeof payload.description === 'string' ? payload.description : '';
          const icon = typeof payload.icon === 'string' ? payload.icon : 'Bot';
          const color = typeof payload.color === 'string' ? payload.color : '#8B5CF6';
          const parentAgentId = typeof payload.parentAgentId === 'string' ? payload.parentAgentId : undefined;
          openAgentsWorkspace(parentAgentId || null);
          const agentId = agentsStore.createCustomAgent(name, description, icon, color, parentAgentId);
          const configUpdates = buildAgentConfigUpdates(payload);
          if (Object.keys(configUpdates).length > 0) {
            configStore.updateConfig(agentId, configUpdates);
          }
          return { success: true };
        }

        case 'agents.agent.updateCustom':
        case 'agents.updateAgent': {
          const agentId = typeof payload.agentId === 'string' ? payload.agentId : '';
          if (!agentId.trim()) return { success: false, error: 'agentId fehlt' };
          openAgentsWorkspace(agentId);
          agentsStore.updateCustomAgent(agentId, {
            name: typeof payload.name === 'string' ? payload.name : undefined,
            description: typeof payload.description === 'string' ? payload.description : undefined,
            icon: typeof payload.icon === 'string' ? payload.icon : undefined,
            color: typeof payload.color === 'string' ? payload.color : undefined,
            parentAgentId: typeof payload.parentAgentId === 'string' ? payload.parentAgentId : undefined,
          });
          const configUpdates = buildAgentConfigUpdates(payload);
          if (Object.keys(configUpdates).length > 0) {
            configStore.updateConfig(agentId, configUpdates);
          }
          return { success: true };
        }

        case 'agents.agent.deleteCustom':
        case 'agents.deleteAgent': {
          const agentId = typeof payload.agentId === 'string' ? payload.agentId : '';
          if (!agentId.trim()) return { success: false, error: 'agentId fehlt' };
          openAgentsWorkspace();
          agentsStore.deleteCustomAgent(agentId);
          return { success: true };
        }

        case 'agents.group.create':
        case 'agents.createGroup': {
          const name = typeof payload.name === 'string' ? payload.name : 'Neue Gruppe';
          const participants = Array.isArray(payload.participants) ? payload.participants : [];
          const adminAgentId =
            typeof payload.adminAgentId === 'string'
              ? payload.adminAgentId
              : (participants[0] && typeof participants[0] === 'object' && participants[0] && 'agentId' in participants[0]
                  ? String((participants[0] as { agentId: string }).agentId)
                  : '');
          const parentAgentId = typeof payload.parentAgentId === 'string' ? payload.parentAgentId : undefined;
          if (!adminAgentId.trim()) return { success: false, error: 'adminAgentId fehlt' };
          openAgentsWorkspace(parentAgentId || null);
          agentsStore.createGroupAgent(name, participants, adminAgentId, parentAgentId);
          return { success: true };
        }

        case 'agents.group.update': {
          const groupId = typeof payload.groupId === 'string' ? payload.groupId : '';
          const updates = payload.updates && typeof payload.updates === 'object'
            ? payload.updates as Record<string, unknown>
            : payload;
          if (!groupId.trim()) return { success: false, error: 'groupId fehlt' };
          openAgentsWorkspace(groupId);
          agentsStore.updateGroupAgent(groupId, updates);
          return { success: true };
        }

        case 'agents.breakout.create':
        case 'agents.orchestration.breakout.create': {
          const parentGroupId =
            typeof payload.parentGroupId === 'string'
              ? payload.parentGroupId
              : (typeof payload.groupId === 'string' ? payload.groupId : '');
          const name = typeof payload.name === 'string' ? payload.name : 'Breakout Session';
          const participants = Array.isArray(payload.participants) ? payload.participants : [];
          if (!parentGroupId.trim()) return { success: false, error: 'groupId fehlt' };
          openAgentsWorkspace(parentGroupId);
          agentsStore.createBreakoutSession(parentGroupId, name, participants);
          return { success: true };
        }

        case 'agents.breakout.upsert': {
          const session = payload.session && typeof payload.session === 'object'
            ? payload.session as Parameters<typeof agentsStore.upsertBreakoutSession>[0]
            : payload as Parameters<typeof agentsStore.upsertBreakoutSession>[0];
          if (!session?.parentGroupId) return { success: false, error: 'Breakout-Session fehlt' };
          openAgentsWorkspace(session.parentGroupId);
          agentsStore.upsertBreakoutSession(session);
          return { success: true };
        }

        case 'agents.agent.createOrchestrated': {
          const draftSource = payload.draft && typeof payload.draft === 'object'
            ? payload.draft
            : payload;
          const draft = draftSource as unknown as Parameters<typeof agentsStore.createOrchestratedAgent>[0];
          if (!draft?.name?.trim()) return { success: false, error: 'Agent-Draft fehlt' };
          openAgentsWorkspace(draft.parentAgentId || draft.targetGroupId || null);
          agentsStore.createOrchestratedAgent(draft);
          return { success: true };
        }

        case 'agents.council.draft.create': {
          openAgentsWorkspace();
          agentsStore.createCouncilDraft();
          return { success: true };
        }

        case 'agents.council.open': {
          const councilId = typeof payload.councilId === 'string' ? payload.councilId : '';
          if (!councilId.trim()) return { success: false, error: 'councilId is required' };
          openAgentsWorkspace();
          agentsStore.openCouncil(councilId);
          return { success: true };
        }

        case 'agents.council.sync': {
          openAgentsWorkspace();
          agentsStore.syncActiveCouncilDraft();
          return { success: true };
        }

        case 'agents.council.persist': {
          openAgentsWorkspace();
          agentsStore.persistActiveCouncilDraft();
          return { success: true };
        }

        case 'agents.council.delete': {
          const councilId = typeof payload.councilId === 'string' ? payload.councilId : '';
          if (!councilId.trim()) return { success: false, error: 'councilId is required' };
          openAgentsWorkspace();
          agentsStore.deleteCouncil(councilId);
          return { success: true };
        }

        case 'agents.council.seat.upsert': {
          const member = payload.member && typeof payload.member === 'object'
            ? payload.member as Parameters<typeof agentsStore.upsertActiveCouncilSeatMember>[0]
            : payload as Parameters<typeof agentsStore.upsertActiveCouncilSeatMember>[0];
          if (!member?.seatId) return { success: false, error: 'council member payload is missing' };
          openAgentsWorkspace();
          agentsStore.upsertActiveCouncilSeatMember(member);
          return { success: true };
        }

        case 'agents.council.seat.remove': {
          const seatId = typeof payload.seatId === 'string' ? payload.seatId : '';
          if (!seatId.trim()) return { success: false, error: 'seatId fehlt' };
          openAgentsWorkspace();
          agentsStore.removeActiveCouncilSeatMember(seatId);
          return { success: true };
        }

        case 'agents.council.mainMessage.add': {
          const content = typeof payload.content === 'string' ? payload.content : '';
          if (!content.trim()) return { success: false, error: 'content fehlt' };
          openAgentsWorkspace();
          agentsStore.addCouncilMainMessage({
            role: payload.role === 'assistant' ? 'assistant' : 'user',
            content,
          });
          return { success: true };
        }

        case 'agents.council.mainMessage.update': {
          const messageId = typeof payload.messageId === 'string' ? payload.messageId : '';
          const updates = payload.updates && typeof payload.updates === 'object'
            ? payload.updates as Record<string, unknown>
            : {};
          if (!messageId.trim()) return { success: false, error: 'messageId fehlt' };
          openAgentsWorkspace();
          agentsStore.updateCouncilMainMessage(messageId, updates);
          return { success: true };
        }

        case 'agents.council.mainMessage.clear': {
          openAgentsWorkspace();
          agentsStore.clearCouncilMainMessages();
          return { success: true };
        }

        case 'agents.council.memberMessage.add': {
          const seatId = typeof payload.seatId === 'string' ? payload.seatId : '';
          const content = typeof payload.content === 'string' ? payload.content : '';
          if (!seatId.trim() || !content.trim()) {
            return { success: false, error: 'seatId oder content fehlt' };
          }
          openAgentsWorkspace();
          agentsStore.addCouncilMemberMessage(seatId, {
            role: payload.role === 'user' ? 'user' : 'assistant',
            content,
          });
          return { success: true };
        }

        case 'agents.council.memberMessage.update': {
          const seatId = typeof payload.seatId === 'string' ? payload.seatId : '';
          const messageId = typeof payload.messageId === 'string' ? payload.messageId : '';
          const updates = payload.updates && typeof payload.updates === 'object'
            ? payload.updates as Record<string, unknown>
            : {};
          if (!seatId.trim() || !messageId.trim()) {
            return { success: false, error: 'seatId oder messageId fehlt' };
          }
          openAgentsWorkspace();
          agentsStore.updateCouncilMemberMessage(seatId, messageId, updates);
          return { success: true };
        }

        case 'agents.council.memberMessage.clear': {
          const seatId = typeof payload.seatId === 'string' ? payload.seatId : '';
          if (!seatId.trim()) return { success: false, error: 'seatId fehlt' };
          openAgentsWorkspace();
          agentsStore.clearCouncilMemberMessages(seatId);
          return { success: true };
        }

        case 'agents.council.run':
        case 'agents.runCouncil': {
          const prompt = typeof payload.prompt === 'string' ? payload.prompt : '';
          if (!prompt.trim()) return { success: false, error: 'prompt fehlt' };
          openAgentsWorkspace();
          await agentsStore.runCouncilPrompt(
            prompt,
            Array.isArray(payload.images) ? payload.images : undefined,
            Array.isArray(payload.files) ? payload.files : undefined
          );
          return { success: true };
        }

        case 'agents.council.abortAndReset': {
          openAgentsWorkspace();
          agentsStore.abortAndResetCouncilRun();
          return { success: true };
        }

        case 'agents.objective.add':
        case 'agents.orchestration.task.delegate': {
          const groupId = typeof payload.groupId === 'string' ? payload.groupId : '';
          if (!groupId.trim()) return { success: false, error: 'groupId fehlt' };
          openAgentsWorkspace(groupId);
          agentsStore.addGroupObjective(groupId, {
            groupId,
            title: typeof payload.title === 'string'
              ? payload.title
              : (typeof payload.task === 'string' ? payload.task : 'Neues Ziel'),
            description: typeof payload.description === 'string'
              ? payload.description
              : (typeof payload.task === 'string' ? payload.task : ''),
            type: payload.type === 'long-term' ? 'long-term' : 'short-term',
            status: payload.status === 'completed' ? 'completed' : 'planned',
            priority: payload.priority === 'critical' || payload.priority === 'high' || payload.priority === 'low'
              ? payload.priority
              : 'medium',
            assignedAgentIds: typeof payload.assigneeId === 'string' ? [payload.assigneeId] : undefined,
          });
          return { success: true };
        }

        case 'agents.objective.update': {
          const objectiveId = typeof payload.objectiveId === 'string' ? payload.objectiveId : '';
          const updates = payload.updates && typeof payload.updates === 'object'
            ? payload.updates as Record<string, unknown>
            : {};
          if (!objectiveId.trim()) return { success: false, error: 'objectiveId fehlt' };
          openAgentsWorkspace();
          agentsStore.updateGroupObjective(objectiveId, updates);
          return { success: true };
        }

        case 'agents.objective.delete': {
          const objectiveId = typeof payload.objectiveId === 'string' ? payload.objectiveId : '';
          if (!objectiveId.trim()) return { success: false, error: 'objectiveId fehlt' };
          openAgentsWorkspace();
          agentsStore.deleteGroupObjective(objectiveId);
          return { success: true };
        }

        case 'agents.orchestration.mode.change': {
          const groupId = typeof payload.groupId === 'string' ? payload.groupId : '';
          const mode = typeof payload.mode === 'string' ? payload.mode : 'planning';
          if (!groupId.trim()) return { success: false, error: 'groupId fehlt' };
          openAgentsWorkspace(groupId);
          useAppStore.getState().setActiveTool(`group-mode:${mode}`);
          agentsStore.setAgentModeEnabled(true);
          return { success: true };
        }

        case 'agents.task.create': {
          const targetId = typeof payload.targetId === 'string' ? payload.targetId : 'master';
          openAgentsWorkspace(targetId);
          tasksStore.createTask(targetId);
          return { success: true };
        }

        case 'agents.task.update': {
          const taskId = typeof payload.taskId === 'string' ? payload.taskId : '';
          const updates = payload.updates && typeof payload.updates === 'object'
            ? payload.updates as Record<string, unknown>
            : {};
          if (!taskId.trim()) return { success: false, error: 'taskId fehlt' };
          openAgentsWorkspace();
          tasksStore.updateTask(taskId, updates);
          return { success: true };
        }

        case 'agents.task.toggleEnabled': {
          const taskId = typeof payload.taskId === 'string' ? payload.taskId : '';
          if (!taskId.trim()) return { success: false, error: 'taskId fehlt' };
          openAgentsWorkspace();
          tasksStore.toggleTaskEnabled(taskId);
          return { success: true };
        }

        case 'agents.task.runNow': {
          const taskId = typeof payload.taskId === 'string' ? payload.taskId : '';
          if (!taskId.trim()) return { success: false, error: 'taskId fehlt' };
          openAgentsWorkspace();
          tasksStore.runTaskNow(taskId);
          return { success: true };
        }

        case 'agents.task.duplicate': {
          const taskId = typeof payload.taskId === 'string' ? payload.taskId : '';
          if (!taskId.trim()) return { success: false, error: 'taskId fehlt' };
          openAgentsWorkspace();
          tasksStore.duplicateTask(taskId);
          return { success: true };
        }

        case 'agents.task.delete': {
          const taskId = typeof payload.taskId === 'string' ? payload.taskId : '';
          if (!taskId.trim()) return { success: false, error: 'taskId fehlt' };
          openAgentsWorkspace();
          tasksStore.deleteTask(taskId);
          return { success: true };
        }

        case 'agents.settings.model.set':
        case 'agents.settings.prompt.set':
        case 'agents.settings.tools.enableDisable':
        case 'agents.settings.skills.enableDisable':
        case 'agents.settings.integrations.allowDeny':
        case 'agents.settings.humanInLoop.set':
        case 'agents.settings.multimodal.set': {
          const agentId = typeof payload.agentId === 'string' ? payload.agentId : '';
          if (!agentId.trim()) return { success: false, error: 'agentId fehlt' };
          openAgentsWorkspace(agentId);
          const updates = payload.updates && typeof payload.updates === 'object'
            ? payload.updates as Record<string, unknown>
            : payload;
          configStore.updateConfig(agentId, buildAgentConfigUpdates(updates));
          return { success: true };
        }

        case 'agents.integration.status.refresh': {
          openAgentsWorkspace();
          await integrationStore.refreshIntegrationStatuses();
          return { success: true };
        }

        case 'agents.analytics.usage.get':
        case 'agents.analytics.conversationSummary.get':
        case 'agents.memory.save':
        case 'agents.memory.recall':
        case 'agents.memory.list':
          openAgentsWorkspace(typeof payload.agentId === 'string' ? payload.agentId : null);
          return { success: true };

        default:
          openAgentsWorkspace();
          return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Agents-Aktion fehlgeschlagen',
      };
    }
  },
};
