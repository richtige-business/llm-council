// ============================================
// constants.ts - Konstanten für das Kalender-Modul
// 
// Zweck: Definiert unveränderliche Werte wie Standard-Kategorien,
//        Farben und andere Konfigurationen
// Verwendet von: store.ts (für initiale Kategorien), Komponenten
// ============================================

import type { Category } from './types';

// --------------------------------------------
// Standard-Kategorien
// Diese Kategorien sind von Anfang an verfügbar
// Der User kann weitere hinzufügen oder diese anpassen
// --------------------------------------------

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'work',
    name: 'Arbeit',
    color: '#3b82f6',    // Blau - professionell, produktiv
    icon: 'Briefcase',
  },
  {
    id: 'private',
    name: 'Privat',
    color: '#22c55e',    // Grün - entspannt, persönlich
    icon: 'User',
  },
  {
    id: 'important',
    name: 'Wichtig',
    color: '#ef4444',    // Rot - dringend, Aufmerksamkeit
    icon: 'AlertCircle',
  },
  {
    id: 'meeting',
    name: 'Meeting',
    color: '#8b5cf6',    // Lila - Zusammenarbeit
    icon: 'Users',
  },
  {
    id: 'health',
    name: 'Gesundheit',
    color: '#f59e0b',    // Orange - Vitalität
    icon: 'Heart',
  },
  {
    id: 'learning',
    name: 'Lernen',
    color: '#06b6d4',    // Cyan - Wissen, Wachstum
    icon: 'BookOpen',
  },
];

// --------------------------------------------
// Wochentage
// Für die Anzeige im Kalender-Header
// --------------------------------------------

export const WEEKDAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
export const WEEKDAYS_LONG = [
  'Sonntag',
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag',
];

// --------------------------------------------
// Monate
// Für die Anzeige in der Navigation
// --------------------------------------------

export const MONTHS = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

// --------------------------------------------
// Erinnerungs-Optionen
// Vordefinierte Zeitabstände für Erinnerungen
// --------------------------------------------

export const REMINDER_OPTIONS = [
  { value: 0, label: 'Zur Startzeit' },
  { value: 5, label: '5 Minuten vorher' },
  { value: 15, label: '15 Minuten vorher' },
  { value: 30, label: '30 Minuten vorher' },
  { value: 60, label: '1 Stunde vorher' },
  { value: 120, label: '2 Stunden vorher' },
  { value: 1440, label: '1 Tag vorher' },
  { value: 10080, label: '1 Woche vorher' },
];

// --------------------------------------------
// Wiederholungs-Optionen
// Für das Dropdown im Event-Modal
// --------------------------------------------

export const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Keine Wiederholung' },
  { value: 'daily', label: 'Täglich' },
  { value: 'weekly', label: 'Wöchentlich' },
  { value: 'monthly', label: 'Monatlich' },
  { value: 'yearly', label: 'Jährlich' },
];

// --------------------------------------------
// Zeitslots für Tages-/Wochenansicht
// Stundenweise Einteilung von 0-23 Uhr
// --------------------------------------------

export const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => ({
  hour: i,
  label: `${i.toString().padStart(2, '0')}:00`,
}));

// --------------------------------------------
// Modul-Metadaten
// Informationen über das Kalender-Modul selbst
// --------------------------------------------

export const CALENDAR_MODULE_INFO = {
  id: 'calendar',
  name: 'Kalender',
  description: 'Plane und verwalte deine Termine und Events',
  version: '1.0.0',
  icon: 'Calendar',
  category: 'productivity' as const,
  author: 'LifeOS',
  color: '#10B981',  // Grün - für Agent Orb und Widgets
};











