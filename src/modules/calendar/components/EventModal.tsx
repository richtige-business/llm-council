// ============================================
// EventModal.tsx - Modal zum Erstellen/Bearbeiten von Events
// 
// Zweck: Formular für alle Event-Details
//        Öffnet sich beim Klick auf "Neues Event" oder beim Bearbeiten
// Verwendet von: CalendarPage.tsx
// 
// WICHTIG: Verwendet unkontrollierte Inputs (useRef statt useState)
//          damit der AI-Agent die Felder über DOM-Manipulation bedienen kann!
// ============================================

'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, Tag, AlignLeft, Trash2 } from 'lucide-react';
import { useCalendarStore } from '../store';
import { useThemeStyles } from '@/lib/theme';

// --------------------------------------------
// Komponente: EventModal
// Das Popup-Fenster für Event-Details
// --------------------------------------------

export function EventModal() {
  // --------------------------------------------
  // Store-Selektoren (Performance-optimiert)
  // Jeder Selektor abonniert nur seinen spezifischen Wert
  // --------------------------------------------
  const isModalOpen = useCalendarStore((state) => state.isModalOpen);
  const editingEvent = useCalendarStore((state) => state.editingEvent);
  const closeModal = useCalendarStore((state) => state.closeModal);
  const addEvent = useCalendarStore((state) => state.addEvent);
  const updateEvent = useCalendarStore((state) => state.updateEvent);
  const deleteEvent = useCalendarStore((state) => state.deleteEvent);
  const categories = useCalendarStore((state) => state.categories);
  const selectedDate = useCalendarStore((state) => state.selectedDate);
  
  // Theme-Styles für dynamisches Design
  const { container, accentColor, designStyle } = useThemeStyles();

  // --------------------------------------------
  // Refs für unkontrollierte Inputs
  // Ermöglicht dem AI-Agent direkten DOM-Zugriff!
  // --------------------------------------------
  
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  const endTimeRef = useRef<HTMLInputElement>(null);
  const allDayRef = useRef<HTMLInputElement>(null);
  
  // State nur für UI-Elemente die React-Updates brauchen
  const [categoryId, setCategoryId] = useState('private');
  const [allDay, setAllDay] = useState(false);

  // --------------------------------------------
  // Effect: Formular mit Event-Daten füllen
  // Setzt die DOM-Werte direkt über die Refs
  // --------------------------------------------
  
  useEffect(() => {
    if (!isModalOpen) return;
    
    // Kurze Verzögerung damit die Refs verfügbar sind
    setTimeout(() => {
      if (editingEvent) {
        // Bestehendes Event bearbeiten -> Felder füllen
        if (titleRef.current) titleRef.current.value = editingEvent.title;
        if (descriptionRef.current) descriptionRef.current.value = editingEvent.description || '';
        if (startDateRef.current) startDateRef.current.value = editingEvent.startDate.split('T')[0];
        if (startTimeRef.current) startTimeRef.current.value = editingEvent.startDate.split('T')[1]?.slice(0, 5) || '09:00';
        if (endDateRef.current) endDateRef.current.value = editingEvent.endDate.split('T')[0];
        if (endTimeRef.current) endTimeRef.current.value = editingEvent.endDate.split('T')[1]?.slice(0, 5) || '10:00';
        if (allDayRef.current) allDayRef.current.checked = editingEvent.allDay;
        setAllDay(editingEvent.allDay);
        setCategoryId(editingEvent.categoryId);
      } else {
        // Neues Event -> Standardwerte
        if (titleRef.current) titleRef.current.value = '';
        if (descriptionRef.current) descriptionRef.current.value = '';
        if (startDateRef.current) startDateRef.current.value = selectedDate;
        if (startTimeRef.current) startTimeRef.current.value = '09:00';
        if (endDateRef.current) endDateRef.current.value = selectedDate;
        if (endTimeRef.current) endTimeRef.current.value = '10:00';
        if (allDayRef.current) allDayRef.current.checked = false;
        setAllDay(false);
        setCategoryId('private');
      }
    }, 50);
  }, [editingEvent, selectedDate, isModalOpen]);

  // --------------------------------------------
  // Handler: Formular absenden
  // Liest Werte direkt aus dem DOM (nicht aus State!)
  // Das ermöglicht dem AI-Agent das Formular zu bedienen
  // --------------------------------------------
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Werte aus DOM lesen (nicht aus State!)
    const title = titleRef.current?.value || '';
    const description = descriptionRef.current?.value || '';
    const startDate = startDateRef.current?.value || selectedDate;
    const startTime = startTimeRef.current?.value || '09:00';
    const endDate = endDateRef.current?.value || selectedDate;
    const endTime = endTimeRef.current?.value || '10:00';
    const isAllDay = allDayRef.current?.checked || false;
    
    console.log('📋 Form Submit - DOM Werte:', { title, startDate, startTime, endDate, endTime, isAllDay });
    
    // Validierung: Titel ist Pflichtfeld
    if (!title.trim()) {
      alert('Bitte gib einen Titel ein');
      return;
    }

    // Event-Daten zusammenstellen
    const eventData = {
      title: title.trim(),
      description: description.trim() || undefined,
      startDate: isAllDay 
        ? `${startDate}T00:00:00` 
        : `${startDate}T${startTime}:00`,
      endDate: isAllDay 
        ? `${endDate}T23:59:59` 
        : `${endDate}T${endTime}:00`,
      allDay: isAllDay,
      categoryId,
      reminders: [],
    };

    console.log('✅ Event wird erstellt:', eventData);

    if (editingEvent) {
      // Bestehendes Event aktualisieren
      updateEvent(editingEvent.id, eventData);
    } else {
      // Neues Event erstellen
      addEvent(eventData);
    }

    // Modal schließen
    closeModal();
  };

  // --------------------------------------------
  // Handler: Event löschen
  // --------------------------------------------
  
  const handleDelete = () => {
    if (editingEvent && confirm('Event wirklich löschen?')) {
      deleteEvent(editingEvent.id);
      closeModal();
    }
  };

  // Handler für Ganztägig-Checkbox
  const handleAllDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAllDay(e.target.checked);
  };

  return (
    <AnimatePresence>
      {isModalOpen && (
        <>
          {/* Hintergrund-Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal-Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 p-4"
          >
            <div 
              className="rounded-3xl p-6"
              style={{
                // Dynamisches Styling basierend auf Design-Stil
                background: designStyle === 'glass' 
                  ? 'rgba(20, 20, 28, 0.95)' 
                  : designStyle === 'brutal'
                  ? '#2a2a3c'
                  : '#1a1a24',
                backdropFilter: designStyle === 'glass' ? 'blur(40px) saturate(150%)' : 'none',
                WebkitBackdropFilter: designStyle === 'glass' ? 'blur(40px) saturate(150%)' : 'none',
                border: designStyle === 'brutal' 
                  ? '3px solid #000' 
                  : '1px solid rgba(255, 255, 255, 0.15)',
                boxShadow: designStyle === 'brutal'
                  ? '6px 6px 0 #000'
                  : '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                borderRadius: designStyle === 'brutal' ? '0.75rem' : '1.5rem',
              }}
            >
              {/* Modal Header */}
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">
                  {editingEvent ? 'Event bearbeiten' : 'Neues Event'}
                </h2>
                <button
                  onClick={closeModal}
                  className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Formular mit unkontrollierten Inputs */}
              <form onSubmit={handleSubmit} className="space-y-5" id="event-form">
                
                {/* Titel - UNKONTROLLIERTER INPUT für AI-Agent */}
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-white/80">
                    <Calendar className="h-4 w-4" />
                    Titel *
                  </label>
                  <input
                    ref={titleRef}
                    type="text"
                    name="title"
                    placeholder="z.B. Meeting mit Team"
                    className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none border border-white/10 focus:border-white/30 transition-colors"
                    autoFocus
                    data-agent-input="title"
                  />
                </div>

                {/* Ganztägig Checkbox */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    ref={allDayRef}
                    type="checkbox"
                    name="allDay"
                    onChange={handleAllDayChange}
                    className="h-5 w-5 rounded bg-white/10 border-white/20 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-sm text-white/80">Ganztägig</span>
                </label>

                {/* Datum und Zeit */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Start */}
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-white/80">
                      <Clock className="h-4 w-4" />
                      Start
                    </label>
                    <input
                      ref={startDateRef}
                      type="date"
                      name="startDate"
                      className="w-full rounded-xl bg-white/10 px-4 py-2 text-white outline-none border border-white/10 focus:border-white/30 transition-colors"
                      data-agent-input="startDate"
                    />
                    {!allDay && (
                      <input
                        ref={startTimeRef}
                        type="time"
                        name="startTime"
                        className="mt-2 w-full rounded-xl bg-white/10 px-4 py-2 text-white outline-none border border-white/10 focus:border-white/30 transition-colors"
                        data-agent-input="startTime"
                      />
                    )}
                  </div>

                  {/* Ende */}
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-white/80">
                      <Clock className="h-4 w-4" />
                      Ende
                    </label>
                    <input
                      ref={endDateRef}
                      type="date"
                      name="endDate"
                      className="w-full rounded-xl bg-white/10 px-4 py-2 text-white outline-none border border-white/10 focus:border-white/30 transition-colors"
                      data-agent-input="endDate"
                    />
                    {!allDay && (
                      <input
                        ref={endTimeRef}
                        type="time"
                        name="endTime"
                        className="mt-2 w-full rounded-xl bg-white/10 px-4 py-2 text-white outline-none border border-white/10 focus:border-white/30 transition-colors"
                        data-agent-input="endTime"
                      />
                    )}
                  </div>
                </div>

                {/* Kategorie */}
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-white/80">
                    <Tag className="h-4 w-4" />
                    Kategorie
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategoryId(cat.id)}
                        className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all ${
                          categoryId === cat.id
                            ? 'ring-2 ring-white/40'
                            : 'opacity-60 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: `${cat.color}40` }}
                      >
                        <span 
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-white">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Beschreibung */}
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-white/80">
                    <AlignLeft className="h-4 w-4" />
                    Beschreibung
                  </label>
                  <textarea
                    ref={descriptionRef}
                    name="description"
                    placeholder="Optionale Notizen..."
                    rows={3}
                    className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none border border-white/10 focus:border-white/30 transition-colors resize-none"
                    data-agent-input="description"
                  />
                </div>

                {/* Aktions-Buttons */}
                <div className="flex items-center justify-between pt-2">
                  {editingEvent ? (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="flex items-center gap-2 rounded-xl px-4 py-2 text-red-400 transition-colors hover:bg-red-500/20"
                    >
                      <Trash2 className="h-4 w-4" />
                      Löschen
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="rounded-xl bg-white/10 px-5 py-2 text-white transition-colors hover:bg-white/20"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl px-5 py-2 font-medium text-white transition-all hover:opacity-90"
                      style={{
                        background: `linear-gradient(135deg, ${accentColor} 0%, #8b5cf6 100%)`,
                        border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                        boxShadow: designStyle === 'brutal' ? '3px 3px 0 #000' : 'none',
                        borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
                      }}
                      data-agent-button="submit"
                    >
                      {editingEvent ? 'Speichern' : 'Erstellen'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
