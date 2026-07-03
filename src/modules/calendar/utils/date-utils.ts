// ============================================
// date-utils.ts - Hilfsfunktionen für Datum-Operationen
// 
// Zweck: Zentrale Sammlung von Datum-Funktionen
//        Vermeidet doppelten Code in Komponenten
// Verwendet von: MonthView, WeekView, DayView, EventModal
// ============================================

// --------------------------------------------
// Datum formatieren
// Wandelt ein Datum in lesbaren Text um
// --------------------------------------------

/**
 * Formatiert ein Datum als "15. Januar 2024"
 * @param date - Date-Objekt oder ISO-String
 * @returns Formatierter String
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  return d.toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Formatiert ein Datum kurz als "15.01.2024"
 * @param date - Date-Objekt oder ISO-String
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formatiert nur die Uhrzeit als "14:30"
 * @param date - Date-Objekt oder ISO-String
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  return d.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formatiert Datum und Zeit als "15.01.2024, 14:30"
 * @param date - Date-Objekt oder ISO-String
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  return `${formatDateShort(d)}, ${formatTime(d)}`;
}

// --------------------------------------------
// Monats-Berechnungen
// Für die Monatsansicht im Kalender
// --------------------------------------------

/**
 * Gibt alle Tage eines Monats zurück (inklusive Padding-Tage)
 * Das Ergebnis ist immer ein 6x7 Grid (42 Tage)
 * 
 * @param year - Jahr (z.B. 2024)
 * @param month - Monat (0-11, wobei 0 = Januar)
 * @returns Array von Date-Objekten
 * 
 * Beispiel für Januar 2024:
 * [31.12.23, 01.01.24, 02.01.24, ..., 10.02.24]
 */
export function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  
  // Erster Tag des Monats
  const firstDay = new Date(year, month, 1);
  
  // Wochentag des ersten Tags (0 = Sonntag, 1 = Montag, ...)
  // Wir wollen aber Montag als ersten Tag der Woche
  const startDayOfWeek = firstDay.getDay();
  // Korrektur: Sonntag (0) wird zu 6, Montag (1) zu 0, etc.
  const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
  
  // Füge Tage vom vorherigen Monat hinzu (Padding links)
  for (let i = adjustedStartDay - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    days.push(date);
  }
  
  // Letzter Tag des Monats
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  
  // Füge alle Tage des aktuellen Monats hinzu
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }
  
  // Füge Tage vom nächsten Monat hinzu (Padding rechts)
  // Wir wollen immer 42 Tage (6 Wochen) für ein konsistentes Grid
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push(new Date(year, month + 1, i));
  }
  
  return days;
}

/**
 * Prüft ob ein Datum im gegebenen Monat liegt
 * @param date - Zu prüfendes Datum
 * @param year - Jahr des Monats
 * @param month - Monat (0-11)
 */
export function isInMonth(date: Date, year: number, month: number): boolean {
  return date.getFullYear() === year && date.getMonth() === month;
}

// --------------------------------------------
// Wochen-Berechnungen
// Für die Wochenansicht im Kalender
// --------------------------------------------

/**
 * Gibt alle 7 Tage einer Woche zurück
 * Startet immer mit Montag
 * 
 * @param date - Ein beliebiger Tag in der Woche
 * @returns Array von 7 Date-Objekten (Mo-So)
 */
export function getWeekDays(date: Date | string): Date[] {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  const days: Date[] = [];
  
  // Finde den Montag dieser Woche
  const dayOfWeek = d.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sonntag = 0, Montag = 1
  
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  
  // Generiere alle 7 Tage
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    days.push(day);
  }
  
  return days;
}

/**
 * Gibt die Kalenderwoche-Nummer zurück
 * @param date - Datum
 * @returns Kalenderwoche (1-53)
 */
export function getWeekNumber(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  
  // Kopie erstellen um Original nicht zu verändern
  const target = new Date(d.valueOf());
  
  // ISO Wochennummer: Woche 1 ist die Woche mit dem ersten Donnerstag
  const dayNr = (d.getDay() + 6) % 7; // Montag = 0
  target.setDate(target.getDate() - dayNr + 3);
  
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

// --------------------------------------------
// Vergleichs-Funktionen
// Zum Prüfen von Datum-Bedingungen
// --------------------------------------------

/**
 * Prüft ob zwei Daten am selben Tag sind (Zeit wird ignoriert)
 */
export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Prüft ob ein Datum heute ist
 */
export function isToday(date: Date | string): boolean {
  return isSameDay(date, new Date());
}

/**
 * Prüft ob ein Datum in der Vergangenheit liegt
 */
export function isPast(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  // Setze Zeit auf Mitternacht für Tagesvergleich
  now.setHours(0, 0, 0, 0);
  const compareDate = new Date(d);
  compareDate.setHours(0, 0, 0, 0);
  
  return compareDate < now;
}

/**
 * Prüft ob ein Datum in der Zukunft liegt
 */
export function isFuture(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d > new Date();
}

// --------------------------------------------
// ISO-String Konvertierungen
// Für die Kommunikation mit dem Store
// --------------------------------------------

/**
 * Konvertiert ein Date-Objekt zu einem ISO-Date-String (nur Datum)
 * Beispiel: "2024-01-15"
 * 
 * WICHTIG: Verwendet lokale Zeit, nicht UTC!
 * toISOString() würde das Datum in UTC konvertieren, was bei
 * Zeitzonen-Unterschieden den falschen Tag ergeben kann.
 */
export function toISODateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Konvertiert ein Date-Objekt zu einem ISO-DateTime-String
 * Beispiel: "2024-01-15T14:30:00.000Z"
 */
export function toISOString(date: Date): string {
  return date.toISOString();
}

/**
 * Erstellt ein Date-Objekt aus separatem Datum und Uhrzeit
 * @param dateString - Datum als "YYYY-MM-DD"
 * @param timeString - Uhrzeit als "HH:MM"
 */
export function combineDateAndTime(dateString: string, timeString: string): Date {
  return new Date(`${dateString}T${timeString}:00`);
}

// --------------------------------------------
// Relative Zeit
// Für "in 2 Tagen", "vor 3 Stunden" etc.
// --------------------------------------------

/**
 * Gibt eine relative Zeitangabe zurück
 * Beispiel: "in 2 Tagen", "vor 3 Stunden", "heute"
 */
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    // Heute - zeige Stunden
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.round(diffMs / (1000 * 60));
      if (diffMinutes === 0) return 'jetzt';
      if (diffMinutes > 0) return `in ${diffMinutes} Min.`;
      return `vor ${Math.abs(diffMinutes)} Min.`;
    }
    if (diffHours > 0) return `in ${diffHours} Std.`;
    return `vor ${Math.abs(diffHours)} Std.`;
  }
  
  if (diffDays === 1) return 'morgen';
  if (diffDays === -1) return 'gestern';
  if (diffDays > 0 && diffDays <= 7) return `in ${diffDays} Tagen`;
  if (diffDays < 0 && diffDays >= -7) return `vor ${Math.abs(diffDays)} Tagen`;
  
  // Mehr als eine Woche: zeige Datum
  return formatDateShort(d);
}




