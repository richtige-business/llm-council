// ============================================
// LifeOS Module Builder - Example Prompts
// 
// Zweck: Zeigt Beispiel-Prompts im Startmenü (wie bolt.diy)
// Verwendet von: BaseChat
// ============================================

'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';

// --------------------------------------------
// Beispiel-Prompts für LifeOS Module
// --------------------------------------------

const EXAMPLE_PROMPTS = [
  { text: 'Erstelle einen Habit-Tracker mit Streak-Anzeige' },
  { text: 'Baue ein Pomodoro-Timer Modul mit Statistiken' },
  { text: 'Erstelle ein Notiz-Modul mit Markdown-Support' },
  { text: 'Baue einen Ausgaben-Tracker mit Kategorien' },
  { text: 'Erstelle ein Mood-Tracking Modul' },
  { text: 'Baue ein Bookmark-Manager Modul' },
];

// --------------------------------------------
// Props
// --------------------------------------------

interface ThemeStyles {
  surface?: { base: React.CSSProperties };
  button?: { base: React.CSSProperties };
  accentColor?: string;
  designStyle?: 'glass' | 'brutal' | 'neo';
  textColor?: string;
}

interface ExamplePromptsProps {
  onSelect: (prompt: string) => void;
  themeStyles?: ThemeStyles;
}

// --------------------------------------------
// Komponente
// --------------------------------------------

export const ExamplePrompts = memo(function ExamplePrompts({
  onSelect,
  themeStyles,
}: ExamplePromptsProps) {
  const { 
    surface, 
    button, 
    accentColor = '#8b5cf6', 
    designStyle = 'glass', 
    textColor = '#ffffff' 
  } = themeStyles || {};

  return (
    <motion.div
      id="examples"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="flex flex-wrap justify-center gap-2 mt-6 max-w-3xl mx-auto px-4"
    >
      {EXAMPLE_PROMPTS.map((prompt, index) => (
        <motion.button
          key={index}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 + index * 0.05 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect(prompt.text)}
          className="px-4 py-2 text-sm transition-all duration-200"
          style={{
            ...(button?.base || {}),
            background: surface?.base?.background || 'rgba(255,255,255,0.05)',
            color: textColor,
            opacity: 0.7,
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '9999px',
            border: designStyle === 'brutal' 
              ? '2px solid #000' 
              : '1px solid rgba(255,255,255,0.1)',
            boxShadow: designStyle === 'brutal' ? '2px 2px 0 #000' : 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.borderColor = `${accentColor}80`;
            if (designStyle !== 'brutal') {
              e.currentTarget.style.boxShadow = `0 4px 15px ${accentColor}20`;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.7';
            e.currentTarget.style.borderColor = designStyle === 'brutal' ? '#000' : 'rgba(255,255,255,0.1)';
            if (designStyle !== 'brutal') {
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          {prompt.text}
        </motion.button>
      ))}
    </motion.div>
  );
});

