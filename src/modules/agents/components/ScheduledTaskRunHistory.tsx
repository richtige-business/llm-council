// ============================================
// ScheduledTaskRunHistory.tsx - Verlauf vergangener Task-Laeufe
//
// Zweck: Zeigt die letzten Ausfuehrungen der aktuell gewaehlten
//        Scheduled Task inklusive Status und Kurzresultat
// Verwendet von: ScheduledTasksPage.tsx
// ============================================

'use client';

import type { ScheduledAgentTaskRun } from '../types';

interface ScheduledTaskRunHistoryProps {
  runs: ScheduledAgentTaskRun[];
}

function formatRunDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('de-DE', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function ScheduledTaskRunHistory({ runs }: ScheduledTaskRunHistoryProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-white">Run History</h3>
        <p className="mt-1 text-xs text-white/45">MVP: lokale Lauf-Historie mit Stub-Ausfuehrungen und manuellen Probelauf-Eintraegen.</p>
      </div>

      <div className="space-y-3">
        {runs.length > 0 ? (
          runs.map((run) => (
            <div key={run.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{run.status}</p>
                  <p className="text-xs text-white/45">{formatRunDate(run.startedAt)}</p>
                </div>
                {typeof run.estimatedTokens === 'number' ? (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/55">
                    ~{run.estimatedTokens} Tokens
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-white/55">
                {run.resultSummary || run.errorMessage || 'Kein Ergebnistext vorhanden.'}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-white/45">Noch keine Task-Laeufe vorhanden.</p>
        )}
      </div>
    </div>
  );
}

