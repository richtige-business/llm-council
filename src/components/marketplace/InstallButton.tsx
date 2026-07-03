// ============================================
// InstallButton.tsx - Installations-Button
// 
// Zweck: Button zum Installieren/Deinstallieren von Modulen
// Verwendet von: ModuleCard, ModuleDetail
// ============================================

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Check, Loader2, Trash2 } from 'lucide-react';
import { useMarketplaceStore } from '@/lib/marketplace/store';
import { useThemeStyles } from '@/lib/theme';

// --------------------------------------------
// Props Interface
// --------------------------------------------

interface InstallButtonProps {
  moduleId: string;
  isBuiltIn?: boolean;
  size?: 'sm' | 'md' | 'lg';
  // Volle Breite
  fullWidth?: boolean;
  // Callback nach Installation
  onInstalled?: () => void;
  // Callback nach Deinstallation
  onUninstalled?: () => void;
}

// --------------------------------------------
// Größen-Mapping
// --------------------------------------------

const sizeMap = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
};

const iconSizeMap = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

// --------------------------------------------
// Komponente
// --------------------------------------------

export function InstallButton({
  moduleId,
  isBuiltIn = false,
  size = 'md',
  fullWidth = false,
  onInstalled,
  onUninstalled,
}: InstallButtonProps) {
  const { accentColor, designStyle, textColor } = useThemeStyles();
  
  // Store Actions
  const installModule = useMarketplaceStore((s) => s.installModule);
  const uninstallModule = useMarketplaceStore((s) => s.uninstallModule);
  const isInstalled = useMarketplaceStore((s) => s.installedModules.includes(moduleId));
  
  // Loading State für Animation
  const [isLoading, setIsLoading] = useState(false);
  
  // Built-in Module können nicht deinstalliert werden
  if (isBuiltIn) {
    return (
      <div
        className={`${sizeMap[size]} flex items-center justify-center font-medium rounded-lg ${fullWidth ? 'w-full' : ''}`}
        style={{
          background: 'rgba(34, 197, 94, 0.15)',
          color: '#22c55e',
          border: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
        }}
      >
        <Check className={iconSizeMap[size]} />
        <span>Integriert</span>
      </div>
    );
  }
  
  // Handler für Klick
  const handleClick = async () => {
    setIsLoading(true);
    
    // Simuliere kurze Verzögerung für Animation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (isInstalled) {
      uninstallModule(moduleId);
      onUninstalled?.();
    } else {
      installModule(moduleId);
      onInstalled?.();
    }
    
    setIsLoading(false);
  };
  
  // Installiert-Status
  if (isInstalled) {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleClick}
        disabled={isLoading}
        data-agent-button={`marketplace-install-${moduleId}`}
        className={`${sizeMap[size]} flex items-center justify-center font-medium transition-all ${fullWidth ? 'w-full' : ''}`}
        style={{
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#f87171',
          border: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
          boxShadow: designStyle === 'brutal' ? '2px 2px 0 #000' : undefined,
        }}
      >
        {isLoading ? (
          <Loader2 className={`${iconSizeMap[size]} animate-spin`} />
        ) : (
          <>
            <Trash2 className={iconSizeMap[size]} />
            <span>Deinstallieren</span>
          </>
        )}
      </motion.button>
    );
  }
  
  // Nicht installiert
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      disabled={isLoading}
      data-agent-button={`marketplace-install-${moduleId}`}
      className={`${sizeMap[size]} flex items-center justify-center font-medium text-white transition-all ${fullWidth ? 'w-full' : ''}`}
      style={{
        background: accentColor,
        border: designStyle === 'brutal' ? '2px solid #000' : 'none',
        borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
        boxShadow: designStyle === 'brutal' 
          ? '3px 3px 0 #000' 
          : `0 4px 15px ${accentColor}40`,
      }}
    >
      {isLoading ? (
        <Loader2 className={`${iconSizeMap[size]} animate-spin`} />
      ) : (
        <>
          <Download className={iconSizeMap[size]} />
          <span>Installieren</span>
        </>
      )}
    </motion.button>
  );
}


