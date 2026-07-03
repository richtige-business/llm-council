// ============================================
// CalendarHeader.tsx - Kopfzeile des Kalenders
// 
// Zweck: Navigation zwischen Monaten/Wochen/Tagen
//        Umschalten zwischen verschiedenen Ansichten
// Verwendet von: CalendarPage.tsx
// ============================================

'use client';

import { motion } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  LayoutGrid,
  List,
  Plus
} from 'lucide-react';
import { useCalendarStore } from '../store';
import { MONTHS } from '../constants';
import type { CalendarView } from '../types';
import { useThemeStyles } from '@/lib/theme';

// --------------------------------------------
// Komponente: CalendarHeader
// Die obere Leiste mit Navigation und View-Tabs
// --------------------------------------------

export function CalendarHeader() {
  // --------------------------------------------
  // Store-Selektoren (Performance-optimiert)
  // Jeder Selektor abonniert nur seinen spezifischen Wert
  // --------------------------------------------
  const selectedDate = useCalendarStore((state) => state.selectedDate);
  const currentView = useCalendarStore((state) => state.currentView);
  const setCurrentView = useCalendarStore((state) => state.setCurrentView);
  const goToPrevious = useCalendarStore((state) => state.goToPrevious);
  const goToNext = useCalendarStore((state) => state.goToNext);
  const goToToday = useCalendarStore((state) => state.goToToday);
  const openModal = useCalendarStore((state) => state.openModal);
  
  // Theme-Styles
  const { button, surface, accentColor, textColor, designStyle } = useThemeStyles();
  
  // Datum parsen für die Anzeige
  const date = new Date(selectedDate);
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  
  // --------------------------------------------
  // View-Buttons Konfiguration
  // Welche Ansichten sind verfügbar?
  // --------------------------------------------
  
  const viewButtons: { view: CalendarView; icon: typeof CalendarIcon; label: string }[] = [
    { view: 'month', icon: LayoutGrid, label: 'Monat' },
    { view: 'week', icon: List, label: 'Woche' },
    { view: 'day', icon: CalendarIcon, label: 'Tag' },
  ];

  return (
    <div className="flex items-center justify-between mb-6">
      {/* ----------------------------------------
          Linke Seite: Navigation
          Pfeile zum Vor-/Zurückblättern + Heute-Button
          ---------------------------------------- */}
      <div className="flex items-center gap-2">
        {/* Zurück-Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={goToPrevious}
          className="flex h-10 w-10 items-center justify-center transition-colors"
          style={{
            ...button.base,
            color: textColor,
          }}
          aria-label="Zurück"
        >
          <ChevronLeft className="h-5 w-5" />
        </motion.button>
        
        {/* Vor-Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={goToNext}
          className="flex h-10 w-10 items-center justify-center transition-colors"
          style={{
            ...button.base,
            color: textColor,
          }}
          aria-label="Vor"
        >
          <ChevronRight className="h-5 w-5" />
        </motion.button>
        
        {/* Heute-Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={goToToday}
          className="ml-2 px-4 py-2 text-sm font-medium transition-colors"
          style={{
            ...button.base,
            color: textColor,
          }}
        >
          Heute
        </motion.button>
        
        {/* Aktueller Monat/Jahr */}
        <h2 className="ml-4 text-2xl font-semibold" style={{ color: textColor }}>
          {month} {year}
        </h2>
      </div>

      {/* ----------------------------------------
          Rechte Seite: View-Tabs + Neues Event
          ---------------------------------------- */}
      <div className="flex items-center gap-3">
        {/* View-Umschalter */}
        <div 
          className="flex p-1"
          style={{
            ...surface.base,
            padding: '0.25rem',
          }}
        >
          {viewButtons.map(({ view, icon: Icon, label }) => (
            <motion.button
              key={view}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentView(view)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium transition-all"
              style={{
                background: currentView === view ? 'rgba(255,255,255,0.2)' : 'transparent',
                color: currentView === view ? textColor : `${textColor}99`,
                borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
              }}
              aria-label={label}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </motion.button>
          ))}
        </div>
        
        {/* Neues Event erstellen */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 font-medium text-white transition-all"
          style={{
            background: accentColor,
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
            border: designStyle === 'brutal' ? '2px solid #000' : 'none',
            boxShadow: designStyle === 'brutal' ? '3px 3px 0 #000' : 'none',
          }}
          data-agent-button="new-event"
        >
          <Plus className="h-5 w-5" />
          <span className="hidden sm:inline">Neues Event</span>
        </motion.button>
      </div>
    </div>
  );
}




