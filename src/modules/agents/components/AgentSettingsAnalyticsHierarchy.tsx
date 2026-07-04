// ============================================
// AgentSettingsAnalyticsHierarchy.tsx - Analytics & Hierarchie
//
// Zweck: Wiederverwendbare Panels fuer Modal und Settings-Seite
// Verwendet von: AgentSettingsPage, AgentSettingsModal
// ============================================

'use client';

import { useMemo, useState } from 'react';
import { BrainCircuit } from 'lucide-react';
import { useAgentsStore } from '../store';
import { useScheduledTasksStore } from '../tasks-store';
import { useAgentConfigStore } from '@/lib/agent/stores/agent-config-store';
import { CHARS_PER_TOKEN } from '../constants';
import { AGENT_ICON_MAP } from '../agent-meta';
import type { AgentUsageSummary, ChatConversation } from '../types';
import type { AgentListEntry } from './agent-settings-entries';

// --------------------------------------------
// Hilfsfunktionen
// --------------------------------------------

export type AnalyticsRange = 'today' | '7d' | '30d';

function approximateMessageTokens(content: string, explicitTokenCount?: number): number {
  return explicitTokenCount ?? Math.max(1, Math.ceil(content.length / CHARS_PER_TOKEN));
}

export function formatAgentSettingsDateTime(timestamp?: number | null): string {
  if (!timestamp) return 'Keine Daten';
  return new Date(timestamp).toLocaleString('de-DE', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function createUsageSummary(conversations: ChatConversation[]): AgentUsageSummary {
  let totalTokens = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  let lastActiveAt: number | null = null;

  conversations.forEach((conversation) => {
    totalTokens += conversation.totalTokens || 0;
    lastActiveAt = lastActiveAt ? Math.max(lastActiveAt, conversation.updatedAt) : conversation.updatedAt;

    conversation.messages.forEach((message) => {
      const tokens = approximateMessageTokens(message.content, message.tokenCount);
      if (message.role === 'assistant') {
        completionTokens += tokens;
      } else {
        promptTokens += tokens;
      }
    });
  });

  return {
    totalTokens,
    promptTokens,
    completionTokens,
    estimatedCost: Number((totalTokens * 0.000002).toFixed(4)),
    conversationsCount: conversations.length,
    lastActiveAt,
  };
}

// --------------------------------------------
// Kleine UI-Bausteine
// --------------------------------------------

export function AnalyticsCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
      <p className="text-[10px] uppercase tracking-wide text-white/40 sm:text-xs">{title}</p>
      <p className="mt-1.5 text-lg font-semibold text-white sm:mt-2 sm:text-2xl">{value}</p>
    </div>
  );
}

