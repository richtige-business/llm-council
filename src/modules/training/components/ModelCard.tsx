'use client';

// ============================================
// ModelCard.tsx - Karte für ein trainiertes Modell
// 
// Zweck: Anzeige von Modell-Infos mit Aktionen
// Verwendet von: TrainingPage
// ============================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Image,
  Video,
  MoreVertical,
  Play,
  Trash2,
  Settings,
  Loader2,
} from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { STATUS_COLORS, MODEL_TYPE_INFO } from '../constants';
import type { TrainingModel } from '../types';

// --------------------------------------------
// Props
// --------------------------------------------

interface ModelCardProps {
  model: TrainingModel;
  onUpdate: () => void;
}

// --------------------------------------------
// Icon-Mapping
// --------------------------------------------

const TYPE_ICONS = {
  text: Brain,
  image: Image,
  video: Video,
};

// --------------------------------------------
// Komponente
// --------------------------------------------

export function ModelCard({ model, onUpdate }: ModelCardProps) {
  const { surface, designStyle, textColor, accentColor } = useThemeStyles();
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const Icon = TYPE_ICONS[model.type] || Brain;
  const status = STATUS_COLORS[model.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.draft;
  const typeInfo = MODEL_TYPE_INFO[model.type];

  // --------------------------------------------
  // Löschen
  // --------------------------------------------

  const handleDelete = async () => {
    if (!confirm('Modell wirklich löschen? Alle Training-Jobs werden ebenfalls gelöscht.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await fetch(`/api/training/models/${model.id}`, {
        method: 'DELETE',
      });
      onUpdate();
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
    } finally {
      setIsDeleting(false);
      setShowMenu(false);
    }
  };

  // --------------------------------------------
  // Render
  // --------------------------------------------

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden p-4 transition-all hover:scale-[1.02]"
      style={{
        ...surface.base,
        borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
      }}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center"
          style={{
            background: model.color || typeInfo.color,
            borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
            boxShadow: designStyle === 'brutal' 
              ? '2px 2px 0 #000' 
              : `0 4px 12px ${model.color || typeInfo.color}40`,
          }}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>

        {/* Menu Button */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex h-8 w-8 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '0.375rem',
            }}
          >
            <MoreVertical className="h-4 w-4" style={{ color: textColor, opacity: 0.7 }} />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div
                className="absolute right-0 top-full z-20 mt-1 min-w-[150px] overflow-hidden py-1"
                style={{
                  ...surface.base,
                  borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
                }}
              >
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-white/10"
                  style={{ color: textColor }}
                >
                  <Settings className="h-4 w-4 opacity-60" />
                  Bearbeiten
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-white/10"
                  style={{ color: textColor }}
                >
                  <Play className="h-4 w-4 opacity-60" />
                  Training starten
                </button>
                <hr className="my-1 border-white/10" />
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Löschen
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <h3 className="mb-1 font-semibold" style={{ color: textColor }}>
        {model.name}
      </h3>
      <p className="mb-3 text-xs opacity-60" style={{ color: textColor }}>
        {model.description || `Basiert auf ${model.baseModel}`}
      </p>

      {/* Meta */}
      <div className="flex items-center justify-between">
        <span
          className="inline-flex items-center px-2 py-0.5 text-xs font-medium"
          style={{
            background: status.bg,
            color: status.text,
            borderRadius: '9999px',
          }}
        >
          {status.label}
        </span>

        <span className="text-xs opacity-40" style={{ color: textColor }}>
          {typeInfo.name}
        </span>
      </div>

      {/* Metriken (wenn vorhanden) */}
      {model.metrics && (
        <div className="mt-3 flex gap-3 border-t border-white/10 pt-3">
          <div>
            <span className="text-xs opacity-40" style={{ color: textColor }}>Loss</span>
            <p className="text-sm font-medium" style={{ color: textColor }}>
              {model.metrics.finalLoss.toFixed(4)}
            </p>
          </div>
          {model.metrics.accuracy && (
            <div>
              <span className="text-xs opacity-40" style={{ color: textColor }}>Accuracy</span>
              <p className="text-sm font-medium" style={{ color: textColor }}>
                {(model.metrics.accuracy * 100).toFixed(1)}%
              </p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}








