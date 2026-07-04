// ============================================
// ArtifactsPage.tsx - Uebersicht aller abgeschlossenen Council-Ergebnisse
//
// Zweck: Listet alle Council-Runs (gespeicherte Councils + aktiver
//        Draft) mit Status 'completed' auf und bietet PDF/DOCX-Download.
// Verwendet von: /agents/artifacts Route
// ============================================

'use client';

import { useMemo } from 'react';
import { FileStack } from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { useAgentsStore } from '../store';
import type { CouncilRunData, CouncilSeatMemberData } from '../types';
import { ArtifactExportMenu } from './ArtifactExportMenu';

interface ArtifactEntry {
  run: CouncilRunData;
  seatMembers: CouncilSeatMemberData[];
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
}

export function ArtifactsPage() {
  const councils = useAgentsStore((state) => state.councils);
  const draftId = useAgentsStore((state) => state.activeCouncilDraftId);
  const draftName = useAgentsStore((state) => state.activeCouncilDraftName);
  const draftRuns = useAgentsStore((state) => state.activeCouncilDraftRuns);
  const draftSeatMembers = useAgentsStore((state) => state.activeCouncilDraftSeatMembers);
  const { textColor, surface, designStyle } = useThemeStyles();

  const entries = useMemo<ArtifactEntry[]>(() => {
    const fromCouncils = councils.flatMap((council) =>
      (council.runs || [])
        .filter((run) => run.stage === 'completed' && run.finalResponse)
        .map((run) => ({ run, seatMembers: council.seatMembers }))
    );

    const fromDraft = draftId
      ? draftRuns
          .filter((run) => run.stage === 'completed' && run.finalResponse)
          .map((run) => ({
            run: { ...run, councilName: run.councilName || draftName || 'Unbenannter Council' },
            seatMembers: draftSeatMembers,
          }))
      : [];

    return [...fromCouncils, ...fromDraft].sort(
      (a, b) => (b.run.updatedAt || b.run.createdAt) - (a.run.updatedAt || a.run.createdAt)
    );
  }, [councils, draftId, draftName, draftRuns, draftSeatMembers]);

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-4 overflow-y-auto p-6">
      <div className="flex items-center gap-2.5">
        <FileStack className="h-5 w-5" style={{ color: textColor, opacity: 0.7 }} />
        <h1 className="text-lg font-semibold" style={{ color: textColor }}>Artifacts</h1>
      </div>
      <p className="text-sm" style={{ color: textColor, opacity: 0.5 }}>
        Alle abgeschlossenen Council-Ergebnisse als PDF oder DOCX herunterladen.
      </p>

      {entries.length === 0 ? (
        <div
          className="mt-6 flex flex-col items-center justify-center gap-2 rounded-2xl px-6 py-16 text-center"
          style={surface.base}
        >
          <FileStack className="h-8 w-8" style={{ color: textColor, opacity: 0.25 }} />
          <p className="text-sm" style={{ color: textColor, opacity: 0.5 }}>
            Noch keine abgeschlossenen Council-Ergebnisse.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry) => (
            <div
              key={entry.run.id}
              className="flex items-center justify-between gap-4 rounded-xl px-4 py-3"
              style={{
                ...surface.base,
                border: designStyle === 'brutal' ? '2px solid #000' : surface.base.border,
              }}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium" style={{ color: textColor }}>
                  {entry.run.councilName}
                </div>
                <div className="truncate text-xs" style={{ color: textColor, opacity: 0.5 }}>
                  {entry.run.prompt}
                </div>
                <div className="mt-0.5 text-[11px]" style={{ color: textColor, opacity: 0.35 }}>
                  {formatDate(entry.run.updatedAt || entry.run.createdAt)}
                </div>
              </div>
              <ArtifactExportMenu run={entry.run} seatMembers={entry.seatMembers} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
