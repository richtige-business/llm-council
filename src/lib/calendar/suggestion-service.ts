// ============================================
// suggestion-service.ts - Kalender-Terminvorschläge Service
// 
// Zweck: Verwaltet erkannte Terminvorschläge aus E-Mails
//        - Erstellt Vorschläge aus KI-Analyse
//        - Prüft auf Duplikate im Kalender
//        - Accept/Decline Workflow
// Verwendet von: API Routes, Inbox-Sync
// ============================================

import { prisma } from '@/lib/db';
import { publishNotification } from '@/lib/notifications/notification-bus';
import type { MessageAnalysis } from '@/lib/ai/message-analyzer';

// --------------------------------------------
// Typen
// --------------------------------------------

export interface CalendarSuggestionInput {
  messageId: string;
  title: string;
  date?: string;         // ISO-Format: "2024-01-15"
  time?: string;         // Format: "14:00"
  endTime?: string;      // Format: "15:30"
  meetingLink?: string;
  location?: string;
  description?: string;
  confidence?: number;
}

export interface CalendarSuggestion {
  id: string;
  messageId: string;
  suggestedTitle: string;
  suggestedDate: Date | null;
  suggestedTime: string | null;
  suggestedEndTime: string | null;
  meetingLink: string | null;
  location: string | null;
  description: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdEventId: string | null;
  confidence: number;
  createdAt: Date;
  processedAt: Date | null;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingEventId?: string;
  existingEventTitle?: string;
  matchReason?: 'same_time' | 'similar_title' | 'same_link';
}

export interface CalendarEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  description?: string;
}

// --------------------------------------------
// Hilfsfunktionen für Duplikat-Erkennung
// --------------------------------------------

/**
 * Berechnet die Ähnlichkeit zweier Strings (Levenshtein-basiert)
 * Gibt einen Wert zwischen 0 und 1 zurück (1 = identisch)
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  // Einfache Wort-basierte Ähnlichkeit
  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));
  
  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;
  
  return union > 0 ? intersection / union : 0;
}

/**
 * Prüft ob zwei Zeitpunkte innerhalb einer Toleranz liegen
 */
function isWithinTimeRange(
  date1: Date,
  date2: Date,
  toleranceMinutes: number
): boolean {
  const diffMs = Math.abs(date1.getTime() - date2.getTime());
  const diffMinutes = diffMs / (1000 * 60);
  return diffMinutes <= toleranceMinutes;
}

/**
 * Kombiniert Datum und Zeit zu einem Date-Objekt
 */
function combineDateAndTime(dateStr: string, timeStr?: string): Date {
  const date = new Date(dateStr);
  
  if (timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    date.setHours(hours || 0, minutes || 0, 0, 0);
  }
  
  return date;
}

// --------------------------------------------
// Haupt-Service-Funktionen
// --------------------------------------------

/**
 * Erstellt einen neuen Terminvorschlag aus der KI-Analyse
 */
export async function createCalendarSuggestion(
  input: CalendarSuggestionInput
): Promise<CalendarSuggestion> {
  // Datum parsen falls vorhanden
  let suggestedDate: Date | null = null;
  
  if (input.date) {
    suggestedDate = new Date(input.date);
    
    // Prüfe ob Datum in der Vergangenheit liegt
    if (suggestedDate < new Date()) {
      // Vorschlag als expired markieren
    }
  }
  
  const suggestion = await prisma.calendarSuggestion.create({
    data: {
      messageId: input.messageId,
      suggestedTitle: input.title,
      suggestedDate,
      suggestedTime: input.time || null,
      suggestedEndTime: input.endTime || null,
      meetingLink: input.meetingLink || null,
      location: input.location || null,
      description: input.description || null,
      confidence: input.confidence || 0.5,
      status: suggestedDate && suggestedDate < new Date() ? 'expired' : 'pending',
    },
  });
  
  // Nachricht aktualisieren
  await prisma.message.update({
    where: { id: input.messageId },
    data: { hasCalendarAction: true },
  });
  
  // Benachrichtigung senden (nur für pending)
  if (suggestion.status === 'pending') {
    const dateText = suggestedDate 
      ? suggestedDate.toLocaleDateString('de-DE', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long' 
        })
      : 'Datum unbekannt';
    
    const timeText = input.time ? ` um ${input.time} Uhr` : '';
    
    publishNotification({
      source: 'inbox',
      title: 'Terminvorschlag erkannt',
      body: `"${input.title}" am ${dateText}${timeText}. Möchtest du diesen Termin in deinen Kalender eintragen?`,
      priority: 'normal',
      actionUrl: `/inbox?suggestion=${suggestion.id}`,
      metadata: {
        suggestionId: suggestion.id,
        messageId: input.messageId,
      },
    });
  }
  
  return suggestion as CalendarSuggestion;
}

