// ============================================
// LLM Council - Utility Functions
// 
// Zweck: Gemeinsame Hilfsfunktionen
// Verwendet von: Allen Komponenten
// ============================================

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --------------------------------------------
// Classnames Helper
// Kombiniert clsx und tailwind-merge
// --------------------------------------------

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}



