// ============================================
// DateFilterPopover.tsx - Datums-Filter mit Mini-Kalender
// 
// Zweck: Erlaubt Filterung nach Datum mit:
//        - Schnellauswahl (Heute, Gestern, Letzte X Tage)
//        - Mini-Kalender für präzise Auswahl
//        - Von-Bis Zeitraum
// Verwendet von: FilterDropdown.tsx
// ============================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInboxStore } from '../store';
import { useThemeStyles } from '@/lib/theme';
import type { DatePreset } from '../types';

// --------------------------------------------
// Konstanten: Schnellauswahl-Presets
// --------------------------------------------

const DATE_PRESETS: { value: DatePreset; label: string; icon: string }[] = [
  { value: 'today', label: 'Heute', icon: '📅' },
  { value: 'yesterday', label: 'Gestern', icon: '⏪' },
  { value: 'last3days', label: 'Letzte 3 Tage', icon: '3️⃣' },
  { value: 'last7days', label: 'Letzte 7 Tage', icon: '📆' },
  { value: 'last14days', label: 'Letzte 14 Tage', icon: '📊' },
  { value: 'last30days', label: 'Letzte 30 Tage', icon: '📈' },
  { value: 'thisMonth', label: 'Dieser Monat', icon: '🗓️' },
  { value: 'lastMonth', label: 'Letzter Monat', icon: '📁' },
  { value: 'all', label: 'Gesamtes Postfach', icon: '📬' },
];

// --------------------------------------------
// Hilfsfunktionen
// --------------------------------------------

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

const WEEKDAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  // Montag = 0, Sonntag = 6
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  return new Date(dateStr);
}

// --------------------------------------------
// Komponente: DateFilterPopover
// --------------------------------------------

