// ============================================
// store.ts - Agents State Management
// 
// Zweck: Verwaltet alle Agent-Daten (Conversations, Messages, Folders,
//        Agent-Auswahl, UI-State) mit Zustand und localStorage
// Verwendet von: AgentsPage.tsx, Sidebars, ChatBar, etc.
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AgentsStore,
  BreakoutSessionData,
  ChatConversation,
  ChatMessageData,
  ChatFolderData,
  CouncilData,
  CouncilRunData,
  CouncilSeatMemberData,
  CustomAgentData,
  GroupChatParticipantRole,
  GroupFileFolderData,
  GroupFileData,
  GroupObjective,
} from './types';
import { DEFAULT_CONVERSATION_TITLE, MAX_CONVERSATIONS } from './constants';
import {
  DEFAULT_AGENT_CONFIG,
  createDefaultAgentMultimodalConfig,
  useAgentConfigStore,
  type AgentConfig,
} from '@/lib/agent/stores/agent-config-store';
import { useAgentsSpatialStore } from './spatial-store';
import {
  buildAnonymizedCouncilOpinions,
  buildCouncilFinalSystemPrompt,
  buildCouncilFinalUserPrompt,
  buildCouncilFirstOpinionSystemPrompt,
  buildCouncilReviewSystemPrompt,
  buildCouncilReviewUserPrompt,
  ensureCouncilFinalResponsePrefix,
  executeCouncilCompletionStream,
  mapCouncilMessagesForApi,
  serializeCouncilPrompt,
} from './council-runtime';
import { stripTransientAttachmentFieldsFromMessages } from './lib/chat-attachments';

type CouncilRunSnapshot = {
  draftId: string | null;
  mainMessages: ChatMessageData[];
  memberMessages: Record<string, ChatMessageData[]>;
  runs: CouncilRunData[];
};

let activeCouncilRunAbortController: AbortController | null = null;
let activeCouncilRunSnapshot: CouncilRunSnapshot | null = null;

// --------------------------------------------
// Standard-Council-Member
// Der mittlere Chair bleibt immer initial belegt.
// --------------------------------------------

