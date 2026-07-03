import { useAgentsStore } from '../store';
import type { AttachedFile, AttachedImage, ChatMessageData } from '../types';
import { stripTransientAttachmentFieldsFromImages } from './chat-attachments';

interface OrbChatMessageLike {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  toolCalls?: ChatMessageData['toolCalls'];
  images?: AttachedImage[];
  files?: AttachedFile[];
  reasoning?: string;
}

function mapOrbModuleToAgentId(moduleId: string): string {
  if (moduleId === 'agents' || moduleId.startsWith('base:')) {
    return 'master';
  }

  return moduleId;
}

export function syncOrbTabToAgentsConversation(options: {
  moduleId: string;
  messages: OrbChatMessageLike[];
  linkedConversationId?: string | null;
}): string {
  const { moduleId, messages, linkedConversationId } = options;
  const agentId = mapOrbModuleToAgentId(moduleId);
  const store = useAgentsStore.getState();

  let conversationId = linkedConversationId;
  if (!conversationId || !store.conversations.some((conversation) => conversation.id === conversationId)) {
    conversationId = store.createConversation(agentId);
  }

  const syncedMessages: ChatMessageData[] = messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: message.timestamp,
    toolCalls: message.toolCalls,
    images: stripTransientAttachmentFieldsFromImages(message.images),
    files: message.files,
    reasoning: message.reasoning,
  }));

  const totalTokens = syncedMessages.reduce(
    (sum, message) => sum + Math.ceil((message.content?.length || 0) / 4),
    0,
  );

  useAgentsStore.setState((state) => ({
    selectedAgentId: agentId,
    activeConversationId: conversationId,
    historySidebarCollapsed: false,
    conversations: state.conversations.map((conversation) =>
      conversation.id === conversationId
        ? {
            ...conversation,
            agentId,
            messages: syncedMessages,
            updatedAt: Date.now(),
            totalTokens,
          }
        : conversation
    ),
  }));

  return conversationId;
}
