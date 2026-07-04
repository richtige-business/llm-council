// ============================================
// verify-phase2.ts - Smoke-Checks für Phase 2
//
// Zweck: Prüft die neuen LangGraph-Kernpfade offline mit
//        einem gestubbten LLM-Adapter und einer Fake-Tool-Loop.
// Verwendet von: npx tsx scripts/verify-phase2.ts
// ============================================

import assert from 'node:assert/strict';
import { initializeToolRegistry } from '@/lib/agent/init-server';
import { toolRegistry } from '@/lib/agent/registry';
import type { ModuleTool } from '@/lib/agent/types';
import type { LLMResponse } from '@/lib/llm/types';
import {
  runGroupOrchestrator,
  type GroupOrchestratorDependencies,
  type GroupOrchestratorLLMAdapter,
  streamGroupOrchestrator,
} from '@/lib/agent/group-orchestrator';
import {
  serializeGroupOrchestrateDone,
  serializeGroupOrchestrateEvent,
} from '@/lib/agent/group-orchestrate-sse';
import {
  getMatchingOrchestrationModeCommands,
  parseOrchestrationModeCommand,
} from '@/modules/agents/lib/orchestration-mode';
import type {
  GroupChatParticipantRole,
  GroupOrchestrateEvent,
  OrchestrationMode,
} from '@/modules/agents/types';

function createUsage(totalTokens: number) {
  return {
    inputTokens: Math.floor(totalTokens / 2),
    outputTokens: totalTokens - Math.floor(totalTokens / 2),
    totalTokens,
    estimatedCost: totalTokens / 1_000_000,
  };
}

function createLLMResponse(
  overrides: Partial<LLMResponse>,
): LLMResponse {
  return {
    message: overrides.message ?? '',
    rawContent: overrides.rawContent,
    toolCalls: overrides.toolCalls,
    stopReason: overrides.stopReason ?? 'end_turn',
    usage: overrides.usage,
  };
}

function createQueuedAdapter(config: {
  structured?: Array<{
    data?: unknown;
    error?: string;
    usage?: number;
  }>;
  text?: Array<{
    text: string;
    response?: Partial<LLMResponse>;
    usage?: number;
  }>;
}): GroupOrchestratorLLMAdapter {
  const structuredQueue = [...(config.structured || [])];
  const textQueue = [...(config.text || [])];

  return {
    async invokeStructured(
      options: {
        validator?: (value: unknown) => {
          valid: boolean;
          data?: unknown;
          errors: string[];
        };
      },
    ) {
      const next = structuredQueue.shift();
      if (!next) {
        throw new Error('Keine gestubbte Structured-Response mehr vorhanden.');
      }
      if (next.error) {
        throw new Error(next.error);
      }
      const validation = options?.validator
        ? options.validator(next.data)
        : { valid: true, data: next.data, errors: [] };
      if (!validation.valid || validation.data === undefined) {
        throw new Error(validation.errors.join(' ') || 'Structured Output konnte nicht validiert werden.');
      }
      return {
        data: validation.data as never,
        rawText: JSON.stringify(next.data),
        response: createLLMResponse({
          message: JSON.stringify(next.data),
          usage: {
            inputTokens: 5,
            outputTokens: 5,
          },
        }),
        usage: createUsage(next.usage ?? 10),
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
      };
    },

    async invokeText() {
      const next = textQueue.shift();
      if (!next) {
        throw new Error('Keine gestubbte Text-Response mehr vorhanden.');
      }
      const response = createLLMResponse({
        ...next.response,
        message: next.response?.message ?? next.text,
        usage: next.response?.usage ?? {
          inputTokens: 5,
          outputTokens: 5,
        },
      });

      return {
        text: next.text,
        response,
        usage: createUsage(next.usage ?? 10),
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
      };
    },

    async *streamText() {
      const next = textQueue.shift();
      if (!next) {
        throw new Error('Keine gestubbte Stream-Response mehr vorhanden.');
      }

      const chunks = next.text.match(/\S+\s*|\n/g) || [next.text];
      for (const chunk of chunks) {
        yield chunk;
      }
    },

    estimateResponseUsage(_model, response) {
      return createUsage((response.usage?.inputTokens ?? 0) + (response.usage?.outputTokens ?? 0));
    },
  };
}

