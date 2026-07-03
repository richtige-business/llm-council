import type { OrchestrationMode } from '../types';

export interface OrchestrationModeCommandOption {
  command: string;
  aliases: string[];
  mode: OrchestrationMode;
  label: string;
  description: string;
}

export const ORCHESTRATION_MODE_COMMAND_OPTIONS: OrchestrationModeCommandOption[] = [
  {
    command: '/brainstorm',
    aliases: ['/brainstorm', '/brainstorming'],
    mode: 'brainstorming',
    label: 'Brainstorming',
    description: 'Ideen gemeinsam sammeln und verdichten',
  },
  {
    command: '/debate',
    aliases: ['/debate'],
    mode: 'debate',
    label: 'Debatte',
    description: 'Pro und Contra strukturiert gegeneinanderstellen',
  },
  {
    command: '/delegate',
    aliases: ['/delegate', '/delegation', '/task-delegation'],
    mode: 'task-delegation',
    label: 'Aufgabenverteilung',
    description: 'Aufgaben zerlegen, zuweisen und integrieren',
  },
  {
    command: '/review',
    aliases: ['/review'],
    mode: 'review',
    label: 'Review',
    description: 'Ergebnisse gemeinsam bewerten',
  },
  {
    command: '/plan',
    aliases: ['/plan', '/planning'],
    mode: 'planning',
    label: 'Planung',
    description: 'Ziele und Meilensteine ausarbeiten',
  },
  {
    command: '/synthesize',
    aliases: ['/synthesize', '/summary', '/summarize'],
    mode: 'synthesis',
    label: 'Synthese',
    description: 'Beiträge gezielt zusammenführen',
  },
];

export const ORCHESTRATION_MODE_COMMANDS: Record<string, OrchestrationMode> =
  ORCHESTRATION_MODE_COMMAND_OPTIONS.reduce<Record<string, OrchestrationMode>>((acc, option) => {
    option.aliases.forEach((alias) => {
      acc[alias] = option.mode;
    });
    return acc;
  }, {});

export interface ParsedOrchestrationModeCommand {
  forceMode?: OrchestrationMode;
  message: string;
  consumedCommand: boolean;
}

export function getMatchingOrchestrationModeCommands(query: string): OrchestrationModeCommandOption[] {
  const normalizedQuery = query.trim().toLowerCase().replace(/^\/+/, '');
  if (!normalizedQuery) {
    return ORCHESTRATION_MODE_COMMAND_OPTIONS;
  }

  return ORCHESTRATION_MODE_COMMAND_OPTIONS.filter((option) => {
    const haystacks = [
      option.command,
      option.label,
      option.description,
      ...option.aliases,
    ].map((entry) => entry.toLowerCase());

    return haystacks.some((entry) => entry.includes(normalizedQuery));
  });
}

export function parseOrchestrationModeCommand(input: string): ParsedOrchestrationModeCommand {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) {
    return {
      message: input.trim(),
      consumedCommand: false,
    };
  }

  const [commandToken, ...rest] = trimmed.split(/\s+/);
  const normalizedCommand = commandToken.toLowerCase();
  const matchedMode = ORCHESTRATION_MODE_COMMANDS[normalizedCommand];

  if (matchedMode) {
    return {
      forceMode: matchedMode,
      message: rest.join(' ').trim(),
      consumedCommand: true,
    };
  }

  if (normalizedCommand === '/mode') {
    const [requestedModeToken, ...messageTokens] = rest;
    const requestedMode = requestedModeToken
      ? ORCHESTRATION_MODE_COMMANDS[`/${requestedModeToken.toLowerCase().replace(/^\/+/, '')}`]
      : undefined;

    if (requestedMode) {
      return {
        forceMode: requestedMode,
        message: messageTokens.join(' ').trim(),
        consumedCommand: true,
      };
    }
  }

  return {
    message: input.trim(),
    consumedCommand: false,
  };
}
