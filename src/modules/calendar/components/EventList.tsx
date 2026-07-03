// ============================================
// EventList.tsx - Liste der Events für den ausgewählten Tag
// 
// Zweck: Zeigt alle Events des aktuell ausgewählten Tages
//        Ermöglicht schnellen Zugriff zum Bearbeiten
// Verwendet von: CalendarPage.tsx
// ============================================

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { useCalendarStore, getEventsForDate } from '../store';
import { formatDate, formatTime, isToday } from '../utils/date-utils';
import { useThemeStyles } from '@/lib/theme';

// --------------------------------------------
// Komponente: EventList
// Die Seitenleiste mit Events für den ausgewählten Tag
// --------------------------------------------

export function EventList() {
  // Store-Werte holen
  const selectedDate = useCalendarStore((state) => state.selectedDate);
  const allEvents = useCalendarStore((state) => state.events);
  const visibleCategories = useCalendarStore((state) => state.visibleCategories);
  const categories = useCalendarStore((state) => state.categories);
  const openModal = useCalendarStore((state) => state.openModal);
  
  // Theme-Styles
  const { surface, accentColor, designStyle, surfaceColor, textColor } = useThemeStyles();
  
  // Events für den ausgewählten Tag mit useMemo filtern
  const events = useMemo(
    () => getEventsForDate(allEvents, visibleCategories, selectedDate),
    [allEvents, visibleCategories, selectedDate]
  );
  
  // Datum für die Überschrift formatieren
  const formattedDate = formatDate(selectedDate);
  const todayCheck = isToday(selectedDate);

  return (
    <div 
      className="flex h-full flex-col p-4"
      style={{
        ...surface.base,
        borderRadius: designStyle === 'brutal' ? '0.5rem' : '1.5rem',
      }}
    >
      {/* ----------------------------------------
          Header mit Datum
          ---------------------------------------- */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold" style={{ color: textColor }}>
          {todayCheck ? 'Heute' : formattedDate}
        </h3>
        {todayCheck && (
          <p className="text-sm" style={{ color: textColor, opacity: 0.6 }}>{formattedDate}</p>
        )}
        <p className="mt-1 text-sm" style={{ color: textColor, opacity: 0.4 }}>
          {events.length === 0 
            ? 'Keine Events' 
            : `${events.length} Event${events.length > 1 ? 's' : ''}`
          }
        </p>
      </div>

      {/* ----------------------------------------
          Event-Liste
          Scrollbar wenn zu viele Events
          ---------------------------------------- */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {events.length === 0 ? (
          // Keine Events -> Hinweis anzeigen
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p style={{ color: textColor, opacity: 0.4 }}>
              Keine Events an diesem Tag
            </p>
            <button
              onClick={() => openModal()}
              className="mt-3 text-sm transition-colors"
              style={{ color: accentColor }}
            >
              + Event erstellen
            </button>
          </div>
        ) : (
          // Events als Karten anzeigen
          events.map((event, index) => {
            // Kategorie für Farbe finden
            const category = categories.find(c => c.id === event.categoryId);
            const color = category?.color || '#6b7280';
            
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <EventCard
                  title={event.title}
                  startTime={event.allDay ? 'Ganztägig' : formatTime(event.startDate)}
                  endTime={event.allDay ? undefined : formatTime(event.endDate)}
                  color={color}
                  categoryName={category?.name || 'Unbekannt'}
                  onClick={() => openModal(event)}
                />
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

// --------------------------------------------
// Komponente: EventCard
// Eine einzelne Event-Karte in der Liste
// --------------------------------------------

interface EventCardProps {
  title: string;
  startTime: string;
  endTime?: string;
  color: string;
  categoryName: string;
  onClick: () => void;
}

function EventCard({ 
  title, 
  startTime, 
  endTime, 
  color, 
  categoryName,
  onClick 
}: EventCardProps) {
  // Theme-Styles
  const { designStyle, textColor } = useThemeStyles();
  
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full p-3 text-left transition-all"
      style={{
        borderLeft: designStyle === 'brutal' ? `4px solid ${color}` : `3px solid ${color}`,
        background: `${color}15`,
        borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
        border: designStyle === 'brutal' ? `2px solid #000` : 'none',
        borderLeftWidth: designStyle === 'brutal' ? '4px' : '3px',
        borderLeftColor: color,
        boxShadow: designStyle === 'brutal' ? '2px 2px 0 #000' : 'none',
      }}
    >
      {/* Event-Titel */}
      <h4 className="font-medium truncate" style={{ color: textColor }}>
        {title}
      </h4>
      
      {/* Zeit und Kategorie */}
      <div className="mt-1 flex items-center gap-2 text-sm" style={{ color: textColor, opacity: 0.6 }}>
        <Clock className="h-3 w-3" />
        <span>
          {startTime}
          {endTime && ` - ${endTime}`}
        </span>
        <span style={{ opacity: 0.3 }}>•</span>
        <span style={{ color }}>{categoryName}</span>
      </div>
    </motion.button>
  );
}

