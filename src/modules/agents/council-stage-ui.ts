// ============================================
// council-stage-ui.ts - Gemeinsame UI-Texte fuer Council-Phasen
//
// Zweck: Liefert konsistente Labels und Beschreibungen fuer
//        die sichtbaren Council-Phasen im UI
// Verwendet von: CouncilChatBar, AgentsModuleShell
// ============================================

import type { CouncilRunStage } from './types';

// --------------------------------------------
// Rueckgabeformat fuer die UI
// badgeLabel: kompakter Titel fuer Badges / Tags
// description: kurzer Kontextsatz zur aktuellen Aktivitaet
// --------------------------------------------

export interface CouncilStagePresentation {
  badgeLabel: string | null;
  description: string | null;
}

// --------------------------------------------
// Einheitliche Phase-Texte
// Damit Chatbar und Badge immer synchron bleiben.
// --------------------------------------------

export function getCouncilStagePresentation(stage: CouncilRunStage): CouncilStagePresentation {
  switch (stage) {
    case 'first-opinions':
      return {
        badgeLabel: 'First opinions',
        description: 'Each member answers your prompt independently.',
      };
    case 'review':
      return {
        badgeLabel: 'Review',
        description: 'Members anonymously review each other’s first answers.',
      };
    case 'final-synthesis':
    case 'completed':
      return {
        badgeLabel: 'Final answer',
        description: 'The council eldest synthesizes opinions and reviews into one reply.',
      };
    case 'error':
      return {
        badgeLabel: 'Error',
        description: 'The council run stopped. You can start the prompt again.',
      };
    case 'idle':
    default:
      return {
        badgeLabel: null,
        description: null,
      };
  }
}
