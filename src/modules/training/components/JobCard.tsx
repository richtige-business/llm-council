'use client';

// ============================================
// JobCard.tsx - Karte für einen Training Job
// 
// Zweck: Anzeige von Job-Status und Fortschritt
// Verwendet von: TrainingPage
// ============================================

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Square,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { STATUS_COLORS } from '../constants';
import type { TrainingJob } from '../types';

// --------------------------------------------
// Props
// --------------------------------------------

interface JobCardProps {
  job: TrainingJob & {
    model?: { id: string; name: string; type: string; icon?: string; color?: string };
    dataset?: { id: string; name: string; type: string; rowCount: number };
  };
  onUpdate: () => void;
}

// --------------------------------------------
// Status-Icons
// --------------------------------------------

const STATUS_ICONS = {
  queued: Clock,
  running: Loader2,
  completed: CheckCircle,
  failed: XCircle,
  cancelled: Square,
};

// --------------------------------------------
// Komponente
// --------------------------------------------

export function JobCard({ job, onUpdate }: JobCardProps) {
  const { surface, designStyle, textColor, accentColor } = useThemeStyles();
  const [showLogs, setShowLogs] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const status = STATUS_COLORS[job.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.queued;
  const StatusIcon = STATUS_ICONS[job.status] || Clock;
  const isRunning = job.status === 'running';
  const isSimulation = job.gpuProvider === 'mock';
  const visualizationLabel =
    job.config?.visualizationKind === 'distillation'
      ? 'Distillation'
      : job.config?.visualizationKind === 'fine-tuning'
        ? 'Fine-Tuning'
        : job.config?.visualizationKind === 'preference'
          ? 'Preference'
          : null;

  // --------------------------------------------
  // Mock-Training simulieren (nur für laufende Jobs)
  // --------------------------------------------

  useEffect(() => {
    if (job.status !== 'running' || job.gpuProvider !== 'mock') return;

    // Alle 2 Sekunden Progress aktualisieren
    const interval = setInterval(async () => {
      // Nur wenn nicht schon bei 100%
      if (job.progress >= 100) return;

      const newProgress = Math.min(100, job.progress + Math.random() * 10);
      const newEpoch = Math.floor((newProgress / 100) * job.totalEpochs);

      try {
        await fetch(`/api/training/jobs/${job.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            progress: Math.round(newProgress),
            currentEpoch: newEpoch,
            log: {
              level: 'info',
              message: `Training... ${newProgress.toFixed(1)}%`,
              step: Math.round(newProgress * 10),
              loss: 2.5 - (newProgress / 100) * 2,
            },
            ...(newProgress >= 100 ? {
              status: 'completed',
              metrics: {
                trainLoss: 0.5 + Math.random() * 0.2,
                evalLoss: 0.6 + Math.random() * 0.2,
                trainingSamples: job.dataset?.rowCount || 100,
                stepsPerSecond: 2.5,
                gpuMemoryUsed: 8192,
              },
            } : {}),
          }),
        });
        onUpdate();
      } catch (error) {
        console.error('Fehler beim Progress-Update:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [job.id, job.status, job.progress, job.gpuProvider, job.totalEpochs, job.dataset?.rowCount, onUpdate]);

  // --------------------------------------------
  // Job abbrechen
  // --------------------------------------------

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await fetch(`/api/training/jobs/${job.id}`, {
        method: 'DELETE',
      });
      onUpdate();
    } catch (error) {
      console.error('Fehler beim Abbrechen:', error);
    } finally {
      setIsCancelling(false);
    }
  };

  // --------------------------------------------
  // Dauer berechnen
  // --------------------------------------------

  const getDuration = () => {
    if (!job.startedAt) return '-';
    const end = job.completedAt ? new Date(job.completedAt) : new Date();
    const start = new Date(job.startedAt);
    const seconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  // --------------------------------------------
  // Render
  // --------------------------------------------

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden"
      style={{
        ...surface.base,
        borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center"
            style={{
              background: status.bg,
              borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
            }}
          >
            <StatusIcon 
              className={`h-5 w-5 ${isRunning ? 'animate-spin' : ''}`} 
              style={{ color: status.text }} 
            />
          </div>
          
          <div>
            <h3 className="font-semibold" style={{ color: textColor }}>
              {job.model?.name || 'Unbekanntes Modell'}
            </h3>
            <p className="text-xs opacity-60" style={{ color: textColor }}>
              {job.dataset?.name || 'Unbekanntes Dataset'} • {job.method.toUpperCase()}
            </p>
            {(isSimulation || visualizationLabel) && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {isSimulation ? (
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      background: 'rgba(59, 130, 246, 0.16)',
                      color: '#60a5fa',
                    }}
                  >
                    Simulation
                  </span>
                ) : null}
                {visualizationLabel ? (
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      background: `${accentColor}16`,
                      color: accentColor,
                    }}
                  >
                    {visualizationLabel}
                  </span>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Badge */}
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

          {/* Cancel Button */}
          {(job.status === 'running' || job.status === 'queued') && (
            <button
              onClick={handleCancel}
              disabled={isCancelling}
              className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-white/10"
              style={{
                borderRadius: '0.375rem',
              }}
            >
              {isCancelling ? (
                <Loader2 className="h-4 w-4 animate-spin text-red-400" />
              ) : (
                <Square className="h-4 w-4 text-red-400" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar (wenn läuft) */}
      {(job.status === 'running' || job.status === 'queued') && (
        <div className="px-4 pb-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span style={{ color: textColor, opacity: 0.6 }}>
              Epoche {job.currentEpoch}/{job.totalEpochs}
            </span>
            <span style={{ color: textColor, opacity: 0.6 }}>
              {job.progress}%
            </span>
          </div>
          <div
            className="h-2 overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '9999px',
            }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${job.progress}%` }}
              className="h-full"
              style={{
                background: `linear-gradient(90deg, ${accentColor} 0%, #8b5cf6 100%)`,
                borderRadius: '9999px',
              }}
            />
          </div>
        </div>
      )}

      {/* Metriken (wenn abgeschlossen) */}
      {job.status === 'completed' && job.metrics && (
        <div className="flex gap-4 border-t border-white/10 px-4 py-3">
          <div>
            <span className="text-xs opacity-40" style={{ color: textColor }}>Train Loss</span>
            <p className="text-sm font-medium" style={{ color: textColor }}>
              {job.metrics.trainLoss?.toFixed(4)}
            </p>
          </div>
          {job.metrics.evalLoss && (
            <div>
              <span className="text-xs opacity-40" style={{ color: textColor }}>Eval Loss</span>
              <p className="text-sm font-medium" style={{ color: textColor }}>
                {job.metrics.evalLoss.toFixed(4)}
              </p>
            </div>
          )}
          <div>
            <span className="text-xs opacity-40" style={{ color: textColor }}>Dauer</span>
            <p className="text-sm font-medium" style={{ color: textColor }}>
              {getDuration()}
            </p>
          </div>
        </div>
      )}

      {/* Fehler (wenn fehlgeschlagen) */}
      {job.status === 'failed' && job.error && (
        <div
          className="mx-4 mb-4 p-3 text-xs"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '0.375rem',
            color: '#f87171',
          }}
        >
          {job.error}
        </div>
      )}

      {/* Logs Toggle */}
      {job.logs && job.logs.length > 0 && (
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="flex w-full items-center justify-center gap-1 border-t border-white/10 py-2 text-xs transition-colors hover:bg-white/5"
          style={{ color: textColor, opacity: 0.6 }}
        >
          {showLogs ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {showLogs ? 'Logs ausblenden' : `${job.logs.length} Log-Einträge`}
        </button>
      )}

      {/* Logs */}
      {showLogs && job.logs && (
        <div
          className="max-h-40 overflow-y-auto border-t border-white/10 p-3 font-mono text-xs"
          style={{ background: 'rgba(0, 0, 0, 0.2)' }}
        >
          {job.logs.slice(-10).map((log, i) => (
            <div key={i} className="mb-1" style={{ color: textColor, opacity: 0.7 }}>
              <span className="opacity-50">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>{' '}
              <span style={{ 
                color: log.level === 'error' ? '#f87171' : 
                       log.level === 'warning' ? '#fbbf24' : 
                       textColor 
              }}>
                {log.message}
              </span>
              {log.loss !== undefined && (
                <span className="ml-2 opacity-50">loss: {log.loss.toFixed(4)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}








