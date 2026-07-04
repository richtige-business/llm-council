// ============================================
// use-theme-styles.ts - Theme Style Hook
// 
// Zweck: Liefert fertige Style-Objekte basierend auf dem 
//        gewählten Design-Stil (glass, brutal, neo)
// Verwendet von: Alle UI-Komponenten (Sidebar, Tabs, Cards, etc.)
// ============================================

'use client';

import { useMemo } from 'react';
import { useAppStore } from '@/lib/store/app-store';
import type { CSSProperties } from 'react';

// --------------------------------------------
// Style-Typen
// Definieren die Struktur der zurückgegebenen Styles
// --------------------------------------------

export interface ContainerStyles {
  // Basis-Styles für Container (Sidebar, Tabs, Modals)
  base: CSSProperties;
  // Hover-State (optional, für interaktive Container)
  hover?: CSSProperties;
}

export interface SurfaceStyles {
  // Basis-Styles für Surfaces (Cards, Panels)
  base: CSSProperties;
}

export interface ButtonStyles {
  // Basis-Styles für Buttons
  base: CSSProperties;
  // Hover-State
  hover: CSSProperties;
  // Active-State (beim Klicken)
  active: CSSProperties;
  // Primary Button (mit Akzentfarbe)
  primary: CSSProperties;
  primaryHover: CSSProperties;
}

export interface InputStyles {
  // Basis-Styles für Inputs
  base: CSSProperties;
  // Focus-State
  focus: CSSProperties;
}

export interface NavItemStyles {
  // Basis-Styles für Nav-Items
  base: CSSProperties;
  // Aktiver Nav-Item
  active: CSSProperties;
  // Hover-State
  hover: CSSProperties;
}

export interface ThemeStyles {
  // Alle Style-Kategorien
  container: ContainerStyles;
  surface: SurfaceStyles;
  button: ButtonStyles;
  input: InputStyles;
  navItem: NavItemStyles;
  // Akzentfarbe für einfachen Zugriff
  accentColor: string;
  // Design-Stil für Conditional Rendering
  designStyle: 'glass' | 'brutal' | 'neo';
}

// --------------------------------------------
// Style-Generatoren für jeden Design-Stil
// --------------------------------------------

// Glassmorphism Styles
const getGlassStyles = (accentColor: string, surfaceColor: string): Omit<ThemeStyles, 'accentColor' | 'designStyle'> => ({
  container: {
    base: {
      background: surfaceColor,
      backdropFilter: 'blur(40px) saturate(180%)',
      WebkitBackdropFilter: 'blur(40px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
      borderRadius: '1.5rem',
    },
  },
  surface: {
    base: {
      background: surfaceColor,
      backdropFilter: 'blur(40px) saturate(180%)',
      WebkitBackdropFilter: 'blur(40px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
      borderRadius: '1.5rem',
    },
  },
  button: {
    base: {
      background: 'rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '0.75rem',
    },
    hover: {
      background: 'rgba(255, 255, 255, 0.2)',
    },
    active: {
      background: 'rgba(255, 255, 255, 0.25)',
    },
    primary: {
      background: `linear-gradient(135deg, ${accentColor} 0%, ${adjustColor(accentColor, 20)} 100%)`,
      border: 'none',
      borderRadius: '0.75rem',
      boxShadow: `0 4px 15px ${accentColor}40`,
    },
    primaryHover: {
      boxShadow: `0 6px 20px ${accentColor}60`,
    },
  },
  input: {
    base: {
      background: 'rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '0.75rem',
    },
    focus: {
      border: '1px solid rgba(255, 255, 255, 0.3)',
    },
  },
  navItem: {
    base: {
      borderRadius: '1rem',
    },
    active: {
      background: 'rgba(255, 255, 255, 0.2)',
    },
    hover: {
      background: 'rgba(255, 255, 255, 0.1)',
    },
  },
});

// Neo-Brutalism Styles
const getBrutalStyles = (accentColor: string, surfaceColor: string): Omit<ThemeStyles, 'accentColor' | 'designStyle'> => ({
  container: {
    base: {
      background: surfaceColor,
      border: '3px solid #000000',
      boxShadow: '6px 6px 0 #000000',
      borderRadius: '0.5rem',
    },
  },
  surface: {
    base: {
      background: surfaceColor,
      border: '2px solid #000000',
      boxShadow: '4px 4px 0 #000000',
      borderRadius: '0.5rem',
    },
  },
  button: {
    base: {
      background: surfaceColor,
      border: '2px solid #000000',
      borderRadius: '0.375rem',
      boxShadow: '3px 3px 0 #000000',
    },
    hover: {
      background: '#4a4a5c',
      transform: 'translate(-1px, -1px)',
      boxShadow: '4px 4px 0 #000000',
    },
    active: {
      background: '#5a5a6c',
      transform: 'translate(2px, 2px)',
      boxShadow: '1px 1px 0 #000000',
    },
    primary: {
      background: accentColor,
      border: '2px solid #000000',
      borderRadius: '0.375rem',
      boxShadow: '3px 3px 0 #000000',
      color: '#000000',
      fontWeight: 700,
    },
    primaryHover: {
      transform: 'translate(-1px, -1px)',
      boxShadow: '4px 4px 0 #000000',
    },
  },
  input: {
    base: {
      background: surfaceColor,
      border: '2px solid #000000',
      borderRadius: '0.375rem',
    },
    focus: {
      border: `2px solid ${accentColor}`,
    },
  },
  navItem: {
    base: {
      borderRadius: '0.375rem',
    },
    active: {
      background: surfaceColor,
      boxShadow: '2px 2px 0 #000000',
    },
    hover: {
      background: surfaceColor,
    },
  },
});

