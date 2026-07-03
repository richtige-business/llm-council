'use client';

// ============================================
// TrainingEntryScreen.tsx - Einstiegsscreen fuer das Training Center
//
// Zweck: Praesentiert die drei Hauptbereiche LLM Training,
//        Agent Training und Dataset Studio als erste Auswahl
// Verwendet von: TrainingPage
// ============================================

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { TRAINING_CATEGORY_INFO } from '../constants';
import type { TrainingCategory } from '../types';
import { TrainingIcon } from './TrainingIcon';

// --------------------------------------------
// Props
// --------------------------------------------

interface TrainingEntryScreenProps {
  lastCategory: TrainingCategory | null;
  onSelectCategory: (category: TrainingCategory) => void;
}

// --------------------------------------------
// Einstiegsscreen
// Zeigt drei Hauptkarten als neue IA-Ebene
// --------------------------------------------

export function TrainingEntryScreen({
  lastCategory,
  onSelectCategory,
}: TrainingEntryScreenProps) {
  const { surface, container, designStyle, textColor } = useThemeStyles();
  const categories = Object.entries(TRAINING_CATEGORY_INFO) as Array<
    [TrainingCategory, (typeof TRAINING_CATEGORY_INFO)[TrainingCategory]]
  >;

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4 md:p-6">
      {/* --------------------------------------------
          Hero-Bereich
          Erklaert die neue Startlogik des Training Centers
         -------------------------------------------- */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
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
          <span
            className="mb-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background: 'rgba(245, 158, 11, 0.16)',
              color: '#fbbf24',
            }}
          >
            AI Training Center
          </span>
          <h1 className="text-2xl font-semibold md:text-3xl" style={{ color: textColor }}>
            Wähle, was du heute trainieren möchtest
          </h1>
          <p className="mt-2 max-w-3xl text-sm opacity-70 md:text-base" style={{ color: textColor }}>
            Starte mit einem klaren Pfad: trainiere ein LLM, bringe einem Agenten Arbeitsweisen bei
            oder baue saubere Datensätze für beide Welten auf.
          </p>
        </div>
      </motion.div>

      {/* --------------------------------------------
          Hauptkarten
          Jede Karte steht fuer einen Hauptbereich
         -------------------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-3">
        {categories.map(([category, info], index) => {
          const isLastUsed = lastCategory === category;

          return (
            <motion.button
              key={category}
              type="button"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              onClick={() => onSelectCategory(category)}
              className="group flex h-full flex-col overflow-hidden p-5 text-left transition-transform hover:-translate-y-1"
              style={{
                ...surface.base,
                borderRadius: designStyle === 'brutal' ? '0.75rem' : '1.5rem',
                border: `1px solid ${info.color}22`,
                boxShadow: `0 10px 30px ${info.color}14`,
              }}
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <div
                  className="flex h-14 w-14 items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${info.color} 0%, ${info.color}bb 100%)`,
                    borderRadius: designStyle === 'brutal' ? '0.75rem' : '1rem',
                    boxShadow: `0 12px 24px ${info.color}33`,
                  }}
                >
                  <TrainingIcon iconName={info.icon} className="h-6 w-6 text-white" />
                </div>
                {isLastUsed ? (
                  <span
                    className="inline-flex rounded-full px-3 py-1 text-[11px] font-medium"
                    style={{
                      background: `${info.color}1f`,
                      color: info.color,
                    }}
                  >
                    Zuletzt genutzt
                  </span>
                ) : null}
              </div>

              <h2 className="text-lg font-semibold" style={{ color: textColor }}>
                {info.name}
              </h2>
              <p className="mt-2 text-sm opacity-70" style={{ color: textColor }}>
                {info.description}
              </p>

              <div className="mt-5 space-y-2">
                {info.useCases.map((useCase) => (
                  <div
                    key={useCase}
                    className="rounded-xl px-3 py-2 text-xs"
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      color: textColor,
                    }}
                  >
                    {useCase}
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-6">
                <div
                  className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-transform group-hover:translate-x-1"
                  style={{
                    background: `${info.color}20`,
                    color: info.color,
                  }}
                >
                  <span>{info.ctaLabel}</span>
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
