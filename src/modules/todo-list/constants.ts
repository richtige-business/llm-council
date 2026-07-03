// ============================================
// Todo Liste - Konstanten
// 
// Zweck: Alle Konstanten für das Todo Modul
// Verwendet von: Store und Komponenten
// ============================================

export const TODO_PRIORITIES = {
  low: {
    label: 'Niedrig',
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30'
  },
  medium: {
    label: 'Mittel',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30'
  },
  high: {
    label: 'Hoch',
    color: 'text-red-500',
    bgColor: 'bg-red-100 dark:bg-red-900/30'
  }
} as const;

export const TODO_FILTERS = {
  all: { label: 'Alle', icon: 'List' },
  active: { label: 'Aktiv', icon: 'Clock' },
  completed: { label: 'Erledigt', icon: 'CheckCircle' }
} as const;

export const TODO_SORT_OPTIONS = {
  created: { label: 'Erstellungsdatum', icon: 'Calendar' },
  priority: { label: 'Priorität', icon: 'AlertTriangle' },
  alphabetical: { label: 'Alphabetisch', icon: 'SortAsc' }
} as const;

export const DEFAULT_CATEGORIES = [
  'Persönlich',
  'Arbeit',
  'Einkaufen',
  'Gesundheit'
];

export const TODO_EVENTS = {
  CREATED: 'todo-list.item.created',
  COMPLETED: 'todo-list.item.completed',
  DELETED: 'todo-list.item.deleted',
  UPDATED: 'todo-list.item.updated'
} as const;

// --------------------------------------------
// Todo Liste Modul Info
// Metadaten für die Modul-Registry
// --------------------------------------------

export const TODO_MODULE_INFO = {
  id: 'todo-list',
  name: 'Aufgaben',
  description: 'Verwalte deine To-Do-Listen und Aufgaben',
  version: '1.0.0',
  icon: 'CheckSquare',
  category: 'productivity' as const,
  author: 'LifeOS',
  color: '#F59E0B',  // Orange - für Agent Orb und Widgets
};