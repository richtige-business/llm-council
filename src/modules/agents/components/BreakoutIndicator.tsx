import { ArrowUpRight, CheckCircle2, Loader2, Users, XCircle } from 'lucide-react';
import type { BreakoutSessionData } from '../types';

interface BreakoutIndicatorProps {
  sessions: BreakoutSessionData[];
  onOpenBreakout: (breakoutGroupId: string, breakoutConversationId: string | null) => void;
}

function getStatusLabel(session: BreakoutSessionData): string {
  switch (session.status) {
    case 'completed':
      return 'Abgeschlossen';
    case 'failed':
      return 'Fehlgeschlagen';
    default:
      return 'Läuft';
  }
}

function StatusIcon({ status }: { status: BreakoutSessionData['status'] }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />;
    case 'failed':
      return <XCircle className="h-3.5 w-3.5 text-rose-300" />;
    default:
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-300" />;
  }
}

export function BreakoutIndicator({ sessions, onOpenBreakout }: BreakoutIndicatorProps) {
  if (sessions.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-sm">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-white/70">
        <Users className="h-3.5 w-3.5 text-cyan-300" />
        <span>Breakout Sessions</span>
      </div>
      <div className="space-y-2">
        {sessions.map((session) => (
          <button
            key={session.breakoutId}
            type="button"
            onClick={() => onOpenBreakout(session.breakoutGroupId, session.breakoutConversationId)}
            className="flex w-full items-start justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-left transition-colors hover:bg-white/[0.06]"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <StatusIcon status={session.status} />
                <span className="truncate">{session.name}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-white/55">
                {session.status === 'failed' && session.error ? session.error : (session.summary || session.task)}
              </p>
              <p className="mt-1 text-[11px] text-white/40">
                {getStatusLabel(session)}
                {' · '}
                {session.participants.length} Teilnehmer
              </p>
            </div>
            <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/45" />
          </button>
        ))}
      </div>
    </div>
  );
}
