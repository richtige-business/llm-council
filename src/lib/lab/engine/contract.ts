// ============================================
// LifeOS Module Contract System
// 
// Zweck: Definiert die Regeln und Templates für
//        interoperable LifeOS Module
// Verwendet von: System-Prompts, Modul-Validierung
// ============================================

import type { ModuleContract, ModuleFile } from './types';

// --------------------------------------------
// Standard-Imports die jedes Modul braucht
// --------------------------------------------

export const REQUIRED_IMPORTS = {
  // Event-Bus für Modul-Kommunikation
  eventBus: `import { emit, subscribe, useEventBus } from '@/lib/kernel-stub';`,
  
  // Theme für konsistentes Styling
  theme: `import { useThemeStyles } from '@/lib/theme';`,
  
  // Zustand für State Management
  zustand: `import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';`,
  
  // Framer Motion für Animationen
  framerMotion: `import { motion, AnimatePresence } from 'framer-motion';`,
  
  // Lucide Icons
  lucideIcons: `import { /* Icons hier */ } from 'lucide-react';`,
};

// --------------------------------------------
// Standard Event-Namenskonvention
// Format: modulename.action.status
// --------------------------------------------

export const EVENT_NAMING_CONVENTION = {
  pattern: '{moduleId}.{action}.{status}',
  examples: [
    'todo.item.created',
    'todo.item.completed',
    'calendar.event.scheduled',
    'inbox.email.received',
  ],
  actions: ['created', 'updated', 'deleted', 'completed', 'started', 'ended'],
};

// --------------------------------------------
// Standard-Dateistruktur für ein Modul
// --------------------------------------------

export const MODULE_FILE_STRUCTURE: Record<string, string> = {
  'module.json': 'Modul-Metadaten (id, name, version, etc.)',
  'index.ts': 'Re-exports aller öffentlichen APIs',
  'types.ts': 'TypeScript Interfaces und Types',
  'store.ts': 'Zustand Store mit persist middleware',
  'tools.ts': 'Agent-Tools und System Prompt',
  'constants.ts': 'Modul-Konstanten',
  'components/index.ts': 'Component exports',
  'components/{Name}Page.tsx': 'Hauptseiten-Komponente',
  'widgets/index.ts': 'Widget exports',
  'widgets/{Name}Widget.tsx': 'Dashboard-Widget',
};

// --------------------------------------------
// Template-Generatoren für Modul-Dateien
// --------------------------------------------

export function generateModuleJson(contract: Partial<ModuleContract>): string {
  return JSON.stringify({
    id: contract.id || 'new-module',
    name: contract.name || 'Neues Modul',
    description: contract.description || '',
    version: contract.version || '1.0.0',
    category: contract.category || 'productivity',
    icon: contract.icon || 'Box',
    author: 'LifeOS User',
    permissions: ['storage'],
  }, null, 2);
}

export function generateTypesFile(contract: Partial<ModuleContract>): string {
  const moduleName = contract.name?.replace(/\s+/g, '') || 'Module';
  
  return `// ============================================
// ${contract.name || 'Modul'} - Types
// 
// Zweck: TypeScript-Definitionen für das Modul
// ============================================

// Haupt-Datentyp
export interface ${moduleName}Item {
  id: string;
  createdAt: number;
  updatedAt: number;
  // TODO: Weitere Felder hinzufügen
}

// Store-State Type
export interface ${moduleName}State {
  items: ${moduleName}Item[];
  isLoading: boolean;
  error: string | null;
}

// Store-Actions Type
export interface ${moduleName}Actions {
  addItem: (item: Omit<${moduleName}Item, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateItem: (id: string, updates: Partial<${moduleName}Item>) => void;
  deleteItem: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}
`;
}

