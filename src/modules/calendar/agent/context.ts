// ============================================
// context.ts - Calendar Context Provider
// 
// Zweck: Liefert Kontext-Informationen über das Kalender-Modul für den Agent
// Verwendet von: Context Collector
// ============================================

import type { ModuleContext } from '@/lib/agent/types';

// --------------------------------------------
// Hilfsfunktionen
// --------------------------------------------

function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function getTomorrowISO(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

function formatDateGerman(dateString: string): string {
  return new Date(dateString).toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getDayOfWeek(): string {
  const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  return days[new Date().getDay()];
}

// --------------------------------------------
// Calendar Context Provider (Server-Side)
// Hinweis: Da Kalender-Daten im LocalStorage sind,
// können wir hier nur Datums-Informationen liefern.
// Die tatsächlichen Events werden im Frontend verarbeitet.
// --------------------------------------------

export function getCalendarContext(): ModuleContext {
  const today = getTodayISO();
  const tomorrow = getTomorrowISO();
  
  return {
    moduleId: 'calendar',
    
    state: {
      today,
      tomorrow,
      todayFormatted: formatDateGerman(today),
      tomorrowFormatted: formatDateGerman(tomorrow),
      dayOfWeek: getDayOfWeek(),
    },
    
    stats: {
      // Stats werden vom Frontend gefüllt
      // Server kennt keine LocalStorage-Daten
    },
    
    relevantData: {
      // Hinweis: Events sind im LocalStorage, nicht auf dem Server
      // Der Context-Collector kann diese Daten nicht direkt abrufen
      // Stattdessen nutzen wir Datums-Informationen für den Prompt
    },
  };
}

// --------------------------------------------
// Calendar Context als Text für System-Prompt
// --------------------------------------------

export function getCalendarContextPrompt(): string {
  const ctx = getCalendarContext();
  const state = ctx.state as {
    today: string;
    tomorrow: string;
    todayFormatted: string;
    tomorrowFormatted: string;
    dayOfWeek: string;
  };
  
  return `KALENDER-KONTEXT:
Heute ist ${state.todayFormatted} (${state.today}).
Morgen ist ${state.tomorrowFormatted} (${state.tomorrow}).
Wochentag: ${state.dayOfWeek}

DATUMS-BERECHNUNG:
- Wenn der User "morgen" sagt, verwende EXAKT: ${state.tomorrow}
- Wenn der User "heute" sagt, verwende EXAKT: ${state.today}
- Datum MUSS im Format YYYY-MM-DD sein (z.B. "${state.tomorrow}")
- Berechne andere relative Daten ausgehend von heute`;
}

// --------------------------------------------
// Erweiterte Datums-Hilfsfunktionen für Tools
// --------------------------------------------

export function getDateInfo(): {
  today: string;
  todayISO: string;
  tomorrow: string;
  tomorrowISO: string;
  dayOfWeek: string;
} {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return {
    today: formatDateGerman(now.toISOString()),
    todayISO: getTodayISO(),
    tomorrow: formatDateGerman(tomorrow.toISOString()),
    tomorrowISO: getTomorrowISO(),
    dayOfWeek: getDayOfWeek(),
  };
}

// Berechnet ein Datum relativ zu heute
export function getRelativeDate(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().split('T')[0];
}

// Findet den nächsten bestimmten Wochentag
export function getNextWeekday(targetDay: number): string {
  // targetDay: 0 = Sonntag, 1 = Montag, ..., 6 = Samstag
  const today = new Date();
  const currentDay = today.getDay();
  let daysUntilTarget = targetDay - currentDay;
  
  if (daysUntilTarget <= 0) {
    daysUntilTarget += 7; // Nächste Woche
  }
  
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysUntilTarget);
  
  return targetDate.toISOString().split('T')[0];
}