function createDefaultCouncilSeatMembers(): CouncilSeatMemberData[] {
  const now = Date.now();

  return [
    {
      seatId: 'chair-center',
      name: 'Council Eldest',
      color: '#f8cd4f',
      model: DEFAULT_AGENT_CONFIG.llmModel,
      role: 'Council Eldest',
      rolePrompt:
        'You are the council eldest. You sit in the central chair, structure the discussion, and guide the other voices toward a clear decision.',
      sourceAgentId: null,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

// --------------------------------------------
// Council-Helfer
// Gemeinsame Message-/Run-Bausteine fuer den
// Council-Orchestrator im Store.
// --------------------------------------------

function createCouncilMessage(
  message: Omit<ChatMessageData, 'id' | 'timestamp'>
): ChatMessageData {
  return {
    ...message,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
}

function createEmptyCouncilRunData(
  councilId: string | null,
  councilName: string,
  prompt: string,
): CouncilRunData {
  const now = Date.now();

  return {
    id: `council-run-${crypto.randomUUID()}`,
    councilId,
    councilName,
    prompt,
    stage: 'first-opinions',
    firstOpinions: {},
    reviews: {},
    finalResponse: '',
    error: null,
    createdAt: now,
    updatedAt: now,
  };
}

// --------------------------------------------
// Council-Run sauber aufraeumen
// Stoppt aktive Orb-/Bubble-Zustaende im Spatial-Raum.
// --------------------------------------------

function resetCouncilSpatialRunUi() {
  useAgentsSpatialStore.setState({
    speakingCouncilSeatId: null,
    openCouncilSpeechBubbleIds: {},
    openCouncilChatMemberId: null,
  });
}

// --------------------------------------------
// Council-Namen normalisieren
// Wenn ein Name gesetzt ist, haengen wir genau ein
// "Council" an und vermeiden doppelte Suffixe.
// --------------------------------------------

function normalizeCouncilName(name: string): string {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return '';
  }

  return /(?:\s|^)council$/i.test(trimmedName)
    ? trimmedName
    : `${trimmedName} Council`;
}

function sanitizeConversationMessages(conversations: ChatConversation[] | undefined): ChatConversation[] {
  return (conversations || []).map((conversation) => ({
    ...conversation,
    messages: stripTransientAttachmentFieldsFromMessages(conversation.messages || []).map((message) => ({
      ...message,
      isStreaming: false,
    })),
  }));
}

function sanitizeCouncilDraftMessages(
  memberMessages: Record<string, ChatMessageData[]> | undefined,
): Record<string, ChatMessageData[]> {
  return Object.fromEntries(
    Object.entries(memberMessages || {}).map(([key, messages]) => [
      key,
      stripTransientAttachmentFieldsFromMessages(messages || []).map((message) => ({
        ...message,
        isStreaming: false,
      })),
    ]),
  );
}

// --------------------------------------------
// Council-Sitzreihenfolge fuer Deliberation
// Die Debatte soll sichtbar von links nach rechts laufen.
// --------------------------------------------

function getCouncilSeatOrderRank(seatId: string): number {
  if (seatId === 'chair-center') return 0;

  const leftExtraMatch = seatId.match(/^arc-left-extra-(\d+)$/);
  if (leftExtraMatch) {
    return -100 - Number(leftExtraMatch[1]);
  }

  const rightExtraMatch = seatId.match(/^arc-right-extra-(\d+)$/);
  if (rightExtraMatch) {
    return 100 + Number(rightExtraMatch[1]);
  }

  if (seatId === 'arc-left-1') return -10;
  if (seatId === 'arc-left-0') return -1;
  if (seatId === 'arc-right-0') return 1;
  if (seatId === 'arc-right-1') return 10;

  return 999;
}

// --------------------------------------------
// Agents Store erstellen
// Verwaltet Conversations, Messages, Folders, Agent-Auswahl
// --------------------------------------------

export const useAgentsStore = create<AgentsStore>()(
  persist(
    (set, get) => ({
      // ----------------------------------------
      // Initial State
      // Startwerte für das Agents-Modul
      // ----------------------------------------
      
      conversations: [],
      folders: [],
      groupFileFolders: [],
      groupFiles: [],
      customAgents: [],
      breakoutSessions: [],
      groupObjectives: [],
      groupSessionSummaries: [],
      councils: [],
      activeCouncilDraftId: null,
      activeCouncilDraftName: '',
      activeCouncilDraftSeatMembers: createDefaultCouncilSeatMembers(),
      activeCouncilDraftMemberMessages: {},
      activeCouncilDraftMainMessages: [],
      activeCouncilDraftRuns: [],
      activeCouncilStage: 'idle',
      activeCouncilStageLabel: '',
      activeCouncilIsRunning: false,
      activeConversationId: null,
      selectedAgentId: null,           // Standard: keine Auswahl
      isLoading: false,
      agentSidebarCollapsed: false,    // Agent-Sidebar sichtbar
      historySidebarCollapsed: true,   // History-Sidebar erst nach Auswahl sichtbar
      webResearchEnabled: false,
      deepResearchEnabled: false,
      agentModeEnabled: false,

      // ----------------------------------------
      // Conversation Management Actions
      // Erstellen, Löschen, Aktualisieren von Konversationen
      // ----------------------------------------

      // Neue Konversation erstellen
      // Parameter: agentId - Optional: Welcher Agent? (Default: aktueller Agent)
      // Rückgabe: ID der neuen Konversation
      createConversation: (agentId) => {
        const state = get();
        const targetAgentId = agentId || state.selectedAgentId || 'master';
        const targetCustomAgent = state.customAgents.find((customAgent) => customAgent.id === targetAgentId);
        const isGroupAgent = targetCustomAgent?.type === 'group';

        // Gruppen: Zum bestehenden Hauptchat (Gruppenchat) weiterleiten
        // Einzelchats (groupParticipantChatId) werden separat erstellt
        if (isGroupAgent) {
          const existingMainConversation = state.conversations.find(
            (conversation) =>
              conversation.agentId === targetAgentId && !conversation.groupParticipantChatId
          );
          if (existingMainConversation) {
            set({ activeConversationId: existingMainConversation.id });
            return existingMainConversation.id;
          }
        }
        
        // Prüfen ob maximale Anzahl erreicht
        if (state.conversations.length >= MAX_CONVERSATIONS) {
          // Älteste nicht-angepinnte Konversation entfernen
          const unpinned = [...state.conversations]
            .filter(c => !c.isPinned)
            .sort((a, b) => a.createdAt - b.createdAt);
          if (unpinned.length > 0) {
            get().deleteConversation(unpinned[0].id);
          }
        }

        // Neue Konversation erstellen
        const newConversation: ChatConversation = {
          id: crypto.randomUUID(),
          title: DEFAULT_CONVERSATION_TITLE,
          messages: [],
          folderId: null,
          agentId: targetAgentId,
          isGroupChat: isGroupAgent,
          participantRoles: isGroupAgent ? targetCustomAgent?.participantRoles || [] : undefined,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        // Gruppenchats bekommen den festen Gruppenchat-Titel
        if (isGroupAgent) {
          newConversation.title = 'Gruppenchat';
        }

        // Konversation zum Array hinzufügen und als aktiv setzen
        set({
          conversations: [newConversation, ...state.conversations],
          activeConversationId: newConversation.id,
        });

        return newConversation.id;
      },

      // Konversation löschen
      deleteConversation: (conversationId) => {
        const state = get();
        const conversationToDelete = state.conversations.find((conversation) => conversation.id === conversationId);
        if (!conversationToDelete) return;

        // Gruppen-Hauptchat (ohne groupParticipantChatId) nicht löschen
        const customAgent = state.customAgents.find((agent) => agent.id === conversationToDelete.agentId);
        if (customAgent?.type === 'group' && !conversationToDelete.groupParticipantChatId) {
          return;
        }
        
        const newConversations = state.conversations.filter(conv => conv.id !== conversationId);
        
        // Wenn die gelöschte Konversation aktiv war, nächste setzen
        let newActiveConversationId = state.activeConversationId;
        if (state.activeConversationId === conversationId) {
          newActiveConversationId = newConversations.length > 0 ? newConversations[0].id : null;
        }

        // Konversation aus allen Ordnern entfernen
        const updatedFolders = state.folders.map(folder => ({
          ...folder,
          conversationIds: folder.conversationIds.filter(id => id !== conversationId),
        }));

        set({
          conversations: newConversations,
          activeConversationId: newActiveConversationId,
          folders: updatedFolders,
        });
      },

      // Aktive Konversation setzen
      setActiveConversation: (conversationId) => {
        set((state) => ({
          activeConversationId: conversationId,
          conversations: state.conversations.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  unreadCount: 0,
                }
              : conversation
          ),
        }));
      },

      // Titel einer Konversation aktualisieren
      updateConversationTitle: (conversationId, title) => {
        set((state) => {
          const conversation = state.conversations.find((conv) => conv.id === conversationId);
          if (!conversation) return {};

          // Gruppen-Hauptchat bleibt bewusst fix benannt
          const isGroupConversation = state.customAgents.some(
            (agent) => agent.id === conversation.agentId && agent.type === 'group'
          );
          if (isGroupConversation) {
            return {};
          }

          return {
            conversations: state.conversations.map(conv =>
              conv.id === conversationId
                ? { ...conv, title, updatedAt: Date.now() }
                : conv
            ),
          };
        });
      },

      // Teilnehmer einer Konversation aktualisieren (ad-hoc Multi-Agent Chat)
      // Caller ist dafür verantwortlich, nur gültige Teilnehmer zu übergeben
      updateConversationParticipants: (conversationId, participants) => {
        set((state) => ({
          conversations: state.conversations.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  isGroupChat: participants.length > 0,
                  participantRoles: participants.length > 0 ? participants : undefined,
                  updatedAt: Date.now(),
                }
              : conversation
          ),
        }));
      },

      // Konversation anpinnen/entpinnen
      togglePinConversation: (conversationId) => {
        set((state) => ({
          conversations: state.conversations.map(conv =>
            conv.id === conversationId
              ? { ...conv, isPinned: !conv.isPinned, updatedAt: Date.now() }
              : conv
          ),
        }));
      },

      // ----------------------------------------
      // Message Management Actions
      // Nachrichten hinzufügen, aktualisieren, löschen
      // ----------------------------------------

      // Nachricht zu einer Konversation hinzufügen
      // Gibt die generierte Message-ID zurück (für Streaming-Updates)
      addMessage: (conversationId, message) => {
        const state = get();
        const conversation = state.conversations.find(conv => conv.id === conversationId);
        if (!conversation) return '';

        // Neue Nachricht erstellen
        const newMessage: ChatMessageData = {
          ...message,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        };

        // Nachricht zur Konversation hinzufügen
        // Titel bleibt "Neuer Chat" – wird erst nach ein paar Nachrichten
        // automatisch via LLM generiert (siehe AgentsPage.tsx)
        const updatedConversations = state.conversations.map(conv => {
          if (conv.id === conversationId) {
            // Token-Approximation aktualisieren
            const msgTokens = Math.ceil(message.content.length / 4);
            const totalTokens = (conv.totalTokens || 0) + msgTokens;
            const isParticipantPrivateChat = Boolean(conv.groupParticipantChatId);
            const isTrackedPrivateAssistantMessage = isParticipantPrivateChat
              && message.role === 'assistant'
              && (message.privateMessageKind === 'message' || message.privateMessageKind === 'clarification');
            const unreadCount = isTrackedPrivateAssistantMessage
              ? (state.activeConversationId === conversationId ? 0 : (conv.unreadCount || 0) + 1)
              : message.role === 'user' && isParticipantPrivateChat
                ? 0
                : conv.unreadCount;
            const requiresPrivateReply = isParticipantPrivateChat
              ? message.role === 'assistant' && message.privateMessageKind === 'clarification'
                ? true
                : message.role === 'user'
                  ? false
                  : conv.requiresPrivateReply
              : conv.requiresPrivateReply;
            const lastPrivateMessageAt = isTrackedPrivateAssistantMessage
              ? Date.now()
              : conv.lastPrivateMessageAt;
            const lastPrivateMessageKind = isTrackedPrivateAssistantMessage
              ? message.privateMessageKind
              : conv.lastPrivateMessageKind;

            return {
              ...conv,
              messages: [...conv.messages, newMessage],
              updatedAt: Date.now(),
              totalTokens,
              unreadCount,
              requiresPrivateReply,
              lastPrivateMessageAt,
              lastPrivateMessageKind,
            };
          }
          return conv;
        });

        set({ conversations: updatedConversations });
        return newMessage.id;
      },

      // Nachricht aktualisieren (z.B. für Streaming oder Token-Counts)
      updateMessage: (conversationId, messageId, updates) => {
        set((state) => ({
          conversations: state.conversations.map(conv =>
            conv.id === conversationId
              ? {
                  ...conv,
                  messages: conv.messages.map(msg =>
                    msg.id === messageId ? { ...msg, ...updates } : msg
                  ),
                  updatedAt: Date.now(),
                }
              : conv
          ),
        }));
      },

      clearConversationMessages: (conversationId) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  messages: [],
                  totalTokens: 0,
                  unreadCount: 0,
                  requiresPrivateReply: false,
                  lastPrivateMessageAt: undefined,
                  lastPrivateMessageKind: undefined,
                  updatedAt: Date.now(),
                }
              : conv
          ),
        }));
      },

      // Nachricht aus einer Konversation löschen
      deleteMessage: (conversationId, messageId) => {
        set((state) => ({
          conversations: state.conversations.map(conv =>
            conv.id === conversationId
              ? {
                  ...conv,
                  messages: conv.messages.filter(msg => msg.id !== messageId),
                  updatedAt: Date.now(),
                }
              : conv
          ),
        }));
      },

      // ----------------------------------------
      // Folder Management Actions
      // Ordner erstellen, löschen, aktualisieren
      // ----------------------------------------

      createFolder: (name, color) => {
        const state = get();
        const newFolder: ChatFolderData = {
          id: crypto.randomUUID(),
          name,
          color,
          agentId: state.selectedAgentId || 'master',
          conversationIds: [],
          createdAt: Date.now(),
        };

        set((state) => ({
          folders: [...state.folders, newFolder],
        }));

        return newFolder.id;
      },

      deleteFolder: (folderId) => {
        set((state) => {
          const updatedConversations = state.conversations.map(conv =>
            conv.folderId === folderId ? { ...conv, folderId: null } : conv
          );

          return {
            conversations: updatedConversations,
            folders: state.folders.filter(folder => folder.id !== folderId),
          };
        });
      },

      updateFolder: (folderId, updates) => {
        set((state) => ({
          folders: state.folders.map(folder =>
            folder.id === folderId ? { ...folder, ...updates } : folder
          ),
        }));
      },

      moveConversationToFolder: (conversationId, folderId) => {
        set((state) => {
          const updatedConversations = state.conversations.map(conv =>
            conv.id === conversationId ? { ...conv, folderId } : conv
          );

          const updatedFolders = state.folders.map(folder => {
            const conversationIds = folder.conversationIds.filter(id => id !== conversationId);
            
            if (folderId === folder.id) {
              return {
                ...folder,
                conversationIds: [...conversationIds, conversationId],
              };
            }
            
            return { ...folder, conversationIds };
          });

          return {
            conversations: updatedConversations,
            folders: updatedFolders,
          };
        });
      },

      createGroupFileFolder: (groupId, name, color) => {
        const newFolder: GroupFileFolderData = {
          id: crypto.randomUUID(),
          groupId,
          name: name.trim(),
          color,
          createdAt: Date.now(),
        };

        set((state) => ({
          groupFileFolders: [...state.groupFileFolders, newFolder],
        }));

        return newFolder.id;
      },

      addGroupFile: (groupId, file, folderId = null) => {
        const newGroupFile: GroupFileData = {
          ...file,
          id: file.id || crypto.randomUUID(),
          groupId,
          folderId,
          createdAt: Date.now(),
        };

        set((state) => ({
          groupFiles: [...state.groupFiles, newGroupFile],
        }));

        return newGroupFile.id;
      },

      moveGroupFileToFolder: (fileId, folderId) => {
        set((state) => ({
          groupFiles: state.groupFiles.map((file) =>
            file.id === fileId ? { ...file, folderId } : file
          ),
        }));
      },

      deleteGroupFile: (fileId) => {
        set((state) => ({
          groupFiles: state.groupFiles.filter((file) => file.id !== fileId),
        }));
      },

      ensureGroupMainConversation: (groupAgentId) => {
        const state = get();
        const groupAgent = state.customAgents.find(
          (customAgent) => customAgent.id === groupAgentId && customAgent.type === 'group'
        );
        if (!groupAgent) {
          return '';
        }

        // Nur den Hauptchat (ohne groupParticipantChatId) suchen
        const existingMainConversation = state.conversations.find(
          (conversation) =>
            conversation.agentId === groupAgentId && !conversation.groupParticipantChatId
        );
        if (existingMainConversation) {
          if (state.activeConversationId !== existingMainConversation.id) {
            set({ activeConversationId: existingMainConversation.id });
          }
          return existingMainConversation.id;
        }

        const mainConversation: ChatConversation = {
          id: crypto.randomUUID(),
          title: 'Gruppenchat',
          messages: [],
          folderId: null,
          agentId: groupAgentId,
          isGroupChat: true,
          participantRoles: groupAgent.participantRoles || [],
          unreadCount: 0,
          requiresPrivateReply: false,
          lastPrivateMessageAt: undefined,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set({
          conversations: [mainConversation, ...state.conversations],
          activeConversationId: mainConversation.id,
        });

        return mainConversation.id;
      },

      // ----------------------------------------
      // Einzelchats mit jedem Gruppenteilnehmer sicherstellen
      // Erstellt pro Teilnehmer einen 1:1-Chat innerhalb der Gruppe
      // ----------------------------------------
      ensureGroupParticipantChats: (groupAgentId) => {
        const state = get();
        const groupAgent = state.customAgents.find(
          (customAgent) => customAgent.id === groupAgentId && customAgent.type === 'group'
        );
        if (!groupAgent || !groupAgent.participantRoles?.length) return;

        // Bestehende Einzelchats für diese Gruppe sammeln
        const existingParticipantChatIds = new Set(
          state.conversations
            .filter(
              (conversation) =>
                conversation.agentId === groupAgentId && conversation.groupParticipantChatId
            )
            .map((conversation) => conversation.groupParticipantChatId!)
        );

        // Fehlende Einzelchats erstellen
        const newChats: ChatConversation[] = [];
        for (const participant of groupAgent.participantRoles) {
          if (existingParticipantChatIds.has(participant.agentId)) continue;

          // Teilnehmernamen auflösen (Custom-Agent oder System-Agent)
          const SYSTEM_AGENT_NAMES: Record<string, string> = {
            master: 'Intelligence',
            calendar: 'Kalender',
            inbox: 'Inbox',
            lab: 'Lab',
          };
          const customAgent = state.customAgents.find((a) => a.id === participant.agentId);
          const participantName = customAgent?.name
            || SYSTEM_AGENT_NAMES[participant.agentId]
            || participant.agentId;

          newChats.push({
            id: crypto.randomUUID(),
            title: participantName,
            messages: [],
            folderId: null,
            agentId: groupAgentId,
            isGroupChat: false,
            groupParticipantChatId: participant.agentId,
            participantRoles: [participant],
            unreadCount: 0,
            requiresPrivateReply: false,
            lastPrivateMessageAt: undefined,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }

        // Verwaiste Einzelchats entfernen (Teilnehmer nicht mehr in der Gruppe)
        const activeParticipantIds = new Set(
          groupAgent.participantRoles.map((p) => p.agentId)
        );
        const orphanedChatIds = state.conversations
          .filter(
            (conversation) =>
              conversation.agentId === groupAgentId &&
              conversation.groupParticipantChatId &&
              !activeParticipantIds.has(conversation.groupParticipantChatId)
          )
          .map((conversation) => conversation.id);

        if (newChats.length === 0 && orphanedChatIds.length === 0) return;

        const orphanedSet = new Set(orphanedChatIds);
        set({
          conversations: [
            ...newChats,
            ...state.conversations.filter((c) => !orphanedSet.has(c.id)),
          ],
        });
      },

      // ----------------------------------------
      // Agent Selection
      // Welcher Agent ist gerade ausgewählt?
      // ----------------------------------------

      setSelectedAgent: (agentId) => {
        set((state) => {
          if (!agentId) {
            return {
              selectedAgentId: null,
              activeConversationId: null,
              historySidebarCollapsed: true,
            };
          }

          const currentActive = state.conversations.find(
            (conversation) => conversation.id === state.activeConversationId
          );
          const shouldOpenHistory = state.selectedAgentId === null;

          // Falls aktueller Chat bereits zum gewählten Agent gehört, beibehalten
          if (currentActive?.agentId === agentId) {
            return {
              selectedAgentId: agentId,
              historySidebarCollapsed: shouldOpenHistory ? false : state.historySidebarCollapsed,
            };
          }

          // Sonst: jüngsten Chat dieses Agents aktivieren, oder null wenn keiner existiert
          const agentConversations = state.conversations
            .filter((conversation) => {
              if (conversation.agentId === agentId) return true;
              if (conversation.isGroupChat) {
                return (conversation.participantRoles || []).some(
                  (participant) => participant.agentId === agentId
                );
              }
              return false;
            })
            .sort((a, b) => b.updatedAt - a.updatedAt);

          const selectedCustomAgent = state.customAgents.find((agent) => agent.id === agentId);
          const isSelectedGroup = selectedCustomAgent?.type === 'group';

          // Gruppen: Hauptchat sicherstellen falls noch keiner existiert
          if (isSelectedGroup) {
            const mainConversation = agentConversations.find(
              (conv) => !conv.groupParticipantChatId
            );
            if (!mainConversation) {
              const newMainConversation: ChatConversation = {
                id: crypto.randomUUID(),
                title: 'Gruppenchat',
                messages: [],
                folderId: null,
                agentId,
                isGroupChat: true,
                participantRoles: selectedCustomAgent?.participantRoles || [],
                unreadCount: 0,
                requiresPrivateReply: false,
                lastPrivateMessageAt: undefined,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              };

              return {
                selectedAgentId: agentId,
                conversations: [newMainConversation, ...state.conversations],
                activeConversationId: newMainConversation.id,
                historySidebarCollapsed: shouldOpenHistory ? false : state.historySidebarCollapsed,
              };
            }

            // Hauptchat als aktiven Chat setzen
            return {
              selectedAgentId: agentId,
              activeConversationId: mainConversation.id,
              historySidebarCollapsed: shouldOpenHistory ? false : state.historySidebarCollapsed,
            };
          }

          return {
            selectedAgentId: agentId,
            activeConversationId: agentConversations[0]?.id ?? null,
            historySidebarCollapsed: shouldOpenHistory ? false : state.historySidebarCollapsed,
          };
        });
      },

      // Bestehenden Custom Agent aktualisieren
      updateCustomAgent: (agentId, updates) => {
        const state = get();
        const targetAgent = state.customAgents.find(
          (agent) => agent.id === agentId && (agent.type ?? 'agent') === 'agent'
        );
        if (!targetAgent) return;

        const nextName = updates.name?.trim() || targetAgent.name;
        const nextDescription = updates.description?.trim() ?? targetAgent.description;
        const nextIcon = updates.icon?.trim() || targetAgent.icon || 'Bot';
        const nextColor = updates.color?.trim() || targetAgent.color || '#8B5CF6';
        const nextParentAgentId = updates.parentAgentId?.trim() || undefined;

        set({
          customAgents: state.customAgents.map((agent) =>
            agent.id === agentId
              ? {
                  ...agent,
                  name: nextName,
                  description: nextDescription,
                  icon: nextIcon,
                  color: nextColor,
                  parentAgentId: nextParentAgentId,
                }
              : agent
          ),
        });
      },

      // Neuen Custom Agent erstellen
      createCustomAgent: (name, description, icon = 'Bot', color = '#8B5CF6', parentAgentId) => {
        const state = get();
        const normalizedName = name.trim();
        const normalizedParentId = parentAgentId?.trim() || undefined;

        // Duplikat-Schutz: existiert bereits ein Agent mit gleichem Namen unter gleichem Parent?
        const existingAgent = state.customAgents.find((agent) =>
          (agent.type ?? 'agent') === 'agent' &&
          agent.name.trim().toLowerCase() === normalizedName.toLowerCase() &&
          (agent.parentAgentId || undefined) === normalizedParentId
        );
        if (existingAgent) {
          set({
            selectedAgentId: existingAgent.id,
            activeConversationId: null,
            historySidebarCollapsed: false,
          });
          return existingAgent.id;
        }

        const newAgent: CustomAgentData = {
          id: `custom-${crypto.randomUUID()}`,
          name: normalizedName,
          description: description?.trim(),
          icon,
          color,
          type: 'agent',
          parentAgentId: normalizedParentId,
          createdAt: Date.now(),
        };

        set({
          customAgents: [newAgent, ...state.customAgents],
          selectedAgentId: newAgent.id,
          activeConversationId: null,
          historySidebarCollapsed: false,
        });

        return newAgent.id;
      },

      // Custom Agent (inkl. Subagenten) löschen
      deleteCustomAgent: (agentId) => {
        set((state) => {
          // Zu löschende IDs rekursiv sammeln (Agent + alle Kinder)
          const idsToDelete = new Set<string>([agentId]);
          let changed = true;
          while (changed) {
            changed = false;
            state.customAgents.forEach((agent) => {
              if (agent.parentAgentId && idsToDelete.has(agent.parentAgentId) && !idsToDelete.has(agent.id)) {
                idsToDelete.add(agent.id);
                changed = true;
              }
            });
          }

          // Custom Agents bereinigen
          const baseRemainingCustomAgents = state.customAgents.filter((agent) => !idsToDelete.has(agent.id));

          // Zusätzlicher Dedupe-Cleanup:
          // Alte Doppel-Erstellungen zusammenführen (gleicher Typ + Parent + Name)
          const dedupeMap = new Map<string, CustomAgentData>();
          const dedupedOutIds = new Set<string>();
          for (const agent of baseRemainingCustomAgents) {
            const normalizedType = agent.type || 'agent';
            const normalizedParent = agent.parentAgentId || 'master';
            const normalizedName = agent.name.trim().toLowerCase();
            const key = `${normalizedType}::${normalizedParent}::${normalizedName}`;

            if (!dedupeMap.has(key)) {
              dedupeMap.set(key, agent);
            } else {
              dedupedOutIds.add(agent.id);
            }
          }
          const remainingCustomAgents = Array.from(dedupeMap.values());
          const allRemovedIds = new Set<string>([...idsToDelete, ...dedupedOutIds]);

          // Conversations bereinigen (direkter Agent oder Gruppenteilnehmer)
          const remainingConversations = state.conversations.filter((conversation) => {
            if (allRemovedIds.has(conversation.agentId)) return false;
            if (conversation.isGroupChat) {
              const participants = conversation.participantRoles || [];
              return !participants.some((participant) => allRemovedIds.has(participant.agentId));
            }
            return true;
          });

          // Folder bereinigen
          const remainingFolders = state.folders.filter((folder) => !allRemovedIds.has(folder.agentId));

          // Active Conversation bereinigen
          const activeStillExists = remainingConversations.some(
            (conversation) => conversation.id === state.activeConversationId
          );

          // Selected Agent bereinigen
          const selectedStillExists =
            state.selectedAgentId !== null && !allRemovedIds.has(state.selectedAgentId);

          return {
            customAgents: remainingCustomAgents,
            conversations: remainingConversations,
            groupFileFolders: state.groupFileFolders.filter((folder) => !allRemovedIds.has(folder.groupId)),
            groupFiles: state.groupFiles.filter((file) => !allRemovedIds.has(file.groupId)),
            folders: remainingFolders,
            activeConversationId: activeStillExists ? state.activeConversationId : null,
            selectedAgentId: selectedStillExists ? state.selectedAgentId : null,
            historySidebarCollapsed: selectedStillExists ? state.historySidebarCollapsed : true,
          };
        });
      },

      // Neue Gruppe als Agent-Eintrag erstellen (NICHT als Chat)
      createGroupAgent: (name, participants, adminAgentId, parentAgentId) => {
        const state = get();
        const normalizedName = name.trim() || 'Neue Gruppe';
        const normalizedParentId = parentAgentId?.trim() || 'master';
        const normalizedAdminAgentId = adminAgentId.trim();
        const normalizedParticipants = participants
          .filter((participant) => participant.agentId.trim())
          .map((participant) => ({
            agentId: participant.agentId.trim(),
            role: participant.role.trim(),
          }));

        if (
          !normalizedAdminAgentId
          || !normalizedParticipants.some((participant) => participant.agentId === normalizedAdminAgentId)
        ) {
          return '';
        }

        // Duplikat-Schutz für Gruppen
        const existingGroup = state.customAgents.find((agent) =>
          agent.type === 'group' &&
          agent.name.trim().toLowerCase() === normalizedName.toLowerCase() &&
          (agent.parentAgentId || 'master') === normalizedParentId
        );
        if (existingGroup) {
          const mergedParticipants = normalizedParticipants.length > 0
            ? normalizedParticipants
            : existingGroup.participantRoles || [];
          const existingMainConversation = state.conversations
            .filter((conversation) => conversation.agentId === existingGroup.id)
            .sort((a, b) => b.updatedAt - a.updatedAt)[0];

          set({
            customAgents: state.customAgents.map((agent) =>
              agent.id === existingGroup.id
                ? {
                    ...agent,
                    name: normalizedName,
                    participantRoles: mergedParticipants,
                    adminAgentId: normalizedAdminAgentId,
                  }
                : agent
            ),
            conversations: state.conversations.map((conversation) =>
              conversation.agentId === existingGroup.id
                ? {
                    ...conversation,
                    participantRoles: mergedParticipants,
                    isGroupChat: true,
                  }
                : conversation
            ),
            selectedAgentId: existingGroup.id,
            activeConversationId: existingMainConversation?.id || null,
            historySidebarCollapsed: false,
          });
          return existingGroup.id;
        }

        const newGroupAgent: CustomAgentData = {
          id: `group-${crypto.randomUUID()}`,
          name: normalizedName,
          description: '',
          icon: 'Users',
          color: '#14B8A6',
          type: 'group',
          participantRoles: normalizedParticipants,
          adminAgentId: normalizedAdminAgentId,
          // Gruppen sind standardmäßig Intelligence untergeordnet
          parentAgentId: normalizedParentId,
          parentGroupId: undefined,
          rootGroupId: undefined,
          createdAt: Date.now(),
        };

        const mainConversation: ChatConversation = {
          id: crypto.randomUUID(),
          title: 'Gruppenchat',
          messages: [],
          folderId: null,
          agentId: newGroupAgent.id,
          isGroupChat: true,
          participantRoles: normalizedParticipants,
          unreadCount: 0,
          requiresPrivateReply: false,
          lastPrivateMessageAt: undefined,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set({
          customAgents: [newGroupAgent, ...state.customAgents],
          conversations: [mainConversation, ...state.conversations],
          selectedAgentId: newGroupAgent.id,
          activeConversationId: mainConversation.id,
          historySidebarCollapsed: false,
        });

        return newGroupAgent.id;
      },

      updateGroupAgent: (groupAgentId, updates) => {
        // get() + set() Pattern statt set((state) => ...) für klarere Persistierung
        const state = get();
        const groupAgent = state.customAgents.find(
          (agent) => agent.id === groupAgentId && agent.type === 'group'
        );
        if (!groupAgent) {
          console.warn('[updateGroupAgent] Gruppe nicht gefunden:', groupAgentId);
          return;
        }

        // Teilnehmer direkt übernehmen – Caller filtert bereits
        // Kein doppeltes Filtern, um keine Daten zu verlieren
        const nextParticipants = updates.participantRoles ?? groupAgent.participantRoles ?? [];
        const nextAdminAgentId =
          updates.adminAgentId !== undefined
            ? updates.adminAgentId.trim()
            : groupAgent.adminAgentId || '';

        if (
          nextParticipants.length > 0
          && nextAdminAgentId
          && !nextParticipants.some((participant) => participant.agentId === nextAdminAgentId)
        ) {
          console.warn('[updateGroupAgent] Admin ist kein Gruppenmitglied:', nextAdminAgentId);
          return;
        }
        const nextName = updates.name?.trim() || groupAgent.name;
        const nextDescription = updates.description?.trim() ?? groupAgent.description;
        const nextObjective = updates.objective?.trim() ?? groupAgent.objective;
        const nextColor = updates.color || groupAgent.color || '#14B8A6';
        const nextIcon =
          typeof updates.icon === 'string' && updates.icon.trim() !== ''
            ? updates.icon.trim()
            : groupAgent.icon || 'Users';

        set({
          customAgents: state.customAgents.map((agent) =>
            agent.id === groupAgentId
              ? {
                  ...agent,
                  name: nextName,
                  description: nextDescription,
                  objective: nextObjective,
                  color: nextColor,
                  icon: nextIcon,
                  participantRoles: nextParticipants,
                  adminAgentId: nextAdminAgentId || undefined,
                }
              : agent
          ),
          conversations: state.conversations.map((conversation) => {
            if (conversation.agentId !== groupAgentId) return conversation;
            // Einzelchats behalten ihre eigene Teilnehmerliste
            if (conversation.groupParticipantChatId) return conversation;
            return {
              ...conversation,
              isGroupChat: true,
              participantRoles: nextParticipants,
              title: conversation.title || 'Gruppenchat',
              updatedAt: Date.now(),
            };
          }),
        });

        // Einzelchats synchronisieren (neue Teilnehmer hinzufügen, verwaiste entfernen)
        get().ensureGroupParticipantChats(groupAgentId);
      },

      createBreakoutSession: (parentGroupId, name, participants) => {
        const state = get();
        const parentGroup = state.customAgents.find(
          (agent) => agent.id === parentGroupId && agent.type === 'group'
        );
        if (!parentGroup) {
          return '';
        }

        const normalizedName = name.trim() || 'Breakout Session';
        const normalizedParticipants = participants
          .filter((participant) => participant.agentId.trim())
          .map((participant) => ({
            agentId: participant.agentId.trim(),
            role: participant.role.trim(),
          }));

        if (normalizedParticipants.length === 0) {
          return '';
        }

        const existingBreakout = state.customAgents.find((agent) =>
          agent.type === 'group' &&
          agent.parentGroupId === parentGroupId &&
          agent.name.trim().toLowerCase() === normalizedName.toLowerCase()
        );

        if (existingBreakout) {
          const existingMainConversation = state.conversations
            .filter((conversation) => conversation.agentId === existingBreakout.id)
            .sort((a, b) => b.updatedAt - a.updatedAt)[0];

          set({
            customAgents: state.customAgents.map((agent) =>
              agent.id === existingBreakout.id
                ? {
                    ...agent,
                    participantRoles: normalizedParticipants,
                  }
                : agent
            ),
            conversations: state.conversations.map((conversation) =>
              conversation.agentId === existingBreakout.id
                ? {
                    ...conversation,
                    isGroupChat: true,
                    participantRoles: normalizedParticipants,
                  }
                : conversation
            ),
            selectedAgentId: existingBreakout.id,
            activeConversationId: existingMainConversation?.id || null,
            historySidebarCollapsed: false,
          });

          return existingBreakout.id;
        }

        const breakoutGroup: CustomAgentData = {
          id: `group-${crypto.randomUUID()}`,
          name: normalizedName,
          description: '',
          icon: 'Users',
          color: parentGroup.color || '#14B8A6',
          type: 'group',
          participantRoles: normalizedParticipants,
          parentAgentId: parentGroup.parentAgentId || 'master',
          parentGroupId,
          rootGroupId: parentGroup.rootGroupId || parentGroup.id,
          createdAt: Date.now(),
        };

        const mainConversation: ChatConversation = {
          id: crypto.randomUUID(),
          title: 'Gruppenchat',
          messages: [],
          folderId: null,
          agentId: breakoutGroup.id,
          isGroupChat: true,
          participantRoles: normalizedParticipants,
          unreadCount: 0,
          requiresPrivateReply: false,
          lastPrivateMessageAt: undefined,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set({
          customAgents: [breakoutGroup, ...state.customAgents],
          conversations: [mainConversation, ...state.conversations],
          selectedAgentId: breakoutGroup.id,
          activeConversationId: mainConversation.id,
          historySidebarCollapsed: false,
        });

        return breakoutGroup.id;
      },

      upsertBreakoutSession: (session) => {
        const state = get();
        const now = Date.now();
        const createdAt = session.createdAt ?? now;
        const updatedAt = session.updatedAt ?? now;
        const parentGroup = state.customAgents.find(
          (agent) => agent.id === session.parentGroupId && agent.type === 'group'
        );

        const existingBreakoutGroup = state.customAgents.find(
          (agent) => agent.id === session.breakoutGroupId
            || agent.breakoutSessionId === session.breakoutId
        );

        const breakoutGroupId = existingBreakoutGroup?.id || session.breakoutGroupId;
        const breakoutGroup: CustomAgentData = existingBreakoutGroup
          ? {
              ...existingBreakoutGroup,
              name: session.name,
              description: session.summary || session.task,
              objective: session.task,
              type: 'group',
              participantRoles: session.participants,
              parentGroupId: session.parentGroupId,
              parentAgentId: existingBreakoutGroup.parentAgentId || parentGroup?.parentAgentId || 'master',
              rootGroupId: existingBreakoutGroup.rootGroupId || parentGroup?.rootGroupId || parentGroup?.id,
              breakoutSessionId: session.breakoutId,
            }
          : {
              id: breakoutGroupId,
              name: session.name,
              description: session.summary || session.task,
              objective: session.task,
              icon: 'Users',
              color: parentGroup?.color || '#14B8A6',
              type: 'group',
              participantRoles: session.participants,
              parentAgentId: parentGroup?.parentAgentId || 'master',
              parentGroupId: session.parentGroupId,
              rootGroupId: parentGroup?.rootGroupId || parentGroup?.id,
              breakoutSessionId: session.breakoutId,
              createdAt,
            };

        const existingConversation = state.conversations.find(
          (conversation) =>
            conversation.id === session.breakoutConversationId
            || conversation.breakoutSessionId === session.breakoutId
            || (conversation.agentId === breakoutGroupId && !conversation.groupParticipantChatId)
        );

        const breakoutConversationId = existingConversation?.id || session.breakoutConversationId || crypto.randomUUID();
        const breakoutConversation: ChatConversation = existingConversation
          ? {
              ...existingConversation,
              id: breakoutConversationId,
              title: session.name,
              agentId: breakoutGroupId,
              isGroupChat: true,
              participantRoles: session.participants,
              breakoutSessionId: session.breakoutId,
              updatedAt,
            }
          : {
              id: breakoutConversationId,
              title: session.name,
              messages: [],
              folderId: null,
              agentId: breakoutGroupId,
              isGroupChat: true,
              participantRoles: session.participants,
              breakoutSessionId: session.breakoutId,
              unreadCount: 0,
              requiresPrivateReply: false,
              lastPrivateMessageAt: undefined,
              createdAt,
              updatedAt,
            };

        const nextSession: BreakoutSessionData = {
          ...session,
          breakoutGroupId,
          breakoutConversationId,
          createdAt,
          updatedAt,
        };

        set({
          customAgents: existingBreakoutGroup
            ? state.customAgents.map((agent) =>
                agent.id === existingBreakoutGroup.id ? breakoutGroup : agent
              )
            : [breakoutGroup, ...state.customAgents],
          conversations: existingConversation
            ? state.conversations.map((conversation) =>
                conversation.id === existingConversation.id ? breakoutConversation : conversation
              )
            : [breakoutConversation, ...state.conversations],
          breakoutSessions: state.breakoutSessions.some((entry) => entry.breakoutId === session.breakoutId)
            ? state.breakoutSessions.map((entry) =>
                entry.breakoutId === session.breakoutId ? nextSession : entry
              )
            : [nextSession, ...state.breakoutSessions],
        });

        get().ensureGroupParticipantChats(breakoutGroupId);
        return breakoutConversationId;
      },

      createOrchestratedAgent: (draft) => {
        const state = get();
        const normalizedName = draft.name.trim();
        const normalizedDescription = draft.description.trim();
        const normalizedParentAgentId = draft.parentAgentId?.trim() || undefined;
        const normalizedTargetGroupId = draft.targetGroupId?.trim() || undefined;
        const existingAgent = draft.agentId
          ? state.customAgents.find((agent) => agent.id === draft.agentId)
          : state.customAgents.find((agent) =>
              (agent.type ?? 'agent') === 'agent'
              && agent.name.trim().toLowerCase() === normalizedName.toLowerCase()
              && (agent.parentAgentId || undefined) === normalizedParentAgentId
            );
        const agentId = existingAgent?.id || draft.agentId?.trim() || `custom-${crypto.randomUUID()}`;
        const now = Date.now();

        const nextAgent: CustomAgentData = {
          id: agentId,
          name: normalizedName,
          description: normalizedDescription,
          icon: draft.icon?.trim() || existingAgent?.icon || 'Bot',
          color: draft.color?.trim() || existingAgent?.color || '#8B5CF6',
          type: 'agent',
          parentAgentId: normalizedParentAgentId,
          createdAt: existingAgent?.createdAt || now,
        };

        const nextCustomAgents = existingAgent
          ? state.customAgents.map((agent) => (agent.id === existingAgent.id ? { ...agent, ...nextAgent } : agent))
          : [nextAgent, ...state.customAgents];

        let nextConversations = state.conversations;
        let shouldEnsureParticipantChats = false;
        if (draft.addToGroup && normalizedTargetGroupId) {
          const nextParticipant: GroupChatParticipantRole = {
            agentId,
            role: draft.role.trim() || normalizedName,
            authority: draft.authority || 'member',
            scope: draft.scope,
            capabilities: draft.capabilities,
          };

          const targetGroup = nextCustomAgents.find(
            (agent) => agent.id === normalizedTargetGroupId && agent.type === 'group'
          );
          if (targetGroup) {
            const existingParticipants = targetGroup.participantRoles || [];
            const mergedParticipants = existingParticipants.some((participant) => participant.agentId === agentId)
              ? existingParticipants.map((participant) =>
                  participant.agentId === agentId ? { ...participant, ...nextParticipant } : participant
                )
              : [...existingParticipants, nextParticipant];

            for (let index = 0; index < nextCustomAgents.length; index += 1) {
              const candidate = nextCustomAgents[index];
              if (candidate.id === normalizedTargetGroupId) {
                nextCustomAgents[index] = {
                  ...candidate,
                  participantRoles: mergedParticipants,
                };
              }
            }

            nextConversations = state.conversations.map((conversation) =>
              conversation.agentId === normalizedTargetGroupId
                ? {
                    ...conversation,
                    participantRoles: conversation.groupParticipantChatId
                      ? conversation.participantRoles
                      : mergedParticipants,
                    updatedAt: now,
                  }
                : conversation
            );
            shouldEnsureParticipantChats = true;
          }
        }

        set({
          customAgents: nextCustomAgents,
          conversations: nextConversations,
        });

        const configUpdates: Partial<AgentConfig> = {
          agentName: nextAgent.name,
          agentIcon: nextAgent.icon,
          orbColor: nextAgent.color,
          ...(draft.settings?.llmProvider ? { llmProvider: draft.settings.llmProvider } : {}),
          ...(draft.settings?.llmModel ? { llmModel: draft.settings.llmModel } : {}),
          ...(draft.settings?.systemPrompt !== undefined ? { systemPrompt: draft.settings.systemPrompt } : {}),
          ...(draft.settings?.enabledTools !== undefined ? { enabledTools: draft.settings.enabledTools } : {}),
          ...(draft.settings?.visualTools !== undefined ? { visualTools: draft.settings.visualTools } : {}),
          ...(draft.settings?.enabledSkills !== undefined ? { enabledSkills: draft.settings.enabledSkills } : {}),
          ...(draft.settings?.allowedIntegrations !== undefined
            ? { allowedIntegrations: draft.settings.allowedIntegrations }
            : {}),
          ...(draft.settings?.temperature !== undefined ? { temperature: draft.settings.temperature } : {}),
          ...(draft.settings?.maxTokens !== undefined ? { maxTokens: draft.settings.maxTokens } : {}),
          ...(draft.settings?.visualModeEnabled !== undefined ? { visualModeEnabled: draft.settings.visualModeEnabled } : {}),
          ...(draft.settings?.humanInTheLoopTools !== undefined
            ? { humanInTheLoopTools: draft.settings.humanInTheLoopTools }
            : {}),
          ...(draft.settings?.multimodal
            ? {
                multimodal: {
                  ...createDefaultAgentMultimodalConfig(),
                  image: {
                    ...createDefaultAgentMultimodalConfig().image,
                    ...draft.settings.multimodal.image,
                  },
                  video: {
                    ...createDefaultAgentMultimodalConfig().video,
                    ...draft.settings.multimodal.video,
                  },
                  tts: {
                    ...createDefaultAgentMultimodalConfig().tts,
                    ...draft.settings.multimodal.tts,
                  },
                  stt: {
                    ...createDefaultAgentMultimodalConfig().stt,
                    ...draft.settings.multimodal.stt,
                  },
                },
              }
            : {}),
        };

        useAgentConfigStore.getState().updateConfig(agentId, configUpdates);

        if (shouldEnsureParticipantChats && normalizedTargetGroupId) {
          get().ensureGroupParticipantChats(normalizedTargetGroupId);
        }

        return agentId;
      },

      // ----------------------------------------
      // Council Draft Actions
      // Persistenter Draft fuer Council-Hub + Sidebar-Liste
      // ----------------------------------------

      createCouncilDraft: () => {
        const nextDraftId = `council-${crypto.randomUUID()}`;

        set({
          activeCouncilDraftId: nextDraftId,
          activeCouncilDraftName: '',
          activeCouncilDraftSeatMembers: createDefaultCouncilSeatMembers(),
          activeCouncilDraftMemberMessages: {},
          activeCouncilDraftMainMessages: [],
          activeCouncilDraftRuns: [],
          activeCouncilStage: 'idle',
          activeCouncilStageLabel: '',
          activeCouncilIsRunning: false,
        });

        return nextDraftId;
      },

      openCouncil: (councilId) => {
        const state = get();
        const council = state.councils.find((entry) => entry.id === councilId);

        if (!council) {
          return;
        }

        set({
          activeCouncilDraftId: council.id,
          activeCouncilDraftName: normalizeCouncilName(council.name),
          activeCouncilDraftSeatMembers:
            council.seatMembers?.length
              ? council.seatMembers
              : createDefaultCouncilSeatMembers(),
          activeCouncilDraftMemberMessages: council.memberMessages || {},
          activeCouncilDraftMainMessages: council.mainMessages || [],
          activeCouncilDraftRuns: council.runs || [],
          activeCouncilStage: 'idle',
          activeCouncilStageLabel: '',
          activeCouncilIsRunning: false,
        });
      },

      ensureCouncilDraft: () => {
        const state = get();
        if (state.activeCouncilDraftId) {
          return state.activeCouncilDraftId;
        }

        return state.createCouncilDraft();
      },

      setActiveCouncilDraftName: (name) => {
        set({
          activeCouncilDraftName: name,
        });
      },

      upsertActiveCouncilSeatMember: (member) => {
        set((state) => {
          const now = Date.now();
          const existingMember = state.activeCouncilDraftSeatMembers.find(
            (entry) => entry.seatId === member.seatId
          );

          const nextMember: CouncilSeatMemberData = {
            ...member,
            createdAt: existingMember?.createdAt || now,
            updatedAt: now,
          };

          return {
            activeCouncilDraftSeatMembers: existingMember
              ? state.activeCouncilDraftSeatMembers.map((entry) =>
                  entry.seatId === member.seatId ? nextMember : entry
                )
              : [...state.activeCouncilDraftSeatMembers, nextMember],
          };
        });
      },

      removeActiveCouncilSeatMember: (seatId) => {
        if (seatId === 'chair-center') {
          return;
        }

        set((state) => ({
          activeCouncilDraftSeatMembers: state.activeCouncilDraftSeatMembers.filter(
            (entry) => entry.seatId !== seatId
          ),
        }));
      },

      trimActiveCouncilExtraSeatMembers: (side, fromIndex) => {
        const prefix = side === 'left' ? 'arc-left-extra-' : 'arc-right-extra-';

        set((state) => ({
          activeCouncilDraftSeatMembers: state.activeCouncilDraftSeatMembers.filter((entry) => {
            if (!entry.seatId.startsWith(prefix)) {
              return true;
            }

            const index = Number(entry.seatId.replace(prefix, ''));
            if (!Number.isFinite(index)) {
              return true;
            }

            return index < fromIndex;
          }),
        }));
      },

      updateCouncilName: (councilId, name) => {
        const normalizedName = normalizeCouncilName(name);
        if (!normalizedName) {
          return;
        }

        set((state) => {
          const now = Date.now();
          const nextCouncils = state.councils.map((council) =>
            council.id === councilId
              ? {
                  ...council,
                  name: normalizedName,
                  updatedAt: now,
                }
              : council
          );

          const isActiveCouncil = state.activeCouncilDraftId === councilId;

          return {
            councils: nextCouncils,
            activeCouncilDraftName: isActiveCouncil ? normalizedName : state.activeCouncilDraftName,
          };
        });
      },

      deleteCouncil: (councilId) => {
        set((state) => {
          const isActiveCouncil = state.activeCouncilDraftId === councilId;

          return {
            councils: state.councils.filter((council) => council.id !== councilId),
            activeCouncilDraftId: isActiveCouncil ? null : state.activeCouncilDraftId,
            activeCouncilDraftName: isActiveCouncil ? '' : state.activeCouncilDraftName,
            activeCouncilDraftSeatMembers: isActiveCouncil
              ? createDefaultCouncilSeatMembers()
              : state.activeCouncilDraftSeatMembers,
            activeCouncilDraftMemberMessages: isActiveCouncil
              ? {}
              : state.activeCouncilDraftMemberMessages,
            activeCouncilDraftMainMessages: isActiveCouncil
              ? []
              : state.activeCouncilDraftMainMessages,
            activeCouncilDraftRuns: isActiveCouncil
              ? []
              : state.activeCouncilDraftRuns,
            activeCouncilStage: isActiveCouncil ? 'idle' : state.activeCouncilStage,
            activeCouncilStageLabel: isActiveCouncil ? '' : state.activeCouncilStageLabel,
            activeCouncilIsRunning: isActiveCouncil ? false : state.activeCouncilIsRunning,
          };
        });
      },

      persistActiveCouncilDraft: () => {
        const state = get();
        const draftId = state.activeCouncilDraftId;
        const normalizedName = normalizeCouncilName(state.activeCouncilDraftName);

        if (!draftId) {
          return null;
        }

        if (!normalizedName) {
          set({
            activeCouncilDraftId: null,
            activeCouncilDraftName: '',
            activeCouncilDraftSeatMembers: createDefaultCouncilSeatMembers(),
            activeCouncilDraftMemberMessages: {},
            activeCouncilDraftMainMessages: [],
            activeCouncilDraftRuns: [],
            activeCouncilStage: 'idle',
            activeCouncilStageLabel: '',
            activeCouncilIsRunning: false,
          });
          return null;
        }

        const now = Date.now();
        const existingCouncil = state.councils.find((council) => council.id === draftId);

        const nextCouncil: CouncilData = existingCouncil
          ? {
              ...existingCouncil,
              name: normalizedName,
              seatMembers: state.activeCouncilDraftSeatMembers,
              memberMessages: state.activeCouncilDraftMemberMessages,
              mainMessages: state.activeCouncilDraftMainMessages,
              runs: state.activeCouncilDraftRuns,
              updatedAt: now,
            }
          : {
              id: draftId,
              name: normalizedName,
              seatMembers: state.activeCouncilDraftSeatMembers,
              memberMessages: state.activeCouncilDraftMemberMessages,
              mainMessages: state.activeCouncilDraftMainMessages,
              runs: state.activeCouncilDraftRuns,
              createdAt: now,
              updatedAt: now,
            };

        set({
          councils: existingCouncil
            ? state.councils.map((council) => (council.id === draftId ? nextCouncil : council))
            : [nextCouncil, ...state.councils],
          activeCouncilDraftId: null,
          activeCouncilDraftName: '',
          activeCouncilDraftSeatMembers: createDefaultCouncilSeatMembers(),
          activeCouncilDraftMemberMessages: {},
          activeCouncilDraftMainMessages: [],
          activeCouncilDraftRuns: [],
          activeCouncilStage: 'idle',
          activeCouncilStageLabel: '',
          activeCouncilIsRunning: false,
        });

        return draftId;
      },

      // ----------------------------------------
      // Council-Draft synchronisieren
      // Speichert den aktiven Council in die persistente Liste,
      // behaelt aber die aktuelle Auswahl bewusst aktiv.
      // ----------------------------------------

      syncActiveCouncilDraft: () => {
        const state = get();
        const draftId = state.activeCouncilDraftId;
        const normalizedName = normalizeCouncilName(state.activeCouncilDraftName);

        if (!draftId || !normalizedName) {
          return null;
        }

        const now = Date.now();
        const existingCouncil = state.councils.find((council) => council.id === draftId);

        const nextCouncil: CouncilData = existingCouncil
          ? {
              ...existingCouncil,
              name: normalizedName,
              seatMembers: state.activeCouncilDraftSeatMembers,
              memberMessages: state.activeCouncilDraftMemberMessages,
              mainMessages: state.activeCouncilDraftMainMessages,
              runs: state.activeCouncilDraftRuns,
              updatedAt: now,
            }
          : {
              id: draftId,
              name: normalizedName,
              seatMembers: state.activeCouncilDraftSeatMembers,
              memberMessages: state.activeCouncilDraftMemberMessages,
              mainMessages: state.activeCouncilDraftMainMessages,
              runs: state.activeCouncilDraftRuns,
              createdAt: now,
              updatedAt: now,
            };

        set({
          councils: existingCouncil
            ? state.councils.map((council) => (council.id === draftId ? nextCouncil : council))
            : [nextCouncil, ...state.councils],
          activeCouncilDraftId: draftId,
          activeCouncilDraftName: normalizedName,
        });

        return draftId;
      },

      // ----------------------------------------
      // Council Main Messages
      // Oeffentlicher Council-Verlauf (User + finale Eldest-Antwort)
      // ----------------------------------------

      addCouncilMainMessage: (message) => {
        const nextMessage = createCouncilMessage(message);
        set((state) => ({
          activeCouncilDraftMainMessages: [
            ...state.activeCouncilDraftMainMessages,
            nextMessage,
          ],
        }));
        return nextMessage.id;
      },

      updateCouncilMainMessage: (messageId, updates) => {
        set((state) => ({
          activeCouncilDraftMainMessages: state.activeCouncilDraftMainMessages.map((message) =>
            message.id === messageId
              ? {
                  ...message,
                  ...updates,
                }
              : message
          ),
        }));
      },

      clearCouncilMainMessages: () => {
        set({
          activeCouncilDraftMainMessages: [],
        });
      },

      // ----------------------------------------
      // Council Member Messages
      // Nachrichten pro Sitz im aktiven Council
      // ----------------------------------------

      addCouncilMemberMessage: (seatId, message) => {
        const nextMessage = createCouncilMessage(message);
        set((state) => ({
          activeCouncilDraftMemberMessages: {
            ...state.activeCouncilDraftMemberMessages,
            [seatId]: [
              ...(state.activeCouncilDraftMemberMessages[seatId] || []),
              nextMessage,
            ],
          },
        }));
        return nextMessage.id;
      },

      updateCouncilMemberMessage: (seatId, messageId, updates) => {
        set((state) => ({
          activeCouncilDraftMemberMessages: {
            ...state.activeCouncilDraftMemberMessages,
            [seatId]: (state.activeCouncilDraftMemberMessages[seatId] || []).map((message) =>
              message.id === messageId
                ? {
                    ...message,
                    ...updates,
                  }
                : message
            ),
          },
        }));
      },

      clearCouncilMemberMessages: (seatId) => {
        set((state) => {
          const updated = { ...state.activeCouncilDraftMemberMessages };
          delete updated[seatId];
          return { activeCouncilDraftMemberMessages: updated };
        });
      },

      // ----------------------------------------
      // Council Deliberation
      // Karpathy-inspirierter 3-Phasen-Flow:
      // First Opinions -> Review -> Final Synthesis
      // ----------------------------------------

      runCouncilPrompt: async (prompt, images, files) => {
        const initialState = get();
        const councilId = initialState.ensureCouncilDraft();
        const currentState = get();
        const councilName = currentState.activeCouncilDraftName.trim() || 'Council';
        const allSeats = [...currentState.activeCouncilDraftSeatMembers];
        const eldest =
          allSeats.find((member) => member.seatId === 'chair-center')
          || allSeats[0]
          || null;

        if (!eldest || !prompt.trim()) {
          return null;
        }

        const abortController = new AbortController();
        activeCouncilRunAbortController = abortController;
        const runSnapshot = {
          draftId: currentState.activeCouncilDraftId,
          mainMessages: currentState.activeCouncilDraftMainMessages,
          memberMessages: currentState.activeCouncilDraftMemberMessages,
          runs: currentState.activeCouncilDraftRuns,
        };
        activeCouncilRunSnapshot = runSnapshot;

        const debateMembers = allSeats
          .filter((member) => member.seatId !== eldest.seatId)
          .sort(
            (leftMember, rightMember) =>
              getCouncilSeatOrderRank(leftMember.seatId) - getCouncilSeatOrderRank(rightMember.seatId)
          );
        const opinionMembers = debateMembers.length > 0 ? debateMembers : [eldest];
        const serializedPrompt = serializeCouncilPrompt(prompt, images, files);
        const run = createEmptyCouncilRunData(councilId, councilName, prompt.trim());

        // User-Prompt zuerst im oeffentlichen und in allen privaten Verlaeufen ablegen.
        get().addCouncilMainMessage({
          role: 'user',
          content: prompt.trim(),
          images,
          files,
        });

        allSeats.forEach((member) => {
          get().addCouncilMemberMessage(member.seatId, {
            role: 'user',
            content: serializedPrompt,
            images,
            files,
          });
        });

        set((state) => ({
          activeCouncilDraftRuns: [...state.activeCouncilDraftRuns, run],
          activeCouncilStage: 'first-opinions',
          activeCouncilStageLabel: 'First Opinions',
          activeCouncilIsRunning: true,
        }));

        const updateRun = (updates: Partial<CouncilRunData>) => {
          set((state) => ({
            activeCouncilDraftRuns: state.activeCouncilDraftRuns.map((entry) =>
              entry.id === run.id
                ? {
                    ...entry,
                    ...updates,
                    updatedAt: Date.now(),
                  }
                : entry
            ),
          }));
        };

        try {
          // ------------------------------------
          // Stage 1: First Opinions
          // Alle nicht-Eldest-Sitze antworten zuerst unabhängig.
          // ------------------------------------
          const publicContext = mapCouncilMessagesForApi(
            get().activeCouncilDraftMainMessages.slice(-12)
          );

          const firstOpinionEntries: Array<{
            seatId: string;
            memberName: string;
            role: string;
            content: string;
          }> = [];

          for (let index = 0; index < opinionMembers.length; index += 1) {
            const member = opinionMembers[index];
            const mainMessageId = get().addCouncilMainMessage({
              role: 'assistant',
              content: '',
              model: member.model,
              agentId: member.seatId,
              agentName: member.name,
              agentColor: member.color,
            });
            const memberMessageId = get().addCouncilMemberMessage(member.seatId, {
              role: 'assistant',
              content: '',
              model: member.model,
              agentId: member.seatId,
              agentName: member.name,
              agentColor: member.color,
            });

            useAgentsSpatialStore.getState().setSpeakingCouncilSeat(member.seatId);
            useAgentsSpatialStore.getState().openCouncilSpeechBubble(member.seatId, memberMessageId);

            const content = await executeCouncilCompletionStream({
              messages: publicContext,
              moduleId: member.sourceAgentId || 'master',
              model: member.model,
              systemPrompt: buildCouncilFirstOpinionSystemPrompt(
                member,
                councilName,
                allSeats.filter((entry) => entry.seatId !== member.seatId)
              ),
              signal: abortController.signal,
              onProgress: (nextContent) => {
                get().updateCouncilMemberMessage(member.seatId, memberMessageId, {
                  content: nextContent,
                });
                get().updateCouncilMainMessage(mainMessageId, {
                  content: nextContent,
                });
              },
            });

            get().updateCouncilMemberMessage(member.seatId, memberMessageId, {
              content,
            });
            get().updateCouncilMainMessage(mainMessageId, {
              content,
            });

            firstOpinionEntries.push({
              seatId: member.seatId,
              memberName: member.name,
              role: member.role,
              content,
            });

          }

          useAgentsSpatialStore.getState().setSpeakingCouncilSeat(null);

          updateRun({
            stage: 'review',
            firstOpinions: Object.fromEntries(
              firstOpinionEntries.map((entry) => [entry.seatId, entry.content])
            ),
          });

          // ------------------------------------
          // Stage 2: Review
          // Reviews bleiben in den Member-Histories und gehen
          // anschliessend in die Eldest-Synthese.
          // ------------------------------------
          const reviewEntries: Array<{
            seatId: string;
            memberName: string;
            role: string;
            content: string;
          }> = [];

          if (firstOpinionEntries.length > 1) {
            set({
              activeCouncilStage: 'review',
              activeCouncilStageLabel: 'Review',
            });

            // Reviews sollen nur in den privaten Member-Histories auftauchen
            // und nicht als aktive Sprechblasen oder Raum-Outputs erscheinen.
            useAgentsSpatialStore.getState().setSpeakingCouncilSeat(null);

            for (const reviewer of opinionMembers) {
              const anonymizedOpinions = buildAnonymizedCouncilOpinions(
                firstOpinionEntries
                  .filter((entry) => entry.seatId !== reviewer.seatId)
                  .map((entry) => ({
                    seatId: entry.seatId,
                    memberName: entry.memberName,
                    content: entry.content,
                  }))
              );

              const reviewMessageId = get().addCouncilMemberMessage(reviewer.seatId, {
                role: 'assistant',
                content: '',
                model: reviewer.model,
                agentId: reviewer.seatId,
                agentName: reviewer.name,
                agentColor: reviewer.color,
              });

              const content = await executeCouncilCompletionStream({
                messages: [
                  ...publicContext,
                  {
                    role: 'user',
                    content: buildCouncilReviewUserPrompt(
                      serializedPrompt,
                      anonymizedOpinions
                    ),
                  },
                ],
                moduleId: reviewer.sourceAgentId || 'master',
                model: reviewer.model,
                systemPrompt: buildCouncilReviewSystemPrompt(reviewer, councilName),
              signal: abortController.signal,
                onProgress: (nextContent) => {
                  get().updateCouncilMemberMessage(reviewer.seatId, reviewMessageId, {
                    content: nextContent,
                  });
                },
              });

              get().updateCouncilMemberMessage(reviewer.seatId, reviewMessageId, {
                content,
              });

              reviewEntries.push({
                seatId: reviewer.seatId,
                memberName: reviewer.name,
                role: reviewer.role,
                content,
              });
            }

            useAgentsSpatialStore.getState().setSpeakingCouncilSeat(null);

            updateRun({
              reviews: Object.fromEntries(
                reviewEntries.map((entry) => [entry.seatId, entry.content])
              ),
            });
          }

          // ------------------------------------
          // Stage 3: Final Synthesis durch den Eldest
          // ------------------------------------
          set({
            activeCouncilStage: 'final-synthesis',
            activeCouncilStageLabel: 'Final Answer',
          });

          const finalMainMessageId = get().addCouncilMainMessage({
            role: 'assistant',
            content: '',
            model: eldest.model,
            agentId: eldest.seatId,
            agentName: eldest.name,
            agentColor: eldest.color,
          });

          const eldestMessageId = get().addCouncilMemberMessage(eldest.seatId, {
            role: 'assistant',
            content: '',
            model: eldest.model,
            agentId: eldest.seatId,
            agentName: eldest.name,
            agentColor: eldest.color,
          });

          useAgentsSpatialStore.getState().setSpeakingCouncilSeat(eldest.seatId);
          useAgentsSpatialStore.getState().openCouncilSpeechBubble(eldest.seatId, eldestMessageId);

          const rawFinalResponse = await executeCouncilCompletionStream({
            messages: [
              ...publicContext,
              {
                role: 'user',
                content: buildCouncilFinalUserPrompt(
                  serializedPrompt,
                  firstOpinionEntries.map((entry) => ({
                    memberName: entry.memberName,
                    role: entry.role,
                    content: entry.content,
                  })),
                  reviewEntries.map((entry) => ({
                    memberName: entry.memberName,
                    role: entry.role,
                    content: entry.content,
                  }))
                ),
              },
            ],
            moduleId: eldest.sourceAgentId || 'master',
            model: eldest.model,
            systemPrompt: buildCouncilFinalSystemPrompt(
              eldest,
              councilName,
              allSeats.filter((entry) => entry.seatId !== eldest.seatId)
            ),
            signal: abortController.signal,
            onProgress: (nextContent) => {
              get().updateCouncilMemberMessage(eldest.seatId, eldestMessageId, {
                content: nextContent,
              });
              get().updateCouncilMainMessage(finalMainMessageId, {
                content: nextContent,
              });
            },
          });

          const finalResponse = ensureCouncilFinalResponsePrefix(rawFinalResponse);

          get().updateCouncilMemberMessage(eldest.seatId, eldestMessageId, {
            content: finalResponse,
          });
          get().updateCouncilMainMessage(finalMainMessageId, {
            content: finalResponse,
          });

          updateRun({
            stage: 'completed',
            finalResponse,
          });

          set({
            activeCouncilStage: 'completed',
            activeCouncilStageLabel: 'Final Answer',
            activeCouncilIsRunning: false,
          });

          useAgentsSpatialStore.getState().setSpeakingCouncilSeat(null);

          // Nach Abschluss den Main-Feed mit Prompt, erster Stimme
          // und finaler Eldest-Synthese oeffnen.
          useAgentsSpatialStore.getState().setOpenCouncilChatMember('__council-main__');

          return run.id;
        } catch (error) {
          if (abortController.signal.aborted) {
            if (activeCouncilRunAbortController && activeCouncilRunAbortController !== abortController) {
              return null;
            }

            const latestState = get();
            const canRestoreSnapshot = runSnapshot.draftId === latestState.activeCouncilDraftId;

            resetCouncilSpatialRunUi();

            set({
              activeCouncilDraftMainMessages: canRestoreSnapshot
                ? runSnapshot.mainMessages
                : latestState.activeCouncilDraftMainMessages,
              activeCouncilDraftMemberMessages: canRestoreSnapshot
                ? runSnapshot.memberMessages
                : latestState.activeCouncilDraftMemberMessages,
              activeCouncilDraftRuns: canRestoreSnapshot
                ? runSnapshot.runs
                : latestState.activeCouncilDraftRuns,
              activeCouncilStage: 'idle',
              activeCouncilStageLabel: '',
              activeCouncilIsRunning: false,
            });

            return null;
          }

          const errorText = error instanceof Error
            ? error.message
            : 'Council run failed.';

          updateRun({
            stage: 'error',
            error: errorText,
          });

          get().addCouncilMemberMessage(eldest.seatId, {
            role: 'assistant',
            content: `⚠️ Council error: ${errorText}`,
            model: eldest.model,
            agentId: eldest.seatId,
            agentName: eldest.name,
            agentColor: eldest.color,
          });

          set({
            activeCouncilStage: 'error',
            activeCouncilStageLabel: 'Council run failed.',
            activeCouncilIsRunning: false,
          });

          resetCouncilSpatialRunUi();

          throw error;
        } finally {
          if (activeCouncilRunAbortController === abortController) {
            activeCouncilRunAbortController = null;
            activeCouncilRunSnapshot = null;
          }
        }
      },

      // ----------------------------------------
      // Aktiven Council-Run abbrechen und auf den
      // Zustand vor dem Start zuruecksetzen.
      // ----------------------------------------

      abortAndResetCouncilRun: () => {
        activeCouncilRunAbortController?.abort();
        resetCouncilSpatialRunUi();

        const state = get();
        const snapshot = activeCouncilRunSnapshot;
        const canRestoreSnapshot = snapshot?.draftId === state.activeCouncilDraftId;

        set({
          activeCouncilDraftMainMessages: canRestoreSnapshot
            ? (snapshot?.mainMessages || state.activeCouncilDraftMainMessages)
            : state.activeCouncilDraftMainMessages,
          activeCouncilDraftMemberMessages: canRestoreSnapshot
            ? (snapshot?.memberMessages || state.activeCouncilDraftMemberMessages)
            : state.activeCouncilDraftMemberMessages,
          activeCouncilDraftRuns: canRestoreSnapshot
            ? (snapshot?.runs || state.activeCouncilDraftRuns)
            : state.activeCouncilDraftRuns,
          activeCouncilStage: 'idle',
          activeCouncilStageLabel: '',
          activeCouncilIsRunning: false,
        });
      },

      // ----------------------------------------
      // Group Objectives Actions
      // Ziele fuer Gruppenarbeit verwalten
      // ----------------------------------------

      addGroupObjective: (groupId, objective) => {
        const newObjective: GroupObjective = {
          ...objective,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          groupObjectives: [...state.groupObjectives, newObjective],
        }));

        return newObjective.id;
      },

      updateGroupObjective: (objectiveId, updates) => {
        set((state) => ({
          groupObjectives: state.groupObjectives.map((objective) =>
            objective.id === objectiveId
              ? { ...objective, ...updates, updatedAt: Date.now() }
              : objective
          ),
        }));
      },

      deleteGroupObjective: (objectiveId) => {
        set((state) => ({
          groupObjectives: state.groupObjectives.filter(
            (objective) => objective.id !== objectiveId
          ),
        }));
      },

      // ----------------------------------------
      // UI State Actions
      // Sidebar-Toggles, Loading, Research-Modi
      // ----------------------------------------

      setIsLoading: (loading) => {
        set({ isLoading: loading });
      },

      toggleAgentSidebar: () => {
        set((state) => ({ agentSidebarCollapsed: !state.agentSidebarCollapsed }));
      },

      toggleHistorySidebar: () => {
        set((state) => ({ historySidebarCollapsed: !state.historySidebarCollapsed }));
      },

      setWebResearchEnabled: (enabled) => {
        set({ webResearchEnabled: enabled });
      },

      setDeepResearchEnabled: (enabled) => {
        set({ deepResearchEnabled: enabled });
      },

      setAgentModeEnabled: (enabled) => {
        set({ agentModeEnabled: enabled });
      },
    }),
    {
      name: 'llm-council-agents-state',
      version: 4,

      // ----------------------------------------
      // Store-Migration v1 → v2: Group Orchestration
      // Ergaenzt authority-Felder in participantRoles,
      // leitet adminAgentIds aus adminAgentId ab und
      // initialisiert neue State-Felder mit Defaults.
      // ----------------------------------------
      migrate: (persistedState, version) => {
        const state = persistedState as Record<string, unknown>;

        if (version < 2) {
          // 1. Neue Top-Level-Felder initialisieren
          if (!state.groupObjectives) {
            state.groupObjectives = [];
          }
          if (!state.groupSessionSummaries) {
            state.groupSessionSummaries = [];
          }

          // 2. participantRoles: authority-Feld ergaenzen
          const customAgents = (state.customAgents || []) as CustomAgentData[];
          for (const agent of customAgents) {
            if (agent.type !== 'group' || !agent.participantRoles) continue;

            for (const participant of agent.participantRoles) {
              if (!(participant as GroupChatParticipantRole & { authority?: string }).authority) {
                // Bisheriger Admin → owner, alle anderen → member
                (participant as GroupChatParticipantRole & { authority: string }).authority =
                  participant.agentId === agent.adminAgentId
                    ? 'owner'
                    : 'member';
              }
            }

            // adminAgentIds aus adminAgentId ableiten
            if (agent.adminAgentId && !agent.adminAgentIds) {
              agent.adminAgentIds = [agent.adminAgentId];
            }
          }

          // 3. Conversations: participantRoles ebenfalls migrieren
          const conversations = (state.conversations || []) as ChatConversation[];
          for (const conv of conversations) {
            if (!conv.participantRoles) continue;
            const groupAgent = customAgents.find((a) => a.id === conv.agentId);
            for (const participant of conv.participantRoles) {
              if (!(participant as GroupChatParticipantRole & { authority?: string }).authority) {
                (participant as GroupChatParticipantRole & { authority: string }).authority =
                  participant.agentId === groupAgent?.adminAgentId
                    ? 'owner'
                    : 'member';
              }
            }
          }
        }

        if (!state.breakoutSessions) {
          state.breakoutSessions = [];
        }

        if (version < 4) {
          state.conversations = sanitizeConversationMessages(state.conversations as ChatConversation[] | undefined);
          state.activeCouncilDraftMainMessages = stripTransientAttachmentFieldsFromMessages(
            (state.activeCouncilDraftMainMessages || []) as ChatMessageData[],
          );
          state.activeCouncilDraftMemberMessages = sanitizeCouncilDraftMessages(
            state.activeCouncilDraftMemberMessages as Record<string, ChatMessageData[]> | undefined,
          );
        }

        return state;
      },

      partialize: (state) => ({
        conversations: sanitizeConversationMessages(state.conversations),
        folders: state.folders,
        groupFileFolders: state.groupFileFolders,
        groupFiles: state.groupFiles,
        customAgents: state.customAgents,
        breakoutSessions: state.breakoutSessions,
        groupObjectives: state.groupObjectives,
        groupSessionSummaries: state.groupSessionSummaries,
        councils: state.councils,
        activeCouncilDraftId: state.activeCouncilDraftId,
        activeCouncilDraftName: state.activeCouncilDraftName,
        activeCouncilDraftSeatMembers: state.activeCouncilDraftSeatMembers,
        activeCouncilDraftMemberMessages: sanitizeCouncilDraftMessages(state.activeCouncilDraftMemberMessages),
        activeCouncilDraftMainMessages: stripTransientAttachmentFieldsFromMessages(state.activeCouncilDraftMainMessages),
        activeCouncilDraftRuns: state.activeCouncilDraftRuns,
        activeConversationId: state.activeConversationId,
        selectedAgentId: state.selectedAgentId,
        agentSidebarCollapsed: state.agentSidebarCollapsed,
        historySidebarCollapsed: state.historySidebarCollapsed,
        agentModeEnabled: state.agentModeEnabled,
      }),
    }
  )
);

