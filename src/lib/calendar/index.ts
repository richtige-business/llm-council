// ============================================
// index.ts - Calendar Library Exports
// 
// Zweck: Zentrale Exports für Kalender-Funktionalitäten
// Verwendet von: API Routes, Komponenten
// ============================================

export {
  createCalendarSuggestion,
  createSuggestionFromAnalysis,
  checkForDuplicates,
  acceptSuggestion,
  declineSuggestion,
  getPendingSuggestions,
  getSuggestionById,
  expireOldSuggestions,
  prepareCalendarEventData,
} from './suggestion-service';

export type {
  CalendarSuggestionInput,
  CalendarSuggestion,
  DuplicateCheckResult,
  CalendarEvent,
} from './suggestion-service';
