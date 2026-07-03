// ============================================
// orchestrator-prompts.ts - System-Prompts für Gruppen-Orchestrierung
//
// Zweck: Baut dynamische System-Prompts für Owner/Admin-Orchestratoren,
//        Sub-Admins und Modus-spezifische Steuerung.
// Verwendet von: group-orchestrator, group-orchestrate Route
// ============================================

import { ORCHESTRATION_MODES } from '@/modules/agents/constants';
import type {
  AuthorityScope,
  GroupChatParticipantRole,
  GroupObjective,
  OrchestrationMode,
} from '@/modules/agents/types';
import { buildGroupContextPromptBlock } from './group-context-builder';
import { buildOrchestratorDecisionSchemaPrompt } from './orchestrator-tools';

// --------------------------------------------
// Hilfsfunktionen für Prompt-Bausteine
// --------------------------------------------

function formatScope(scope?: AuthorityScope): string {
  if (!scope) {
    return 'Kein expliziter Scope definiert.';
  }

  return [
    `Domain: ${scope.domain}`,
    `Beschreibung: ${scope.description || 'keine'}`,
    `Darf im Scope delegieren: ${scope.canDelegateInScope ? 'ja' : 'nein'}`,
    `Darf Breakouts erstellen: ${scope.canCreateBreakouts ? 'ja' : 'nein'}`,
    `Darf Artefakte verwalten: ${scope.canManageArtifacts ? 'ja' : 'nein'}`,
    `Subordinates: ${scope.subordinateAgentIds?.join(', ') || 'keine'}`,
  ].join('\n');
}

function formatParticipants(participants: GroupChatParticipantRole[]): string {
  if (participants.length === 0) {
    return '- keine Teilnehmer';
  }

  return participants
    .map((participant) => [
      `- ${participant.agentId}`,
      `  Rolle: ${participant.role || 'Teilnehmer'}`,
      `  Authority: ${participant.authority || 'member'}`,
      `  Capabilities: ${participant.capabilities?.join(', ') || 'keine'}`,
      `  Scope: ${participant.scope ? participant.scope.domain : 'keiner'}`,
    ].join('\n'))
    .join('\n');
}

function formatObjectives(objectives: GroupObjective[]): string {
  if (objectives.length === 0) {
    return '- keine aktiven Ziele';
  }

  return objectives
    .map((objective) => {
      return [
        `- ${objective.title} (${objective.id})`,
        `  Status: ${objective.status}`,
        `  Priorität: ${objective.priority}`,
        `  Typ: ${objective.type}`,
        `  Fortschritt: ${objective.progress ?? 0}%`,
        `  Beschreibung: ${objective.description}`,
      ].join('\n');
    })
    .join('\n');
}

