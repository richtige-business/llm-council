// ============================================
// colors.ts - Dynamische Modul-Farbgenerierung
//
// Zweck: Generiert konsistente, ansprechende Farbverlaeufe
//        fuer jedes Modul basierend auf dessen Eigenschaften.
//        Ersetzt die hartcodierten MODULE_COLORS-Mappings.
// Verwendet von: Dashboard Navbar, Bases-Seite, TabWindow
// ============================================

// --------------------------------------------
// Bekannte Module: Handverlesene Pastellfarben
// Fuer Built-in Module, die immer gleich aussehen sollen
// --------------------------------------------

const KNOWN_MODULE_COLORS: Record<string, string> = {
  inbox: 'from-amber-200 to-yellow-300',
  browser: 'from-sky-200 to-cyan-300',
  calendar: 'from-rose-300 to-red-400',
  chat: 'from-slate-300 to-gray-400',
};

// --------------------------------------------
// Generierte Farbpalette
// Wird fuer unbekannte Module per Hash-Index gewaehlt.
// Alle Farben sind Pastell-Gradients die zum LLM Council-Design passen.
// --------------------------------------------

const GENERATED_GRADIENTS = [
  'from-teal-300 to-emerald-400',
  'from-pink-300 to-rose-400',
  'from-indigo-300 to-blue-400',
  'from-orange-300 to-amber-400',
  'from-fuchsia-300 to-pink-400',
  'from-lime-300 to-green-400',
  'from-cyan-300 to-sky-400',
  'from-violet-300 to-purple-400',
  'from-red-300 to-orange-400',
  'from-blue-300 to-indigo-400',
  'from-emerald-300 to-teal-400',
  'from-yellow-300 to-amber-400',
];

// --------------------------------------------
// Hex-Farbe → Tailwind-Gradient erzeugen
// Fuer Module die eine eigene Farbe mitbringen (z.B. aus dem Lab)
// --------------------------------------------

function hexToGradient(hex: string): string {
  // Einfache Heuristik: Verwende die Hex-Farbe als Basis
  // und erzeuge inline CSS statt Tailwind-Klassen
  return `from-[${hex}] to-[${hex}cc]`;
}

// --------------------------------------------
// stableHash - Erzeugt einen stabilen Hash aus einem String
// Gleicher Input = gleicher Output (fuer konsistente Farben)
// --------------------------------------------

function stableHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // 32-bit Integer
  }
  return Math.abs(hash);
}

// --------------------------------------------
// getModuleGradient - Hauptfunktion
//
// Bestimmt den Farbverlauf fuer ein Modul:
// 1. Bekanntes Modul → handverlesene Farbe
// 2. Modul hat eigene Hex-Farbe → daraus generieren
// 3. Sonst → konsistenter Gradient per Hash
//
// Parameter:
//   moduleId - Die ID des Moduls
//   moduleColor - Optionale Hex-Farbe aus dem Modul (z.B. '#8B5CF6')
// Rueckgabe:
//   Tailwind-Gradient-Klasse (z.B. 'from-rose-300 to-red-400')
// --------------------------------------------

export function getModuleGradient(moduleId: string, moduleColor?: string): string {
  // 1. Bekannte Built-in Module
  if (KNOWN_MODULE_COLORS[moduleId]) {
    return KNOWN_MODULE_COLORS[moduleId];
  }

  // 2. Modul bringt eigene Hex-Farbe mit
  if (moduleColor && moduleColor.startsWith('#')) {
    return hexToGradient(moduleColor);
  }

  // 3. Konsistenter Gradient per Hash der Module-ID
  const index = stableHash(moduleId) % GENERATED_GRADIENTS.length;
  return GENERATED_GRADIENTS[index];
}

// --------------------------------------------
// Hex-Farbpalette fuer Stellen die Hex-Werte brauchen
// (z.B. TabWindow, Agent-Orb etc.)
// --------------------------------------------

const KNOWN_HEX_COLORS: Record<string, string> = {
  calendar: '#10B981',
  inbox: '#3B82F6',
  browser: '#8B5CF6',
  chat: '#EC4899',
  'todo-list': '#F59E0B',
  training: '#EF4444',
  library: '#6366F1',
  lab: '#14B8A6',
};

const GENERATED_HEX_COLORS = [
  '#14B8A6', '#F472B6', '#818CF8', '#FB923C',
  '#E879F9', '#84CC16', '#22D3EE', '#A78BFA',
  '#F87171', '#60A5FA', '#34D399', '#FBBF24',
];

// --------------------------------------------
// getModuleHexColor - Hex-Farbe fuer ein Modul
// Konsistent pro Module-ID, mit Built-in-Overrides
// --------------------------------------------

export function getModuleHexColor(moduleId: string, moduleColor?: string): string {
  if (KNOWN_HEX_COLORS[moduleId]) return KNOWN_HEX_COLORS[moduleId];
  if (moduleColor?.startsWith('#')) return moduleColor;
  const index = stableHash(moduleId) % GENERATED_HEX_COLORS.length;
  return GENERATED_HEX_COLORS[index];
}
