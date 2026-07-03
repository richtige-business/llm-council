'use client';

// ============================================
// CreateSandboxModal.tsx - Modal zum Erstellen einer Sandbox Session
// 
// Zweck: Formular für neue Sandbox Session
// Verwendet von: TrainingPage
// ============================================

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FlaskConical, Brain, Loader2, Check, Sparkles } from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { SANDBOX_MOCK_PRESETS } from '../constants';
import type { SandboxSession, CreateSandboxRequest, TrainingModel } from '../types';

// --------------------------------------------
// Props
// --------------------------------------------

interface CreateSandboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (session: SandboxSession) => void;
}

// --------------------------------------------
// Komponente
// --------------------------------------------

export function CreateSandboxModal({ isOpen, onClose, onCreated }: CreateSandboxModalProps) {
  const { surface, container, designStyle, textColor, accentColor } = useThemeStyles();
  
  // Form State
  const [name, setName] = useState('');
  const [modelId, setModelId] = useState<string | null>(null);
  const [baseModel, setBaseModel] = useState('claude-3-haiku');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verfügbare Modelle laden
  const [models, setModels] = useState<TrainingModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadModels();
    }
  }, [isOpen]);

  const loadModels = async () => {
    setLoadingModels(true);
    try {
      const res = await fetch('/api/training/models?status=ready');
      const data = await res.json();
      if (data.models) {
        setModels(data.models);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Modelle:', err);
    } finally {
      setLoadingModels(false);
    }
  };

  // Preset auswählen
  const handleSelectPreset = (presetId: string) => {
    setSelectedPreset(presetId === selectedPreset ? null : presetId);
  };

  // --------------------------------------------
  // Submit
  // --------------------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    setIsSubmitting(true);

    try {
      // Mock-Daten aus Preset
      const mockData = selectedPreset 
        ? SANDBOX_MOCK_PRESETS[selectedPreset as keyof typeof SANDBOX_MOCK_PRESETS]?.mockData
        : undefined;

      const payload: CreateSandboxRequest = {
        name: name.trim() || undefined,
        modelId: modelId || undefined,
        baseModel: modelId ? undefined : baseModel,
        systemPrompt: systemPrompt.trim() || undefined,
        mockData,
      };

      const res = await fetch('/api/training/sandbox', {
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
      setModelId(null);
      setBaseModel('claude-3-haiku');
      setSystemPrompt('');
      setSelectedPreset(null);
      onCreated(data.session);
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
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5" style={{ color: '#10b981' }} />
                  <h2 className="text-lg font-semibold" style={{ color: textColor }}>
                    Neue Sandbox Session
                  </h2>
                </div>
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
                    Name (optional)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="z.B. Test Support-Bot"
                    className="w-full px-3 py-2 text-sm outline-none transition-colors"
                    style={{
                      ...surface.base,
                      borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.75rem',
                      color: textColor,
                    }}
                  />
                </div>

                {/* Modell-Auswahl */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium" style={{ color: textColor }}>
                    Modell
                  </label>
                  
                  {loadingModels ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin" style={{ color: textColor, opacity: 0.5 }} />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Basis-Modell Option */}
                      <button
                        type="button"
                        onClick={() => setModelId(null)}
                        className="flex w-full items-center justify-between p-3 text-left transition-all"
                        style={{
                          ...surface.base,
                          borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.75rem',
                          border: !modelId ? `2px solid ${accentColor}` : '2px solid transparent',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-8 w-8 items-center justify-center"
                            style={{
                              background: !modelId ? `${accentColor}20` : 'rgba(255, 255, 255, 0.1)',
                              borderRadius: '0.375rem',
                            }}
                          >
                            <Sparkles className="h-4 w-4" style={{ color: !modelId ? accentColor : textColor }} />
                          </div>
                          <div>
                            <span className="text-sm font-medium" style={{ color: textColor }}>
                              Claude 3 Haiku
                            </span>
                            <p className="text-xs opacity-50" style={{ color: textColor }}>
                              Basis-Modell (ohne Fine-Tuning)
                            </p>
                          </div>
                        </div>
                        {!modelId && <Check className="h-4 w-4" style={{ color: accentColor }} />}
                      </button>

                      {/* Trainierte Modelle */}
                      {models.filter(m => m.status === 'ready').map((model) => {
                        const isSelected = modelId === model.id;
                        
                        return (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => setModelId(model.id)}
                            className="flex w-full items-center justify-between p-3 text-left transition-all"
                            style={{
                              ...surface.base,
                              borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.75rem',
                              border: isSelected ? `2px solid ${model.color || accentColor}` : '2px solid transparent',
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="flex h-8 w-8 items-center justify-center"
                                style={{
                                  background: model.color || accentColor,
                                  borderRadius: '0.375rem',
                                }}
                              >
                                <Brain className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <span className="text-sm font-medium" style={{ color: textColor }}>
                                  {model.name}
                                </span>
                                <p className="text-xs opacity-50" style={{ color: textColor }}>
                                  Basiert auf {model.baseModel}
                                </p>
                              </div>
                            </div>
                            {isSelected && <Check className="h-4 w-4" style={{ color: model.color || accentColor }} />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Mock-Daten Preset */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium" style={{ color: textColor }}>
                    Test-Szenario (Mock-Daten)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(SANDBOX_MOCK_PRESETS).map(([id, preset]) => {
                      const isSelected = selectedPreset === id;
                      
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => handleSelectPreset(id)}
                          className="flex flex-col items-center gap-1 p-3 text-center transition-all"
                          style={{
                            ...surface.base,
                            borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.75rem',
                            border: isSelected ? `2px solid ${accentColor}` : '2px solid transparent',
                          }}
                        >
                          <span 
                            className="text-xs font-medium"
                            style={{ color: isSelected ? accentColor : textColor }}
                          >
                            {preset.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* System Prompt */}
                <div className="mb-4">
                  <label className="mb-1 block text-sm font-medium" style={{ color: textColor }}>
                    System Prompt (optional)
                  </label>
                  <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="Zusätzliche Anweisungen für das Modell..."
                    rows={3}
                    className="w-full resize-none px-3 py-2 text-sm outline-none transition-colors"
                    style={{
                      ...surface.base,
                      borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.75rem',
                      color: textColor,
                    }}
                  />
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
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-all hover:scale-105 disabled:opacity-50"
                    style={{
                      background: '#10b981',
                      borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.75rem',
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Starte...
                      </>
                    ) : (
                      <>
                        <FlaskConical className="h-4 w-4" />
                        Session starten
                      </>
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