const TEST_PARTICIPANTS: GroupChatParticipantRole[] = [
  {
    agentId: 'owner-agent',
    role: 'Owner',
    authority: 'owner',
  },
  {
    agentId: 'browser',
    role: 'Browser Agent',
    authority: 'member',
  },
  {
    agentId: 'training',
    role: 'Training Agent',
    authority: 'member',
  },
];

function createDeps(llmAdapter: GroupOrchestratorLLMAdapter): GroupOrchestratorDependencies {
  return {
    llmAdapter,
    systemPromptBuilder: async () => 'Test System Prompt',
  };
}

async function runBaseCase(params: {
  llmAdapter: GroupOrchestratorLLMAdapter;
  forceMode?: OrchestrationMode;
  maxTurns?: number;
}) {
  return runGroupOrchestrator(
    createBaseInput({
      forceMode: params.forceMode,
      maxTurns: params.maxTurns,
    }),
    createDeps(params.llmAdapter),
  );
}

function createBaseInput(overrides: Partial<Parameters<typeof runGroupOrchestrator>[0]> = {}) {
  return {
    userMessage: 'Teste Phase 2',
    groupId: 'group-1',
    conversationId: 'conversation-1',
    conversationHistory: [
      {
        id: 'msg-1',
        role: 'user' as const,
        content: 'Bitte bearbeitet das Thema.',
        timestamp: Date.now(),
      },
    ],
    participants: TEST_PARTICIPANTS,
    objectives: [],
    groupContext: {
      groupName: 'Phase 2 Testgruppe',
    },
    ...overrides,
  };
}

async function testAskAgentToolLoopAndSynthesis() {
  const llmAdapter = createQueuedAdapter({
    structured: [
      {
        data: {
          reasoning: 'Hole zuerst Spezialwissen vom Browser Agent und fasse dann zusammen.',
          mode: 'task-delegation',
          actions: [
            {
              type: 'ask_agent',
              agentId: 'browser',
              question: 'Nutze dein Tool und liefere ein Ergebnis.',
            },
            {
              type: 'synthesize',
            },
          ],
        },
      },
    ],
    text: [
      {
        text: '',
        response: {
          stopReason: 'tool_use',
          toolCalls: [
            {
              id: 'tool-1',
              name: 'browser_fakeLookup',
              input: { query: 'phase 2' },
            },
          ],
        },
        usage: 20,
      },
      {
        text: 'Recherche fertig: Tool hat Daten geliefert.',
        response: {
          stopReason: 'end_turn',
        },
        usage: 15,
      },
      {
        text: 'Synthese fertig: Browser Agent hat verwertbare Daten geliefert.',
        response: {
          stopReason: 'end_turn',
        },
        usage: 12,
      },
    ],
  });

  const finalState = await runBaseCase({
    llmAdapter,
    forceMode: 'task-delegation',
  });

  assert.equal(finalState.responseMessage, 'Synthese fertig: Browser Agent hat verwertbare Daten geliefert.');
  assert.ok(finalState.events.some((event) => event.type === 'agent_done'));
  assert.ok(finalState.events.some((event) => event.type === 'synthesis'));
  assert.ok(finalState.tokensUsed > 0);
}

async function testBroadcastAndSynthesis() {
  const llmAdapter = createQueuedAdapter({
    structured: [
      {
        data: {
          reasoning: 'Hole zwei Perspektiven ein und fasse dann zusammen.',
          mode: 'brainstorming',
          actions: [
            {
              type: 'broadcast',
              prompt: 'Gebt jeweils euren wichtigsten Punkt.',
              targetAgentIds: ['browser', 'training'],
            },
            {
              type: 'synthesize',
            },
          ],
        },
      },
    ],
    text: [
      {
        text: 'Browser Sicht: Fokus auf Datenquellen.',
      },
      {
        text: 'Training Sicht: Fokus auf Iteration.',
      },
      {
        text: 'Synthese: Datenquellen und Iteration sind die Kernpunkte.',
      },
    ],
  });

  const finalState = await runBaseCase({
    llmAdapter,
    forceMode: 'brainstorming',
  });

  assert.equal(finalState.agentResponses.length, 2);
  assert.equal(finalState.responseMessage, 'Synthese: Datenquellen und Iteration sind die Kernpunkte.');
  assert.ok(finalState.events.filter((event) => event.type === 'agent_done').length >= 2);
}

