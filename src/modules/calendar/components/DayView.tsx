// ============================================
// DayView.tsx - Tagesansicht des Kalenders
// 
// Zweck: Zeigt einen einzelnen Tag mit detailliertem Stundenraster
//        Ideal für die Planung eines Tages
// Verwendet von: CalendarPage.tsx
// ============================================

'use client';

import { useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Calendar } from 'lucide-react';
import { useCalendarStore, getEventsForDate } from '../store';
import { 
  formatDate, 
  formatTime, 
  isToday,
  toISODateString 
} from '../utils/date-utils';
import type { CalendarEvent } from '../types';

// --------------------------------------------
// Konstanten
// --------------------------------------------

// Stunden die angezeigt werden (0:00 - 23:00)
const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 80; // Höher als in WeekView für mehr Detail

// --------------------------------------------
// Komponente: DayView
// Detaillierte Ansicht eines einzelnen Tages
// --------------------------------------------

export function DayView() {
  // --------------------------------------------
  // Store-Selektoren (Performance-optimiert)
  // --------------------------------------------
  const selectedDate = useCalendarStore((state) => state.selectedDate);
  const openModal = useCalendarStore((state) => state.openModal);
  
  // Events und Kategorien
  const allEvents = useCalendarStore((state) => state.events);
  const visibleCategories = useCalendarStore((state) => state.visibleCategories);
  const categories = useCalendarStore((state) => state.categories);
  
  // Events für den ausgewählten Tag
  const dayEvents = useMemo(
    () => getEventsForDate(allEvents, visibleCategories, selectedDate),
    [allEvents, visibleCategories, selectedDate]
  );
  
  // Ganztägige Events separat
  const allDayEvents = dayEvents.filter(e => e.allDay);
  const timedEvents = dayEvents.filter(e => !e.allDay);
  
  // Datum-Info
  const today = isToday(selectedDate);
  const currentHour = new Date().getHours();
  
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
    <div className="flex gap-4 h-full">
      {/* ----------------------------------------
          Haupt-Zeitraster links
          ---------------------------------------- */}
      <div 
        className="flex-1 rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(40px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Header mit Datum */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
              today ? 'bg-blue-500' : 'bg-white/10'
            }`}>
              <span className="text-xl font-bold text-white">
                {new Date(selectedDate).getDate()}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {today ? 'Heute' : formatDate(selectedDate)}
              </h2>
              <p className="text-sm text-white/60">
                {dayEvents.length === 0 
                  ? 'Keine Events' 
                  : `${dayEvents.length} Event${dayEvents.length > 1 ? 's' : ''}`
                }
              </p>
            </div>
          </div>

          {/* Ganztägige Events */}
          {allDayEvents.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider">
                Ganztägig
              </p>
              {allDayEvents.map((event) => {
                const category = categories.find(c => c.id === event.categoryId);
                return (
                  <button
                    key={event.id}
                    onClick={() => openModal(event)}
                    className="w-full rounded-lg p-2 text-left transition-all hover:scale-[1.02]"
                    style={{
                      backgroundColor: `${category?.color || '#6b7280'}30`,
                      borderLeft: `3px solid ${category?.color || '#6b7280'}`,
                    }}
                  >
                    <span className="text-sm font-medium text-white">
                      {event.title}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Zeit-Grid - scrollt automatisch zur aktuellen Uhrzeit */}
        <div 
          ref={scrollContainerRef}
          className="relative overflow-y-auto" 
          style={{ maxHeight: '450px' }}
        >
          {ALL_HOURS.map((hour) => (
            <div
              key={hour}
              onClick={() => openModal()}
              className={`relative flex border-b border-white/5 cursor-pointer transition-colors hover:bg-white/5 ${
                today && hour === currentHour ? 'bg-blue-500/10' : ''
              }`}
              style={{ height: HOUR_HEIGHT }}
            >
              {/* Stunden-Label */}
              <div className="w-16 shrink-0 border-r border-white/10 p-2 text-right">
                <span className="text-xs text-white/40">
                  {hour.toString().padStart(2, '0')}:00
                </span>
              </div>
              
              {/* Event-Bereich */}
              <div className="flex-1 relative" />
            </div>
          ))}

          {/* Events als Blöcke */}
          {timedEvents.map((event) => (
            <DayEventBlock
              key={event.id}
              event={event}
              category={categories.find(c => c.id === event.categoryId)}
              onClick={() => openModal(event)}
            />
          ))}

          {/* Aktuelle Zeit-Linie */}
          {today && (
            <CurrentTimeLine />
          )}
        </div>
      </div>

      {/* ----------------------------------------
          Seitenleiste mit Event-Details
          ---------------------------------------- */}
      <div 
        className="w-72 rounded-2xl p-4"
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(40px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-white/60" />
          Tagesübersicht
        </h3>

        {dayEvents.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-10 w-10 text-white/20 mx-auto mb-3" />
            <p className="text-sm text-white/40">
              Keine Events geplant
            </p>
            <button
              onClick={() => openModal()}
              className="mt-4 text-sm text-blue-400 hover:text-blue-300"
            >
              + Event erstellen
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {dayEvents.map((event) => {
              const category = categories.find(c => c.id === event.categoryId);
              return (
                <motion.button
                  key={event.id}
                  whileHover={{ x: 4 }}
                  onClick={() => openModal(event)}
                  className="w-full rounded-xl p-3 text-left transition-colors hover:bg-white/5"
                  style={{
                    borderLeft: `3px solid ${category?.color || '#6b7280'}`,
                  }}
                >
                  <div className="font-medium text-white text-sm">
                    {event.title}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-white/50">
                    <Clock className="h-3 w-3" />
                    {event.allDay 
                      ? 'Ganztägig' 
                      : `${formatTime(event.startDate)} - ${formatTime(event.endDate)}`
                    }
                  </div>
                  {event.description && (
                    <p className="mt-2 text-xs text-white/40 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// --------------------------------------------
// Komponente: DayEventBlock
// Ein Event als Block im Zeitraster
// --------------------------------------------

interface DayEventBlockProps {
  event: CalendarEvent;
  category?: { color: string; name: string };
  onClick: () => void;
}

function DayEventBlock({ event, category, onClick }: DayEventBlockProps) {
  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  
  const startHour = startDate.getHours() + startDate.getMinutes() / 60;
  const endHour = endDate.getHours() + endDate.getMinutes() / 60;
  
  // Position: Zeit-Spalte (64px) + offset
  const top = startHour * HOUR_HEIGHT;
  const height = Math.max(40, (endHour - startHour) * HOUR_HEIGHT);
  const color = category?.color || '#6b7280';

  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className="absolute left-[68px] right-4 rounded-xl px-3 py-2 text-left overflow-hidden shadow-lg"
      style={{
        top,
        height,
        backgroundColor: `${color}40`,
        borderLeft: `4px solid ${color}`,
      }}
    >
      <div className="font-medium text-white text-sm truncate">
        {event.title}
      </div>
      <div className="text-xs text-white/70 mt-1">
        {formatTime(event.startDate)} - {formatTime(event.endDate)}
      </div>
      {height > 60 && event.description && (
        <p className="text-xs text-white/50 mt-2 line-clamp-2">
          {event.description}
        </p>
      )}
    </motion.button>
  );
}

// --------------------------------------------
// Komponente: CurrentTimeLine
// Zeigt die aktuelle Uhrzeit als rote Linie
// --------------------------------------------

function CurrentTimeLine() {
  const now = new Date();
  const hours = now.getHours() + now.getMinutes() / 60;
  const top = hours * HOUR_HEIGHT;

  return (
    <div 
      className="absolute left-16 right-0 flex items-center pointer-events-none z-10"
      style={{ top }}
    >
      {/* Roter Punkt */}
      <div className="h-3 w-3 rounded-full bg-red-500 -ml-1.5 shadow-lg" />
      {/* Rote Linie */}
      <div className="flex-1 h-0.5 bg-red-500 shadow-lg" />
    </div>
  );
}

