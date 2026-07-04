// ============================================
// AgentCursor.tsx - Animierter Cursor für den Agent
// 
// Zweck: Zeigt visuell wo der Agent gerade "klickt"
// Verwendet von: Shell.tsx, useVisualAgent
// ============================================

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MousePointer2 } from 'lucide-react';
import { useAgentStore } from '../agent-store';

// --------------------------------------------
// Cursor Store für Position und Status
// --------------------------------------------

interface CursorState {
  x: number;
  y: number;
  isVisible: boolean;
  isClicking: boolean;
  label: string | null;
}

// Global state für Cursor (wird vom Hook gesteuert)
let cursorState: CursorState = {
  x: 0,
  y: 0,
  isVisible: false,
  isClicking: false,
  label: null,
};

let cursorListeners: Set<() => void> = new Set();

export function setCursorPosition(x: number, y: number) {
  cursorState = { ...cursorState, x, y };
  cursorListeners.forEach(fn => fn());
}

export function setCursorVisible(visible: boolean) {
  cursorState = { ...cursorState, isVisible: visible };
  cursorListeners.forEach(fn => fn());
}

export function setCursorClicking(clicking: boolean) {
  cursorState = { ...cursorState, isClicking: clicking };
  cursorListeners.forEach(fn => fn());
}

export function setCursorLabel(label: string | null) {
  cursorState = { ...cursorState, label };
  cursorListeners.forEach(fn => fn());
}

export function getCursorState() {
  return cursorState;
}

export function subscribeToCursor(fn: () => void) {
  cursorListeners.add(fn);
  return () => { cursorListeners.delete(fn); };
}

// --------------------------------------------
// Komponente: AgentCursor
// Der animierte Cursor der auf dem Screen erscheint
// --------------------------------------------

import { useState, useEffect } from 'react';

export function AgentCursor() {
  const [state, setState] = useState(cursorState);
  
  useEffect(() => {
    return subscribeToCursor(() => {
      setState({ ...getCursorState() });
    });
  }, []);

  return (
    <AnimatePresence>
      {state.isVisible && (
        <motion.div
          className="pointer-events-none fixed z-[9999]"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ 
            opacity: 1, 
            scale: state.isClicking ? 0.8 : 1,
            x: state.x,
            y: state.y,
          }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ 
            type: 'spring', 
            damping: 20, 
            stiffness: 300,
            x: { type: 'spring', damping: 25, stiffness: 200 },
            y: { type: 'spring', damping: 25, stiffness: 200 },
          }}
        >
          {/* Cursor Icon */}
          <div className="relative">
            {/* Glow Effect */}
            <div 
              className={`absolute -inset-2 rounded-full blur-md transition-all duration-200 ${
                state.isClicking 
                  ? 'bg-amber-400/60 scale-150' 
                  : 'bg-indigo-400/40'
              }`}
            />
            
            {/* Cursor */}
            <MousePointer2 
              className={`relative h-6 w-6 drop-shadow-lg transition-colors duration-200 ${
                state.isClicking 
                  ? 'text-amber-400' 
                  : 'text-indigo-500'
              }`}
              style={{
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              }}
            />
            
            {/* Click Ripple Effect */}
            {state.isClicking && (
              <motion.div
                className="absolute left-1 top-1 h-4 w-4 rounded-full border-2 border-amber-400"
                initial={{ scale: 0.5, opacity: 1 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ duration: 0.4 }}
              />
            )}
          </div>

          {/* Label */}
          {state.label && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute left-8 top-0 whitespace-nowrap rounded-lg bg-gray-900/90 px-3 py-1.5 text-sm font-medium text-white shadow-xl backdrop-blur-sm"
            >
              {state.label}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}










