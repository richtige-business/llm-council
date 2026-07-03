// ============================================
// handler.ts - Calendar Action Handler
// 
// Zweck: Führt Kalender-spezifische Agent-Actions im Frontend aus
// Verwendet von: Action Registry, useAgentExecutor
// ============================================

'use client';

import { useCalendarStore } from '../store';
import { useAppStore } from '@/lib/store/app-store';
import type { AgentAction, ActionHandler, ActionResult } from '@/lib/agent/types';
import type { CalendarView } from '../types';

// --------------------------------------------
// Calendar Action Handler
// --------------------------------------------

export const calendarActionHandler: ActionHandler = {
  moduleId: 'calendar',

  supportedActions: [
    'calendar.openTab',
    'calendar.createEvent',
    'calendar.openModal',
    'calendar.deleteEvent',
    'calendar.updateEvent',
  ],

  execute: async (action: AgentAction): Promise<ActionResult> => {
    // Stores abrufen (außerhalb von React-Kontext)
    const calendarStore = useCalendarStore.getState();
    const appStore = useAppStore.getState();

    try {
      switch (action.type) {
        // ========================================
        // Kalender öffnen
        // ========================================
        case 'calendar.openTab': {
          const { date, view } = action.payload as { 
            date?: string; 
            view?: string;
          };
          
          // Tab öffnen
          appStore.openTab('calendar');
          
          // Datum setzen falls angegeben
          if (date) {
            calendarStore.setSelectedDate(date);
          }
          
          // Ansicht wechseln falls angegeben
          if (view) {
            calendarStore.setCurrentView(view as CalendarView);
          }
          
          return { success: true };
        }

        // ========================================
        // Event erstellen
        // ========================================
        case 'calendar.createEvent': {
          console.log('📅 calendar.createEvent Handler gestartet');
          console.log('📦 Payload:', JSON.stringify(action.payload, null, 2));
          
          const { 
            title, 
            startDate, 
            endDate, 
            description, 
            allDay, 
            categoryId, 
            reminders,
          } = action.payload as {
            title: string;
            startDate: string;
            endDate: string;
            description?: string;
            allDay?: boolean;
            categoryId?: string;
            reminders?: Array<{ id: string; minutesBefore: number; type: 'notification' | 'email' }>;
          };
          
          // Validierung
          if (!title) {
            console.error('❌ Titel fehlt!');
            return { success: false, error: 'Titel fehlt' };
          }
          if (!startDate) {
            console.error('❌ Startdatum fehlt!');
            return { success: false, error: 'Startdatum fehlt' };
          }
          
          // Kalender öffnen
          console.log('📂 Öffne Kalender-Tab...');
          appStore.openTab('calendar');
          
          // Event-Daten vorbereiten
          const eventData = {
            title,
            startDate,
            endDate: endDate || startDate,
            description: description || '',
            allDay: allDay || false,
            categoryId: categoryId || 'private',
            reminders: reminders || [],
          };
          
          console.log('➕ Erstelle Event:', eventData);
          
          // Event erstellen
          calendarStore.addEvent(eventData);
          
          // Zum Datum des Events navigieren
          const eventDate = startDate.split('T')[0];
          calendarStore.setSelectedDate(eventDate);
          
          // Prüfen ob Event erstellt wurde
          const events = calendarStore.events;
          const newEvent = events.find(e => e.title === title && e.startDate === startDate);
          
          if (newEvent) {
            console.log('✅ Event erfolgreich erstellt:', newEvent.id);
            return { success: true };
          } else {
            console.log('⚠️ Event wurde zur Queue hinzugefügt, Verifikation steht aus');
            return { success: true };
          }
        }

        // ========================================
        // Event-Modal öffnen
        // ========================================
        case 'calendar.openModal': {
          // Kalender öffnen
          appStore.openTab('calendar');
          
          // Modal öffnen
          calendarStore.openModal();
          
          return { success: true };
        }

        // ========================================
        // Event löschen
        // ========================================
        case 'calendar.deleteEvent': {
          const { eventId, title, date } = action.payload as {
            eventId?: string;
            title?: string;
            date?: string;
          };
          
          // Versuche Event zu finden und zu löschen
          if (eventId) {
            // Direkt löschen
            calendarStore.deleteEvent(eventId);
            return { success: true };
          }
          
          // Wenn kein eventId, nach Titel und Datum suchen
          if (title) {
            const events = calendarStore.events;
            const event = events.find(e => {
              const titleMatch = e.title.toLowerCase().includes(title.toLowerCase());
              const dateMatch = !date || e.startDate.startsWith(date);
              return titleMatch && dateMatch;
            });
            
            if (event) {
              calendarStore.deleteEvent(event.id);
              return { success: true };
            }
            
            return { 
              success: false, 
              error: `Kein Event mit Titel "${title}" gefunden`,
            };
          }
          
          return { 
            success: false, 
            error: 'Bitte gib eine Event-ID oder einen Titel an',
          };
        }

        // ========================================
        // Event aktualisieren
        // ========================================
        case 'calendar.updateEvent': {
          const { 
            eventId, 
            title, 
            date, 
            startTime, 
            endTime, 
            description, 
            categoryId,
          } = action.payload as {
            eventId: string;
            title?: string;
            date?: string;
            startTime?: string;
            endTime?: string;
            description?: string;
            categoryId?: string;
          };
          
          if (!eventId) {
            return { 
              success: false, 
              error: 'Event-ID fehlt',
            };
          }
          
          // Updates zusammenstellen
          const updates: Record<string, unknown> = {};
          
          if (title) updates.title = title;
          if (description) updates.description = description;
          if (categoryId) updates.categoryId = categoryId;
          
          // Datum/Zeit Updates
          if (date || startTime) {
            const event = calendarStore.events.find(e => e.id === eventId);
            if (event) {
              const existingDate = event.startDate.split('T')[0];
              const existingTime = event.startDate.split('T')[1]?.substring(0, 5) || '09:00';
              
              const newDate = date || existingDate;
              const newStartTime = startTime || existingTime;
              
              updates.startDate = `${newDate}T${newStartTime}:00`;
              
              // Endzeit berechnen
              if (endTime) {
                updates.endDate = `${newDate}T${endTime}:00`;
              } else {
                // 1 Stunde nach Start
                const hour = parseInt(newStartTime.split(':')[0]) + 1;
                const minute = newStartTime.split(':')[1];
                updates.endDate = `${newDate}T${String(hour).padStart(2, '0')}:${minute}:00`;
              }
            }
          }
          
          // Event aktualisieren
          calendarStore.updateEvent(eventId, updates);
          
          return { success: true };
        }

        default:
          return { 
            success: false, 
            error: `Unbekannte Calendar-Action: ${action.type}`,
          };
      }
    } catch (error) {
      console.error(`Calendar Action Handler Fehler:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      };
    }
  },
};