async function testInvalidStructuredOutputFallback() {
  const llmAdapter = createQueuedAdapter({
    structured: [
      { error: 'Structured Output fehlgeschlagen: invalid JSON' },
    ],
  });

  const finalState = await runBaseCase({
    llmAdapter,
  });

  assert.ok(finalState.responseMessage?.includes('Fallback'));
  assert.equal(finalState.shouldContinue, false);
}

async function testMaxTurnsGuard() {
  const llmAdapter = createQueuedAdapter({});
  const finalState = await runBaseCase({
    llmAdapter,
    maxTurns: 0,
  });

  assert.equal(finalState.responseMessage, 'Maximale Anzahl an Orchestrierungs-Turns erreicht.');
}

async function testSseSerializationHelpers() {
  assert.equal(
    serializeGroupOrchestrateEvent({ type: 'orchestrator_message', content: 'Hallo' }),
    'data: {"type":"orchestrator_message","content":"Hallo"}\n\n',
  );
  assert.equal(serializeGroupOrchestrateDone(), 'data: [DONE]\n\n');
}

async function testRespondPathStreaming() {
  const llmAdapter = createQueuedAdapter({
    structured: [
      {
        data: {
          reasoning: 'Antworte direkt.',
          mode: 'free-discussion',
          actions: [
            {
              type: 'respond',
              message: 'Direkte Antwort vom Orchestrator.',
            },
          ],
        },
      },
    ],
  });

  const run = streamGroupOrchestrator(
    createBaseInput(),
    createDeps(llmAdapter),
  );

  const events = [];
  for await (const event of run.events) {
    events.push(event);
  }
  const finalState = await run.finalState;

  assert.equal(finalState.responseMessage, 'Direkte Antwort vom Orchestrator.');
  assert.ok(events.some((event) => event.type === 'mode_selected'));
  assert.ok(events.some((event) => event.type === 'orchestrator_message'));
}

async function testAskAgentPathStreaming() {
  const llmAdapter = createQueuedAdapter({
    structured: [
      {
        data: {
          reasoning: 'Frage den Browser Agent.',
          mode: 'free-discussion',
          actions: [
            {
              type: 'ask_agent',
              agentId: 'browser',
              question: 'Liefer ein kurzes Ergebnis.',
            },
          ],
        },
      },
    ],
    text: [
      {
        text: 'Kurzes Ergebnis vom Browser Agent.',
      },
    ],
  });

  const run = streamGroupOrchestrator(
    createBaseInput(),
    createDeps(llmAdapter),
  );

  const events = [];
  for await (const event of run.events) {
    events.push(event);
  }
  await run.finalState;

  assert.ok(events.some((event) => event.type === 'agent_speaking'));
  assert.ok(events.some((event) => event.type === 'agent_token'));
  assert.ok(events.some((event) => event.type === 'agent_done'));
}

async function testBroadcastPathStreaming() {
  const llmAdapter = createQueuedAdapter({
    structured: [
      {
        data: {
          reasoning: 'Hole zwei Perspektiven parallel ein.',
          mode: 'brainstorming',
          actions: [
            {
              type: 'broadcast',
              prompt: 'Gebt euren wichtigsten Punkt.',
              targetAgentIds: ['browser', 'training'],
            },
          ],
        },
      },
    ],
    text: [
      { text: 'Browser Sicht.' },
      { text: 'Training Sicht.' },
    ],
  });

  const run = streamGroupOrchestrator(
    createBaseInput({ forceMode: 'brainstorming' }),
    createDeps(llmAdapter),
  );

  const events = [];
  for await (const event of run.events) {
    events.push(event);
  }
  await run.finalState;

  assert.ok(events.filter((event) => event.type === 'agent_speaking').length >= 2);
  assert.ok(events.filter((event) => event.type === 'agent_done').length >= 2);
}

async function testAbortStreaming() {
  const controller = new AbortController();
  controller.abort();

  const run = streamGroupOrchestrator(
    createBaseInput(),
    {
      ...createDeps(createQueuedAdapter({})),
      signal: controller.signal,
    },
  );

  const events = [];
  for await (const event of run.events) {
    events.push(event);
  }

  await assert.rejects(run.finalState);
  assert.ok(events.some((event) => event.type === 'orchestration_aborted'));
}

