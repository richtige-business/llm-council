// ============================================
// AgentWorkspaceEmbed.tsx - Live-Modul-Fenster im Chat
//
// Zweck: Zeigt ein eingebettetes Live-Fenster eines Moduls
//        direkt im Chat-Verlauf an, wenn der Agent Mode aktiv ist.
//        Der User kann dem Agent bei der Arbeit zusehen.
// Verwendet von: ChatMessage.tsx
// ============================================

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Minimize2, Maximize2, Monitor } from 'lucide-react';
import { TabContent } from '@/components/dashboard/TabContent';
import { useModule } from '@/lib/modules';

// --------------------------------------------
// Modul-Name-Fallback für bekannte Module
// Falls das Modul nicht in der Registry ist
// --------------------------------------------
const MODULE_DISPLAY_NAMES: Record<string, string> = {
  calendar: 'Kalender',
  inbox: 'Postfach',
  browser: 'Browser',
  'todo-list': 'Aufgaben',
  training: 'Training',
};

// --------------------------------------------
// Props Interface
// --------------------------------------------
interface AgentWorkspaceEmbedProps {
  moduleId: string;    // Welches Modul angezeigt wird
  isActive: boolean;   // Ob der Agent gerade arbeitet
}

// --------------------------------------------
// Komponente: AgentWorkspaceEmbed
// Rendert TabContent in einem skalierten Container im Chat
// --------------------------------------------
export function AgentWorkspaceEmbed({ moduleId, isActive }: AgentWorkspaceEmbedProps) {
  // Modul-Info aus der Registry laden
  const moduleEntry = useModule(moduleId);
  const moduleName = moduleEntry?.name || MODULE_DISPLAY_NAMES[moduleId] || moduleId;

  // Minimiert/Maximiert-State
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="my-2 w-full max-w-[90%] overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md"
    >
      {/* ----------------------------------------
          Header: Modul-Name, Status, Minimize/Maximize
          ---------------------------------------- */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          {/* Status-Indikator */}
          {isActive ? (
            <div className="flex items-center gap-1.5">
              <div className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </div>
              <span className="text-[10px] font-medium text-emerald-400">
                Agent arbeitet...
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Monitor className="h-3 w-3 text-white/40" />
              <span className="text-[10px] font-medium text-white/40">
                Abgeschlossen
              </span>
            </div>
          )}

          {/* Modul-Name */}
          <span className="text-[10px] text-white/30">·</span>
          <span className="text-[10px] font-medium text-white/50">{moduleName}</span>
        </div>

        {/* Minimize/Maximize Button */}
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="flex h-5 w-5 items-center justify-center rounded text-white/30 hover:text-white/60 hover:bg-white/10 transition-colors"
          title={isMinimized ? 'Maximieren' : 'Minimieren'}
        >
          {isMinimized ? (
            <Maximize2 className="h-3 w-3" />
          ) : (
            <Minimize2 className="h-3 w-3" />
          )}
        </button>
      </div>

      {/* ----------------------------------------
          Modul-Content: Eingebettetes Live-Fenster
          Rendert die echte Modul-Komponente (TabContent)
          ---------------------------------------- */}
      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 400, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="relative overflow-hidden"
          >
            {/* Loading-Overlay wenn Agent arbeitet */}
            {isActive && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-end p-2">
                <div className="flex items-center gap-1.5 rounded-lg bg-black/60 px-2 py-1 backdrop-blur-sm">
                  <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
                  <span className="text-[9px] text-emerald-300">Live</span>
                </div>
              </div>
            )}

            {/* Das eigentliche Modul — gleicher State wie das Dashboard-Tab */}
            <div className="h-[400px] w-full overflow-auto">
              <TabContent moduleId={moduleId} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
