'use client';

// ============================================
// SwipeFeedback.tsx - Tinder-Style Bewertungs-UI
// 
// Zweck: Schnelle Bewertung von Modell-Outputs
// Verwendet von: Sandbox, Feedback-Übersicht
// ============================================

import { useState, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import {
  ThumbsUp,
  ThumbsDown,
  Pencil,
  SkipForward,
  RotateCcw,
  CheckCircle,
} from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import type { SandboxPrompt, FeedbackRating } from '../types';

// --------------------------------------------
// Props
// --------------------------------------------

interface SwipeFeedbackProps {
  prompts: SandboxPrompt[];
  onFeedback: (promptId: string, rating: FeedbackRating, editedOutput?: string) => Promise<void>;
  onComplete?: () => void;
}

// --------------------------------------------
// Komponente
// --------------------------------------------

export function SwipeFeedback({ prompts, onFeedback, onComplete }: SwipeFeedbackProps) {
  const { surface, container, designStyle, textColor, accentColor } = useThemeStyles();
  
  // Nur Prompts ohne Feedback
  const pendingPrompts = prompts.filter(p => !p.feedback);
  
  // State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedOutput, setEditedOutput] = useState('');
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  // Aktueller Prompt
  const currentPrompt = pendingPrompts[currentIndex];

  // Swipe-Animation
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  // Overlay-Farben
  const leftOverlayOpacity = useTransform(x, [-200, -50, 0], [1, 0.5, 0]);
  const rightOverlayOpacity = useTransform(x, [0, 50, 200], [0, 0.5, 1]);

  // --------------------------------------------
  // Feedback senden
  // --------------------------------------------

  const handleFeedback = useCallback(async (rating: FeedbackRating) => {
    if (!currentPrompt || isSubmitting) return;

    setIsSubmitting(true);
    setSwipeDirection(rating === 'good' ? 'right' : 'left');

    try {
      await onFeedback(
        currentPrompt.id,
        rating,
        rating === 'edited' ? editedOutput : undefined
      );

      // Zum nächsten Prompt
      setTimeout(() => {
        if (currentIndex < pendingPrompts.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else if (onComplete) {
          onComplete();
        }
        setSwipeDirection(null);
        setEditMode(false);
        setEditedOutput('');
      }, 300);
    } catch (error) {
      console.error('Fehler beim Feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [currentPrompt, currentIndex, pendingPrompts.length, editedOutput, isSubmitting, onFeedback, onComplete]);

  // --------------------------------------------
  // Drag-End Handler
  // --------------------------------------------

  const handleDragEnd = useCallback((event: never, info: { offset: { x: number }, velocity: { x: number } }) => {
    const threshold = 100;
    const velocity = Math.abs(info.velocity.x);
    const offset = info.offset.x;

    if (offset < -threshold || (offset < 0 && velocity > 500)) {
      handleFeedback('bad');
    } else if (offset > threshold || (offset > 0 && velocity > 500)) {
      handleFeedback('good');
    }
  }, [handleFeedback]);

  // --------------------------------------------
  // Alle fertig
  // --------------------------------------------

  if (pendingPrompts.length === 0 || !currentPrompt) {
    return (
      <div
        className="flex flex-col items-center justify-center p-8"
        style={{
          ...surface.base,
          borderRadius: designStyle === 'brutal' ? '0.5rem' : '1.5rem',
        }}
      >
        <div
          className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: 'rgba(34, 197, 94, 0.2)' }}
        >
          <CheckCircle className="h-8 w-8 text-green-400" />
        </div>
        <h3 className="mb-2 text-lg font-semibold" style={{ color: textColor }}>
          Alle bewertet!
        </h3>
        <p className="text-sm opacity-60" style={{ color: textColor }}>
          {prompts.length} Prompts wurden bewertet
        </p>
      </div>
    );
  }

  // --------------------------------------------
  // Render
  // --------------------------------------------

  return (
    <div className="flex flex-col items-center">
      {/* Progress */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm" style={{ color: textColor, opacity: 0.6 }}>
          {currentIndex + 1} / {pendingPrompts.length}
        </span>
        <div
          className="h-1 w-32 overflow-hidden rounded-full"
          style={{ background: 'rgba(255, 255, 255, 0.1)' }}
        >
          <motion.div
            className="h-full"
            style={{ background: accentColor }}
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / pendingPrompts.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Swipe Card */}
      <div className="relative h-96 w-full max-w-md">
        <AnimatePresence>
          <motion.div
            key={currentPrompt.id}
            className="absolute inset-0 cursor-grab overflow-hidden active:cursor-grabbing"
            style={{
              ...container.base,
              x,
              rotate,
              opacity,
              borderRadius: designStyle === 'brutal' ? '0.5rem' : '1.5rem',
            }}
            drag={!editMode ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              scale: 1, 
              opacity: 1,
              x: swipeDirection === 'left' ? -300 : swipeDirection === 'right' ? 300 : 0,
            }}
            exit={{ 
              scale: 0.8, 
              opacity: 0,
              x: swipeDirection === 'left' ? -300 : swipeDirection === 'right' ? 300 : 0,
            }}
          >
            {/* Swipe Overlays */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                background: 'rgba(239, 68, 68, 0.3)',
                opacity: leftOverlayOpacity,
              }}
            >
              <ThumbsDown className="h-16 w-16 text-red-500" />
            </motion.div>
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                background: 'rgba(34, 197, 94, 0.3)',
                opacity: rightOverlayOpacity,
              }}
            >
              <ThumbsUp className="h-16 w-16 text-green-500" />
            </motion.div>

            {/* Content */}
            <div className="flex h-full flex-col p-4">
              {/* Input */}
              <div className="mb-3">
                <span className="text-xs font-medium opacity-50" style={{ color: textColor }}>
                  INPUT
                </span>
                <p className="mt-1 text-sm" style={{ color: textColor }}>
                  {currentPrompt.input}
                </p>
              </div>

              {/* Divider */}
              <div className="my-2 border-t border-white/10" />

              {/* Output */}
              <div className="flex-1 overflow-y-auto">
                <span className="text-xs font-medium opacity-50" style={{ color: textColor }}>
                  OUTPUT
                </span>
                {editMode ? (
                  <textarea
                    value={editedOutput}
                    onChange={(e) => setEditedOutput(e.target.value)}
                    className="mt-1 h-full w-full resize-none bg-transparent text-sm outline-none"
                    style={{ color: textColor }}
                    placeholder="Korrigierte Ausgabe..."
                  />
                ) : (
                  <p className="mt-1 whitespace-pre-wrap text-sm" style={{ color: textColor }}>
                    {currentPrompt.output}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex items-center gap-4">
        {/* Reject */}
        <button
          onClick={() => handleFeedback('bad')}
          disabled={isSubmitting}
          className="flex h-14 w-14 items-center justify-center rounded-full transition-all hover:scale-110 disabled:opacity-50"
          style={{
            background: 'rgba(239, 68, 68, 0.2)',
            border: '2px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          <ThumbsDown className="h-6 w-6 text-red-400" />
        </button>

        {/* Edit */}
        <button
          onClick={() => {
            if (editMode) {
              // Save edit
              handleFeedback('edited');
            } else {
              // Enter edit mode
              setEditMode(true);
              setEditedOutput(currentPrompt.output || '');
            }
          }}
          disabled={isSubmitting}
          className="flex h-12 w-12 items-center justify-center rounded-full transition-all hover:scale-110 disabled:opacity-50"
          style={{
            background: editMode ? `${accentColor}40` : 'rgba(59, 130, 246, 0.2)',
            border: editMode ? `2px solid ${accentColor}` : '2px solid rgba(59, 130, 246, 0.3)',
          }}
        >
          {editMode ? (
            <CheckCircle className="h-5 w-5" style={{ color: accentColor }} />
          ) : (
            <Pencil className="h-5 w-5 text-blue-400" />
          )}
        </button>

        {/* Skip */}
        <button
          onClick={() => {
            if (currentIndex < pendingPrompts.length - 1) {
              setCurrentIndex(prev => prev + 1);
              setEditMode(false);
              setEditedOutput('');
            }
          }}
          disabled={isSubmitting || currentIndex >= pendingPrompts.length - 1}
          className="flex h-10 w-10 items-center justify-center rounded-full transition-all hover:scale-110 disabled:opacity-30"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <SkipForward className="h-4 w-4" style={{ color: textColor, opacity: 0.7 }} />
        </button>

        {/* Accept */}
        <button
          onClick={() => handleFeedback('good')}
          disabled={isSubmitting}
          className="flex h-14 w-14 items-center justify-center rounded-full transition-all hover:scale-110 disabled:opacity-50"
          style={{
            background: 'rgba(34, 197, 94, 0.2)',
            border: '2px solid rgba(34, 197, 94, 0.3)',
          }}
        >
          <ThumbsUp className="h-6 w-6 text-green-400" />
        </button>
      </div>

      {/* Hint */}
      <p className="mt-4 text-xs opacity-40" style={{ color: textColor }}>
        Swipe links = Schlecht • Swipe rechts = Gut • Oder nutze die Buttons
      </p>
    </div>
  );
}