async function testStructuredOutputNormalizationForRoleAndAllTargets() {
  const llmAdapter = createQueuedAdapter({
    structured: [
      {
        data: {
          reasoning: 'CEO delegiert an alle relevanten Teilnehmer.',
          mode: 'task delegation',
          actions: [
            {
              type: 'delegate',
              task: 'Erarbeitet je einen konkreten SaaS-Case.',
              assignTo: 'all participants',
            },
          ],
        },
      },
    ],
    text: [
      { text: 'Browser Beitrag.' },
      { text: 'Training Beitrag.' },
      { text: 'Synthese: Beide Beiträge wurden integriert.' },
    ],
  });

  const finalState = await runBaseCase({
    llmAdapter,
    forceMode: 'task-delegation',
  });

  const delegateTask = finalState.completedTasks[0];
  assert.ok(delegateTask);
  assert.deepEqual(delegateTask.assignedTo.sort(), ['browser', 'training'].sort());
  assert.equal(finalState.lastError, null);
}

function testParseOrchestrationModeCommand() {
  assert.deepEqual(
    parseOrchestrationModeCommand('/brainstorm Neue SaaS-Idee'),
    {
      forceMode: 'brainstorming',
      message: 'Neue SaaS-Idee',
      consumedCommand: true,
    },
  );
  assert.deepEqual(
    parseOrchestrationModeCommand('/mode planning Roadmap für Q3'),
    {
      forceMode: 'planning',
      message: 'Roadmap für Q3',
      consumedCommand: true,
    },
  );
  assert.deepEqual(
    parseOrchestrationModeCommand('/unknown command'),
    {
      message: '/unknown command',
      consumedCommand: false,
    },
  );
}

function testMatchingOrchestrationModeCommands() {
  const brainstormMatches = getMatchingOrchestrationModeCommands('brain');
  assert.ok(brainstormMatches.some((entry) => entry.mode === 'brainstorming'));

  const emptyMatches = getMatchingOrchestrationModeCommands('');
  assert.ok(emptyMatches.length >= 5);
}

async function testBrainstormingGuardrails() {
  const llmAdapter = createQueuedAdapter({
    structured: [
      {
        data: {
          reasoning: 'Ich würde sonst direkt antworten.',
          mode: 'brainstorming',
          actions: [
            {
              type: 'respond',
              message: 'Direkte Kurzantwort.',
            },
          ],
        },
      },
    ],
    text: [
      { text: 'Browser Idee eins.' },
      { text: 'Training Idee zwei.' },
      { text: 'Synthese: Zwei Ideen wurden gesammelt und verdichtet.' },
    ],
  });

  const finalState = await runBaseCase({
    llmAdapter,
    forceMode: 'brainstorming',
  });

  assert.equal(finalState.activeMode, 'brainstorming');
  assert.equal(finalState.modeRound, 1);
  assert.ok(finalState.modePhase);
  assert.equal(finalState.agentResponses.length, 2);
  assert.ok(finalState.responseMessage?.includes('Synthese'));
}

async function testDebateGuardrails() {
  const llmAdapter = createQueuedAdapter({
    structured: [
      {
        data: {
          reasoning: 'Ich antworte direkt.',
          mode: 'debate',
          actions: [
            {
              type: 'respond',
              message: 'Abkürzung statt Debatte.',
            },
          ],
        },
      },
    ],
    text: [
      { text: 'Pro: Wir sollten die Initiative starten.' },
      { text: 'Contra: Das Risiko ist noch zu hoch.' },
      { text: 'Synthese: Pro und Contra wurden abgewogen.' },
    ],
  });

  const finalState = await runBaseCase({
    llmAdapter,
    forceMode: 'debate',
  });

  assert.equal(finalState.activeMode, 'debate');
  assert.equal(finalState.agentResponses.length, 2);
  assert.ok(finalState.responseMessage?.includes('Synthese'));
}

async function testPlanningGuardrailsCreateObjective() {
  const llmAdapter = createQueuedAdapter({
    structured: [
      {
        data: {
          reasoning: 'Ich würde direkt planen.',
          mode: 'planning',
          actions: [
            {
              type: 'broadcast',
              prompt: 'Gebt kurz Machbarkeits-Input.',
              targetAgentIds: ['browser', 'training'],
            },
          ],
        },
      },
    ],
    text: [
      { text: 'Browser: Markt ist validierbar.' },
      { text: 'Training: Iteration ist machbar.' },
      { text: 'Synthese: Ziel und Meilensteine wurden abgeleitet.' },
    ],
  });

  const finalState = await runBaseCase({
    llmAdapter,
    forceMode: 'planning',
  });

  assert.equal(finalState.activeMode, 'planning');
  assert.ok(finalState.objectiveUpdates.length > 0);
  assert.ok(finalState.events.some((event) => event.type === 'objective_created'));
}