// --------------------------------------------
// Selectors für optimierte Re-Renders
// Nur die benötigten Teile des Stores abonnieren
// --------------------------------------------

export const useAgentsConversations = () => 
  useAgentsStore((state) => state.conversations);

export const useActiveAgentsConversation = () => 
  useAgentsStore((state) => 
    state.conversations.find(conv => conv.id === state.activeConversationId)
  );

export const useAgentsFolders = () => 
  useAgentsStore((state) => state.folders);

export const useAgentsIsLoading = () => 
  useAgentsStore((state) => state.isLoading);

export const useSelectedAgentId = () =>
  useAgentsStore((state) => state.selectedAgentId);

export const useAgentSidebarCollapsed = () =>
  useAgentsStore((state) => state.agentSidebarCollapsed);

export const useHistorySidebarCollapsed = () =>
  useAgentsStore((state) => state.historySidebarCollapsed);

// --------------------------------------------
// Gruppen-Autoritaets-Helper
// Lesen authority aus participantRoles, um adminAgentId
// Schritt fuer Schritt abzuloesen.
// --------------------------------------------

export function getGroupAdmins(group: CustomAgentData): GroupChatParticipantRole[] {
  return (group.participantRoles || []).filter(
    (p) => p.authority === 'owner' || p.authority === 'admin'
  );
}

