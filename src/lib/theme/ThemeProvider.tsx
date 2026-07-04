// ============================================
// ThemeProvider.tsx - Theme Style Provider
// 
// Zweck: Setzt das data-style Attribut und CSS-Variablen,
//        um das gewählte Theme global anzuwenden
// Verwendet von: layout.tsx (über providers)
// ============================================

'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store/app-store';

// --------------------------------------------
// ThemeProvider Component
// Setzt alle Theme-Variablen global
// --------------------------------------------

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const designStyle = useAppStore((state) => state.designStyle);
  const accentColor = useAppStore((state) => state.accentColor);
  const surfaceColor = useAppStore((state) => state.surfaceColor);
  const textColor = useAppStore((state) => state.textColor);
  const appFont = useAppStore((state) => state.appFont);
  
  // Setze das data-style Attribut auf dem Body-Element
  useEffect(() => {
    document.body.setAttribute('data-style', designStyle);
  }, [designStyle]);
  
  // Setze alle Farben als CSS-Variablen
  useEffect(() => {
    const root = document.documentElement;
    
    // Akzentfarbe
    root.style.setProperty('--accent-primary', accentColor);
    root.style.setProperty('--accent-primary-hover', adjustColor(accentColor, 15));
    
    // Oberflächenfarbe
    root.style.setProperty('--surface-color', surfaceColor);
    
    // Textfarbe
    root.style.setProperty('--text-primary', textColor);
    root.style.setProperty('--text-secondary', adjustOpacity(textColor, 0.7));
    root.style.setProperty('--text-tertiary', adjustOpacity(textColor, 0.5));
    
    // Schriftart
    root.style.setProperty('--font-app', appFont);
    document.body.style.fontFamily = appFont;
    
  }, [accentColor, surfaceColor, textColor, appFont]);
  
  return <>{children}</>;
}

// --------------------------------------------
// Hilfsfunktion: Farbe aufhellen/abdunkeln
// --------------------------------------------

function adjustColor(hex: string, percent: number): string {
  // Handle rgba format
  if (hex.startsWith('rgba')) return hex;
  
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return hex;
  
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  const adjust = (value: number) => {
    const adjusted = value + (percent / 100) * 255;
    return Math.max(0, Math.min(255, Math.round(adjusted)));
  };
  
  const toHex = (value: number) => value.toString(16).padStart(2, '0');
  
  return `#${toHex(adjust(r))}${toHex(adjust(g))}${toHex(adjust(b))}`;
}

// --------------------------------------------
// Hilfsfunktion: Farbe mit Opacity
// --------------------------------------------

function adjustOpacity(color: string, opacity: number): string {
  // Handle rgba format
  if (color.startsWith('rgba')) {
    return color.replace(/[\d.]+\)$/, `${opacity})`);
  }
  
  // Handle hex format
  if (color.startsWith('#')) {
    const cleanHex = color.replace('#', '');
    if (cleanHex.length !== 6) return color;
    
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  
  return color;
}