async function testParticipantOutputNormalization() {
  const llmAdapter = createQueuedAdapter({
    structured: [
      {
        data: {
          reasoning: 'Frage den Browser Agent und liefere die Antwort.',
          mode: 'free-discussion',
          actions: [
            {
              type: 'ask_agent',
              agentId: 'browser',
              question: 'Reagiere auf den Training Agent.',
            },
          ],
        },
      },
    ],
    text: [
      {
        text: '[Training Agent]: **Perfekt!** ## Nächster Schritt',
      },
    ],
  });

  const finalState = await runBaseCase({
    llmAdapter,
  });

  assert.equal(finalState.agentResponses.length, 1);
  assert.equal(finalState.agentResponses[0]?.rawContent, '@training Perfekt! Nächster Schritt');
}

async function testSynthesisOutputNormalization() {
  const llmAdapter = createQueuedAdapter({
    structured: [
      {
        data: {
          reasoning: 'Fasse direkt zusammen.',
          mode: 'synthesis',
          actions: [
            {
              type: 'synthesize',
            },
          ],
        },
      },
    ],
    text: [
      {
        text: '## Zusammenfassung\n**Wichtig:** Fokus auf Klarheit.',
      },
    ],
  });

  const finalState = await runBaseCase({
    llmAdapter,
    forceMode: 'synthesis',
  });

  assert.equal(finalState.responseMessage, 'Zusammenfassung\nWichtig: Fokus auf Klarheit.');
}

async function testPrivateClarificationRoutingNoLeak() {
  const llmAdapter = createQueuedAdapter({
    structured: [
      {
        data: {
          reasoning: 'Der Browser Agent braucht noch User-Kontext.',
          mode: 'free-discussion',
          actions: [
            {
              type: 'ask_agent',
              agentId: 'browser',
              question: 'Gib erst ein kurzes Gruppenupdate und stelle dann privat die Rückfrage.',
            },
          ],
        },
      },
    ],
    text: [
      {
        text: 'Öffentlicher Stand ist klar.\n\n[PRIVATE] Welche Budgetgrenze gilt für die Recherche?',
      },
    ],
  });

  const finalState = await runBaseCase({ llmAdapter });

  assert.equal(finalState.privateMessages.length, 0);
  assert.equal(finalState.pendingClarifications.length, 1);
  assert.equal(finalState.pendingClarifications[0]?.question, 'Welche Budgetgrenze gilt für die Recherche?');
  assert.ok(finalState.events.some(
    (event) => event.type === 'agent_done' && event.fullContent === 'Öffentlicher Stand ist klar.',
  ));
  assert.ok(finalState.events.some((event) => event.type === 'private_clarification_needed'));
  assert.ok(!finalState.events.some((event) => event.type === 'private_message'));
}

async function testPrivateMessageRoutingWithoutPublicBubble() {
  const llmAdapter = createQueuedAdapter({
    structured: [
      {
        data: {
          reasoning: 'Der Hinweis ist nur für den User relevant.',
          mode: 'free-discussion',
          actions: [
            {
              type: 'ask_agent',
              agentId: 'training',
              question: 'Schicke nur einen privaten Hinweis.',
            },
          ],
        },
      },
    ],
    text: [
      {
        text: '[PRIVATE] Ich habe dir die sensiblen Details im Einzelchat notiert.',
      },
    ],
  });

  const finalState = await runBaseCase({ llmAdapter });

  assert.equal(finalState.privateMessages.length, 1);
  assert.equal(finalState.pendingClarifications.length, 0);
  assert.ok(finalState.events.some((event) => event.type === 'private_message'));
  assert.ok(!finalState.events.some((event) => event.type === 'private_clarification_needed'));
  assert.ok(!finalState.events.some((event) => event.type === 'agent_done'));
  assert.ok(finalState.events.some((event) => event.type === 'agent_passed'));
}