interface DateFilterPopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DateFilterPopover({ isOpen, onClose }: DateFilterPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  
  // Store
  const filters = useInboxStore((state) => state.filters);
  const setDateFilter = useInboxStore((state) => state.setDateFilter);
  
  // Theme
  const { surface, accentColor, designStyle, surfaceColor, textColor } = useThemeStyles();
  
  // Lokaler State für Mini-Kalender
  const [viewMode, setViewMode] = useState<'presets' | 'calendar' | 'range'>('presets');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [rangeStart, setRangeStart] = useState<Date | null>(parseDate(filters.dateFrom));
  const [rangeEnd, setRangeEnd] = useState<Date | null>(parseDate(filters.dateTo));

  // Klick außerhalb schließt Popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Preset auswählen
  const handlePresetSelect = (preset: DatePreset) => {
    setDateFilter(preset);
    onClose();
  };

  // Einzelnes Datum auswählen
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    // Setze als "von" und "bis" gleich (einzelner Tag)
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
    setDateFilter(null, startOfDay.toISOString(), endOfDay.toISOString());
    onClose();
  };

  // Zeitraum anwenden
  const handleRangeApply = () => {
    if (rangeStart) {
      const start = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
      const end = rangeEnd 
        ? new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate(), 23, 59, 59)
        : new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59);
      setDateFilter(null, start.toISOString(), end.toISOString());
      onClose();
    }
  };

  // Monat wechseln
  const changeMonth = (delta: number) => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + delta, 1));
  };

  // Jahr wechseln
  const changeYear = (delta: number) => {
    setCalendarDate(new Date(calendarDate.getFullYear() + delta, calendarDate.getMonth(), 1));
  };

  // Kalender-Grid generieren
  const generateCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date();
    
    const days = [];
    
    // Leere Felder vor dem 1. des Monats
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, date: null });
    }
    
    // Tage des Monats
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({
        day: i,
        date,
        isToday: 
          date.getDate() === today.getDate() &&
          date.getMonth() === today.getMonth() &&
          date.getFullYear() === today.getFullYear(),
        isSelected: selectedDate?.toDateString() === date.toDateString(),
        isInRange: rangeStart && rangeEnd && date >= rangeStart && date <= rangeEnd,
        isRangeStart: rangeStart?.toDateString() === date.toDateString(),
        isRangeEnd: rangeEnd?.toDateString() === date.toDateString(),
        isFuture: date > today,
      });
    }
    
    return days;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={popoverRef}
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="absolute right-0 top-full z-50 mt-2 w-80 p-4 shadow-xl"
        style={{
          background: designStyle === 'glass' 
            ? 'rgba(15, 23, 42, 0.92)' 
            : surfaceColor,
          backdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
        }}
      >
        {/* Header mit Tabs */}
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-sm font-semibold" style={{ color: textColor }}>
            Zeitraum
          </h4>
          <div className="flex gap-1 rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <button
              onClick={() => setViewMode('presets')}
              className="rounded-md px-2 py-1 text-xs font-medium transition-colors"
              style={{
                background: viewMode === 'presets' ? accentColor : 'transparent',
                color: viewMode === 'presets' ? '#fff' : textColor,
                opacity: viewMode === 'presets' ? 1 : 0.6,
              }}
            >
              Schnell
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className="rounded-md px-2 py-1 text-xs font-medium transition-colors"
              style={{
                background: viewMode === 'calendar' ? accentColor : 'transparent',
                color: viewMode === 'calendar' ? '#fff' : textColor,
                opacity: viewMode === 'calendar' ? 1 : 0.6,
              }}
            >
              Kalender
            </button>
            <button
              onClick={() => setViewMode('range')}
              className="rounded-md px-2 py-1 text-xs font-medium transition-colors"
              style={{
                background: viewMode === 'range' ? accentColor : 'transparent',
                color: viewMode === 'range' ? '#fff' : textColor,
                opacity: viewMode === 'range' ? 1 : 0.6,
              }}
            >
              Zeitraum
            </button>
          </div>
        </div>

        {/* ========================================
            PRESETS VIEW
            ======================================== */}
        {viewMode === 'presets' && (
          <div className="flex flex-col gap-1">
            {DATE_PRESETS.map((preset) => (
              <motion.button
                key={preset.value}
                onClick={() => handlePresetSelect(preset.value)}
                whileHover={{ scale: designStyle === 'brutal' ? 1 : 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors"
                style={{
                  background: filters.datePreset === preset.value ? `${accentColor}20` : 'transparent',
                  color: textColor,
                }}
              >
                <span className="text-base">{preset.icon}</span>
                <span>{preset.label}</span>
                {filters.datePreset === preset.value && (
                  <svg 
                    className="ml-auto h-4 w-4" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                    style={{ color: accentColor }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </motion.button>
            ))}
          </div>
        )}

        {/* ========================================
            CALENDAR VIEW
            ======================================== */}
        {viewMode === 'calendar' && (
          <div>
            {/* Monat/Jahr Navigation */}
            <div className="mb-3 flex items-center justify-between">
              <button
                onClick={() => changeYear(-1)}
                className="rounded p-1 transition-colors hover:bg-white/10"
                style={{ color: textColor, opacity: 0.6 }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => changeMonth(-1)}
                className="rounded p-1 transition-colors hover:bg-white/10"
                style={{ color: textColor, opacity: 0.6 }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm font-medium" style={{ color: textColor }}>
                {MONTH_NAMES[calendarDate.getMonth()]} {calendarDate.getFullYear()}
              </span>
              <button
                onClick={() => changeMonth(1)}
                className="rounded p-1 transition-colors hover:bg-white/10"
                style={{ color: textColor, opacity: 0.6 }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={() => changeYear(1)}
                className="rounded p-1 transition-colors hover:bg-white/10"
                style={{ color: textColor, opacity: 0.6 }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Wochentage */}
            <div className="mb-2 grid grid-cols-7 gap-1">
              {WEEKDAY_NAMES.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium"
                  style={{ color: textColor, opacity: 0.4 }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Tage */}
            <div className="grid grid-cols-7 gap-1">
              {generateCalendarDays().map((item, index) => (
                <button
                  key={index}
                  onClick={() => item.date && !item.isFuture && handleDateSelect(item.date)}
                  disabled={!item.day || item.isFuture}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: item.isSelected
                      ? accentColor
                      : item.isToday
                        ? `${accentColor}30`
                        : 'transparent',
                    color: item.isSelected
                      ? '#fff'
                      : item.isFuture
                        ? `${textColor}30`
                        : textColor,
                    cursor: item.day && !item.isFuture ? 'pointer' : 'default',
                    opacity: item.day ? 1 : 0,
                  }}
                >
                  {item.day}
                </button>
              ))}
            </div>

            {/* Heute-Button */}
            <button
              onClick={() => {
                setCalendarDate(new Date());
                handleDateSelect(new Date());
              }}
              className="mt-3 w-full rounded-lg py-2 text-xs font-medium text-white transition-colors hover:bg-white/10"
            >
              Heute auswählen
            </button>
          </div>
        )}

        {/* ========================================
            RANGE VIEW
            ======================================== */}
        {viewMode === 'range' && (
          <div>
            <div className="mb-4 flex flex-col gap-3">
              {/* Von */}
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: textColor, opacity: 0.6 }}>
                  Von
                </label>
                <input
                  type="date"
                  value={rangeStart?.toISOString().split('T')[0] || ''}
                  onChange={(e) => setRangeStart(e.target.value ? new Date(e.target.value) : null)}
                  className="w-full rounded-lg border-none px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={{
                    background: surfaceColor,
                    color: textColor,
                    // @ts-expect-error CSS custom property
                    '--tw-ring-color': accentColor,
                  }}
                />
              </div>

              {/* Bis */}
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: textColor, opacity: 0.6 }}>
                  Bis
                </label>
                <input
                  type="date"
                  value={rangeEnd?.toISOString().split('T')[0] || ''}
                  onChange={(e) => setRangeEnd(e.target.value ? new Date(e.target.value) : null)}
                  className="w-full rounded-lg border-none px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={{
                    background: surfaceColor,
                    color: textColor,
                    // @ts-expect-error CSS custom property
                    '--tw-ring-color': accentColor,
                  }}
                />
              </div>
            </div>

            {/* Aktuelle Auswahl anzeigen */}
            {(rangeStart || rangeEnd) && (
              <div 
                className="mb-3 rounded-lg p-2 text-center text-xs"
                style={{ background: `${accentColor}10`, color: textColor }}
              >
                {rangeStart && formatDate(rangeStart)}
                {rangeStart && rangeEnd && ' – '}
                {rangeEnd && formatDate(rangeEnd)}
              </div>
            )}

            {/* Anwenden Button */}
            <button
              onClick={handleRangeApply}
              disabled={!rangeStart}
              className="w-full rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                background: accentColor,
                color: '#fff',
              }}
            >
              Zeitraum anwenden
            </button>

            {/* Zurücksetzen */}
            <button
              onClick={() => {
                setRangeStart(null);
                setRangeEnd(null);
                setDateFilter('all');
                onClose();
              }}
              className="mt-2 w-full rounded-lg py-2 text-xs font-medium transition-colors hover:bg-white/10"
              style={{ color: textColor, opacity: 0.6 }}
            >
              Filter zurücksetzen
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

