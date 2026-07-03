// ============================================
// UpcomingEventsWidget.tsx - Widget für nächste Events
// 
// Zweck: Zeigt die kommenden Events als kompakte Liste
//        Für das Dashboard
// Verwendet von: Dashboard, Modul-Übersicht
// ============================================

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useCalendarStore, getUpcomingEvents } from '../store';
import { formatDateShort, formatTime, getRelativeTime } from '../utils/date-utils';
import { useThemeStyles } from '@/lib/theme';

// --------------------------------------------
// Komponente: UpcomingEventsWidget
// Kompakte Liste der nächsten Events
// --------------------------------------------

interface UpcomingEventsWidgetProps {
  limit?: number;
  showHeader?: boolean;
}

export function UpcomingEventsWidget({ 
  limit = 5, 
  showHeader = true 
}: UpcomingEventsWidgetProps) {
  // Store-Daten
  const allEvents = useCalendarStore((state) => state.events);
  const visibleCategories = useCalendarStore((state) => state.visibleCategories);
  const categories = useCalendarStore((state) => state.categories);
  
  // Theme-Styles
  const { surface, accentColor, textColor, designStyle } = useThemeStyles();
  
  // Kommende Events filtern
  const upcomingEvents = useMemo(
    () => getUpcomingEvents(allEvents, visibleCategories, limit),
    [allEvents, visibleCategories, limit]
  );

  return (
    <div 
      className="p-4 h-full"
      style={surface.base}
    >
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div 
              className="flex h-8 w-8 items-center justify-center"
              style={{
                background: accentColor,
                borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
                border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                boxShadow: designStyle === 'brutal' ? '2px 2px 0 #000' : 'none',
              }}
            >
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <span className="font-medium text-sm" style={{ color: textColor }}>Nächste Termine</span>
          </div>
          
          <Link 
            href="/calendar"
            className="text-xs flex items-center gap-1 transition-colors hover:opacity-100"
            style={{ color: textColor, opacity: 0.5 }}
          >
            Alle
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Event-Liste */}
      {upcomingEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Calendar className="h-8 w-8 mb-2" style={{ color: textColor, opacity: 0.2 }} />
          <p className="text-sm" style={{ color: textColor, opacity: 0.4 }}>Keine anstehenden Events</p>
        </div>
      ) : (
        <div className="space-y-2">
          {upcomingEvents.map((event, index) => {
            const category = categories.find(c => c.id === event.categoryId);
            const color = category?.color || '#6b7280';
            
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href="/calendar"
                  className="flex items-start gap-3 p-2 transition-colors"
                  style={{
                    borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.75rem',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Farbiger Indikator */}
                  <div 
                    className="mt-1 h-2 w-2 shrink-0"
                    style={{ 
                      backgroundColor: color,
                      borderRadius: designStyle === 'brutal' ? '0' : '9999px',
                    }}
                  />
                  
                  {/* Event-Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: textColor }}>
                      {event.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs" style={{ color: textColor, opacity: 0.5 }}>
                      <Clock className="h-3 w-3" />
                      <span>{getRelativeTime(event.startDate)}</span>
                      {!event.allDay && (
                        <>
                          <span>•</span>
                          <span>{formatTime(event.startDate)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}