export function getGroupOwner(group: CustomAgentData): GroupChatParticipantRole | undefined {
  return (group.participantRoles || []).find((p) => p.authority === 'owner');
}

// ============================================
// Migration: Alte Chat-Daten übernehmen
// Wird beim ersten Laden aufgerufen
// ============================================

export function migrateFromChatStore() {
  try {
    const oldData = localStorage.getItem('llm-council-chat-state');
    const newData = localStorage.getItem('llm-council-agents-state');
    
    // Nur migrieren wenn alte Daten vorhanden und neue noch leer
    if (oldData && !newData) {
      const parsed = JSON.parse(oldData);
      if (parsed?.state) {
        const migrated = {
          state: {
            ...parsed.state,
            // Neue Felder mit Defaults setzen
            selectedAgentId: 'master',
            agentSidebarCollapsed: false,
            historySidebarCollapsed: false,
            // agentId zu allen Conversations hinzufügen
            conversations: (parsed.state.conversations || []).map((conv: ChatConversation) => ({
              ...conv,
              agentId: conv.agentId || 'master',
            })),
            // Ordner an Default-Agent binden
            folders: (parsed.state.folders || []).map((folder: ChatFolderData) => ({
              ...folder,
              agentId: folder.agentId || 'master',
            })),
            groupFileFolders: [],
            groupFiles: [],
            customAgents: [],
          },
          version: 0,
        };
        localStorage.setItem('llm-council-agents-state', JSON.stringify(migrated));
        console.log('✅ Chat-Daten erfolgreich zu Agents migriert');
      }
    }
  } catch (error) {
    console.warn('⚠️ Migration der Chat-Daten fehlgeschlagen:', error);
  }
}
