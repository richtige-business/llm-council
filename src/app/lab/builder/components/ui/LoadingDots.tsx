// ============================================
// LifeOS Module Builder - Loading Dots
// 
// Zweck: Animierte Ladeanzeige
// Verwendet von: Chat, Workbench
// ============================================

'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';

// --------------------------------------------
// Komponente
// --------------------------------------------

export const LoadingDots = memo(function LoadingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-purple-400 rounded-full"
          animate={{
            y: [0, -8, 0],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
});



