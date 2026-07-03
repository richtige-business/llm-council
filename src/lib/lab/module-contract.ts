// ============================================
// module-contract.ts - Minimaler Modul-Vertrag
// 
// Zweck: Definiert den minimalen Vertrag für LifeOS Module
//        Philosophie: So wenig wie nötig, so viel wie möglich erlauben
// ============================================

import type { ModuleCategory } from '@/types';

// --------------------------------------------
// Minimaler Modul-Vertrag
// Das ist ALLES was ein Modul braucht!
// --------------------------------------------

/**
 * Minimale module.json Struktur
 * Nur 4 Pflichtfelder!
 */
export interface MinimalModuleManifest {
  /** Eindeutige ID (kebab-case, z.B. "my-game") */
  id: string;
  /** Anzeigename (z.B. "Mein Spiel") */
  name: string;
  /** Lucide Icon Name oder URL zu Custom Icon */
  icon: string;
  /** Entry Point relativ zum Modul-Ordner (z.B. "./App.tsx") */
  entry: string;
}

/**
 * Vollständige module.json Struktur
 * Alle optionalen Felder inklusive
 */
export interface FullModuleManifest extends MinimalModuleManifest {
  /** Beschreibung für den Module Store */
  description?: string;
  /** Semantic Version (z.B. "1.0.0") */
  version?: string;
  /** Kategorie für Sidebar/Filterung */
  category?: ModuleCategory;
  /** Autor/Ersteller */
  author?: string;
  /** Benötigte Berechtigungen */
  permissions?: ModulePermission[];
  /** Abhängigkeiten zu anderen Modulen */
  dependencies?: string[];
  /** Tags für Suche */
  tags?: string[];
  /** Repository URL */
  repository?: string;
  /** Lizenz */
  license?: string;
}

// --------------------------------------------
// Berechtigungen
// --------------------------------------------

export type ModulePermission =
  | 'storage'        // Lokaler Speicher (IndexedDB, localStorage)
  | 'network'        // Netzwerk-Zugriff (APIs, Fetch)
  | 'notifications'  // Push-Benachrichtigungen
  | 'clipboard'      // Zwischenablage
  | 'camera'         // Kamera-Zugriff
  | 'microphone'     // Mikrofon-Zugriff
  | 'geolocation'    // Standort
  | 'calendar'       // LifeOS Kalender-Integration
  | 'contacts'       // LifeOS Kontakte-Integration
  | 'files';         // Dateisystem-Zugriff

// --------------------------------------------
// Validierung
// --------------------------------------------

/**
 * Validiert ein module.json Objekt
 * Prüft nur die Pflichtfelder!
 */
