// ============================================
// council-seats.ts - Sitzplatz-Zuteilung fuer Council-Mitglieder
//
// Zweck: Bestimmt den naechsten freien Sitzplatz in fester
//        Reihenfolge (4 Basis-Sitze, dann abwechselnd links/rechts
//        Zusatzsitze). Gemeinsam genutzt von Eldest-Onboarding und
//        der Preset-Bibliothek.
// Verwendet von: CouncilOnboardingModal.tsx, CouncilPresetLibraryDropdown.tsx
// ============================================

import type { CouncilSeatMemberData } from '../types';

const BASE_SEAT_ORDER = ['arc-left-0', 'arc-right-0', 'arc-left-1', 'arc-right-1'];

export function getNextAvailableCouncilSeatId(existingSeatMembers: CouncilSeatMemberData[]): string {
  const usedSeatIds = new Set(existingSeatMembers.map((member) => member.seatId));

  for (const seatId of BASE_SEAT_ORDER) {
    if (!usedSeatIds.has(seatId)) {
      return seatId;
    }
  }

  let extraIndex = 0;
  // Abwechselnd links/rechts weiterfuellen, wie die manuelle "+"-Seat-Erstellung.
  while (true) {
    const leftId = `arc-left-extra-${extraIndex}`;
    if (!usedSeatIds.has(leftId)) return leftId;
    const rightId = `arc-right-extra-${extraIndex}`;
    if (!usedSeatIds.has(rightId)) return rightId;
    extraIndex += 1;
  }
}