export function generateStoreFile(contract: Partial<ModuleContract>): string {
  const moduleName = contract.name?.replace(/\s+/g, '') || 'Module';
  const moduleId = contract.id || 'new-module';
  
  return `// ============================================
// ${contract.name || 'Modul'} - Store
// 
// Zweck: Zustand Store für State Management
// ============================================

'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { emit } from '@/lib/kernel-stub';
import type { ${moduleName}State, ${moduleName}Actions, ${moduleName}Item } from './types';

// --------------------------------------------
// Store erstellen mit Persistenz
// --------------------------------------------

export const use${moduleName}Store = create<${moduleName}State & ${moduleName}Actions>()(
  persist(
    (set, get) => ({
      // === State ===
      items: [],
      isLoading: false,
      error: null,
      
      // === Actions ===
      addItem: (itemData) => {
        const newItem: ${moduleName}Item = {
          ...itemData,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        set((state) => ({
          items: [...state.items, newItem],
        }));
        
        // Event an andere Module senden
        emit('${moduleId}.item.created', { item: newItem });
      },
      
      updateItem: (id, updates) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, ...updates, updatedAt: Date.now() }
              : item
          ),
        }));
        
        emit('${moduleId}.item.updated', { id, updates });
      },
      
      deleteItem: (id) => {
        const item = get().items.find((i) => i.id === id);
        
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
        
        if (item) {
          emit('${moduleId}.item.deleted', { item });
        }
      },
      
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
    }),
    {
      name: '${moduleId}-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// --------------------------------------------
// Selektoren für optimierte Renders
// --------------------------------------------

export const use${moduleName}Items = () => 
  use${moduleName}Store((state) => state.items);

export const use${moduleName}Loading = () => 
  use${moduleName}Store((state) => state.isLoading);
`;
}

export function generateToolsFile(contract: Partial<ModuleContract>): string {
  const moduleName = contract.name?.replace(/\s+/g, '') || 'Module';
  const moduleId = contract.id || 'new-module';
  
  return `// ============================================
// ${contract.name || 'Modul'} - Agent Tools & System Prompt
// 
// Zweck: Ermöglicht AI-Agents, dieses Modul zu steuern
// ============================================

import type { ModuleTool, ModuleSystemPrompt } from '@/lib/lab/types';

// --------------------------------------------
// Agent-Tools für dieses Modul
// Diese Funktionen können von AI-Agents aufgerufen werden
// --------------------------------------------

export const moduleTools: ModuleTool[] = [
  {
    id: '${moduleId}_get_all',
    name: 'get_all_${moduleId}_items',
    description: 'Ruft alle Items aus dem ${contract.name || 'Modul'} ab',
    category: 'read',
    parameters: [],
    returns: 'Array von ${moduleName}Item Objekten',
    implementation: \`
      const { items } = use${moduleName}Store.getState();
      return items;
    \`,
    examples: ['Zeige mir alle meine Items'],
  },
  {
    id: '${moduleId}_create',
    name: 'create_${moduleId}_item',
    description: 'Erstellt ein neues Item im ${contract.name || 'Modul'}',
    category: 'write',
    parameters: [
      { name: 'data', type: 'object', description: 'Die Daten für das neue Item', required: true },
    ],
    returns: 'Das erstellte ${moduleName}Item Objekt',
    implementation: \`
      const { addItem } = use${moduleName}Store.getState();
      addItem(data);
      return { success: true };
    \`,
    examples: ['Erstelle ein neues Item mit dem Titel "Test"'],
  },
  {
    id: '${moduleId}_update',
    name: 'update_${moduleId}_item',
    description: 'Aktualisiert ein bestehendes Item',
    category: 'update',
    parameters: [
      { name: 'id', type: 'string', description: 'Die ID des Items', required: true },
      { name: 'updates', type: 'object', description: 'Die zu aktualisierenden Felder', required: true },
    ],
    returns: 'Erfolgs-Status',
    implementation: \`
      const { updateItem } = use${moduleName}Store.getState();
      updateItem(id, updates);
      return { success: true };
    \`,
  },
  {
    id: '${moduleId}_delete',
    name: 'delete_${moduleId}_item',
    description: 'Löscht ein Item aus dem ${contract.name || 'Modul'}',
    category: 'delete',
    parameters: [
      { name: 'id', type: 'string', description: 'Die ID des zu löschenden Items', required: true },
    ],
    returns: 'Erfolgs-Status',
    implementation: \`
      const { deleteItem } = use${moduleName}Store.getState();
      deleteItem(id);
      return { success: true };
    \`,
  },
];

// --------------------------------------------
// System Prompt für AI-Agents
// Beschreibt wie das Modul verwendet werden soll
// --------------------------------------------

export const moduleSystemPrompt: ModuleSystemPrompt = {
  description: \`
    Das ${contract.name || 'Modul'} ist ein LifeOS Modul für ${contract.description || 'Produktivität'}.
    Es speichert Daten lokal und synchronisiert sich mit dem LifeOS Event-Bus.
  \`,
  capabilities: [
    'Items erstellen, lesen, aktualisieren und löschen',
    'Daten werden automatisch lokal gespeichert',
    'Events werden an andere Module gesendet',
  ],
  limitations: [
    'Keine Cloud-Synchronisation',
    'Maximale Speichergröße durch localStorage begrenzt',
  ],
  useCases: [
    'Persönliche Daten verwalten',
    'Mit anderen LifeOS Modulen interagieren',
  ],
  exampleInteractions: [
    'Nutzer: "Zeige mir alle Items" → Agent ruft get_all_${moduleId}_items auf',
    'Nutzer: "Erstelle ein neues Item" → Agent ruft create_${moduleId}_item auf',
  ],
};
`;
}

