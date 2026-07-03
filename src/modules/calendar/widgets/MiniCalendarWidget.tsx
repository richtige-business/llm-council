// ============================================
// MiniCalendarWidget.tsx - Kompaktes Kalender-Widget
// 
// Zweck: Kleine Monatsansicht für das Dashboard
//        Zeigt Tage mit Events als Punkte
// Verwendet von: Dashboard
// ============================================

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useCalendarStore, getEventsForDate } from '../store';
import { 
  getMonthDays, 
  isInMonth, 
  isToday, 
  toISODateString 
} from '../utils/date-utils';
import { WEEKDAYS_SHORT, MONTHS } from '../constants';
import { useThemeStyles } from '@/lib/theme';

// --------------------------------------------
// Komponente: MiniCalendarWidget
// Kompakter Monatskalender für das Dashboard
// --------------------------------------------

export function MiniCalendarWidget() {
  // --------------------------------------------
  // Store-Selektoren (Performance-optimiert)
  // --------------------------------------------
  const selectedDate = useCalendarStore((state) => state.selectedDate);
  const setSelectedDate = useCalendarStore((state) => state.setSelectedDate);
  const goToPrevious = useCalendarStore((state) => state.goToPrevious);
  const goToNext = useCalendarStore((state) => state.goToNext);
  const allEvents = useCalendarStore((state) => state.events);
  const visibleCategories = useCalendarStore((state) => state.visibleCategories);
  
  // Theme-Styles
  const { surface, button, accentColor, textColor, designStyle } = useThemeStyles();
  
  // Datum parsen
  const date = new Date(selectedDate);
  const year = date.getFullYear();
  const month = date.getMonth();
  
  // Tage des Monats
  const days = useMemo(() => getMonthDays(year, month), [year, month]);

  return (
    <div 
      className="p-4"
      style={surface.base}
    >
      {/* Header mit Navigation */}
      <div className="flex items-center justify-between mb-3">
        <Link 
          href="/calendar"
          className="text-sm font-medium transition-colors"
          style={{ color: textColor }}
        >
          {MONTHS[month]} {year}
        </Link>
        
        <div className="flex gap-1">
          <button
            onClick={goToPrevious}
            className="p-1 transition-colors"
            style={{ 
              color: textColor, 
              opacity: 0.6,
              borderRadius: designStyle === 'brutal' ? '0.25rem' : '0.5rem',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.opacity = '0.6';
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goToNext}
            className="p-1 transition-colors"
            style={{ 
              color: textColor, 
              opacity: 0.6,
              borderRadius: designStyle === 'brutal' ? '0.25rem' : '0.5rem',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.opacity = '0.6';
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Wochentag-Header */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS_SHORT.map((day, index) => (
          <div 
            key={day} 
            className="text-center text-[10px] font-medium py-1"
            style={{ color: textColor, opacity: index >= 5 ? 0.3 : 0.5 }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Tages-Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((dayDate, index) => (
          <MiniDayCell
            key={index}
            date={dayDate}
            isCurrentMonth={isInMonth(dayDate, year, month)}
            allEvents={allEvents}
            visibleCategories={visibleCategories}
            accentColor={accentColor}
            textColor={textColor}
            designStyle={designStyle}
          />
        ))}
      </div>
    </div>
  );
}

// --------------------------------------------
// Komponente: MiniDayCell
// Eine einzelne Zelle im Mini-Kalender
// --------------------------------------------

interface MiniDayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  allEvents: any[];
  visibleCategories: string[];
  accentColor: string;
  textColor: string;
  designStyle: 'glass' | 'brutal' | 'neo';
}

function MiniDayCell({ 
  date, 
  isCurrentMonth,
  allEvents,
  visibleCategories,
  accentColor,
  textColor,
  designStyle,
}: MiniDayCellProps) {
  const dateStr = toISODateString(date);
  const today = isToday(date);
  
  // Hat dieser Tag Events?
  const hasEvents = useMemo(() => {
    const events = getEventsForDate(allEvents, visibleCategories, dateStr);
    return events.length > 0;
  }, [allEvents, visibleCategories, dateStr]);

  return (
    <Link
      href="/calendar"
      className="relative flex items-center justify-center h-6 w-6 mx-auto text-xs transition-colors"
      style={{
        color: isCurrentMonth ? textColor : `${textColor}4D`, // 30% opacity
        background: today ? accentColor : 'transparent',
        fontWeight: today ? 600 : 400,
        borderRadius: designStyle === 'brutal' ? '0.25rem' : '0.375rem',
      }}
      onMouseEnter={(e) => {
        if (!today) e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
      }}
      onMouseLeave={(e) => {
        if (!today) e.currentTarget.style.background = 'transparent';
      }}
    >
      {date.getDate()}
      
      {/* Event-Indikator */}
      {hasEvents && !today && (
        <span 
          className="absolute bottom-0.5 h-1 w-1"
          style={{ 
            backgroundColor: accentColor,
            borderRadius: designStyle === 'brutal' ? '0' : '9999px',
          }}
        />
      )}
    </Link>
  );
}

