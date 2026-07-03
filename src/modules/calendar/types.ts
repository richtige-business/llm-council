// ============================================
// types.ts - TypeScript Definitionen für das Kalender-Modul
// 
// Zweck: Definiert alle Datenstrukturen (Interfaces) die im 
//        Kalender-Modul verwendet werden
// Verwendet von: store.ts, allen Komponenten, Widgets
// ============================================

// --------------------------------------------
// Kalender-Event
// Das ist die Hauptstruktur für jeden Termin im Kalender
// --------------------------------------------

export interface CalendarEvent {
  // Eindeutige ID - wird automatisch generiert (UUID)
  id: string;
  
  // Titel des Events - das was der User sieht (z.B. "Meeting mit Max")
  title: string;
  
  // Optionale Beschreibung für mehr Details
  description?: string;
  
  // Start-Zeitpunkt im ISO-Format (z.B. "2024-01-15T14:00:00")
  // ISO-Format ist ein internationaler Standard für Datumsangaben
  startDate: string;
  
  // End-Zeitpunkt im ISO-Format
  endDate: string;
  
  // Ist es ein ganztägiges Event? (z.B. Feiertag, Urlaub)
  // Bei true werden Start/End-Uhrzeiten ignoriert
  allDay: boolean;
  
  // Referenz zur Kategorie (z.B. "work", "private")
  // Bestimmt die Farbe des Events
  categoryId: string;
  
  // Optionale Wiederholungsregel (z.B. "jeden Montag")
  recurrence?: RecurrenceRule;
  
  // Liste von Erinnerungen (z.B. "15 Minuten vorher")
  reminders: Reminder[];
  
  // Wann wurde das Event erstellt? (ISO-Format)
  createdAt: string;
  
  // Wann wurde es zuletzt geändert? (ISO-Format)
  updatedAt: string;
}

// --------------------------------------------
// Kategorie
// Kategorien helfen Events zu organisieren und farblich zu unterscheiden
// --------------------------------------------

export interface Category {
  // Eindeutige ID (z.B. "work", "private", "important")
  id: string;
  
  // Anzeigename (z.B. "Arbeit", "Privat", "Wichtig")
  name: string;
  
  // Farbe als Hex-Code (z.B. "#3b82f6" für Blau)
  color: string;
  
  // Optionales Icon (Lucide Icon Name, z.B. "Briefcase")
  icon?: string;
}

// --------------------------------------------
// Wiederholungsregel
// Definiert wie oft sich ein Event wiederholt
// --------------------------------------------

export interface RecurrenceRule {
  // Wie oft? täglich, wöchentlich, monatlich, jährlich
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  
  // Alle X Tage/Wochen/Monate/Jahre (z.B. 2 = alle 2 Wochen)
  interval: number;
  
  // Optionales End-Datum der Wiederholung
  endDate?: string;
  
  // Bei wöchentlich: An welchen Wochentagen? (0=So, 1=Mo, ..., 6=Sa)
  daysOfWeek?: number[];
}

// --------------------------------------------
// Erinnerung
// Wann soll der User an das Event erinnert werden?
// --------------------------------------------

export interface Reminder {
  // Eindeutige ID der Erinnerung
  id: string;
  
  // Wieviele Minuten vor dem Event? (z.B. 15, 30, 60)
  minutesBefore: number;
  
  // Wie soll erinnert werden?
  type: 'notification' | 'email';
}

// --------------------------------------------
// View-Typen
// Welche Ansicht ist gerade aktiv?
// --------------------------------------------

export type CalendarView = 'month' | 'week' | 'day';

// --------------------------------------------
// Store State
// Definiert den kompletten Zustand des Kalender-Stores
// --------------------------------------------

export interface CalendarState {
  // Alle Events als Array
  events: CalendarEvent[];
  
  // Alle Kategorien als Array
  categories: Category[];
  
  // Aktuell ausgewähltes Datum (für Navigation)
  selectedDate: string;
  
  // Aktuelle Ansicht (Monat/Woche/Tag)
  currentView: CalendarView;
  
  // Ist ein Event-Modal offen?
  isModalOpen: boolean;
  
  // Welches Event wird gerade bearbeitet? (null = neues Event)
  editingEvent: CalendarEvent | null;
  
  // Filter: Welche Kategorien sind sichtbar?
  visibleCategories: string[];
}

// --------------------------------------------
// Store Actions
// Alle Funktionen die den State verändern können
// --------------------------------------------

export interface CalendarActions {
  // Events verwalten
  addEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  
  // Kategorien verwalten
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  
  // Navigation
  setSelectedDate: (date: string) => void;
  setCurrentView: (view: CalendarView) => void;
  goToToday: () => void;
  goToPrevious: () => void;
  goToNext: () => void;
  
  // Modal
  openModal: (event?: CalendarEvent) => void;
  closeModal: () => void;
  
  // Filter
  toggleCategoryVisibility: (categoryId: string) => void;
  setVisibleCategories: (categoryIds: string[]) => void;
}

// --------------------------------------------
// Kombinierter Store-Typ
// State + Actions zusammen
// --------------------------------------------

export type CalendarStore = CalendarState & CalendarActions;











