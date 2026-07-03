'use client';

// ============================================
// Shimmer.tsx - Schimmernder Text fuer Thinking-States
//
// Zweck: Zeigt laufende Denk- oder Ladezustaende
//        mit einem dezenten Lichtlauf ueber dem Text
// Verwendet von: ThinkingBlock.tsx, ChatMessage.tsx
// ============================================

import { motion } from 'framer-motion';

interface ShimmerProps {
  children: string;
  className?: string;
  accentColor?: string;
}

export function Shimmer({
  children,
  className,
  accentColor = 'rgba(255,255,255,0.9)',
}: ShimmerProps) {
  return (
    <span
      className={className}
      style={{
        position: 'relative',
        display: 'inline-block',
        color: 'rgba(255,255,255,0.6)',
      }}
    >
      <span>{children}</span>

      {/* ----------------------------------------
          Lichtlauf ueber dem Text
          Nutzt background-clip fuer einen weichen
          Schimmer ohne separates Canvas.
          ---------------------------------------- */}
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 bg-clip-text text-transparent"
        style={{
          backgroundImage: `linear-gradient(110deg, transparent 0%, ${accentColor} 45%, transparent 100%)`,
          backgroundSize: '220% 100%',
          WebkitBackgroundClip: 'text',
        }}
        animate={{
          backgroundPositionX: ['200%', '-120%'],
        }}
        transition={{
          duration: 1.9,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        {children}
      </motion.span>
    </span>
  );
}
