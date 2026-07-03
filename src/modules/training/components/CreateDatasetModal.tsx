'use client';

// ============================================
// CreateDatasetModal.tsx - Modal zum Erstellen eines Datasets
// 
// Zweck: Formular für neues Dataset
// Verwendet von: TrainingPage
// ============================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, FileSpreadsheet, Tag, Loader2, Check } from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { DATASET_TYPE_INFO } from '../constants';
import type { Dataset, DatasetType, CreateDatasetRequest } from '../types';

// --------------------------------------------
// Props
// --------------------------------------------

interface CreateDatasetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (dataset: Dataset) => void;
}

// --------------------------------------------
// Type Icons
// --------------------------------------------

const TYPE_ICONS = {
  sft: MessageSquare,
  dpo: FileSpreadsheet,
  classification: Tag,
};

// --------------------------------------------
// Komponente
// --------------------------------------------

export function CreateDatasetModal({ isOpen, onClose, onCreated }: CreateDatasetModalProps) {
  const { surface, container, designStyle, textColor, accentColor } = useThemeStyles();
  
  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<DatasetType>('sft');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --------------------------------------------
  // Submit
  // --------------------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name ist erforderlich');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: CreateDatasetRequest = {
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        source: 'upload',
      };

      const res = await fetch('/api/training/datasets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Fehler beim Erstellen');
      }

      // Reset und Callback
      setName('');
      setDescription('');
      setType('sft');
      onCreated(data.dataset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --------------------------------------------
  // Render
  // --------------------------------------------

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal - zentriert, volle Höhe verfügbar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 z-50 mx-auto flex w-full max-w-lg items-center justify-center"
          >
            <div
              className="max-h-full w-full overflow-y-auto"
              style={{
                ...container.base,
                borderRadius: designStyle === 'brutal' ? '0.5rem' : '1.5rem',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 p-4">
                <h2 className="text-lg font-semibold" style={{ color: textColor }}>
                  Neues Dataset erstellen
                </h2>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-white/10"
                  style={{ borderRadius: '0.375rem' }}
                >
                  <X className="h-4 w-4" style={{ color: textColor, opacity: 0.7 }} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-4">
                {/* Name */}
                <div className="mb-4">
                  <label className="mb-1 block text-sm font-medium" style={{ color: textColor }}>
                    Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="z.B. Kundenservice E-Mails"
                    className="w-full px-3 py-2 text-sm outline-none transition-colors"
                    style={{
                      ...surface.base,
                      borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.75rem',
                      color: textColor,
                    }}
                  />
                </div>

                {/* Beschreibung */}
                <div className="mb-4">
                  <label className="mb-1 block text-sm font-medium" style={{ color: textColor }}>
                    Beschreibung
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Wofür ist dieses Dataset?"
                    rows={2}
                    className="w-full resize-none px-3 py-2 text-sm outline-none transition-colors"
                    style={{
                      ...surface.base,
                      borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.75rem',
                      color: textColor,
                    }}
                  />
                </div>

                {/* Dataset-Typ */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium" style={{ color: textColor }}>
                    Dataset-Typ
                  </label>
                  <div className="space-y-2">
                    {(Object.keys(DATASET_TYPE_INFO) as DatasetType[]).map((t) => {
                      const info = DATASET_TYPE_INFO[t];
                      const Icon = TYPE_ICONS[t];
                      const isSelected = type === t;
                      
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setType(t)}
                          className="flex w-full items-start gap-3 p-3 text-left transition-all"
                          style={{
                            ...surface.base,
                            borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.75rem',
                            border: isSelected ? `2px solid ${accentColor}` : '2px solid transparent',
                          }}
                        >
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center"
                            style={{
                              background: isSelected ? `${accentColor}20` : 'rgba(255, 255, 255, 0.1)',
                              borderRadius: '0.375rem',
                            }}
                          >
                            <Icon 
                              className="h-4 w-4" 
                              style={{ color: isSelected ? accentColor : textColor, opacity: isSelected ? 1 : 0.5 }} 
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium" style={{ color: textColor }}>
                                {info.name}
                              </span>
                              {isSelected && (
                                <Check className="h-4 w-4" style={{ color: accentColor }} />
                              )}
                            </div>
                            <p className="text-xs opacity-50" style={{ color: textColor }}>
                              {info.description}
                            </p>
                            <p className="mt-1 text-xs opacity-30" style={{ color: textColor }}>
                              Felder: {info.fields.join(', ')}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Info Box */}
                <div
                  className="mb-4 p-3 text-xs"
                  style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '0.375rem',
                    color: '#60a5fa',
                  }}
                >
                  Nach dem Erstellen kannst du Daten hochladen (CSV/JSONL) oder synthetisch generieren.
                </div>

                {/* Error */}
                {error && (
                  <div
                    className="mb-4 p-3 text-sm"
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      borderRadius: '0.375rem',
                      color: '#f87171',
                    }}
                  >
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium transition-colors hover:bg-white/10"
                    style={{
                      borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.75rem',
                      color: textColor,
                    }}
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !name.trim()}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-all hover:scale-105 disabled:opacity-50"
                    style={{
                      background: accentColor,
                      borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.75rem',
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Erstelle...
                      </>
                    ) : (
                      'Erstellen'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

