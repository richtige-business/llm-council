// ============================================
// Builder Prompt Suggestions
//
// Zweck: Zentrale Vorschlagsliste für die Builder-Startseite
//        und Hilfsfunktionen für Randomisierung.
// ============================================

export interface BuilderPromptSuggestionSeed {
  text: string;
  category:
    | 'productivity'
    | 'finance'
    | 'health'
    | 'social'
    | 'dashboard'
    | 'automation'
    | 'learning'
    | 'creative'
    | 'general';
}

export const DEFAULT_BUILDER_PROMPT_SUGGESTIONS: BuilderPromptSuggestionSeed[] = [
  { text: 'Erstelle ein Habit-Tracker Modul mit Streaks und Wochenauswertung', category: 'productivity' },
  { text: 'Baue eine Aufgaben-App mit Prioritaeten, Deadlines und Fokusmodus', category: 'productivity' },
  { text: 'Erstelle ein Journal-Modul mit Tagesreflexion und Stimmungsskala', category: 'health' },
  { text: 'Baue ein Schlaf-Tracking Dashboard mit Trends und Empfehlungen', category: 'health' },
  { text: 'Erstelle ein Ausgaben-Tracker Modul mit Kategorien und Monatsbudget', category: 'finance' },
  { text: 'Baue ein Sparziel-Tool mit Fortschrittsbalken und Erinnerungen', category: 'finance' },
  { text: 'Erstelle ein Abo-Kosten Modul mit naechsten Abbuchungen und Warnungen', category: 'finance' },
  { text: 'Baue ein Kontakte-CRM fuer persoenliche Beziehungen mit Follow-up Erinnerungen', category: 'social' },
  { text: 'Erstelle ein Event-Planer Modul fuer Treffen mit Freunden', category: 'social' },
  { text: 'Baue ein Geburtstags-Manager Modul mit Geschenkideen und Erinnerungen', category: 'social' },
  { text: 'Erstelle ein Wochen-Dashboard mit KPI-Karten fuer Alltag, Fokus und Energie', category: 'dashboard' },
  { text: 'Baue ein Morning-Briefing Widget mit Terminen, To-dos und Wetter', category: 'dashboard' },
  { text: 'Erstelle ein Tagesabschluss-Widget mit Rueckblick und naechsten Schritten', category: 'dashboard' },
  { text: 'Baue ein Notiz-Modul mit Markdown, Tags und Volltextsuche', category: 'productivity' },
  { text: 'Erstelle ein Lernplan-Modul mit Etappen, Quizfragen und Fortschrittsanzeige', category: 'learning' },
  { text: 'Baue einen Vokabeltrainer mit Wiederholungsintervallen', category: 'learning' },
  { text: 'Erstelle ein Workout-Planer Modul mit Uebungen und Wochenplan', category: 'health' },
  { text: 'Baue ein Meal-Prep Modul mit Einkaufslisten und Kalorienueberblick', category: 'health' },
  { text: 'Erstelle ein Content-Ideen Board mit Status und Publish-Plan', category: 'creative' },
  { text: 'Baue ein Ideen-Backlog Modul mit Voting und Priorisierung', category: 'creative' },
  { text: 'Erstelle ein Reiseplaner Modul mit Packliste, Budget und Zeitplan', category: 'general' },
  { text: 'Baue ein Hausarbeiten-Planer Modul mit wiederkehrenden Aufgaben', category: 'general' },
  { text: 'Erstelle ein personalisiertes Focus-Session Modul mit Timer und Statistik', category: 'productivity' },
  { text: 'Baue ein Projekt-Radar mit Risiken, Blockern und naechsten Aktionen', category: 'automation' },
  { text: 'Erstelle ein Follow-up Automationsmodul fuer offene Kontakte', category: 'automation' },
  { text: 'Baue ein Entscheidungs-Board mit Pro/Contra und gewichteter Bewertung', category: 'general' },
  { text: 'Erstelle ein Zielsetzungs-Modul mit Quartalszielen und Milestones', category: 'productivity' },
  { text: 'Baue ein Wissensdatenbank Modul mit Themenordnern und Quick Notes', category: 'learning' },
  { text: 'Erstelle ein Clean-Desk Challenge Modul mit taeglichen Mini-Aufgaben', category: 'productivity' },
  { text: 'Baue ein Meeting-Prep Modul mit Agenda, Notizen und Action Items', category: 'automation' },
];

export function shuffleArray<T>(values: T[]): T[] {
  const next = [...values];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}
