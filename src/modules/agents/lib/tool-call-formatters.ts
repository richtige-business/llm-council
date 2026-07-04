import type { AgentToolCall } from '@/lib/agent/types';

function toTitleCaseSegment(segment: string): string {
  if (!segment) {
    return '';
  }

  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function formatToolCallName(name: string): string {
  const normalized = name.replace(/[._]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return 'Tool';
  }

  return normalized
    .split(' ')
    .map((segment) => toTitleCaseSegment(segment))
    .join(' ');
}

export function formatToolCallDuration(durationMs?: number): string | null {
  if (typeof durationMs !== 'number' || Number.isNaN(durationMs) || durationMs < 0) {
    return null;
  }

  if (durationMs < 1000) {
    return `${Math.round(durationMs)} ms`;
  }

  return `${(durationMs / 1000).toFixed(1)} s`;
}

export function getToolCallStatus(toolCall: AgentToolCall): 'success' | 'error' {
  return toolCall.result.success ? 'success' : 'error';
}

export function stringifyToolCallValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (
    typeof value === 'number'
    || typeof value === 'boolean'
    || value === null
  ) {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function isStructuredToolCallValue(value: unknown): value is Record<string, unknown> | unknown[] {
  return typeof value === 'object' && value !== null;
}

export function getToolCallsSummaryLabel(toolCalls: AgentToolCall[]): string {
  const count = toolCalls.length;
  return `${count} Tool${count === 1 ? '' : 's'} ausgeführt`;
}
