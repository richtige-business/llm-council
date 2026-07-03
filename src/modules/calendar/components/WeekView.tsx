// ============================================
// WeekView.tsx - Wochenansicht des Kalenders
// 
// Zweck: Zeigt eine Woche als Zeitraster mit Stunden
//        Events werden als Blöcke in den Zeitslots angezeigt
// Verwendet von: CalendarPage.tsx
// ============================================

'use client';

import { useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCalendarStore, getEventsForDate } from '../store';
import { WEEKDAYS_SHORT } from '../constants';
import { 
  getWeekDays, 
  isToday, 
  toISODateString,
  formatTime 
} from '../utils/date-utils';
import type { CalendarEvent } from '../types';

// --------------------------------------------
// Konstanten für das Zeit-Grid
// --------------------------------------------

// Alle 24 Stunden anzeigen (0:00 - 23:00)
const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i);
// Höhe einer Stunde in Pixeln
const HOUR_HEIGHT = 60;

// --------------------------------------------
// Komponente: WeekView
// Das Hauptlayout der Wochenansicht
// --------------------------------------------

export function WeekView() {
  // --------------------------------------------
  // Store-Selektoren (Performance-optimiert)
  // --------------------------------------------
  const selectedDate = useCalendarStore((state) => state.selectedDate);
  const setSelectedDate = useCalendarStore((state) => state.setSelectedDate);
  const openModal = useCalendarStore((state) => state.openModal);
  
  // Die 7 Tage der aktuellen Woche berechnen
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  
  // Ref für den Scroll-Container (für auto-scroll zur aktuellen Zeit)
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // ----------------------------------------
  // Auto-Scroll zur aktuellen Uhrzeit
  // Beim Laden wird die Ansicht auf die aktuelle Stunde zentriert
  // ----------------------------------------
  useEffect(() => {
    if (scrollContainerRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Berechne die Scroll-Position so, dass die aktuelle Stunde zentriert ist
      // containerHeight / 2 = halbe Höhe des sichtbaren Bereichs
      const containerHeight = scrollContainerRef.current.clientHeight;
      const targetScroll = (currentHour * HOUR_HEIGHT) - (containerHeight / 2) + (HOUR_HEIGHT / 2);
      
      // Scroll mit sanfter Animation
      scrollContainerRef.current.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth',
      });
    }
  }, [selectedDate]); // Auch bei Datumsänderung neu zentrieren

  return (
    <div 
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(40px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* ----------------------------------------
          Header mit Wochentagen
          ---------------------------------------- */}
      <div className="flex border-b border-white/10">
        {/* Leere Zelle für Zeit-Spalte */}
        <div className="w-16 shrink-0 border-r border-white/10 p-2" />
        
        {/* Wochentage */}
        {weekDays.map((day, index) => {
          const dateStr = toISODateString(day);
          const today = isToday(day);
          const isSelected = dateStr === selectedDate;
          
          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              className={`flex-1 p-3 text-center transition-colors ${
                today ? 'bg-blue-500/20' : ''
              } ${isSelected ? 'bg-white/10' : 'hover:bg-white/5'}`}
            >
              {/* Wochentag (Mo, Di, ...) */}
              <div className={`text-xs font-medium ${
                index >= 5 ? 'text-white/40' : 'text-white/60'
              }`}>
                {WEEKDAYS_SHORT[day.getDay()]}
              </div>
              
              {/* Tagnummer */}
              <div className={`mt-1 text-lg font-semibold ${
                today 
                  ? 'flex h-8 w-8 mx-auto items-center justify-center rounded-full bg-blue-500 text-white' 
                  : 'text-white'
              }`}>
                {day.getDate()}
              </div>
            </button>
          );
        })}
      </div>

      {/* ----------------------------------------
          Zeit-Grid mit Events
          Scrollt automatisch zur aktuellen Uhrzeit
          ---------------------------------------- */}
      <div 
        ref={scrollContainerRef}
        className="relative flex flex-1 overflow-y-auto" 
        style={{ maxHeight: '500px' }}
      >
        {/* Zeit-Spalte links */}
        <div className="w-16 shrink-0 border-r border-white/10">
          {ALL_HOURS.map((hour) => (
            <div 
              key={hour}
              className="relative border-b border-white/5 text-right pr-2 text-xs text-white/40"
              style={{ height: HOUR_HEIGHT }}
            >
              <span className="absolute -top-2 right-2">
                {hour.toString().padStart(2, '0')}:00
              </span>
            </div>
          ))}
        </div>

        {/* Tages-Spalten */}
        {weekDays.map((day) => (
          <DayColumn 
            key={toISODateString(day)} 
            date={day}
            onTimeClick={(hour) => {
              setSelectedDate(toISODateString(day));
              openModal();
            }}
          />
        ))}
      </div>
    </div>
  );
}

