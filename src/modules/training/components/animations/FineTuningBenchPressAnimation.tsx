'use client';

// ============================================
// FineTuningBenchPressAnimation.tsx - Visual fuer Fine-Tuning-Runs
//
// Zweck: Visualisiert klassisches Fine-Tuning als Bankdrueck-
//        Simulation, bei der Datensaetze die Gewichte darstellen
// Verwendet von: LLMTrainingWorkspace
// ============================================

import { motion } from 'framer-motion';
import { useThemeStyles } from '@/lib/theme';

// --------------------------------------------
// Props
// --------------------------------------------

interface FineTuningBenchPressAnimationProps {
  progress: number;
  status: 'idle' | 'running' | 'completed' | 'failed';
  datasetCountLabel: string;
  epochs: number;
}

// --------------------------------------------
// Animation
// Stilisierte Bankdrueck-Szene fuer normales Fine-Tuning
// --------------------------------------------

export function FineTuningBenchPressAnimation({
  progress,
  status,
  datasetCountLabel,
  epochs,
}: FineTuningBenchPressAnimationProps) {
  const { surface, designStyle, textColor } = useThemeStyles();
  const normalizedProgress = Math.max(0, Math.min(progress, 100));
  const isRunning = status === 'running';

  return (
    <div
      className="overflow-hidden p-5"
      style={{
        ...surface.base,
        borderRadius: designStyle === 'brutal' ? '0.75rem' : '1.5rem',
      }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] opacity-50" style={{ color: textColor }}>
            Fine-Tuning Simulation
          </p>
          <h3 className="mt-1 text-lg font-semibold" style={{ color: textColor }}>
            Das Modell stemmt das Dataset bis zum Ziel
          </h3>
        </div>
        <div
          className="rounded-full px-3 py-1 text-xs font-medium"
          style={{
            background:
              status === 'completed'
                ? 'rgba(34, 197, 94, 0.16)'
                : status === 'failed'
                  ? 'rgba(239, 68, 68, 0.16)'
                  : 'rgba(59, 130, 246, 0.16)',
            color:
              status === 'completed'
                ? '#4ade80'
                : status === 'failed'
                  ? '#f87171'
                  : '#60a5fa',
          }}
        >
          {status === 'completed' ? 'Run abgeschlossen' : status === 'failed' ? 'Run gestoppt' : 'Training läuft'}
        </div>
      </div>

      <div className="relative min-h-[280px] overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.12),rgba(15,23,42,0.05)_42%,transparent_75%)]">
        {/* Bank */}
        <div className="absolute inset-x-12 bottom-10 h-3 rounded-full bg-white/15" />
        <div className="absolute left-[22%] bottom-10 h-14 w-3 rounded-full bg-white/12" />
        <div className="absolute right-[22%] bottom-10 h-14 w-3 rounded-full bg-white/12" />

        {/* Person */}
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2">
          <motion.div
            animate={{
              y: isRunning ? [0, -4, 0] : 0,
            }}
            transition={{
              duration: 1.4,
              repeat: isRunning ? Infinity : 0,
              ease: 'easeInOut',
            }}
            className="relative h-28 w-44"
          >
            <div className="absolute left-1/2 top-0 h-9 w-9 -translate-x-1/2 rounded-full bg-cyan-100/85 shadow-[0_0_18px_rgba(125,211,252,0.35)]" />
            <div className="absolute left-1/2 top-8 h-12 w-8 -translate-x-1/2 rounded-t-2xl rounded-b-lg bg-cyan-300/80" />
            <div className="absolute left-[34%] top-12 h-3 w-16 rounded-full bg-cyan-200/85" />
            <div className="absolute right-[34%] top-12 h-3 w-16 rounded-full bg-cyan-200/85" />
            <div className="absolute left-[41%] bottom-0 h-10 w-3 rounded-full bg-cyan-200/80 rotate-[18deg]" />
            <div className="absolute right-[41%] bottom-0 h-10 w-3 rounded-full bg-cyan-200/80 -rotate-[18deg]" />
          </motion.div>
        </div>

        {/* Hantel */}
        <motion.div
          animate={{
            y:
              status === 'completed'
                ? -72
                : status === 'failed'
                  ? -6
                  : isRunning
                    ? [0, -54, 0]
                    : -10,
          }}
          transition={{
            duration: isRunning ? 1.8 : 0.6,
            repeat: isRunning ? Infinity : 0,
            ease: 'easeInOut',
          }}
          className="absolute left-1/2 top-20 h-24 w-[78%] -translate-x-1/2"
        >
          <div className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-slate-200 via-white to-slate-200 shadow-[0_0_18px_rgba(148,163,184,0.18)]" />

          <WeightPlate side="left" label={datasetCountLabel} color="#06b6d4" />
          <WeightPlate side="right" label={`${epochs} Epochen`} color="#8b5cf6" />
        </motion.div>

        {/* Fortschritt */}
        <div className="absolute inset-x-5 bottom-5">
          <div className="mb-2 flex items-center justify-between text-xs" style={{ color: textColor }}>
            <span className="opacity-60">Trainingsfortschritt</span>
            <span className="font-medium text-cyan-300">{normalizedProgress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/8">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${normalizedProgress}%` }}
              className="h-full rounded-full bg-[linear-gradient(90deg,#06b6d4_0%,#8b5cf6_100%)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function WeightPlate({
  side,
  label,
  color,
}: {
  side: 'left' | 'right';
  label: string;
  color: string;
}) {
  const sideStyle = side === 'left' ? 'left-6' : 'right-6';

  return (
    <div className={`absolute top-1/2 ${sideStyle} -translate-y-1/2`}>
      <div
        className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/15"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${color}dd 0%, ${color}66 35%, rgba(15,23,42,0.45) 72%)`,
          boxShadow: `0 0 24px ${color}35`,
        }}
      >
        <div className="absolute inset-4 rounded-full border border-white/20" />
        <div className="max-w-[56px] text-center text-[10px] font-semibold leading-tight text-white/90">
          {label}
        </div>
      </div>
    </div>
  );
}
