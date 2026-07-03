// ============================================
// route.ts - SSE-Route für Gruppen-Orchestrierung
//
// Zweck: Startet den serverseitigen Group-Orchestrator und streamt
//        dessen Events via Server-Sent Events an das Frontend.
// Verwendet von: AgentsPage Gruppenchat
// ============================================

import { NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger';
import {
  isGroupOrchestratorAbortError,
  streamGroupOrchestrator,
} from '@/lib/agent/group-orchestrator';
import {
  serializeGroupOrchestrateDone,
  serializeGroupOrchestrateError,
  serializeGroupOrchestrateEvent,
} from '@/lib/agent/group-orchestrate-sse';
import type {
  ChatMessageData,
  GroupChatParticipantRole,
  GroupObjective,
  GroupOrchestrateRequest,
} from '@/modules/agents/types';

const log = createLogger('GroupOrchestrateAPI');

function isChatMessageArray(value: unknown): value is ChatMessageData[] {
  return Array.isArray(value);
}

function isParticipantArray(value: unknown): value is GroupChatParticipantRole[] {
  return Array.isArray(value);
}

function isObjectiveArray(value: unknown): value is GroupObjective[] {
  return Array.isArray(value);
}

function buildErrorStream(message: string, status = 400): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(serializeGroupOrchestrateError(message)));
      controller.enqueue(encoder.encode(serializeGroupOrchestrateDone()));
      controller.close();
    },
  });

  return new Response(stream, {
    status,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

async function parseRequest(request: NextRequest): Promise<GroupOrchestrateRequest> {
  const body = await request.json() as Partial<GroupOrchestrateRequest> | null;
  if (!body || typeof body !== 'object') {
    throw new Error('Ungültiger Request-Body.');
  }

  if (!body.groupId || typeof body.groupId !== 'string') {
    throw new Error('`groupId` fehlt.');
  }

  if (!body.conversationId || typeof body.conversationId !== 'string') {
    throw new Error('`conversationId` fehlt.');
  }

  if (!body.userMessage || typeof body.userMessage !== 'string') {
    throw new Error('`userMessage` fehlt.');
  }

  if (!isChatMessageArray(body.conversationHistory)) {
    throw new Error('`conversationHistory` muss ein Array sein.');
  }

  if (!isParticipantArray(body.participants)) {
    throw new Error('`participants` muss ein Array sein.');
  }

  if (body.objectives !== undefined && !isObjectiveArray(body.objectives)) {
    throw new Error('`objectives` muss ein Array sein.');
  }

  return {
    groupId: body.groupId,
    conversationId: body.conversationId,
    userMessage: body.userMessage,
    forceMode: body.forceMode,
    mentionedAgentIds: Array.isArray(body.mentionedAgentIds) ? body.mentionedAgentIds.filter((id): id is string => typeof id === 'string') : [],
    images: Array.isArray(body.images) ? body.images : [],
    files: Array.isArray(body.files) ? body.files : [],
    conversationHistory: body.conversationHistory,
    participants: body.participants,
    objectives: body.objectives || [],
    groupContext: body.groupContext,
    maxTurns: typeof body.maxTurns === 'number' ? body.maxTurns : undefined,
  };
}

export async function POST(request: NextRequest) {
  let parsedRequest: GroupOrchestrateRequest;

  try {
    parsedRequest = await parseRequest(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ungültiger Request.';
    return buildErrorStream(message, 400);
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const run = streamGroupOrchestrator(
          {
            userMessage: parsedRequest.userMessage,
            groupId: parsedRequest.groupId,
            conversationId: parsedRequest.conversationId,
            conversationHistory: parsedRequest.conversationHistory || [],
            participants: parsedRequest.participants || [],
            objectives: parsedRequest.objectives || [],
            groupContext: parsedRequest.groupContext,
            forceMode: parsedRequest.forceMode,
            mentionedAgentIds: parsedRequest.mentionedAgentIds,
            maxTurns: parsedRequest.maxTurns,
          },
          {
            signal: request.signal,
          },
        );

        for await (const event of run.events) {
          controller.enqueue(encoder.encode(serializeGroupOrchestrateEvent(event)));
        }

        try {
          await run.finalState;
        } catch (error) {
          if (isGroupOrchestratorAbortError(error)) {
            log.info('Gruppen-Orchestrierung abgebrochen', {
              conversationId: parsedRequest.conversationId,
              groupId: parsedRequest.groupId,
            });
          } else {
            throw error;
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unbekannter SSE-Fehler.';
        log.error('group-orchestrate Fehler', message);
        controller.enqueue(encoder.encode(serializeGroupOrchestrateError(message)));
      } finally {
        controller.enqueue(encoder.encode(serializeGroupOrchestrateDone()));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
