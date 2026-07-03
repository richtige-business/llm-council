// ============================================
// PriceBadge.tsx - Preis-Badge Komponente
// 
// Zweck: Zeigt den Preis eines Moduls als Badge an
// Verwendet von: ModuleCard, ModuleDetail
// ============================================

'use client';

import type { ModulePricing } from '@/lib/marketplace/types';
import { formatPrice, isPaidModule } from '@/lib/marketplace/types';

// --------------------------------------------
// Props Interface
// --------------------------------------------

interface PriceBadgeProps {
  pricing: ModulePricing;
  size?: 'sm' | 'md' | 'lg';
  // Design-Stil (für Theme-Kompatibilität)
  designStyle?: 'glass' | 'brutal' | 'neo';
}

// --------------------------------------------
// Größen-Mapping
// --------------------------------------------

const sizeMap = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

// --------------------------------------------
// Komponente
// --------------------------------------------

export function PriceBadge({ 
  pricing, 
  size = 'md',
  designStyle = 'glass',
}: PriceBadgeProps) {
  const isPaid = isPaidModule(pricing);
  const priceText = formatPrice(pricing);
  
  // Farben basierend auf Preis-Typ
  const getColors = () => {
    if (pricing.type === 'free') {
      return {
        bg: 'rgba(34, 197, 94, 0.2)',
        text: '#22c55e',
        border: 'rgba(34, 197, 94, 0.3)',
      };
    }
    if (pricing.type === 'freemium') {
      return {
        bg: 'rgba(59, 130, 246, 0.2)',
        text: '#3b82f6',
        border: 'rgba(59, 130, 246, 0.3)',
      };
    }
    if (pricing.type === 'subscription') {
      return {
        bg: 'rgba(139, 92, 246, 0.2)',
        text: '#a78bfa',
        border: 'rgba(139, 92, 246, 0.3)',
      };
    }
    // paid
    return {
      bg: 'rgba(245, 158, 11, 0.2)',
      text: '#f59e0b',
      border: 'rgba(245, 158, 11, 0.3)',
    };
  };
  
  const colors = getColors();
  
  // Design-spezifische Styles
  const getDesignStyles = () => {
    if (designStyle === 'brutal') {
      return {
        borderRadius: '0.25rem',
        border: '2px solid #000',
        boxShadow: '2px 2px 0 #000',
      };
    }
    if (designStyle === 'neo') {
      return {
        borderRadius: '0.5rem',
        boxShadow: '2px 2px 4px rgba(0,0,0,0.2), -1px -1px 2px rgba(255,255,255,0.05)',
      };
    }
    // glass
    return {
      borderRadius: '9999px',
      border: `1px solid ${colors.border}`,
    };
  };
  
  return (
    <span
      className={`${sizeMap[size]} font-semibold inline-flex items-center whitespace-nowrap`}
      style={{
        background: colors.bg,
        color: colors.text,
        ...getDesignStyles(),
      }}
    >
      {priceText}
      {pricing.trialDays && (
        <span className="ml-1 opacity-75">
          ({pricing.trialDays}T Test)
        </span>
      )}
    </span>
  );
}