export function generateIndexFile(contract: Partial<ModuleContract>): string {
  const moduleName = contract.name?.replace(/\s+/g, '') || 'Module';
  
  return `// ============================================
// ${contract.name || 'Modul'} - Index
// 
// Zweck: Re-exports aller öffentlichen APIs
// ============================================

// Types
export * from './types';

// Store
export * from './store';

// Tools
export { moduleTools, moduleSystemPrompt } from './tools';

// Constants
export * from './constants';

// Components
export * from './components';

// Widgets
export * from './widgets';
`;
}

export function generateConstantsFile(contract: Partial<ModuleContract>): string {
  return `// ============================================
// ${contract.name || 'Modul'} - Konstanten
// 
// Zweck: Modul-weite Konstanten und Konfiguration
// ============================================

// Modul-Metadaten
export const MODULE_INFO = {
  id: '${contract.id || 'new-module'}',
  name: '${contract.name || 'Neues Modul'}',
  version: '${contract.version || '1.0.0'}',
} as const;

// Event-Namen für dieses Modul
export const EVENTS = {
  ITEM_CREATED: '${contract.id || 'module'}.item.created',
  ITEM_UPDATED: '${contract.id || 'module'}.item.updated',
  ITEM_DELETED: '${contract.id || 'module'}.item.deleted',
} as const;

// Farben und Styling
export const COLORS = {
  primary: 'var(--color-primary)',
  secondary: 'var(--color-secondary)',
  accent: 'var(--color-accent)',
} as const;
`;
}

// --------------------------------------------
// Contract Validierung
// --------------------------------------------

export function validateModuleContract(contract: Partial<ModuleContract>): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Pflichtfelder prüfen
  if (!contract.id) errors.push('Modul-ID fehlt');
  if (!contract.name) errors.push('Modul-Name fehlt');
  if (!contract.description) warnings.push('Modul-Beschreibung fehlt');
  
  // ID-Format prüfen
  if (contract.id && !/^[a-z][a-z0-9-]*$/.test(contract.id)) {
    errors.push('Modul-ID muss mit Kleinbuchstaben beginnen und darf nur a-z, 0-9, - enthalten');
  }
  
  // Events prüfen
  if (contract.events) {
    for (const event of contract.events) {
      if (!event.name.includes('.')) {
        warnings.push(`Event "${event.name}" sollte dem Format "module.action.status" folgen`);
      }
    }
  }
  
  // Tools prüfen
  if (contract.tools) {
    for (const tool of contract.tools) {
      if (!tool.implementation) {
        errors.push(`Tool "${tool.name}" hat keine Implementation`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}



