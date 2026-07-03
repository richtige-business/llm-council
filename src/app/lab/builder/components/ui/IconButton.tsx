// ============================================
// LifeOS Module Builder - IconButton
// 
// Zweck: Wiederverwendbarer Icon-Button (wie bolt.diy)
// Verwendet von: Workbench, Chat-Komponenten
// ============================================

'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';

// --------------------------------------------
// Props
// --------------------------------------------

interface IconButtonProps {
  icon: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// --------------------------------------------
// Size Mapping
// --------------------------------------------

const sizeClasses = {
  sm: 'w-6 h-6 text-sm',
  md: 'w-8 h-8 text-base',
  lg: 'w-10 h-10 text-lg',
  xl: 'w-12 h-12 text-xl',
};

// --------------------------------------------
// Komponente
// --------------------------------------------

export const IconButton = memo(function IconButton({
  icon,
  onClick,
  disabled = false,
  className,
  title,
  size = 'md',
}: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'flex items-center justify-center rounded-lg transition-all',
        'hover:bg-white/10 active:bg-white/20',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'text-white/70 hover:text-white',
        sizeClasses[size],
        className
      )}
    >
      <span className={icon} />
    </button>
  );
});