async function testStreamingPrivateContentDoesNotLeak() {
  const llmAdapter = createQueuedAdapter({
    structured: [
      {
        data: {
          reasoning: 'Der Agent liefert kurz öffentlich und fragt dann privat nach.',
          mode: 'free-discussion',
          actions: [
            {
              type: 'ask_agent',
              agentId: 'browser',
              question: 'Gib öffentlich einen Satz und frage dann privat nach Budget.',
            },
          ],
        },
      },
    ],
    text: [
      {
        text: 'Öffentlich vorab. [PRIVATE] Welche Budgetgrenze gilt?',
      },
    ],
  });

  const run = streamGroupOrchestrator(
    createBaseInput(),
    createDeps(llmAdapter),
  );

  const events = [];
  for await (const event of run.events) {
    events.push(event);
  }
  await run.finalState;

  const streamedPublicContent = events
    .filter((event) => event.type === 'agent_token')
    .map((event) => event.token)
    .join('');

  assert.ok(!streamedPublicContent.includes('[PRIVATE]'));
  assert.ok(!streamedPublicContent.includes('Budgetgrenze'));
  assert.ok(events.some(
    (event) => event.type === 'agent_done' && event.fullContent === 'Öffentlich vorab.',
  ));
  assert.ok(events.some((event) => event.type === 'private_clarification_needed'));
}

async function testBreakoutLifecycleAndResult() {
  const llmAdapter = createQueuedAdapter({
    structured: [
      {
        data: {
          reasoning: 'Die Teilaufgabe soll separat im Breakout bearbeitet werden.',
          mode: 'task-delegation',
          actions: [
            {
              type: 'create_breakout',
              name: 'Research Squad',
              participantIds: ['browser', 'training'],
              task: 'Erarbeitet zwei marktfähige Optionen.',
              mode: 'brainstorming',
              reportBackTo: 'owner-agent',
              maxTurns: 3,
            },
          ],
        },
      },
      {
        data: {
          reasoning: 'Der Breakout sammelt Beiträge und fasst sie dann zusammen.',
          mode: 'brainstorming',
          actions: [
            {
              type: 'broadcast',
              prompt: 'Liefert je eine priorisierte Option.',
              targetAgentIds: ['browser', 'training'],
            },
            {
              type: 'synthesize',
            },
          ],
        },
      },
      {
        data: {
          reasoning: 'Das Hauptteam bestätigt die Übernahme des Breakout-Ergebnisses.',
          mode: 'task-delegation',
          actions: [
            {
              type: 'respond',
              message: 'Das Hauptteam hat das Breakout-Ergebnis übernommen.',
            },
          ],
        },
      },
    ],
    text: [
      {
        text: 'Option A: Schnell validieren.',
      },
      {
        text: 'Option B: Parallel pilotsieren.',
      },
      {
        text: 'Breakout-Ergebnis: Option A und Option B sind priorisiert.',
      },
    ],
  });

  const run = streamGroupOrchestrator(
    createBaseInput({ forceMode: 'task-delegation' }),
    createDeps(llmAdapter),
  );
  const streamedEvents: GroupOrchestrateEvent[] = [];
  for await (const event of run.events) {
    streamedEvents.push(event);
  }
  const finalState = await run.finalState;

  const breakoutCreated = streamedEvents.find(
    (event): event is Extract<GroupOrchestrateEvent, { type: 'breakout_created' }> =>
      event.type === 'breakout_created',
  );
  const breakoutResult = streamedEvents.find(
    (event): event is Extract<GroupOrchestrateEvent, { type: 'breakout_result' }> =>
      event.type === 'breakout_result',
  );

  assert.ok(breakoutCreated, 'breakout_created Event fehlt.');
  assert.ok(breakoutResult, 'breakout_result Event fehlt.');
  assert.equal(breakoutCreated.name, 'Research Squad');
  assert.equal(breakoutCreated.participants.length, 2);
  assert.equal(breakoutCreated.reportBackTo, 'owner-agent');
  assert.equal(breakoutResult.reportedByAgentId, 'browser');
  assert.match(breakoutResult.summary, /Option A und Option B/);
  assert.ok(finalState.agentResponses.some((response) =>
    response.agentId === breakoutResult.breakoutId
    && response.rawContent.includes('Option A und Option B')
  ));
}

