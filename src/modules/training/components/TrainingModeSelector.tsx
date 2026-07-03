'use client';

// ============================================
// TrainingModeSelector.tsx - Auswahl der Untermodi
//
// Zweck: Zeigt fuer einen Hauptbereich die verfuegbaren
//        Trainings- oder Studio-Modi als zweite Auswahlstufe
// Verwendet von: TrainingPage
// ============================================

import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import {
  TRAINING_CATEGORY_INFO,
  TRAINING_SUBMODE_INFO,
  TRAINING_SUBMODES_BY_CATEGORY,
} from '../constants';
import type { TrainingCategory, TrainingSubmode } from '../types';
import { TrainingIcon } from './TrainingIcon';

// --------------------------------------------
// Props
// --------------------------------------------

interface TrainingModeSelectorProps {
  category: TrainingCategory;
  onBack: () => void;
  onSelectSubmode: (submode: TrainingSubmode) => void;
}

// --------------------------------------------
// Untermodus-Auswahl
// Nutzt die Konfiguration aus den Konstanten fuer jede Kategorie
// --------------------------------------------

export function TrainingModeSelector({
  category,
  onBack,
  onSelectSubmode,
}: TrainingModeSelectorProps) {
  const { surface, container, designStyle, textColor } = useThemeStyles();
  const categoryInfo = TRAINING_CATEGORY_INFO[category];
  const categorySubmodes = TRAINING_SUBMODES_BY_CATEGORY[category];

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4 md:p-6">
      {/* --------------------------------------------
          Kopfbereich
          Zeigt den gewaelten Hauptbereich und die Ruecknavigation
         -------------------------------------------- */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div
          className="overflow-hidden p-5 md:p-6"
          style={{
            ...container.base,
            borderRadius: designStyle === 'brutal' ? '0.75rem' : '1.5rem',
          }}
        >
          <button
            type="button"
            onClick={onBack}
            className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-transform hover:-translate-x-1"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              color: textColor,
            }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Zur Übersicht
          </button>

          <div className="flex items-start gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${categoryInfo.color} 0%, ${categoryInfo.color}bb 100%)`,
                borderRadius: designStyle === 'brutal' ? '0.75rem' : '1rem',
                boxShadow: `0 10px 25px ${categoryInfo.color}33`,
              }}
            >
              <TrainingIcon iconName={categoryInfo.icon} className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] opacity-50" style={{ color: textColor }}>
                Bereichsauswahl
              </p>
              <h1 className="mt-1 text-2xl font-semibold" style={{ color: textColor }}>
                {categoryInfo.name}
              </h1>
              <p className="mt-2 max-w-3xl text-sm opacity-70" style={{ color: textColor }}>
                {categoryInfo.description}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* --------------------------------------------
          Moduskarten
          Konkrete zweite Auswahl fuer die weitere Navigation
         -------------------------------------------- */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {categorySubmodes.map((submode, index) => {
          const info = TRAINING_SUBMODE_INFO[submode];

          return (
            <motion.button
              key={submode}
              type="button"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              onClick={() => onSelectSubmode(submode)}
              className="group flex h-full flex-col p-5 text-left transition-transform hover:-translate-y-1"
              style={{
                ...surface.base,
                borderRadius: designStyle === 'brutal' ? '0.75rem' : '1.5rem',
                border: `1px solid ${info.color}22`,
              }}
            >
              <div
                className="mb-4 flex h-12 w-12 items-center justify-center"
                style={{
                  background: `${info.color}18`,
                  borderRadius: designStyle === 'brutal' ? '0.75rem' : '1rem',
                }}
              >
                <TrainingIcon iconName={info.icon} className="h-5 w-5" style={{ color: info.color }} />
              </div>

              <h2 className="text-lg font-semibold" style={{ color: textColor }}>
                {info.name}
              </h2>
              <p className="mt-2 text-sm opacity-70" style={{ color: textColor }}>
                {info.description}
              </p>

              <div className="mt-auto pt-6">
                <div
                  className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-transform group-hover:translate-x-1"
                  style={{
                    background: `${info.color}18`,
                    color: info.color,
                  }}
                >
                  <span>Modus öffnen</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