// Neomorphism Styles
const getNeoStyles = (accentColor: string, surfaceColor: string): Omit<ThemeStyles, 'accentColor' | 'designStyle'> => ({
  container: {
    base: {
      background: surfaceColor,
      border: 'none',
      boxShadow: '8px 8px 16px rgba(0, 0, 0, 0.4), -8px -8px 16px rgba(255, 255, 255, 0.03)',
      borderRadius: '1.25rem',
    },
  },
  surface: {
    base: {
      background: surfaceColor,
      border: 'none',
      boxShadow: '6px 6px 12px rgba(0, 0, 0, 0.35), -6px -6px 12px rgba(255, 255, 255, 0.025)',
      borderRadius: '1.25rem',
    },
  },
  button: {
    base: {
      background: surfaceColor,
      border: 'none',
      borderRadius: '0.75rem',
      boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.3), -4px -4px 8px rgba(255, 255, 255, 0.02)',
    },
    hover: {
      background: surfaceColor,
      boxShadow: '5px 5px 10px rgba(0, 0, 0, 0.35), -5px -5px 10px rgba(255, 255, 255, 0.025)',
    },
    active: {
      background: surfaceColor,
      boxShadow: 'inset 4px 4px 8px rgba(0, 0, 0, 0.3), inset -4px -4px 8px rgba(255, 255, 255, 0.02)',
    },
    primary: {
      background: `linear-gradient(145deg, ${adjustColor(accentColor, 10)}, ${adjustColor(accentColor, -10)})`,
      border: 'none',
      borderRadius: '0.75rem',
      boxShadow: `4px 4px 8px rgba(0, 0, 0, 0.3), -4px -4px 8px rgba(255, 255, 255, 0.02)`,
    },
    primaryHover: {
      boxShadow: `6px 6px 12px rgba(0, 0, 0, 0.35), -6px -6px 12px rgba(255, 255, 255, 0.025)`,
    },
  },
  input: {
    base: {
      background: surfaceColor,
      border: 'none',
      borderRadius: '0.75rem',
      boxShadow: 'inset 3px 3px 6px rgba(0, 0, 0, 0.3), inset -3px -3px 6px rgba(255, 255, 255, 0.02)',
    },
    focus: {
      boxShadow: `inset 3px 3px 6px rgba(0, 0, 0, 0.3), inset -3px -3px 6px rgba(255, 255, 255, 0.02), 0 0 0 2px ${accentColor}40`,
    },
  },
  navItem: {
    base: {
      borderRadius: '0.75rem',
    },
    active: {
      background: surfaceColor,
      boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.3), -4px -4px 8px rgba(255, 255, 255, 0.02)',
    },
    hover: {
      background: surfaceColor,
    },
  },
});

// --------------------------------------------
// Hilfsfunktion: Farbe aufhellen/abdunkeln
// --------------------------------------------

function adjustColor(hex: string, percent: number): string {
  // Entferne # falls vorhanden
  const cleanHex = hex.replace('#', '');
  
  // Parse RGB Werte
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  // Anpassen
  const adjust = (value: number) => {
    const adjusted = value + (percent / 100) * 255;
    return Math.max(0, Math.min(255, Math.round(adjusted)));
  };
  
  // Zurück zu Hex
  const toHex = (value: number) => value.toString(16).padStart(2, '0');
  
  return `#${toHex(adjust(r))}${toHex(adjust(g))}${toHex(adjust(b))}`;
}

// --------------------------------------------
// Haupt-Hook
// Gibt alle Styles basierend auf dem aktuellen Design-Stil zurück
// --------------------------------------------

export function useThemeStyles(): ThemeStyles & { 
  surfaceColor: string; 
  textColor: string;
  buttonTextColor: string;
  appFont: string;
} {
  const designStyle = useAppStore((state) => state.designStyle);
  const accentColor = useAppStore((state) => state.accentColor);
  const surfaceColor = useAppStore((state) => state.surfaceColor);
  const textColor = useAppStore((state) => state.textColor);
  const buttonTextColor = useAppStore((state) => state.buttonTextColor);
  const appFont = useAppStore((state) => state.appFont);
  
  // Memoize die Styles für bessere Performance
  const styles = useMemo(() => {
    let baseStyles: Omit<ThemeStyles, 'accentColor' | 'designStyle'>;
    
    switch (designStyle) {
      case 'brutal':
        baseStyles = getBrutalStyles(accentColor, surfaceColor);
        break;
      case 'neo':
        baseStyles = getNeoStyles(accentColor, surfaceColor);
        break;
      case 'glass':
      default:
        baseStyles = getGlassStyles(accentColor, surfaceColor);
        break;
    }
    
    return {
      ...baseStyles,
      accentColor,
      designStyle,
      surfaceColor,
      textColor,
      buttonTextColor,
      appFont,
    };
  }, [designStyle, accentColor, surfaceColor, textColor, buttonTextColor, appFont]);
  
  return styles;
}

// --------------------------------------------
// Utility-Hook für einzelne Style-Kategorien
// Für Komponenten, die nur bestimmte Styles brauchen
// --------------------------------------------

export function useContainerStyles(): ContainerStyles {
  const { container } = useThemeStyles();
  return container;
}

export function useSurfaceStyles(): SurfaceStyles {
  const { surface } = useThemeStyles();
  return surface;
}

export function useButtonStyles(): ButtonStyles {
  const { button } = useThemeStyles();
  return button;
}

export function useInputStyles(): InputStyles {
  const { input } = useThemeStyles();
  return input;
}

export function useNavItemStyles(): NavItemStyles {
  const { navItem } = useThemeStyles();
  return navItem;
}
