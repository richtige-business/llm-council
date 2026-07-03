// ============================================
// IntelligenceOrb.tsx - Markantes AI-Icon mit dynamischen Effekten
// 
// Zweck: Ein unverwechselbares, lebendiges Icon das
//        "Intelligence" visualisiert - mit Ringen, Sparks und Glow
// Verwendet von: ChatWidget.tsx
// ============================================

'use client';

import { useMemo } from 'react';
import type { MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { useThemeStyles } from '@/lib/theme';

// --------------------------------------------
// Props für das Orb
// --------------------------------------------

interface IntelligenceOrbProps {
  isOpen: boolean;
  isHovered: boolean;
  isListening?: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onPressStart?: () => void;
  onPressEnd?: () => void;
  // Optionale Modul-Farbe (überschreibt accentColor wenn gesetzt)
  moduleColor?: string;
  // Optionale Größe für verschiedene Kontexte
  size?: 'small' | 'medium' | 'large';
}

// --------------------------------------------
// Komponente: IntelligenceOrb
// Markantes AI-Icon mit Ringen und Glow-Effekten
// --------------------------------------------

// --------------------------------------------
// Größen-Konfiguration für verschiedene Kontexte
// --------------------------------------------

const SIZE_CONFIG = {
  small: {
    container: 60,
    outerGlow: 72,
    outerRing: 52,
    innerRing: 36,
    core: 26,
    highlight: 10,
    sparkContainer: 46,
    sparkSize: 3,
  },
  medium: {
    container: 80,
    outerGlow: 96,
    outerRing: 70,
    innerRing: 48,
    core: 34,
    highlight: 12,
    sparkContainer: 60,
    sparkSize: 4,
  },
  large: {
    container: 100,
    outerGlow: 120,
    outerRing: 88,
    innerRing: 60,
    core: 44,
    highlight: 16,
    sparkContainer: 76,
    sparkSize: 5,
  },
};

export function IntelligenceOrb({ 
  isOpen, 
  isHovered, 
  isListening = false,
  onClick, 
  onHoverStart, 
  onHoverEnd,
  onPressStart,
  onPressEnd,
  moduleColor,
  size = 'large',
}: IntelligenceOrbProps) {
  const { accentColor, designStyle } = useThemeStyles();
  
  // Nutze moduleColor wenn vorhanden, sonst accentColor
  const glowColor = moduleColor || accentColor;
  const sizes = SIZE_CONFIG[size];
  
  // Berechne Ring-Radius und Positionen basierend auf Größe
  const outerRingRadius = sizes.outerRing / 2 - 4;
  const innerRingRadius = sizes.innerRing / 2 - 4;
  
  return (
    <motion.button
      className="relative flex items-center justify-center cursor-pointer focus:outline-none group"
      style={{
        width: sizes.container,
        height: sizes.container,
        background: 'transparent',
        border: 'none',
      }}
      initial={{ scale: 1 }}
      animate={{ 
        scale: isListening ? 1.12 : isHovered ? 1.08 : 1,
      }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
      onPointerDown={onPressStart}
      onPointerUp={onPressEnd}
      onPointerLeave={onPressEnd}
      onPointerCancel={onPressEnd}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      aria-label="Chat öffnen"
    >
      {/* ----------------------------------------
          Äußerer Glow - Atmosphärischer Hintergrund
          ---------------------------------------- */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: sizes.outerGlow,
          height: sizes.outerGlow,
          background: `radial-gradient(circle, ${glowColor}30 0%, ${glowColor}10 40%, transparent 70%)`,
          filter: 'blur(12px)',
        }}
        animate={{
          scale: isListening ? [1.1, 1.4, 1.25] : isHovered ? [1, 1.25, 1.15] : [1, 1.12, 1],
          opacity: isListening ? [0.8, 1, 0.9] : isHovered ? [0.6, 1, 0.8] : [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: isListening ? 1.1 : isHovered ? 1.5 : 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* ----------------------------------------
          Rotierender äußerer Ring
          ---------------------------------------- */}
      <motion.div
        className="absolute"
        style={{
          width: sizes.outerRing,
          height: sizes.outerRing,
        }}
        animate={{
          rotate: 360,
          scale: isListening ? [1, 1.08, 1] : [1, 1, 1],
        }}
        transition={{
          duration: isListening ? 3.5 : isHovered ? 4 : 8,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        <svg width={sizes.outerRing} height={sizes.outerRing} viewBox={`0 0 ${sizes.outerRing} ${sizes.outerRing}`}>
          {/* Gestrichelter Ring */}
          <circle
            cx={sizes.outerRing / 2}
            cy={sizes.outerRing / 2}
            r={outerRingRadius}
            fill="none"
            stroke={glowColor}
            strokeWidth="2"
            strokeDasharray="10 16"
            opacity={isListening ? 1 : isHovered ? 1 : 0.6}
          />
          {/* Akzent-Punkte auf dem Ring */}
          {[0, 90, 180, 270].map((angle) => (
            <circle
              key={angle}
              cx={sizes.outerRing / 2 + outerRingRadius * Math.cos((angle * Math.PI) / 180)}
              cy={sizes.outerRing / 2 + outerRingRadius * Math.sin((angle * Math.PI) / 180)}
              r={size === 'small' ? 3 : 4}
              fill={glowColor}
              opacity={isListening ? 1 : isHovered ? 1 : 0.7}
            >
              <animate
                attributeName="r"
                values={isListening ? '3;7;3' : '3;5;3'}
                dur={isListening ? '1s' : '1.5s'}
                repeatCount="indefinite"
                begin={`${angle / 360}s`}
              />
            </circle>
          ))}
        </svg>
      </motion.div>

      {/* ----------------------------------------
          Innerer Ring - Gegenläufig rotierend
          ---------------------------------------- */}
      <motion.div
        className="absolute"
        style={{
          width: sizes.innerRing,
          height: sizes.innerRing,
        }}
        animate={{
          rotate: -360,
          scale: isListening ? [1, 1.06, 1] : [1, 1, 1],
        }}
        transition={{
          duration: isListening ? 4.5 : isHovered ? 6 : 12,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        <svg width={sizes.innerRing} height={sizes.innerRing} viewBox={`0 0 ${sizes.innerRing} ${sizes.innerRing}`}>
          <circle
            cx={sizes.innerRing / 2}
            cy={sizes.innerRing / 2}
            r={innerRingRadius}
            fill="none"
            stroke={glowColor}
            strokeWidth="1.5"
            strokeDasharray="6 10"
            opacity={0.5}
          />
        </svg>
      </motion.div>

      {/* ----------------------------------------
          Zentraler Kern - Das Herz des Orbs
          ---------------------------------------- */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: sizes.core,
          height: sizes.core,
          background: `
            radial-gradient(circle at 30% 30%, 
              ${glowColor} 0%, 
              ${glowColor}dd 30%,
              ${glowColor}99 60%,
              ${glowColor}44 100%
            )
          `,
          boxShadow: `
            0 0 40px ${glowColor}aa,
            0 0 80px ${glowColor}66,
            inset 0 0 25px rgba(255,255,255,0.3)
          `,
        }}
        animate={{
          scale: isListening ? [1, 1.2, 1.1] : isHovered ? [1, 1.12, 1.08] : [1, 1.06, 1],
          boxShadow: isListening 
            ? [
                `0 0 55px ${glowColor}cc, 0 0 110px ${glowColor}88, inset 0 0 30px rgba(255,255,255,0.4)`,
                `0 0 80px ${glowColor}ff, 0 0 150px ${glowColor}aa, inset 0 0 40px rgba(255,255,255,0.6)`,
                `0 0 65px ${glowColor}dd, 0 0 120px ${glowColor}99, inset 0 0 35px rgba(255,255,255,0.5)`,
              ]
            : isHovered 
            ? [
                `0 0 40px ${glowColor}aa, 0 0 80px ${glowColor}66, inset 0 0 25px rgba(255,255,255,0.3)`,
                `0 0 60px ${glowColor}cc, 0 0 120px ${glowColor}88, inset 0 0 35px rgba(255,255,255,0.5)`,
                `0 0 50px ${glowColor}bb, 0 0 100px ${glowColor}77, inset 0 0 30px rgba(255,255,255,0.4)`,
              ]
            : [
                `0 0 40px ${glowColor}aa, 0 0 80px ${glowColor}66, inset 0 0 25px rgba(255,255,255,0.3)`,
                `0 0 50px ${glowColor}bb, 0 0 90px ${glowColor}77, inset 0 0 30px rgba(255,255,255,0.4)`,
                `0 0 40px ${glowColor}aa, 0 0 80px ${glowColor}66, inset 0 0 25px rgba(255,255,255,0.3)`,
              ],
        }}
        transition={{
          duration: isListening ? 0.9 : isHovered ? 1 : 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* ----------------------------------------
          Innerer Lichtpunkt - Highlight
          ---------------------------------------- */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: sizes.highlight,
          height: sizes.highlight,
          background: 'radial-gradient(circle, #ffffff 0%, #ffffffaa 40%, transparent 70%)',
          top: '50%',
          left: '50%',
          marginTop: -sizes.highlight,
          marginLeft: -2,
        }}
        animate={{
          opacity: isListening ? [0.9, 1, 0.9] : [0.8, 1, 0.8],
          scale: isListening ? [1, 1.25, 1] : [0.9, 1.1, 0.9],
        }}
        transition={{
          duration: isListening ? 0.9 : 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* ----------------------------------------
          Orbiting Sparks - Kleine Funken
          ---------------------------------------- */}
      <motion.div
        className="absolute"
        style={{ width: sizes.sparkContainer, height: sizes.sparkContainer }}
        animate={{ rotate: 360 }}
        transition={{
          duration: isListening ? 3 : 5,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        {/* Spark-Positionen dynamisch berechnen basierend auf Größe */}
        {[0, 120, 240].map((angle, i) => {
          const sparkRadius = sizes.sparkContainer / 2 - 3;
          const x = Math.round(sizes.sparkContainer / 2 + sparkRadius * Math.cos((angle * Math.PI) / 180));
          const y = Math.round(sizes.sparkContainer / 2 + sparkRadius * Math.sin((angle * Math.PI) / 180));
          return (
            <motion.div
              key={`spark-${i}`}
              className="absolute rounded-full"
              style={{
                width: `${sizes.sparkSize}px`,
                height: `${sizes.sparkSize}px`,
                background: '#ffffff',
                boxShadow: `0 0 10px ${glowColor}, 0 0 20px ${glowColor}`,
                left: `${x - sizes.sparkSize / 2}px`,
                top: `${y - sizes.sparkSize / 2}px`,
              }}
              animate={{
                scale: isListening ? [1, 2, 1] : [1, 1.6, 1],
                opacity: isListening ? [0.8, 1, 0.8] : [0.6, 1, 0.6],
              }}
              transition={{
                duration: isListening ? 0.8 : 1,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            />
          );
        })}
      </motion.div>
    </motion.button>
  );
}

// --------------------------------------------
// Dekorative Partikel für den offenen Chat
// Werden am oberen Rand des Chat-Fensters angezeigt
// --------------------------------------------

interface DecorativeParticlesProps {
  accentColor: string;
  width: number;
}

// --------------------------------------------
// Mini Intelligence Orb
// Kleinere Version für Widgets und kompakte UIs
// --------------------------------------------

interface MiniIntelligenceOrbProps {
  color: string;
  size?: number;
  onClick?: () => void;
  isActive?: boolean;
}

export function MiniIntelligenceOrb({ 
  color, 
  size = 48, 
  onClick,
  isActive = false,
}: MiniIntelligenceOrbProps) {
  return (
    <motion.button
      className="relative flex items-center justify-center cursor-pointer focus:outline-none"
      style={{
        width: size,
        height: size,
        background: 'transparent',
        border: 'none',
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      aria-label="Agent öffnen"
    >
      {/* Glow */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size * 1.2,
          height: size * 1.2,
          background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`,
          filter: 'blur(6px)',
        }}
        animate={{
          scale: isActive ? [1, 1.2, 1] : [1, 1.1, 1],
          opacity: isActive ? [0.6, 0.9, 0.6] : [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: isActive ? 1.5 : 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Rotierender Ring */}
      <motion.div
        className="absolute"
        style={{ width: size * 0.85, height: size * 0.85 }}
        animate={{ rotate: 360 }}
        transition={{
          duration: isActive ? 4 : 8,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        <svg 
          width={size * 0.85} 
          height={size * 0.85} 
          viewBox={`0 0 ${size * 0.85} ${size * 0.85}`}
        >
          <circle
            cx={size * 0.425}
            cy={size * 0.425}
            r={size * 0.35}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeDasharray="5 7"
            opacity={isActive ? 0.8 : 0.5}
          />
        </svg>
      </motion.div>
      
      {/* Kern */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size * 0.45,
          height: size * 0.45,
          background: `radial-gradient(circle at 30% 30%, ${color} 0%, ${color}99 60%, ${color}44 100%)`,
          boxShadow: `0 0 ${size * 0.3}px ${color}aa, 0 0 ${size * 0.6}px ${color}44`,
        }}
        animate={{
          scale: isActive ? [1, 1.1, 1] : [1, 1.05, 1],
        }}
        transition={{
          duration: isActive ? 1 : 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Highlight */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size * 0.15,
          height: size * 0.15,
          background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)',
          marginTop: -size * 0.12,
          marginLeft: -size * 0.02,
        }}
      />
    </motion.button>
  );
}

export function DecorativeParticles({ accentColor, width }: DecorativeParticlesProps) {
  const particles = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => ({
      id: i,
      delay: Math.random() * 2,
      size: 2 + Math.random() * 2,
    }));
  }, []);
  
  return (
    <div 
      className="absolute top-0 left-0 right-0 h-16 overflow-hidden pointer-events-none"
      style={{ opacity: 0.7 }}
    >
      {/* Gradient Line */}
      <div 
        className="absolute top-8 left-4 right-4 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentColor}60, transparent)`,
        }}
      />
      
      {/* Floating Particles */}
      {particles.map((particle, index) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            width: particle.size,
            height: particle.size,
            background: accentColor,
            boxShadow: `0 0 6px ${accentColor}`,
            left: `${15 + (index * 14)}%`,
            top: 8,
          }}
          animate={{
            y: [-4, 4, -4],
            opacity: [0.4, 0.9, 0.4],
          }}
          transition={{
            duration: 2 + particle.delay,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: particle.delay,
          }}
        />
      ))}
    </div>
  );
}
