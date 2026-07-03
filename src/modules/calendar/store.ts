// ============================================
// store.ts - Zentraler Datenspeicher für das Kalender-Modul
// 
// Zweck: Verwaltet alle Kalender-Events, Kategorien und UI-State
//        Speichert Daten automatisch im LocalStorage (persist)
// Verwendet von: Allen Kalender-Komponenten und Widgets
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { 
  CalendarStore, 
  CalendarEvent, 
  Category,
  CalendarView 
} from './types';
import { DEFAULT_CATEGORIES } from './constants';

// --------------------------------------------
// Hilfsfunktion: Heutiges Datum als ISO-String
// Wird für die initiale Anzeige verwendet
// --------------------------------------------

const getTodayISO = (): string => {
  return new Date().toISOString().split('T')[0];
};

// --------------------------------------------
// Hilfsfunktion: Aktuellen Zeitstempel erstellen
// Wird beim Erstellen/Aktualisieren von Events genutzt
// --------------------------------------------

const getTimestamp = (): string => {
  return new Date().toISOString();
};

// --------------------------------------------
// Kalender Store erstellen
// Zustand ist eine State-Management Library (wie Redux, aber einfacher)
// persist speichert automatisch im LocalStorage
// --------------------------------------------

export const useCalendarStore = create<CalendarStore>()(
  persist(
    (set, get) => ({
      // ========================================
      // INITIALER STATE
      // Diese Werte werden beim ersten Laden gesetzt
      // ========================================
      
      // Leeres Array für Events (User fügt selbst welche hinzu)
      events: [],
      
      // Standard-Kategorien aus constants.ts
      categories: DEFAULT_CATEGORIES,
      
      // Heute als ausgewähltes Datum
      selectedDate: getTodayISO(),
      
      // Monatsansicht als Standard
      currentView: 'month',
      
      // Modal ist initial geschlossen
      isModalOpen: false,
      
      // Kein Event wird bearbeitet
      editingEvent: null,
      
      // Alle Kategorien sind sichtbar (Array mit allen IDs)
      visibleCategories: DEFAULT_CATEGORIES.map(c => c.id),

      // ========================================
      // EVENT ACTIONS
      // Funktionen zum Erstellen, Bearbeiten, Löschen von Events
      // ========================================

      // Neues Event hinzufügen
      // Parameter: event - Event-Daten ohne ID und Timestamps
      addEvent: (event) => {
        // Erstelle vollständiges Event mit generierter ID und Timestamps
        const newEvent: CalendarEvent = {
          ...event,
          id: crypto.randomUUID(),           // Eindeutige ID generieren
          createdAt: getTimestamp(),         // Erstellungszeitpunkt
          updatedAt: getTimestamp(),         // Zuerst gleich wie createdAt
        };
        
        // Füge zum State hinzu
        set((state) => ({
          events: [...state.events, newEvent],
        }));
      },

      // Bestehendes Event aktualisieren
      // Parameter: id - ID des zu ändernden Events
      //            updates - Objekt mit den geänderten Feldern
      updateEvent: (id, updates) => {
        set((state) => ({
          events: state.events.map((event) =>
            // Finde das Event mit passender ID
            event.id === id
              ? { 
                  ...event, 
                  ...updates, 
                  updatedAt: getTimestamp()  // Aktualisiere Timestamp
                }
              : event  // Andere Events unverändert lassen
          ),
        }));
      },

      // Event löschen
      // Parameter: id - ID des zu löschenden Events
      deleteEvent: (id) => {
        set((state) => ({
          // Behalte nur Events deren ID NICHT übereinstimmt
          events: state.events.filter((event) => event.id !== id),
        }));
      },

      // ========================================
      // KATEGORIE ACTIONS
      // Funktionen zum Verwalten von Kategorien
      // ========================================

      // Neue Kategorie hinzufügen
      addCategory: (category) => {
        const newCategory: Category = {
          ...category,
          id: crypto.randomUUID(),
        };
        
        set((state) => ({
          categories: [...state.categories, newCategory],
          // Neue Kategorie automatisch sichtbar machen
          visibleCategories: [...state.visibleCategories, newCategory.id],
        }));
      },

      // Kategorie aktualisieren
      updateCategory: (id, updates) => {
        set((state) => ({
          categories: state.categories.map((cat) =>
            cat.id === id ? { ...cat, ...updates } : cat
          ),
        }));
      },

      // Kategorie löschen
      // ACHTUNG: Events mit dieser Kategorie werden auf "private" gesetzt
      deleteCategory: (id) => {
        set((state) => ({
          categories: state.categories.filter((cat) => cat.id !== id),
          // Entferne aus sichtbaren Kategorien
          visibleCategories: state.visibleCategories.filter((cid) => cid !== id),
          // Events mit gelöschter Kategorie auf "private" setzen
          events: state.events.map((event) =>
            event.categoryId === id 
              ? { ...event, categoryId: 'private', updatedAt: getTimestamp() }
              : event
          ),
        }));
      },

      // ========================================
      // NAVIGATION ACTIONS
      // Funktionen zum Navigieren im Kalender
      // ========================================

      // Bestimmtes Datum auswählen
      setSelectedDate: (date) => {
        set({ selectedDate: date });
      },

      // Ansicht wechseln (Monat/Woche/Tag)
      setCurrentView: (view) => {
        set({ currentView: view });
      },

      // Zum heutigen Tag springen
      goToToday: () => {
        set({ selectedDate: getTodayISO() });
      },

      // Zum vorherigen Monat/Woche/Tag (je nach Ansicht)
      goToPrevious: () => {
        const { selectedDate, currentView } = get();
        const date = new Date(selectedDate);
        
        // Je nach Ansicht unterschiedlich viel zurückspringen
        switch (currentView) {
          case 'month':
            date.setMonth(date.getMonth() - 1);
            break;
          case 'week':
            date.setDate(date.getDate() - 7);
            break;
          case 'day':
            date.setDate(date.getDate() - 1);
            break;
        }
        
        set({ selectedDate: date.toISOString().split('T')[0] });
      },

      // Zum nächsten Monat/Woche/Tag (je nach Ansicht)
      goToNext: () => {
        const { selectedDate, currentView } = get();
        const date = new Date(selectedDate);
        
        switch (currentView) {
          case 'month':
            date.setMonth(date.getMonth() + 1);
            break;
          case 'week':
            date.setDate(date.getDate() + 7);
            break;
          case 'day':
            date.setDate(date.getDate() + 1);
            break;
        }
        
        set({ selectedDate: date.toISOString().split('T')[0] });
      },

      // ========================================
      // MODAL ACTIONS
      // Funktionen zum Öffnen/Schließen des Event-Modals
      // ========================================

      // Modal öffnen
      // Parameter: event - Optional, wenn vorhanden wird bearbeitet, sonst neu
      openModal: (event) => {
        set({
          isModalOpen: true,
          editingEvent: event || null,
        });
      },

      // Modal schließen und Bearbeitungs-State zurücksetzen
      closeModal: () => {
        set({
          isModalOpen: false,
          editingEvent: null,
        });
      },

      // ========================================
      // FILTER ACTIONS
      // Funktionen zum Ein-/Ausblenden von Kategorien
      // ========================================

      // Einzelne Kategorie ein-/ausblenden (Toggle)
      toggleCategoryVisibility: (categoryId) => {
        set((state) => {
          const isVisible = state.visibleCategories.includes(categoryId);
          
          return {
            visibleCategories: isVisible
              // Wenn sichtbar -> entfernen (ausblenden)
              ? state.visibleCategories.filter((id) => id !== categoryId)
              // Wenn nicht sichtbar -> hinzufügen (einblenden)
              : [...state.visibleCategories, categoryId],
          };
        });
      },

      // Alle sichtbaren Kategorien auf einmal setzen
      setVisibleCategories: (categoryIds) => {
        set({ visibleCategories: categoryIds });
      },
    }),
    {
      // ========================================
      // PERSIST KONFIGURATION
      // Was wird im LocalStorage gespeichert?
      // ========================================
      
      name: 'llm-council-calendar',  // Key im LocalStorage
      
      // Explizites Storage definieren (für SSR-Kompatibilität)
      storage: createJSONStorage(() => localStorage),
      
      // skipHydration: Bei SSR wird der Store nicht sofort hydratisiert
      // Das verhindert Hydration-Mismatches
      skipHydration: true,
      
      // Nur bestimmte Felder speichern (nicht UI-State wie isModalOpen)
      partialize: (state) => ({
        events: state.events,
        categories: state.categories,
        visibleCategories: state.visibleCategories,
        // selectedDate und currentView werden NICHT gespeichert
        // damit der Kalender immer bei "heute" startet
      }),
    }
  )
);

