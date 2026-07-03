// ============================================
// CalendarPage.tsx - Hauptseite des Kalender-Moduls
// 
// Zweck: Container für alle Kalender-Komponenten
//        Wechselt zwischen Monats-/Wochen-/Tagesansicht
// Verwendet von: /app/calendar/page.tsx (Route)
// ============================================

'use client';

import { motion } from 'framer-motion';
import { useCalendarStore } from '../store';
import { CalendarHeader } from './CalendarHeader';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { EventModal } from './EventModal';
import { EventList } from './EventList';
import { CALENDAR_MODULE_INFO } from '../constants';
import { ModuleSettingsButton } from '@/components/agent';

// --------------------------------------------
// Komponente: CalendarPage
// Die Hauptseite die alle Kalender-Teile zusammenfügt
// --------------------------------------------

export function CalendarPage() {
  // Aktuelle Ansicht aus dem Store
  const currentView = useCalendarStore((state) => state.currentView);

  return (
    // h-full für volle verfügbare Höhe (Shell kümmert sich um Chatbar-Freiraum)
    <div className="flex h-full flex-col p-6" data-agent-panel="calendar-root">
      {/* ----------------------------------------
          Seiten-Header
          Mit Navigation und View-Umschalter
          ---------------------------------------- */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <CalendarHeader />
      </motion.div>

      {/* ----------------------------------------
          Haupt-Content
          Kalender-Grid + Event-Liste nebeneinander
          ---------------------------------------- */}
      <div className="flex flex-1 min-h-0 gap-6">
        {/* Kalender-Ansicht (je nach ausgewähltem View) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex-1 h-full min-h-0"
        >
          {/* Je nach View die richtige Komponente rendern */}
          {currentView === 'month' && <MonthView />}
          {currentView === 'week' && <WeekView />}
          {currentView === 'day' && <DayView />}
        </motion.div>

        {/* Event-Liste rechts (nur bei Monatsansicht) */}
        {currentView === 'month' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="w-80 shrink-0 min-h-0"
          >
            <EventList />
          </motion.div>
        )}
      </div>

      {/* ----------------------------------------
          Event Modal
          Popup zum Erstellen/Bearbeiten von Events
          Wird über den Store gesteuert
          ---------------------------------------- */}
      <EventModal />
      
      {/* Agent Settings Button */}
      <ModuleSettingsButton
        moduleId={CALENDAR_MODULE_INFO.id}
        moduleName={CALENDAR_MODULE_INFO.name}
        moduleColor={CALENDAR_MODULE_INFO.color}
      />
    </div>
  );
}