/**
 * Erstellt Terminvorschläge aus einer KI-Analyse
 */
export async function createSuggestionFromAnalysis(
  messageId: string,
  analysis: MessageAnalysis
): Promise<CalendarSuggestion | null> {
  if (!analysis.calendarSuggestion) {
    return null;
  }
  
  const { calendarSuggestion } = analysis;
  
  return createCalendarSuggestion({
    messageId,
    title: calendarSuggestion.title,
    date: calendarSuggestion.date,
    time: calendarSuggestion.time,
    endTime: calendarSuggestion.endTime,
    meetingLink: calendarSuggestion.meetingLink,
    location: calendarSuggestion.location,
    description: calendarSuggestion.description,
    confidence: calendarSuggestion.confidence,
  });
}

/**
 * Prüft ob ein ähnlicher Termin bereits im Kalender existiert
 * 
 * HINWEIS: Diese Funktion arbeitet mit den Calendar-Events aus dem Store,
 * da wir keinen DB-Sync für Kalender haben. Die Events werden übergeben.
 */
export function checkForDuplicates(
  suggestion: CalendarSuggestion,
  existingEvents: CalendarEvent[]
): DuplicateCheckResult {
  if (!suggestion.suggestedDate) {
    return { isDuplicate: false };
  }
  
  const suggestedDateTime = combineDateAndTime(
    suggestion.suggestedDate.toISOString(),
    suggestion.suggestedTime || undefined
  );
  
  for (const event of existingEvents) {
    const eventStart = new Date(event.startDate);
    
    // 1. Prüfe auf gleichen Meeting-Link
    if (suggestion.meetingLink && event.description?.includes(suggestion.meetingLink)) {
      return {
        isDuplicate: true,
        existingEventId: event.id,
        existingEventTitle: event.title,
        matchReason: 'same_link',
      };
    }
    
    // 2. Prüfe auf gleiche/ähnliche Zeit (±60 Minuten)
    if (isWithinTimeRange(suggestedDateTime, eventStart, 60)) {
      // 3. Prüfe auf ähnlichen Titel
      const similarity = calculateStringSimilarity(
        suggestion.suggestedTitle,
        event.title
      );
      
      if (similarity > 0.5) {
        return {
          isDuplicate: true,
          existingEventId: event.id,
          existingEventTitle: event.title,
          matchReason: 'similar_title',
        };
      }
      
      // Sehr ähnliche Zeit = wahrscheinlich gleicher Termin
      if (isWithinTimeRange(suggestedDateTime, eventStart, 15)) {
        return {
          isDuplicate: true,
          existingEventId: event.id,
          existingEventTitle: event.title,
          matchReason: 'same_time',
        };
      }
    }
  }
  
  return { isDuplicate: false };
}

/**
 * Akzeptiert einen Terminvorschlag und erstellt den Kalender-Eintrag
 * Gibt die Daten für den neuen Termin zurück (Erstellung erfolgt im Frontend)
 */
export async function acceptSuggestion(
  suggestionId: string,
  createdEventId: string
): Promise<CalendarSuggestion> {
  const suggestion = await prisma.calendarSuggestion.update({
    where: { id: suggestionId },
    data: {
      status: 'accepted',
      createdEventId,
      processedAt: new Date(),
    },
  });
  
  // Nachricht als verarbeitet markieren
  await prisma.message.update({
    where: { id: suggestion.messageId },
    data: { calendarActionProcessed: true },
  });
  
  return suggestion as CalendarSuggestion;
}