async function testCreateAgentActionCarriesSettings() {
  const llmAdapter = createQueuedAdapter({
    structured: [
      {
        data: {
          reasoning: 'Ein spezialisierter Sub-Agent wird benötigt.',
          mode: 'planning',
          actions: [
            {
              type: 'create_agent',
              name: 'Research Ops',
              role: 'Research Specialist',
              description: 'Analysiert Markt und Wettbewerb.',
              icon: 'Search',
              color: '#38bdf8',
              parentAgentId: 'owner-agent',
              targetGroupId: 'group-1',
              addToGroup: true,
              capabilities: ['research', 'analysis'],
              settings: {
                llmModel: 'gpt-4o',
                systemPrompt: 'Du fokussierst dich auf Markt- und Wettbewerbsanalyse.',
                temperature: 0.2,
                maxTokens: 2048,
                enabledTools: ['browser.fakeLookup'],
                visualModeEnabled: false,
                humanInTheLoopTools: ['browser.fakeLookup'],
                multimodal: {
                  image: {
                    enabled: true,
                    provider: 'openai',
                    model: 'gpt-image-1',
                  },
                },
              },
            },
          ],
        },
      },
      {
        data: {
          reasoning: 'Die Agent-Erstellung ist abgeschlossen.',
          mode: 'planning',
          actions: [
            {
              type: 'respond',
              message: 'Der neue Spezialagent ist angelegt.',
            },
          ],
        },
      },
    ],
  });

  const run = streamGroupOrchestrator(
    createBaseInput({ forceMode: 'planning' }),
    createDeps(llmAdapter),
  );
  const streamedEvents: GroupOrchestrateEvent[] = [];
  for await (const event of run.events) {
    streamedEvents.push(event);
  }
  await run.finalState;

  const agentCreated = streamedEvents.find(
    (event): event is Extract<GroupOrchestrateEvent, { type: 'agent_created' }> =>
      event.type === 'agent_created',
  );

  assert.ok(agentCreated, 'agent_created Event fehlt.');
  assert.equal(agentCreated.name, 'Research Ops');
  assert.equal(agentCreated.role, 'Research Specialist');
  assert.equal(agentCreated.parentAgentId, 'owner-agent');
  assert.equal(agentCreated.targetGroupId, 'group-1');
  assert.equal(agentCreated.addToGroup, true);
  assert.deepEqual(agentCreated.capabilities, ['research', 'analysis']);
  assert.equal(agentCreated.settings?.llmModel, 'gpt-4o');
  assert.equal(agentCreated.settings?.visualModeEnabled, false);
  assert.equal(agentCreated.settings?.multimodal?.image?.model, 'gpt-image-1');
}

async function main() {
  initializeToolRegistry();

  const fakeTool: ModuleTool = {
    id: 'browser.fakeLookup',
    name: 'Fake Lookup',
    description: 'Liefert deterministische Testdaten für die Tool-Loop.',
    module: 'browser',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Suchanfrage',
        },
      },
      required: ['query'],
    },
    effects: [],
    requiresConfirmation: false,
    execute: async () => ({
      success: true,
      data: {
        items: ['result-a', 'result-b'],
      },
    }),
  };

  toolRegistry.register([fakeTool]);

  try {
    await testAskAgentToolLoopAndSynthesis();
    await testBroadcastAndSynthesis();
    await testInvalidStructuredOutputFallback();
    await testMaxTurnsGuard();
    await testSseSerializationHelpers();
    await testRespondPathStreaming();
    await testAskAgentPathStreaming();
    await testBroadcastPathStreaming();
    await testAbortStreaming();
    await testStructuredOutputNormalizationForRoleAndAllTargets();
    testParseOrchestrationModeCommand();
    testMatchingOrchestrationModeCommands();
    await testBrainstormingGuardrails();
    await testDebateGuardrails();
    await testPlanningGuardrailsCreateObjective();
    await testParticipantOutputNormalization();
    await testSynthesisOutputNormalization();
    await testPrivateClarificationRoutingNoLeak();
    await testPrivateMessageRoutingWithoutPublicBubble();
    await testStreamingPrivateContentDoesNotLeak();
    await testBreakoutLifecycleAndResult();
    await testCreateAgentActionCarriesSettings();
    console.log('Phase-2/3/4/5/6-Smoke-Tests erfolgreich.');
  } finally {
    toolRegistry.unregister('browser.fakeLookup');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