// ============================================
// HYDRATION
// Muss in der Root-Komponente aufgerufen werden
// ============================================

/**
 * Initialisiert den Store mit den gespeicherten Daten
 * Muss einmal beim App-Start aufgerufen werden (z.B. in CalendarPage)
 */
export const hydrateCalendarStore = () => {
  // Nur im Browser ausführen
  if (typeof window !== 'undefined') {
    useCalendarStore.persist.rehydrate();
  }
};

// ============================================
// SELEKTOREN
// Optimierte Hooks für häufig benötigte Daten
// Verhindern unnötige Re-Renders
// ============================================

// Alle Events abrufen
export const useCalendarEvents = () => 
  useCalendarStore((state) => state.events);

// Alle Kategorien abrufen
export const useCalendarCategories = () => 
  useCalendarStore((state) => state.categories);

// --------------------------------------------
// Hilfsfunktionen für Event-Filterung
// Diese werden in Komponenten mit useMemo verwendet
// --------------------------------------------

/**
 * Filtert Events für einen bestimmten Tag
 * WICHTIG: In Komponenten mit useMemo verwenden!
 */
export function getEventsForDate(
  events: CalendarEvent[], 
  visibleCategories: string[],
  dateString: string
): CalendarEvent[] {
  return events
    .filter((event) => {
      // Prüfe ob Event an diesem Tag stattfindet
      const eventStart = event.startDate.split('T')[0];
      const eventEnd = event.endDate.split('T')[0];
      return eventStart <= dateString && eventEnd >= dateString;
    })
    .filter((event) => visibleCategories.includes(event.categoryId))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/**
 * Filtert kommende Events (für Widget)
 * WICHTIG: In Komponenten mit useMemo verwenden!
 */
export function getUpcomingEvents(
  events: CalendarEvent[], 
  visibleCategories: string[],
  limit = 5
): CalendarEvent[] {
  const now = new Date().toISOString();
  
  return events
    .filter((event) => event.endDate >= now)
    .filter((event) => visibleCategories.includes(event.categoryId))
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, limit);
}

// Kategorie anhand der ID finden
export const useCategoryById = (categoryId: string) =>
  useCalendarStore((state) => 
    state.categories.find((cat) => cat.id === categoryId)
  );
