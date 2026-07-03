// ============================================
// MonthView.tsx - Monatsansicht des Kalenders
// 
// Zweck: Zeigt einen Monat als 7x6 Grid mit allen Tagen
//        Tage zeigen Events als farbige Punkte/Balken
// Verwendet von: CalendarPage.tsx
// ============================================

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useCalendarStore, getEventsForDate } from '../store';
import { WEEKDAYS_SHORT } from '../constants';
import { getMonthDays, isInMonth, isToday, toISODateString } from '../utils/date-utils';
import { useThemeStyles } from '@/lib/theme';

// --------------------------------------------
// Komponente: MonthView
// Das Haupt-Grid mit allen Tagen des Monats
// --------------------------------------------

export function MonthView() {
  // --------------------------------------------
  // Store-Selektoren (Performance-optimiert)
  // Jeder Selektor abonniert nur seinen spezifischen Wert
  // --------------------------------------------
  const selectedDate = useCalendarStore((state) => state.selectedDate);
  const setSelectedDate = useCalendarStore((state) => state.setSelectedDate);
  const openModal = useCalendarStore((state) => state.openModal);
  
  // Theme-Styles
  const { surface, accentColor, designStyle, surfaceColor, textColor } = useThemeStyles();
  
  // Datum parsen
  const date = new Date(selectedDate);
  const year = date.getFullYear();
  const month = date.getMonth();
  
  // Alle Tage für das Grid berechnen (inkl. Padding vom Vor-/Nachmonat)
  const days = getMonthDays(year, month);

  return (
    <div 
      className="p-4 h-full flex flex-col"
      style={{
        ...surface.base,
        borderRadius: designStyle === 'brutal' ? '0.5rem' : '1.5rem',
      }}
    >
      {/* ----------------------------------------
          Wochentag-Header
          Mo, Di, Mi, Do, Fr, Sa, So
          ---------------------------------------- */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS_SHORT.map((day, index) => (
          <div 
            key={day} 
            className="py-2 text-center text-sm font-medium"
            style={{
              color: textColor,
              opacity: index >= 5 ? 0.4 : 0.6,
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* ----------------------------------------
          Tages-Grid
          6 Zeilen × 7 Spalten = 42 Zellen
          flex-1 damit es den restlichen Platz füllt
          ---------------------------------------- */}
      <div className="grid grid-cols-7 grid-rows-6 gap-1 flex-1 min-h-0">
        {days.map((dayDate, index) => (
          <DayCell 
            key={index}
            date={dayDate}
            isCurrentMonth={isInMonth(dayDate, year, month)}
            isSelected={toISODateString(dayDate) === selectedDate}
            onSelect={() => setSelectedDate(toISODateString(dayDate))}
            onDoubleClick={() => {
              // Doppelklick öffnet Modal für neues Event an diesem Tag
              setSelectedDate(toISODateString(dayDate));
              openModal();
            }}
            accentColor={accentColor}
            designStyle={designStyle}
            surfaceColor={surfaceColor}
            textColor={textColor}
          />
        ))}
      </div>
    </div>
  );
}

// --------------------------------------------
// Komponente: DayCell
// Eine einzelne Zelle im Kalender-Grid
// --------------------------------------------

interface DayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
  accentColor: string;
  designStyle: 'glass' | 'brutal' | 'neo';
  surfaceColor: string;
  textColor: string;
}

function DayCell({ 
  date, 
  isCurrentMonth, 
  isSelected, 
  onSelect,
  onDoubleClick,
  accentColor,
  designStyle,
  surfaceColor,
  textColor,
}: DayCellProps) {
  // Datum als String für Filterung
  const dateString = toISODateString(date);
  
  // Store-Daten holen (stabile Referenzen)
  const allEvents = useCalendarStore((state) => state.events);
  const visibleCategories = useCalendarStore((state) => state.visibleCategories);
  const categories = useCalendarStore((state) => state.categories);
  
  // Events für diesen Tag mit useMemo filtern
  // useMemo verhindert unnötige Neuberechnungen
  const events = useMemo(
    () => getEventsForDate(allEvents, visibleCategories, dateString),
    [allEvents, visibleCategories, dateString]
  );
  
  // Ist dieser Tag heute?
  const today = isToday(date);
  
  // Tagnummer (1-31)
  const dayNumber = date.getDate();

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      className="relative flex h-full min-h-0 flex-col items-center justify-start p-2 transition-all"
      style={{
        color: textColor,
        opacity: isCurrentMonth ? 1 : 0.3,
        background: isSelected 
          ? designStyle === 'brutal' ? surfaceColor : `${accentColor}30`
          : today && !isSelected 
          ? `${accentColor}20`
          : 'transparent',
        borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
        border: isSelected 
          ? designStyle === 'brutal' ? '2px solid #000' : `2px solid ${accentColor}60`
          : 'none',
        boxShadow: isSelected && designStyle === 'brutal' ? '2px 2px 0 #000' : 'none',
      }}
    >
      {/* ----------------------------------------
          Tagnummer
          Bei "heute" mit Akzentfarbe
          ---------------------------------------- */}
      <span 
        className="flex h-7 w-7 items-center justify-center text-sm font-medium"
        style={{
          background: today ? accentColor : 'transparent',
          color: today ? '#fff' : textColor,
          borderRadius: designStyle === 'brutal' ? '0.25rem' : '9999px',
          border: today && designStyle === 'brutal' ? '2px solid #000' : 'none',
        }}
      >
        {dayNumber}
      </span>

      {/* ----------------------------------------
          Event-Indikatoren
          Kleine farbige Punkte für jedes Event
          ---------------------------------------- */}
      {events.length > 0 && (
        <div className="mt-1 flex flex-wrap justify-center gap-1">
          {/* Maximal 3 Punkte anzeigen */}
          {events.slice(0, 3).map((event) => {
            // Farbe der Kategorie finden
            const category = categories.find(c => c.id === event.categoryId);
            const color = category?.color || '#6b7280';
            
            return (
              <span
                key={event.id}
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
                title={event.title}
              />
            );
          })}
          
          {/* Wenn mehr als 3 Events: "+X" anzeigen */}
          {events.length > 3 && (
            <span className="text-[10px]" style={{ color: textColor, opacity: 0.6 }}>
              +{events.length - 3}
            </span>
          )}
        </div>
      )}

      {/* ----------------------------------------
          Event-Titel (nur bei ausgewähltem Tag)
          Zeigt die ersten 2 Events als Text
          ---------------------------------------- */}
      {isSelected && events.length > 0 && (
        <div className="mt-1 w-full space-y-0.5">
          {events.slice(0, 2).map((event) => {
            const category = categories.find(c => c.id === event.categoryId);
            const color = category?.color || '#6b7280';
            
            return (
              <div
                key={event.id}
                className="truncate rounded px-1 py-0.5 text-[10px] text-white"
                style={{ backgroundColor: `${color}80` }}
              >
                {event.title}
              </div>
            );
          })}
        </div>
      )}
    </motion.button>
  );
}