// --------------------------------------------
// Komponente: DayColumn
// Eine einzelne Tages-Spalte im Wochenraster
// --------------------------------------------

interface DayColumnProps {
  date: Date;
  onTimeClick: (hour: number) => void;
}

function DayColumn({ date, onTimeClick }: DayColumnProps) {
  const dateStr = toISODateString(date);
  
  // Events und Kategorien aus dem Store
  const allEvents = useCalendarStore((state) => state.events);
  const visibleCategories = useCalendarStore((state) => state.visibleCategories);
  const categories = useCalendarStore((state) => state.categories);
  const openModal = useCalendarStore((state) => state.openModal);
  
  // Events für diesen Tag filtern
  const dayEvents = useMemo(
    () => getEventsForDate(allEvents, visibleCategories, dateStr)
      .filter(e => !e.allDay), // Nur Events mit Uhrzeit
    [allEvents, visibleCategories, dateStr]
  );

  return (
    <div className="flex-1 relative border-r border-white/5 last:border-r-0">
      {/* Stunden-Grid (klickbar für neue Events) - alle 24 Stunden */}
      {ALL_HOURS.map((hour) => (
        <div
          key={hour}
          onClick={() => onTimeClick(hour)}
          className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
          style={{ height: HOUR_HEIGHT }}
        />
      ))}

      {/* Events als Blöcke */}
      {dayEvents.map((event) => (
        <EventBlock 
          key={event.id} 
          event={event}
          categories={categories}
          onClick={() => openModal(event)}
        />
      ))}
    </div>
  );
}

// --------------------------------------------
// Komponente: EventBlock
// Ein Event als Block im Zeitraster
// --------------------------------------------

interface EventBlockProps {
  event: CalendarEvent;
  categories: { id: string; color: string; name: string }[];
  onClick: () => void;
}

function EventBlock({ event, categories, onClick }: EventBlockProps) {
  // Event-Position und Größe berechnen
  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  
  // Stunden als Dezimalzahl (z.B. 14:30 = 14.5)
  const startHour = startDate.getHours() + startDate.getMinutes() / 60;
  const endHour = endDate.getHours() + endDate.getMinutes() / 60;
  
  // Position in Pixeln (relativ zu 0:00, d.h. Tagesbeginn)
  const top = startHour * HOUR_HEIGHT;
  const height = Math.max(30, (endHour - startHour) * HOUR_HEIGHT);
  
  // Kategorie-Farbe
  const category = categories.find(c => c.id === event.categoryId);
  const color = category?.color || '#6b7280';

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className="absolute left-1 right-1 rounded-lg px-2 py-1 text-left overflow-hidden"
      style={{
        top,
        height,
        backgroundColor: `${color}30`,
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div className="text-xs font-medium text-white truncate">
        {event.title}
      </div>
      <div className="text-[10px] text-white/60">
        {formatTime(event.startDate)} - {formatTime(event.endDate)}
      </div>
    </motion.button>
  );
}

