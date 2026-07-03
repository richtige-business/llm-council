'use client';

// ============================================
// SandboxView.tsx - Sandbox Split-Screen Ansicht
// 
// Zweck: Agent-Testing mit Brain (CoT) und Output View
// Verwendet von: Sandbox-Detailansicht
// ============================================

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Monitor,
  Send,
  Loader2,
  Terminal,
  Mail,
  FileJson,
  Code,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Pencil,
  RotateCcw,
} from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import type { SandboxSession, SandboxPrompt, ChainOfThoughtStep, FeedbackRating } from '../types';

// --------------------------------------------
// Props
// --------------------------------------------

interface SandboxViewProps {
  session: SandboxSession;
  onUpdate: () => void;
}

// --------------------------------------------
// Output Type Icons
// --------------------------------------------

const OUTPUT_ICONS = {
  text: FileText,
  email: Mail,
  image: Monitor,
  json: FileJson,
  code: Code,
};

// --------------------------------------------
// Komponente
// --------------------------------------------

export function SandboxView({ session, onUpdate }: SandboxViewProps) {
  const { surface, container, designStyle, textColor, accentColor } = useThemeStyles();
  
  // State
  const [prompts, setPrompts] = useState<SandboxPrompt[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activePromptId, setActivePromptId] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedOutput, setEditedOutput] = useState('');

  // Refs
  const brainRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Prompts laden
  useEffect(() => {
    loadPrompts();
  }, [session.id]);

  const loadPrompts = async () => {
    try {
      const res = await fetch(`/api/training/sandbox/${session.id}`);
      const data = await res.json();
      if (data.session?.prompts) {
        setPrompts(data.session.prompts);
        // Letzten Prompt als aktiv setzen
        if (data.session.prompts.length > 0) {
          setActivePromptId(data.session.prompts[data.session.prompts.length - 1].id);
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Prompts:', error);
    }
  };

  // Aktiver Prompt
  const activePrompt = prompts.find(p => p.id === activePromptId);
  const OutputIcon = activePrompt ? OUTPUT_ICONS[activePrompt.outputType] || FileText : FileText;

  // --------------------------------------------
  // Prompt senden
  // --------------------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    const userInput = input;
    setInput('');

    try {
      const res = await fetch(`/api/training/sandbox/${session.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: userInput }),
      });

      const data = await res.json();
      if (data.prompt) {
        setPrompts(prev => [...prev, data.prompt]);
        setActivePromptId(data.prompt.id);
        setShowFeedback(true);
        setEditMode(false);
        setEditedOutput('');
        onUpdate();
      }
    } catch (error) {
      console.error('Fehler beim Senden:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // --------------------------------------------
  // Feedback senden
  // --------------------------------------------

  const handleFeedback = async (rating: FeedbackRating) => {
    if (!activePrompt) return;

    try {
      await fetch('/api/training/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptId: activePrompt.id,
          rating,
          editedOutput: rating === 'edited' ? editedOutput : undefined,
        }),
      });

      // Prompt aktualisieren
      setPrompts(prev => prev.map(p => 
        p.id === activePrompt.id 
          ? { ...p, feedback: { id: '', promptId: p.id, rating, editedOutput: rating === 'edited' ? editedOutput : null, notes: null, usedForTraining: false, usedInJobId: null, createdAt: new Date() } }
          : p
      ));
      setShowFeedback(false);
      setEditMode(false);
      onUpdate();
    } catch (error) {
      console.error('Fehler beim Feedback:', error);
    }
  };

  // --------------------------------------------
  // Auto-scroll
  // --------------------------------------------

  useEffect(() => {
    if (brainRef.current) {
      brainRef.current.scrollTop = brainRef.current.scrollHeight;
    }
  }, [activePrompt?.chainOfThought]);

  // --------------------------------------------
  // Render
  // --------------------------------------------

  return (
    <div className="flex h-full flex-col">
      {/* Split View */}
      <div className="flex flex-1 gap-3 overflow-hidden">
        {/* LEFT: The Brain (Chain of Thought) */}
        <div
          className="flex w-1/2 flex-col overflow-hidden"
          style={{
            ...surface.base,
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-white/10 p-3">
            <Terminal className="h-4 w-4" style={{ color: '#8b5cf6' }} />
            <span className="text-sm font-medium" style={{ color: textColor }}>
              The Brain
            </span>
            <span className="text-xs opacity-40" style={{ color: textColor }}>
              Chain of Thought
            </span>
          </div>

          {/* Content */}
          <div
            ref={brainRef}
            className="flex-1 overflow-y-auto p-3 font-mono text-xs"
            style={{ background: 'rgba(0, 0, 0, 0.2)' }}
          >
            {!activePrompt ? (
              <div className="flex h-full items-center justify-center opacity-40" style={{ color: textColor }}>
                Sende einen Prompt um zu starten...
              </div>
            ) : (
              <>
                {/* User Input */}
                <div className="mb-3">
                  <span className="text-green-400">user@sandbox</span>
                  <span style={{ color: textColor, opacity: 0.5 }}>:</span>
                  <span className="text-blue-400">~</span>
                  <span style={{ color: textColor, opacity: 0.5 }}>$ </span>
                  <span style={{ color: textColor }}>{activePrompt.input}</span>
                </div>

                {/* Chain of Thought */}
                {activePrompt.chainOfThought?.map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="mb-2"
                  >
                    <span
                      className="mr-2"
                      style={{
                        color: step.type === 'thinking' ? '#fbbf24' :
                               step.type === 'tool_call' ? '#06b6d4' :
                               step.type === 'result' ? '#10b981' :
                               '#8b5cf6',
                      }}
                    >
                      [{step.type}]
                    </span>
                    <span style={{ color: textColor, opacity: 0.8 }}>
                      {step.content}
                    </span>
                  </motion.div>
                ))}

                {/* Tool Calls */}
                {activePrompt.toolCalls && activePrompt.toolCalls.length > 0 && (
                  <div className="mt-3 border-t border-white/10 pt-3">
                    <span className="text-xs opacity-40" style={{ color: textColor }}>
                      Tool Calls:
                    </span>
                    {activePrompt.toolCalls.map((call, i) => (
                      <div key={i} className="mt-1 pl-2">
                        <span className="text-cyan-400">{call.name}</span>
                        <span style={{ color: textColor, opacity: 0.3 }}> ({call.duration}ms)</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Loading Indicator */}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2"
                  >
                    <Loader2 className="h-3 w-3 animate-spin text-yellow-400" />
                    <span className="text-yellow-400">Processing...</span>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT: The Output */}
        <div
          className="flex w-1/2 flex-col overflow-hidden"
          style={{
            ...surface.base,
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-white/10 p-3">
            <OutputIcon className="h-4 w-4" style={{ color: '#10b981' }} />
            <span className="text-sm font-medium" style={{ color: textColor }}>
              The Output
            </span>
            {activePrompt && (
              <span
                className="ml-auto rounded-full px-2 py-0.5 text-xs"
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#4ade80',
                }}
              >
                {activePrompt.outputType}
              </span>
            )}
          </div>

          {/* Content */}
          <div
            ref={outputRef}
            className="flex-1 overflow-y-auto p-4"
          >
            {!activePrompt ? (
              <div className="flex h-full items-center justify-center opacity-40" style={{ color: textColor }}>
                Output erscheint hier...
              </div>
            ) : editMode ? (
              <textarea
                value={editedOutput}
                onChange={(e) => setEditedOutput(e.target.value)}
                className="h-full w-full resize-none bg-transparent text-sm outline-none"
                style={{ color: textColor }}
                placeholder="Korrigierte Ausgabe eingeben..."
              />
            ) : (
              <div 
                className="whitespace-pre-wrap text-sm"
                style={{ color: textColor }}
              >
                {activePrompt.output}
              </div>
            )}
          </div>

          {/* Feedback Bar */}
          <AnimatePresence>
            {showFeedback && activePrompt && !activePrompt.feedback && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="border-t border-white/10 p-3"
              >
                <div className="flex items-center justify-center gap-3">
                  {/* Reject */}
                  <button
                    onClick={() => handleFeedback('bad')}
                    className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all hover:scale-105"
                    style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      color: '#f87171',
                    }}
                  >
                    <ThumbsDown className="h-4 w-4" />
                    Schlecht
                  </button>

                  {/* Edit Mode */}
                  <button
                    onClick={() => {
                      setEditMode(!editMode);
                      setEditedOutput(activePrompt.output || '');
                    }}
                    className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all hover:scale-105"
                    style={{
                      background: editMode ? `${accentColor}40` : 'rgba(59, 130, 246, 0.2)',
                      color: editMode ? accentColor : '#60a5fa',
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    {editMode ? 'Bearbeiten...' : 'Korrigieren'}
                  </button>

                  {/* Accept */}
                  <button
                    onClick={() => handleFeedback(editMode ? 'edited' : 'good')}
                    className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all hover:scale-105"
                    style={{
                      background: 'rgba(34, 197, 94, 0.2)',
                      color: '#4ade80',
                    }}
                  >
                    <ThumbsUp className="h-4 w-4" />
                    {editMode ? 'Speichern' : 'Gut'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Feedback Status */}
          {activePrompt?.feedback && (
            <div className="border-t border-white/10 p-3">
              <div className="flex items-center justify-center gap-2 text-sm">
                {activePrompt.feedback.rating === 'good' && (
                  <span className="flex items-center gap-1 text-green-400">
                    <ThumbsUp className="h-4 w-4" /> Bewertet: Gut
                  </span>
                )}
                {activePrompt.feedback.rating === 'bad' && (
                  <span className="flex items-center gap-1 text-red-400">
                    <ThumbsDown className="h-4 w-4" /> Bewertet: Schlecht
                  </span>
                )}
                {activePrompt.feedback.rating === 'edited' && (
                  <span className="flex items-center gap-1 text-blue-400">
                    <Pencil className="h-4 w-4" /> Korrigiert
                  </span>
                )}
                <button
                  onClick={() => setShowFeedback(true)}
                  className="ml-2 opacity-50 hover:opacity-100"
                >
                  <RotateCcw className="h-3 w-3" style={{ color: textColor }} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Bar */}
      <form
        onSubmit={handleSubmit}
        className="mt-3 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Prompt eingeben... (z.B. 'Schreibe eine E-Mail an Max')"
          disabled={isLoading || session.status !== 'active'}
          className="flex-1 px-4 py-3 text-sm outline-none transition-colors disabled:opacity-50"
          style={{
            ...surface.base,
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
            color: textColor,
          }}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim() || session.status !== 'active'}
          className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-white transition-all hover:scale-105 disabled:opacity-50"
          style={{
            background: accentColor,
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
          }}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>

      {/* Prompt History */}
      {prompts.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {prompts.map((prompt, i) => (
            <button
              key={prompt.id}
              onClick={() => {
                setActivePromptId(prompt.id);
                setShowFeedback(!prompt.feedback);
                setEditMode(false);
              }}
              className="shrink-0 rounded-full px-3 py-1 text-xs transition-all"
              style={{
                background: prompt.id === activePromptId ? `${accentColor}30` : 'rgba(255, 255, 255, 0.1)',
                color: prompt.id === activePromptId ? accentColor : textColor,
                opacity: prompt.id === activePromptId ? 1 : 0.6,
              }}
            >
              #{i + 1}: {prompt.input.substring(0, 20)}...
            </button>
          ))}
        </div>
      )}
    </div>
  );
}








