'use client';

// ============================================
// DistillationAnimation.tsx - Visual fuer Distillation-Runs
//
// Zweck: Visualisiert den Wissenstransfer vom grossen Teacher-Brain
//        zum kleineren Student-Brain waehrend eines Simulations-Runs
// Verwendet von: LLMTrainingWorkspace
// ============================================

import { motion } from 'framer-motion';
import { useThemeStyles } from '@/lib/theme';

// --------------------------------------------
// Props
// --------------------------------------------

interface DistillationAnimationProps {
  progress: number;
  status: 'idle' | 'running' | 'completed' | 'failed';
  teacherName: string;
  studentName: string;
}

const KNOWLEDGE_STREAMS = Array.from({ length: 6 }, (_, index) => index);
const TEACHER_NEURONS = Array.from({ length: 10 }, (_, index) => index);
const STUDENT_NEURONS = Array.from({ length: 8 }, (_, index) => index);

// --------------------------------------------
// Animation
// Zeigt zwei abstrakte Gehirne mit fliessendem Wissenstransfer
// --------------------------------------------

export function DistillationAnimation({
  progress,
  status,
  teacherName,
  studentName,
}: DistillationAnimationProps) {
  const { surface, designStyle, textColor } = useThemeStyles();
  const normalizedProgress = Math.max(0, Math.min(progress, 100));
  const studentScale = 0.78 + normalizedProgress / 450;
  const isRunning = status === 'running';
  const isCompleted = status === 'completed';

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
            Distillation Simulation
          </p>
          <h3 className="mt-1 text-lg font-semibold" style={{ color: textColor }}>
            Wissen fließt vom Teacher zum Student
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
                  : 'rgba(245, 158, 11, 0.16)',
            color:
              status === 'completed'
                ? '#4ade80'
                : status === 'failed'
                  ? '#f87171'
                  : '#fbbf24',
          }}
        >
          {status === 'completed' ? 'Synchronisiert' : status === 'failed' ? 'Abgebrochen' : 'Transfer läuft'}
        </div>
      </div>

      <div className="relative min-h-[280px] overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.14),rgba(8,15,32,0.05)_42%,transparent_78%)]">
        <div className="absolute inset-x-0 top-4 flex items-center justify-between px-6 text-xs font-medium">
          <span style={{ color: '#c4b5fd' }}>{teacherName}</span>
          <span style={{ color: '#86efac' }}>{studentName}</span>
        </div>

        {/* --------------------------------------------
            Teacher-Brain
            Groesseres Cluster auf der linken Seite
           -------------------------------------------- */}
        <div className="absolute left-5 top-16 flex h-44 w-44 items-center justify-center">
          <motion.div
            animate={{
              boxShadow: isRunning
                ? [
                    '0 0 0 rgba(139, 92, 246, 0.25)',
                    '0 0 30px rgba(139, 92, 246, 0.45)',
                    '0 0 0 rgba(139, 92, 246, 0.25)',
                  ]
                : '0 0 18px rgba(139, 92, 246, 0.25)',
            }}
            transition={{ duration: 2.4, repeat: isRunning ? Infinity : 0 }}
            className="relative h-40 w-40 rounded-full border border-violet-300/25 bg-[radial-gradient(circle_at_40%_35%,rgba(196,181,253,0.9),rgba(109,40,217,0.3)_35%,rgba(30,41,59,0.2)_70%)]"
          >
            {TEACHER_NEURONS.map((neuron, index) => (
              <motion.span
                key={neuron}
                className="absolute h-2.5 w-2.5 rounded-full bg-violet-200"
                style={{
                  left: `${22 + (index % 4) * 18}%`,
                  top: `${20 + Math.floor(index / 4) * 18}%`,
                }}
                animate={{
                  scale: isRunning ? [0.9, 1.3, 0.9] : 1,
                  opacity: isRunning ? [0.35, 1, 0.35] : 0.8,
                }}
                transition={{
                  duration: 1.8,
                  repeat: isRunning ? Infinity : 0,
                  delay: index * 0.14,
                }}
              />
            ))}
          </motion.div>
        </div>

        {/* --------------------------------------------
            Student-Brain
            Kleineres Cluster auf der rechten Seite, waechst subtil mit
           -------------------------------------------- */}
        <div className="absolute right-9 top-20 flex h-36 w-36 items-center justify-center">
          <motion.div
            animate={{
              scale: studentScale,
              boxShadow:
                isCompleted || isRunning
                  ? [
                      '0 0 0 rgba(34, 197, 94, 0.15)',
                      `0 0 ${18 + normalizedProgress / 4}px rgba(34, 197, 94, 0.35)`,
                      '0 0 0 rgba(34, 197, 94, 0.15)',
                    ]
                  : '0 0 12px rgba(34, 197, 94, 0.18)',
            }}
            transition={{
              scale: { duration: 0.6 },
              boxShadow: { duration: 2.2, repeat: isRunning ? Infinity : 0 },
            }}
            className="relative h-32 w-32 rounded-full border border-emerald-300/25 bg-[radial-gradient(circle_at_40%_35%,rgba(187,247,208,0.92),rgba(16,185,129,0.34)_35%,rgba(15,23,42,0.18)_70%)]"
          >
            {STUDENT_NEURONS.map((neuron, index) => (
              <motion.span
                key={neuron}
                className="absolute h-2 w-2 rounded-full bg-emerald-100"
                style={{
                  left: `${22 + (index % 4) * 18}%`,
                  top: `${20 + Math.floor(index / 4) * 20}%`,
                }}
                animate={{
                  scale: isRunning ? [0.85, 1.2, 0.85] : 1,
                  opacity:
                    isCompleted || isRunning
                      ? [0.35, 0.7 + normalizedProgress / 200, 0.35]
                      : 0.65,
                }}
                transition={{
                  duration: 1.7,
                  repeat: isRunning ? Infinity : 0,
                  delay: index * 0.18,
                }}
              />
            ))}
          </motion.div>
        </div>

        {/* --------------------------------------------
            Synapsen und Wissensstream
            Mehrere Impulse bewegen sich vom Teacher zum Student
           -------------------------------------------- */}
        <div className="absolute inset-0">
          {KNOWLEDGE_STREAMS.map((stream, index) => {
            const topOffset = 28 + index * 8;

            return (
              <div
                key={stream}
                className="absolute left-[33%] right-[24%]"
                style={{ top: `${topOffset}%` }}
              >
                <div className="relative h-px bg-gradient-to-r from-violet-400/10 via-violet-300/40 to-emerald-300/30">
                  <motion.div
                    className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-violet-300 to-emerald-300"
                    animate={{
                      left: isRunning || isCompleted ? ['0%', '100%'] : '0%',
                      opacity: isRunning ? [0, 1, 0] : isCompleted ? 1 : 0.45,
                    }}
                    transition={{
                      duration: 1.6 + index * 0.12,
                      repeat: isRunning ? Infinity : 0,
                      ease: 'easeInOut',
                      delay: index * 0.18,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* --------------------------------------------
            Fortschritt
            Kombiniert visuellen und numerischen Transferstatus
           -------------------------------------------- */}
        <div className="absolute inset-x-5 bottom-5">
          <div className="mb-2 flex items-center justify-between text-xs" style={{ color: textColor }}>
            <span className="opacity-60">Knowledge Transfer</span>
            <span className="font-medium text-emerald-300">{normalizedProgress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/8">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${normalizedProgress}%` }}
              className="h-full rounded-full bg-[linear-gradient(90deg,#8b5cf6_0%,#22c55e_100%)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