export function validateModuleManifest(manifest: unknown): ValidationResult {
  const errors: string[] = [];
  
  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['module.json muss ein Objekt sein'] };
  }
  
  const m = manifest as Record<string, unknown>;
  
  // Pflichtfeld: id
  if (!m.id || typeof m.id !== 'string') {
    errors.push('Pflichtfeld "id" fehlt oder ist kein String');
  } else if (!/^[a-z0-9-]+$/.test(m.id)) {
    errors.push('"id" muss kebab-case sein (nur Kleinbuchstaben, Zahlen, Bindestriche)');
  }
  
  // Pflichtfeld: name
  if (!m.name || typeof m.name !== 'string') {
    errors.push('Pflichtfeld "name" fehlt oder ist kein String');
  }
  
  // Pflichtfeld: icon
  if (!m.icon || typeof m.icon !== 'string') {
    errors.push('Pflichtfeld "icon" fehlt oder ist kein String');
  }
  
  // Pflichtfeld: entry
  if (!m.entry || typeof m.entry !== 'string') {
    errors.push('Pflichtfeld "entry" fehlt oder ist kein String');
  } else if (!m.entry.startsWith('./')) {
    errors.push('"entry" muss mit "./" beginnen (relativer Pfad)');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// --------------------------------------------
// Hilfsfunktionen
// --------------------------------------------

/**
 * Erstellt eine minimale module.json
 */
export function createMinimalManifest(
  id: string,
  name: string,
  icon: string = 'Box',
  entry: string = './App.tsx'
): MinimalModuleManifest {
  return {
    id: toKebabCase(id),
    name,
    icon,
    entry,
  };
}

/**
 * Erstellt eine vollständige module.json mit Defaults
 */
export function createFullManifest(
  partial: Partial<FullModuleManifest> & MinimalModuleManifest
): FullModuleManifest {
  return {
    ...partial,
    version: partial.version ?? '1.0.0',
    category: partial.category ?? 'other' as ModuleCategory,
    permissions: partial.permissions ?? ['storage'],
    dependencies: partial.dependencies ?? [],
  };
}

/**
 * Konvertiert String zu kebab-case
 */
function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// --------------------------------------------
// Beispiel-Manifeste
// --------------------------------------------

export const EXAMPLE_MANIFESTS = {
  minimal: {
    id: 'my-app',
    name: 'Meine App',
    icon: 'Box',
    entry: './App.tsx',
  } as MinimalModuleManifest,
  
  game: {
    id: 'space-invaders',
    name: 'Space Invaders',
    description: 'Ein klassisches Arcade-Spiel',
    icon: 'Gamepad2',
    entry: './Game.tsx',
    version: '1.0.0',
    category: 'creative' as ModuleCategory,
    author: 'GameDev',
    tags: ['game', 'arcade', 'retro'],
  } as FullModuleManifest,
  
  saas: {
    id: 'analytics-dashboard',
    name: 'Analytics Dashboard',
    description: 'Detaillierte Datenanalyse und Visualisierung',
    icon: 'BarChart3',
    entry: './App.tsx',
    version: '1.0.0',
    category: 'business' as ModuleCategory,
    permissions: ['storage', 'network'],
    tags: ['analytics', 'dashboard', 'data'],
  } as FullModuleManifest,
  
  social: {
    id: 'community-forum',
    name: 'Community Forum',
    description: 'Diskussionsforum für deine Community',
    icon: 'MessageSquare',
    entry: './App.tsx',
    version: '1.0.0',
    category: 'social' as ModuleCategory,
    permissions: ['storage', 'network', 'notifications'],
    tags: ['forum', 'community', 'discussion'],
  } as FullModuleManifest,
};

// --------------------------------------------
// Modul-Struktur Dokumentation
// --------------------------------------------

export const MODULE_STRUCTURE_DOCS = `
# LifeOS Modul-Struktur

## Minimal (4 Zeilen)
\`\`\`
my-app/
├── module.json    ← Pflicht
└── App.tsx        ← Entry Point
\`\`\`

## Standard
\`\`\`
my-app/
├── module.json
├── App.tsx
├── store.ts       ← Zustand State
└── types.ts       ← TypeScript Types
\`\`\`

## Mit Widgets
\`\`\`
my-app/
├── module.json
├── App.tsx
├── store.ts
├── types.ts
└── widgets/
    ├── index.ts   ← Widget-Exports
    └── MainWidget.tsx
\`\`\`

## Mit Agent-Tools
\`\`\`
my-app/
├── module.json
├── App.tsx
├── store.ts
├── types.ts
└── tools.ts       ← Agent-Konfiguration
\`\`\`

## Komplexe App
\`\`\`
my-app/
├── module.json
├── App.tsx
├── components/
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   └── ...
├── features/
│   ├── dashboard/
│   ├── settings/
│   └── ...
├── services/
│   └── api.ts
├── store/
│   └── index.ts
├── types/
│   └── index.ts
├── widgets/
│   └── ...
└── tools.ts
\`\`\`

## Freiheit!
Du kannst jede Struktur verwenden. Das Einzige was zählt:
- module.json existiert mit den 4 Pflichtfeldern
- entry zeigt auf eine gültige Komponente
`;