/**
 * Lehnt einen Terminvorschlag ab
 */
export async function declineSuggestion(
  suggestionId: string
): Promise<CalendarSuggestion> {
  const suggestion = await prisma.calendarSuggestion.update({
    where: { id: suggestionId },
    data: {
      status: 'declined',
      processedAt: new Date(),
    },
  });
  
  // Nachricht als verarbeitet markieren
  await prisma.message.update({
    where: { id: suggestion.messageId },
    data: { calendarActionProcessed: true },
  });
  
  return suggestion as CalendarSuggestion;
}

/**
 * Holt alle offenen (pending) Terminvorschläge
 */
export async function getPendingSuggestions(): Promise<CalendarSuggestion[]> {
  const suggestions = await prisma.calendarSuggestion.findMany({
    where: { status: 'pending' },
    orderBy: { suggestedDate: 'asc' },
    include: {
      message: {
        select: {
          subject: true,
          sender: true,
          senderName: true,
        },
      },
    },
  });
  
  return suggestions as CalendarSuggestion[];
}

/**
 * Holt einen einzelnen Terminvorschlag mit Details
 */
export async function getSuggestionById(
  id: string
): Promise<(CalendarSuggestion & { message: { subject: string; sender: string; senderName: string | null } }) | null> {
  const suggestion = await prisma.calendarSuggestion.findUnique({
    where: { id },
    include: {
      message: {
        select: {
          subject: true,
          sender: true,
          senderName: true,
        },
      },
    },
  });
  
  return suggestion as (CalendarSuggestion & { message: { subject: string; sender: string; senderName: string | null } }) | null;
}

/**
 * Markiert abgelaufene Vorschläge als expired
 */
export async function expireOldSuggestions(): Promise<number> {
  const result = await prisma.calendarSuggestion.updateMany({
    where: {
      status: 'pending',
      suggestedDate: {
        lt: new Date(),
      },
    },
    data: {
      status: 'expired',
    },
  });
  
  return result.count;
}

/**
 * Bereitet die Daten für einen neuen Kalender-Eintrag vor
 */
export function prepareCalendarEventData(
  suggestion: CalendarSuggestion
): {
  title: string;
  startDate: string;
  endDate: string;
  description: string;
  allDay: boolean;
} {
  // Startdatum erstellen
  let startDate: Date;
  
  if (suggestion.suggestedDate) {
    startDate = new Date(suggestion.suggestedDate);
    
    if (suggestion.suggestedTime) {
      const [hours, minutes] = suggestion.suggestedTime.split(':').map(Number);
      startDate.setHours(hours || 9, minutes || 0, 0, 0);
    } else {
      startDate.setHours(9, 0, 0, 0); // Default: 9:00 Uhr
    }
  } else {
    // Fallback: Morgen um 9:00
    startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    startDate.setHours(9, 0, 0, 0);
  }
  
  // Enddatum erstellen
  let endDate: Date;
  
  if (suggestion.suggestedEndTime && suggestion.suggestedDate) {
    endDate = new Date(suggestion.suggestedDate);
    const [hours, minutes] = suggestion.suggestedEndTime.split(':').map(Number);
    endDate.setHours(hours || 10, minutes || 0, 0, 0);
  } else {
    // Default: 1 Stunde Dauer
    endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  }
  
  // Beschreibung zusammenstellen
  const descriptionParts: string[] = [];
  
  if (suggestion.description) {
    descriptionParts.push(suggestion.description);
  }
  
  if (suggestion.meetingLink) {
    descriptionParts.push(`\n\n🔗 Meeting-Link:\n${suggestion.meetingLink}`);
  }
  
  if (suggestion.location) {
    descriptionParts.push(`\n\n📍 Ort: ${suggestion.location}`);
  }
  
  descriptionParts.push('\n\n---\nAutomatisch aus E-Mail erkannt von LifeOS');
  
  return {
    title: suggestion.suggestedTitle,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    description: descriptionParts.join(''),
    allDay: !suggestion.suggestedTime, // Ganztägig wenn keine Uhrzeit
  };
}