export function buildModeInstructions(
  mode: OrchestrationMode,
  options?: {
    modePhase?: string | null;
    modeRound?: number;
  },
): string {
  const modeConfig = ORCHESTRATION_MODES[mode];

  const phaseHints: Record<OrchestrationMode, string[]> = {
    'free-discussion': [
      'Halte die Diskussion offen, aber zielgerichtet.',
      'Wähle nur dann mehrere Sprecher, wenn neue Perspektiven wirklich Mehrwert liefern.',
    ],
    brainstorming: [
      'Arbeite in Phasen: Generate → Filter → Organize → Evaluate → Decide.',
      'Erzeuge zuerst Vielfalt, bevor du komprimierst.',
    ],
    debate: [
      'Arbeite in Phasen: Setup → Opening → Cross-Examination → Dissent Check → Verdict.',
      'Achte bewusst auf echten Dissens statt bloßer Harmonie.',
    ],
    'task-delegation': [
      'Arbeite in Phasen: Decompose → Assign → Execute → Report → Integrate.',
      'Delegiere präzise und nur an geeignete Teilnehmer.',
    ],
    review: [
      'Arbeite in Phasen: Present → Individual → Anonymize → Discuss → Synthesize.',
      'Priorisiere fundierte Kritik und konkrete Verbesserungsvorschläge.',
    ],
    synthesis: [
      'Fasse die relevanten Erkenntnisse präzise zusammen.',
      'Treffe wenn möglich eine klare Empfehlung oder Entscheidung.',
    ],
    planning: [
      'Arbeite in Phasen: Input → Draft → Feedback → Finalize.',
      'Leite daraus konkrete Ziele und Meilensteine ab.',
    ],
  };

  return [
    `Aktiver Modus: ${modeConfig.label}`,
    `Beschreibung: ${modeConfig.description}`,
    options?.modePhase ? `Aktuelle Phase: ${options.modePhase}` : '',
    typeof options?.modeRound === 'number' && options.modeRound > 0
      ? `Bisherige Modus-Runden: ${options.modeRound}`
      : '',
    'Modus-Regeln:',
    ...phaseHints[mode].map((entry) => `- ${entry}`),
    'Action-Orientierung:',
    ...(mode === 'brainstorming'
      ? [
          '- Erwarte kollaborative Input-Sammlung vor der finalen Synthese.',
          '- Vermeide respond-only-Abkürzungen.',
        ]
      : mode === 'debate'
        ? [
            '- Erzeuge sichtbar unterschiedliche Positionen.',
            '- Führe am Ende eine begründete Synthese oder ein Urteil herbei.',
          ]
        : mode === 'task-delegation'
          ? [
              '- Zerlege Aufgaben in konkrete Arbeitspakete.',
              '- Bevorzuge delegate/ask_sub_admin/ask_agent vor einer bloßen Direktantwort.',
            ]
          : mode === 'review'
            ? [
                '- Sammle erst unabhängige Bewertungen, dann verdichte sie.',
                '- Synthese soll Kritik und Empfehlung enthalten.',
              ]
            : mode === 'planning'
              ? [
                  '- Sammle Input und leite daraus konkrete Ziele oder Objective-Updates ab.',
                  '- Eine reine Direktantwort ohne Planstruktur ist nur im Ausnahmefall erlaubt.',
                ]
              : mode === 'synthesis'
                ? [
                    '- Verdichte vorhandene Beiträge präzise und entscheidungsorientiert.',
                  ]
                : [
                    '- Nutze nur dann mehrere Sprecher, wenn sie echten Mehrwert liefern.',
                  ]),
  ].filter(Boolean).join('\n');
}

// --------------------------------------------
// Owner-/Admin-Systemprompt
// Baut die Steuerungsinstruktionen für den zentralen
// Orchestrator aus Authority, Teilnehmern und Zielen.
// --------------------------------------------

export function buildOrchestratorSystemPrompt(params: {
  adminAgent: GroupChatParticipantRole;
  allParticipants: GroupChatParticipantRole[];
  objectives: GroupObjective[];
  groupContext?: unknown;
  mode: OrchestrationMode;
  mentionedAgentIds?: string[];
  modePhase?: string | null;
  modeRound?: number;
}): string {
  const {
    adminAgent,
    allParticipants,
    objectives,
    groupContext,
    mode,
    mentionedAgentIds = [],
    modePhase,
    modeRound = 0,
  } = params;
  const defaultTargetAgentIds = allParticipants
    .filter((participant) =>
      participant.authority !== 'observer' && participant.agentId !== adminAgent.agentId)
    .map((participant) => participant.agentId);

  return [
    '# GROUP ORCHESTRATOR',
    `Du orchestrierst diese Gruppe als "${adminAgent.role || adminAgent.agentId}".`,
    `Agent-ID: ${adminAgent.agentId}`,
    `Authority: ${adminAgent.authority || 'member'}`,
    '',
    '## Eigener Scope',
    formatScope(adminAgent.scope),
    '',
    '## Teilnehmer',
    formatParticipants(allParticipants),
    '',
    '## Ziele',
    formatObjectives(objectives),
    '',
    '## Explizit erwähnte Teilnehmer',
    mentionedAgentIds.length > 0
      ? mentionedAgentIds.map((agentId) => `- ${agentId}`).join('\n')
      : '- keine',
    '',
    '## Modus',
    buildModeInstructions(mode, { modePhase, modeRound }),
    '',
    '## Channel-Regeln',
    '- Gruppenchat für gruppenrelevante Diskussion, Delegation, Entscheidungen und Ergebnisse.',
    '- Private Nachrichten nur, wenn ausschließlich der User adressiert werden muss.',
    '- Nutze `private_clarification`, wenn ein Teilnehmer im Privatchat gezielt fehlende User-Infos einholen soll.',
    '- Nutze `private_message`, wenn der User einen rein privaten Hinweis bekommen soll, ohne dass eine Antwort zwingend nötig ist.',
    '- Sobald etwas privat geroutet wird, darf derselbe Inhalt NICHT parallel im Gruppenchat wiederholt werden.',
    '- Verwende keine öffentliche `ask_agent`- oder `broadcast`-Aktion für rein user-spezifische Rückfragen.',
    '- Beobachter (`authority: observer`) niemals aktiv einplanen oder delegieren.',
    '',
    '## Delegations-Regeln',
    '- Owner/Admin dürfen steuern; Member liefern Inhalte; Observer bleiben passiv.',
    '- Delegiere nur an reale Teilnehmer-IDs der aktuellen Gruppe.',
    '- Wenn ein Scope verletzt würde, reduziere die Aktion oder wähle `respond`.',
    '- Nutze `create_breakout`, wenn eine klar abgegrenzte Teilaufgabe besser in einer Untergruppe bearbeitet werden sollte.',
    '- Nutze `create_agent`, wenn ein neuer spezialisierter Sub-Agent langfristig sinnvoll ist. Gib dann möglichst konkrete Settings und die gewünschte Einbindung an.',
    '',
    '## Structured Output',
    buildOrchestratorDecisionSchemaPrompt({
      participants: allParticipants,
      defaultTargetAgentIds,
      requestedMode: mode,
      modePhase: modePhase || undefined,
    }),
    '',
    '## Gruppenkontext',
    buildGroupContextPromptBlock(groupContext),
  ].filter(Boolean).join('\n\n');
}

