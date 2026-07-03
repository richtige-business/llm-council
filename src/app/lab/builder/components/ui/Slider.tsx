// ============================================
// LifeOS Module Builder - Tab Slider
// 
// Zweck: Animierter Tab-Switcher (wie bolt.diy)
// Verwendet von: Workbench Header
// ============================================

'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// --------------------------------------------
// Types
// --------------------------------------------

export interface SliderOption<T> {
  value: T;
  text: string;
}

export interface SliderOptions<T> {
  left: SliderOption<T>;
  right: SliderOption<T>;
}

interface ThemeStyles {
  surface?: { base: React.CSSProperties };
  button?: { base: React.CSSProperties };
  accentColor?: string;
  designStyle?: 'glass' | 'brutal' | 'neo';
  textColor?: string;
}

interface SliderProps<T> {
  selected: T;
  options: SliderOptions<T>;
  setSelected: (value: T) => void;
  themeStyles?: ThemeStyles;
}

// --------------------------------------------
// Komponente
// --------------------------------------------

export const Slider = memo(function Slider<T extends string>({
  selected,
  options,
  setSelected,
  themeStyles,
}: SliderProps<T>) {
  const { 
    surface, 
    button, 
    accentColor = '#8b5cf6', 
    designStyle = 'glass', 
    textColor = '#ffffff' 
  } = themeStyles || {};

  return (
    <div 
      className="flex items-center p-1 gap-1"
      style={{
        background: surface?.base?.background || 'rgba(255,255,255,0.05)',
        borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
        border: designStyle === 'brutal' ? '2px solid #000' : 'none',
      }}
    >
      {/* Left Option */}
      <button
        onClick={() => setSelected(options.left.value)}
        className="relative px-4 py-1.5 text-sm font-medium transition-colors"
        style={{
          color: selected === options.left.value ? textColor : `${textColor}99`,
          borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
        }}
      >
        {selected === options.left.value && (
          <motion.div
            layoutId="slider-active"
            className="absolute inset-0"
            style={{
              background: designStyle === 'brutal' 
                ? accentColor 
                : 'rgba(255,255,255,0.1)',
              borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
              border: designStyle === 'brutal' ? '2px solid #000' : 'none',
            }}
            transition={{ type: 'spring', duration: 0.3 }}
          />
        )}
        <span className="relative z-10">{options.left.text}</span>
      </button>
      
      {/* Right Option */}
      <button
        onClick={() => setSelected(options.right.value)}
        className="relative px-4 py-1.5 text-sm font-medium transition-colors"
        style={{
          color: selected === options.right.value ? textColor : `${textColor}99`,
          borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
        }}
      >
        {selected === options.right.value && (
          <motion.div
            layoutId="slider-active"
            className="absolute inset-0"
            style={{
              background: designStyle === 'brutal' 
                ? accentColor 
                : 'rgba(255,255,255,0.1)',
              borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
              border: designStyle === 'brutal' ? '2px solid #000' : 'none',
            }}
            transition={{ type: 'spring', duration: 0.3 }}
          />
        )}
        <span className="relative z-10">{options.right.text}</span>
      </button>
    </div>
  );
}) as <T extends string>(props: SliderProps<T>) => React.ReactElement;