function HierarchySection({
  title,
  items,
  onFocusAgent,
  emptyLabel,
}: {
  title: string;
  items: AgentListEntry[];
  onFocusAgent?: (agentId: string) => void;
  emptyLabel: string;
}) {
  return (
    <div>
      <h4 className="mb-2 text-[10px] uppercase tracking-wide text-white/40 sm:text-xs">{title}</h4>
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((entry) => {
            const IconComponent = AGENT_ICON_MAP[entry.icon] || BrainCircuit;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onFocusAgent?.(entry.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left transition-colors hover:bg-white/10"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${entry.color}25`, color: entry.color }}
                >
                  <IconComponent className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{entry.name}</p>
                  <p className="text-xs text-white/45">{entry.kind}</p>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-white/45">{emptyLabel}</p>
      )}
    </div>
  );
}

// --------------------------------------------
// Analytics-Panel
// --------------------------------------------

export function AgentSettingsAnalyticsPanel({
  focusedEntryId,
  llmModelFallback,
  compact,
}: {
  focusedEntryId: string;
  llmModelFallback: string;
  /** Schmalere Typografie im Modal */
  compact?: boolean;
}) {
  const conversations = useAgentsStore((state) => state.conversations);
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>('7d');
  const [analyticsNow] = useState(() => Date.now());

  const timeframeStart = useMemo(() => {
    if (analyticsRange === 'today') return analyticsNow - 24 * 60 * 60 * 1000;
    if (analyticsRange === '7d') return analyticsNow - 7 * 24 * 60 * 60 * 1000;
    return analyticsNow - 30 * 24 * 60 * 60 * 1000;
  }, [analyticsNow, analyticsRange]);

  const relevantConversations = useMemo(
    () =>
      conversations.filter(
        (conversation) =>
          conversation.updatedAt >= timeframeStart &&
          (conversation.agentId === focusedEntryId ||
            (conversation.participantRoles || []).some((participant) => participant.agentId === focusedEntryId))
      ),
    [conversations, focusedEntryId, timeframeStart]
  );

  const usageSummary = useMemo(() => createUsageSummary(relevantConversations), [relevantConversations]);

  const conversationBreakdown = useMemo(
    () =>
      [...relevantConversations]
        .map((conversation) => ({
          id: conversation.id,
          title: conversation.title,
          tokens:
            conversation.totalTokens ||
            conversation.messages.reduce(
              (sum, message) => sum + approximateMessageTokens(message.content, message.tokenCount),
              0
            ),
          updatedAt: conversation.updatedAt,
        }))
        .sort((a, b) => b.tokens - a.tokens)
        .slice(0, 5),
    [relevantConversations]
  );

  const modelBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    relevantConversations.forEach((conversation) => {
      const conversationModel = conversation.model || llmModelFallback || 'Standard';
      counts.set(conversationModel, (counts.get(conversationModel) || 0) + (conversation.totalTokens || 0));
    });
    return Array.from(counts.entries()).map(([label, tokens]) => ({ label, tokens }));
  }, [llmModelFallback, relevantConversations]);

  const topModelTokens = Math.max(1, ...modelBreakdown.map((entry) => entry.tokens));
  const topConversationTokens = Math.max(1, ...conversationBreakdown.map((entry) => entry.tokens));

  const rangeBtn = (range: AnalyticsRange, label: string) => (
    <button
      key={range}
      type="button"
      onClick={() => setAnalyticsRange(range)}
      className={`rounded-full px-2.5 py-1 text-[11px] sm:px-3 sm:py-1.5 sm:text-xs ${
        analyticsRange === range ? 'bg-white/15 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className="flex flex-wrap gap-2">
        {rangeBtn('today', 'Heute')}
        {rangeBtn('7d', '7 Tage')}
        {rangeBtn('30d', '30 Tage')}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsCard title="Gesamt-Tokens" value={usageSummary.totalTokens.toLocaleString('de-DE')} />
        <AnalyticsCard title="Input-Tokens" value={usageSummary.promptTokens.toLocaleString('de-DE')} />
        <AnalyticsCard title="Output-Tokens" value={usageSummary.completionTokens.toLocaleString('de-DE')} />
        <AnalyticsCard title="Geschaetzte Kosten" value={`~ $${usageSummary.estimatedCost.toFixed(4)}`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:rounded-3xl sm:p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-white sm:text-sm">Top Conversations</h3>
            <span className="text-[10px] text-white/40 sm:text-xs">Estimated analytics</span>
          </div>
          <div className="space-y-3">
            {conversationBreakdown.length > 0 ? (
              conversationBreakdown.map((conversation) => (
                <div key={conversation.id}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-xs sm:text-sm">
                    <span className="truncate text-white/75">{conversation.title}</span>
                    <span className="shrink-0 text-white/45">{conversation.tokens.toLocaleString('de-DE')}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5">
                    <div
                      className="h-2 rounded-full bg-indigo-400"
                      style={{ width: `${Math.max(8, (conversation.tokens / topConversationTokens) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-white/45">Keine Konversationen im gewaehlten Zeitraum.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:rounded-3xl sm:p-4">
          <h3 className="mb-3 text-xs font-semibold text-white sm:text-sm">Breakdown nach Modell</h3>
          <div className="space-y-3">
            {modelBreakdown.length > 0 ? (
              modelBreakdown.map((entry) => (
                <div key={entry.label}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-xs sm:text-sm">
                    <span className="truncate text-white/75">{entry.label}</span>
                    <span className="shrink-0 text-white/45">{entry.tokens.toLocaleString('de-DE')}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5">
                    <div
                      className="h-2 rounded-full bg-fuchsia-400"
                      style={{ width: `${Math.max(8, (entry.tokens / topModelTokens) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-white/45">Noch keine modellbezogenen Nutzungsdaten.</p>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white/55 sm:mt-6 sm:rounded-2xl sm:p-3 sm:text-sm">
            <p>Letzte Aktivitaet: {formatAgentSettingsDateTime(usageSummary.lastActiveAt)}</p>
            <p className="mt-1">Beteiligte Konversationen: {usageSummary.conversationsCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------
// Hierarchie-Panel
// --------------------------------------------

export function AgentSettingsHierarchyPanel({
  focusedEntry,
  entries,
  onFocusAgent,
  compact,
}: {
  focusedEntry: AgentListEntry;
  entries: AgentListEntry[];
  onFocusAgent?: (agentId: string) => void;
  compact?: boolean;
}) {
  const tasks = useScheduledTasksStore((state) => state.tasks);
  const runs = useScheduledTasksStore((state) => state.runs);

  const parentEntry = useMemo(() => {
    if (focusedEntry.parentGroupId) {
      return entries.find((entry) => entry.id === focusedEntry.parentGroupId) || null;
    }
    if (focusedEntry.parentId) {
      return entries.find((entry) => entry.id === focusedEntry.parentId) || null;
    }
    if (focusedEntry.kind === 'system' && focusedEntry.id !== 'master') {
      return entries.find((entry) => entry.id === 'master') || null;
    }
    return null;
  }, [entries, focusedEntry]);

  const childEntries = useMemo(
    () =>
      entries.filter(
        (entry) => entry.parentId === focusedEntry.id || entry.parentGroupId === focusedEntry.id
      ),
    [entries, focusedEntry.id]
  );

  const groupMemberships = useMemo(
    () =>
      entries.filter(
        (entry) =>
          entry.kind === 'group' &&
          (entry.participantRoles || []).some((participant) => participant.agentId === focusedEntry.id)
      ),
    [entries, focusedEntry.id]
  );

  const hierarchyRoot = useMemo(() => {
    if (!focusedEntry.rootGroupId) return null;
    return entries.find((entry) => entry.id === focusedEntry.rootGroupId) || null;
  }, [entries, focusedEntry.rootGroupId]);

  const relatedTasks = useMemo(
    () => tasks.filter((task) => task.targetId === focusedEntry.id),
    [focusedEntry.id, tasks]
  );

  const relatedRuns = useMemo(() => {
    const taskIds = new Set(relatedTasks.map((task) => task.id));
    return runs.filter((run) => taskIds.has(run.taskId)).slice(0, 5);
  }, [relatedTasks, runs]);

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsCard title="Parent" value={parentEntry?.name || 'Keiner'} />
        <AnalyticsCard title="Children" value={String(childEntries.length)} />
        <AnalyticsCard title="Groups" value={String(groupMemberships.length)} />
        <AnalyticsCard title="Scheduled Tasks" value={String(relatedTasks.length)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:rounded-3xl sm:p-4">
          <h3 className="mb-3 text-xs font-semibold text-white sm:text-sm">Orchestration Hierarchy</h3>
          <div className="space-y-4">
            <HierarchySection
              title="Parent"
              items={parentEntry ? [parentEntry] : []}
              onFocusAgent={onFocusAgent}
              emptyLabel="Kein Parent-Agent"
            />
            <HierarchySection
              title="Children"
              items={childEntries}
              onFocusAgent={onFocusAgent}
              emptyLabel="Keine Child-Agents oder Untergruppen"
            />
            <HierarchySection
              title="Group Memberships"
              items={groupMemberships}
              onFocusAgent={onFocusAgent}
              emptyLabel="Keine Gruppen-Mitgliedschaften"
            />
            {hierarchyRoot ? (
              <HierarchySection
                title="Root Group"
                items={[hierarchyRoot]}
                onFocusAgent={onFocusAgent}
                emptyLabel="Keine Root Group"
              />
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:rounded-3xl sm:p-4">
            <h3 className="mb-3 text-xs font-semibold text-white sm:text-sm">Linked Scheduled Tasks</h3>
            <div className="space-y-2">
              {relatedTasks.length > 0 ? (
                relatedTasks.map((task) => (
                  <div key={task.id} className="rounded-xl border border-white/10 bg-white/5 p-2.5 sm:rounded-2xl sm:p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-medium text-white sm:text-sm">{task.title}</p>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] uppercase tracking-wide text-white/55 sm:text-[10px]">
                        {task.type}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-white/45 sm:text-xs">
                      Naechster Lauf: {formatAgentSettingsDateTime(task.nextRunAt)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/45">Keine verknuepften Scheduled Tasks.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:rounded-3xl sm:p-4">
            <h3 className="mb-3 text-xs font-semibold text-white sm:text-sm">Recent Task Runs</h3>
            <div className="space-y-2">
              {relatedRuns.length > 0 ? (
                relatedRuns.map((run) => (
                  <div key={run.id} className="rounded-xl border border-white/10 bg-white/5 p-2.5 sm:rounded-2xl sm:p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-medium text-white sm:text-sm">{run.status}</p>
                      <span className="text-[11px] text-white/45 sm:text-xs">
                        {formatAgentSettingsDateTime(run.startedAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-white/55 sm:text-xs">
                      {run.resultSummary || run.errorMessage || 'Kein Detailtext vorhanden.'}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/45">Noch keine verknuepften Task-Laeufe.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