// --------------------------------------------
// Sub-Admin-Prompt
// Schränkt Delegation auf den eigenen Scope und die
// hinterlegten subordinateAgentIds ein.
// --------------------------------------------

export function buildSubAdminSystemPrompt(params: {
  adminAgent: GroupChatParticipantRole;
  allParticipants: GroupChatParticipantRole[];
  objectives: GroupObjective[];
  delegatedTask: string;
  groupContext?: unknown;
  mode: OrchestrationMode;
  modePhase?: string | null;
  modeRound?: number;
}): string {
  const {
    adminAgent,
    allParticipants,
    objectives,
    delegatedTask,
    groupContext,
    mode,
    modePhase,
    modeRound = 0,
  } = params;
  const subordinates = adminAgent.scope?.subordinateAgentIds || [];
  const defaultTargetAgentIds = subordinates.length > 0
    ? subordinates
    : allParticipants
        .filter((participant) =>
          participant.authority !== 'observer' && participant.agentId !== adminAgent.agentId)
        .map((participant) => participant.agentId);

  return [
    '# SUB-ADMIN ORCHESTRATOR',
    `Du bearbeitest eine delegierte Aufgabe als "${adminAgent.role || adminAgent.agentId}".`,
    `Agent-ID: ${adminAgent.agentId}`,
    `Authority: ${adminAgent.authority || 'member'}`,
    '',
    '## Delegierte Aufgabe',
    delegatedTask,
    '',
    '## Erlaubter Scope',
    formatScope(adminAgent.scope),
    '',
    '## Erlaubte Subordinates',
    subordinates.length > 0 ? subordinates.map((entry) => `- ${entry}`).join('\n') : '- keine expliziten Subordinates',
    '',
    '## Teilnehmer',
    formatParticipants(allParticipants),
    '',
    '## Ziele',
    formatObjectives(objectives),
    '',
    '## Modus',
    buildModeInstructions(mode, { modePhase, modeRound }),
    '',
    '## Harte Regeln',
    '- Delegiere nur innerhalb deines Scopes.',
    '- Delegiere nur an subordinateAgentIds, wenn diese vorhanden sind.',
    '- Wenn keine zulässige Delegation möglich ist, liefere eine knappe Synthese oder Rückfrage statt unerlaubter Aktionen.',
    '- Nutze `private_clarification`, wenn nur der User fehlende Informationen liefern kann.',
    '- Nutze `private_message` nur für user-exklusive Hinweise ohne notwendige Antwort.',
    '- Private Inhalte dürfen nicht zusätzlich im Gruppenchat zusammengefasst oder wiederholt werden.',
    '- `create_breakout` nur verwenden, wenn die Teilaufgabe mit einem kleineren Team sinnvoll separat bearbeitet werden kann.',
    '- `create_agent` nur verwenden, wenn Rolle, Beschreibung und gewünschte Settings hinreichend klar sind.',
    '',
    '## Structured Output',
    buildOrchestratorDecisionSchemaPrompt({
      participants: allParticipants,
      defaultTargetAgentIds,
      requestedMode: mode,
      modePhase: modePhase || undefined,
    }),
    '',
    '## Gruppenkontext',
    buildGroupContextPromptBlock(groupContext),
  ].filter(Boolean).join('\n\n');
}
