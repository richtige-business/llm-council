'use client';

// ============================================
// DatasetCard.tsx - Karte für ein Dataset
// 
// Zweck: Anzeige von Dataset-Infos mit Aktionen
// Verwendet von: TrainingPage
// ============================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Database,
  FileSpreadsheet,
  MessageSquare,
  Tag,
  MoreVertical,
  Upload,
  Trash2,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { STATUS_COLORS, DATASET_TYPE_INFO } from '../constants';
import type { Dataset } from '../types';

// --------------------------------------------
// Props
// --------------------------------------------

interface DatasetCardProps {
  dataset: Dataset;
  onUpdate: () => void;
}

// --------------------------------------------
// Icon-Mapping
// --------------------------------------------

const TYPE_ICONS = {
  sft: MessageSquare,
  dpo: FileSpreadsheet,
  classification: Tag,
};

// --------------------------------------------
// Komponente
// --------------------------------------------

export function DatasetCard({ dataset, onUpdate }: DatasetCardProps) {
  const { surface, designStyle, textColor, accentColor } = useThemeStyles();
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const Icon = TYPE_ICONS[dataset.type] || Database;
  const status = STATUS_COLORS[dataset.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.draft;
  const typeInfo = DATASET_TYPE_INFO[dataset.type];

  // --------------------------------------------
  // Löschen
  // --------------------------------------------

  const handleDelete = async () => {
    if (!confirm('Dataset wirklich löschen? Alle Daten werden gelöscht.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await fetch(`/api/training/datasets/${dataset.id}`, {
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
            background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
            borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
            boxShadow: designStyle === 'brutal' 
              ? '2px 2px 0 #000' 
              : '0 4px 12px rgba(6, 182, 212, 0.4)',
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
                  <Upload className="h-4 w-4 opacity-60" />
                  Daten hochladen
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-white/10"
                  style={{ color: textColor }}
                >
                  <Sparkles className="h-4 w-4 opacity-60" />
                  Synthetisch generieren
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
        {dataset.name}
      </h3>
      <p className="mb-3 text-xs opacity-60" style={{ color: textColor }}>
        {dataset.description || typeInfo.description}
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
          {dataset.rowCount.toLocaleString()} Einträge
        </span>
      </div>

      {/* Typ-Info */}
      <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            color: textColor,
            opacity: 0.7,
            borderRadius: '9999px',
          }}
        >
          {typeInfo.name}
        </span>
        
        {dataset.source === 'synthetic' && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs"
            style={{
              background: 'rgba(139, 92, 246, 0.2)',
              color: '#a78bfa',
              borderRadius: '9999px',
            }}
          >
            <Sparkles className="h-3 w-3" />
            Synthetisch
          </span>
        )}
      </div>

      {/* PII-Warnung */}
      {dataset.piiWarnings && dataset.piiWarnings.length > 0 && (
        <div
          className="mt-2 flex items-center gap-2 p-2 text-xs"
          style={{
            background: 'rgba(245, 158, 11, 0.1)',
            borderRadius: '0.375rem',
            color: '#fbbf24',
          }}
        >
          ⚠️ {dataset.piiWarnings.length} PII-Warnungen
        </div>
      )}
    </motion.div>
  );
}








