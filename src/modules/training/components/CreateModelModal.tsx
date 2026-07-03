'use client';

// ============================================
// CreateModelModal.tsx - Modal zum Erstellen eines Modells
// 
// Zweck: Formular für neues trainiertes Modell
// Verwendet von: TrainingPage
// ============================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, Image, Video, Loader2, Check } from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { BASE_MODELS, MODEL_TYPE_INFO } from '../constants';
import type { TrainingModel, ModelType, CreateModelRequest } from '../types';

// --------------------------------------------
// Props
// --------------------------------------------

interface CreateModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (model: TrainingModel) => void;
}

// --------------------------------------------
// Type Icons
// --------------------------------------------

const TYPE_ICONS = {
  text: Brain,
  image: Image,
  video: Video,
};

// --------------------------------------------
// Komponente
// --------------------------------------------

export function CreateModelModal({ isOpen, onClose, onCreated }: CreateModelModalProps) {
  const { surface, container, designStyle, textColor, accentColor } = useThemeStyles();
  
  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ModelType>('text');
  const [baseModel, setBaseModel] = useState('llama-3-8b');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Basis-Modelle für ausgewählten Typ
  const availableModels = BASE_MODELS[type] || [];

  // Reset bei Typ-Wechsel
  const handleTypeChange = (newType: ModelType) => {
    setType(newType);
    const models = BASE_MODELS[newType];
    if (models && models.length > 0) {
      // Empfohlenes Modell auswählen
      const recommended = models.find(m => m.recommended);
      setBaseModel(recommended?.id || models[0].id);
    }
  };

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
      const payload: CreateModelRequest = {
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        baseModel,
        color: MODEL_TYPE_INFO[type].color,
      };

      const res = await fetch('/api/training/models', {
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
      setType('text');
      setBaseModel('llama-3-8b');
      onCreated(data.model);
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
                  Neues Modell erstellen
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
                    placeholder="z.B. Support-Bot v1"
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
                    placeholder="Was soll dieses Modell können?"
                    rows={2}
                    className="w-full resize-none px-3 py-2 text-sm outline-none transition-colors"
                    style={{
                      ...surface.base,
                      borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.75rem',
                      color: textColor,
                    }}
                  />
                </div>

                {/* Modell-Typ */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium" style={{ color: textColor }}>
                    Modell-Typ
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(MODEL_TYPE_INFO) as ModelType[]).map((t) => {
                      const info = MODEL_TYPE_INFO[t];
                      const Icon = TYPE_ICONS[t];
                      const isSelected = type === t;
                      
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => handleTypeChange(t)}
                          className="flex flex-col items-center gap-1 p-3 transition-all"
                          style={{
                            ...surface.base,
                            borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.75rem',
                            border: isSelected ? `2px solid ${info.color}` : '2px solid transparent',
                            background: isSelected ? `${info.color}20` : surface.base.background,
                          }}
                        >
                          <Icon 
                            className="h-5 w-5" 
                            style={{ color: isSelected ? info.color : textColor, opacity: isSelected ? 1 : 0.5 }} 
                          />
                          <span 
                            className="text-xs font-medium"
                            style={{ color: isSelected ? info.color : textColor, opacity: isSelected ? 1 : 0.6 }}
                          >
                            {info.name.split(' ')[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Basis-Modell */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium" style={{ color: textColor }}>
                    Basis-Modell
                  </label>
                  <div className="space-y-2">
                    {availableModels.map((model) => {
                      const isSelected = baseModel === model.id;
                      
                      return (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => setBaseModel(model.id)}
                          className="flex w-full items-center justify-between p-3 text-left transition-all"
                          style={{
                            ...surface.base,
                            borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.75rem',
                            border: isSelected ? `2px solid ${accentColor}` : '2px solid transparent',
                          }}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium" style={{ color: textColor }}>
                                {model.name}
                              </span>
                              {model.recommended && (
                                <span
                                  className="px-1.5 py-0.5 text-[10px] font-medium"
                                  style={{
                                    background: `${accentColor}20`,
                                    color: accentColor,
                                    borderRadius: '9999px',
                                  }}
                                >
                                  Empfohlen
                                </span>
                              )}
                            </div>
                            <p className="text-xs opacity-50" style={{ color: textColor }}>
                              {model.provider} • {model.parameters}
                            </p>
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4" style={{ color: accentColor }} />
                          )}
                        </button>
                      );
                    })}
                  </div>
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

