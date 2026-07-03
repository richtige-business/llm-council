// ============================================
// LifeOS Module Builder - Option Cards
// 
// Zweck: Zeigt klickbare Optionen nach Discuss-Antworten
// Wenn User klickt → Wechsel zu Build-Mode mit buildPrompt
// ============================================

'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import type { ActionOption } from '../../stores/chat-store';

// --------------------------------------------
// Props
// --------------------------------------------

interface ThemeStyles {
  accentColor?: string;
  designStyle?: 'glass' | 'brutal' | 'neo';
  textColor?: string;
}

interface OptionCardsProps {
  options: ActionOption[];
  onSelect: (option: ActionOption) => void;
  disabled?: boolean;
  themeStyles?: ThemeStyles;
}

// --------------------------------------------
// Option Card Komponente
// --------------------------------------------

const OptionCard = memo(function OptionCard({
  option,
  onSelect,
  disabled,
  themeStyles,
  index,
}: {
  option: ActionOption;
  onSelect: (option: ActionOption) => void;
  disabled?: boolean;
  themeStyles?: ThemeStyles;
  index: number;
}) {
  const { accentColor = '#8b5cf6', designStyle = 'glass', textColor = '#ffffff' } = themeStyles || {};

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: disabled ? 1 : 1.02, y: disabled ? 0 : -2 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={() => !disabled && onSelect(option)}
      disabled={disabled}
      className="flex-1 min-w-[200px] p-4 text-left transition-all group"
      style={{
        background: designStyle === 'brutal'
          ? `${accentColor}15`
          : `linear-gradient(135deg, ${accentColor}15 0%, ${accentColor}05 100%)`,
        border: designStyle === 'brutal'
          ? '2px solid #000'
          : `1px solid ${accentColor}30`,
        borderRadius: designStyle === 'brutal' ? '0.75rem' : '1rem',
        boxShadow: designStyle === 'brutal'
          ? '3px 3px 0 #000'
          : `0 4px 15px ${accentColor}10`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {/* Label mit Arrow */}
      <div className="flex items-center justify-between mb-2">
        <span 
          className="font-semibold text-sm"
          style={{ color: textColor }}
        >
          {option.label}
        </span>
        <motion.div
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          animate={{ x: [0, 3, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <ArrowRight 
            className="w-4 h-4" 
            style={{ color: accentColor }} 
          />
        </motion.div>
      </div>
      
      {/* Description */}
      <p 
        className="text-xs"
        style={{ color: textColor, opacity: 0.6 }}
      >
        {option.description}
      </p>
      
      {/* Build-Hinweis */}
      <div 
        className="flex items-center gap-1 mt-3 pt-2"
        style={{ borderTop: `1px solid ${textColor}10` }}
      >
        <Sparkles className="w-3 h-3" style={{ color: accentColor }} />
        <span 
          className="text-xs font-medium"
          style={{ color: accentColor }}
        >
          Klicken zum Bauen
        </span>
      </div>
    </motion.button>
  );
});

// --------------------------------------------
// Haupt-Komponente
// --------------------------------------------

export const OptionCards = memo(function OptionCards({
  options,
  onSelect,
  disabled = false,
  themeStyles,
}: OptionCardsProps) {
  const { accentColor = '#8b5cf6', textColor = '#ffffff' } = themeStyles || {};

  if (!options || options.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div 
          className="w-1 h-4 rounded-full"
          style={{ background: accentColor }}
        />
        <p 
          className="text-xs font-medium"
          style={{ color: textColor, opacity: 0.5 }}
        >
          Wähle eine Option zum Umsetzen:
        </p>
      </div>
      
      {/* Options Grid */}
      <div className="flex flex-wrap gap-3">
        {options.map((option, index) => (
          <OptionCard
            key={option.id}
            option={option}
            onSelect={onSelect}
            disabled={disabled}
            themeStyles={themeStyles}
            index={index}
          />
        ))}
      </div>
    </motion.div>
  );
});

export default OptionCards;






