// ============================================
// module-templates.ts - Modul-Templates für Builder
// 
// Zweck: Vordefinierte Templates für verschiedene Modul-Typen
//        Werden vom Agent als Basis verwendet
// Verwendet von: Module Builder API
// ============================================

import type { ModuleCategory } from '@/types';

// --------------------------------------------
// Template Interface
// --------------------------------------------

export interface ModuleTemplate {
  id: string;
  name: string;
  description: string;
  category: ModuleCategory;
  icon: string;
  tags: string[];
  // Template-Strings mit Platzhaltern
  templates: {
    types: string;
    store: string;
    page: string;
    widget: string;
    index: string;
  };
}

// --------------------------------------------
// Basis-Platzhalter
// Diese werden vom Agent ersetzt:
// {{MODULE_ID}} - Modul-ID (kebab-case)
// {{MODULE_NAME}} - Anzeigename
// {{STORE_NAME}} - Store-Name (CamelCase)
// {{ITEM_TYPE}} - Hauptdaten-Typ (z.B. "Todo", "Note")
// {{ITEM_TYPE_LOWER}} - Kleingeschrieben (z.B. "todo", "note")
// --------------------------------------------

// --------------------------------------------
// Types Template
// --------------------------------------------

export const TYPES_TEMPLATE = `// ============================================
// types.ts - {{MODULE_NAME}} Type Definitions
// 
// Zweck: TypeScript Interfaces für {{MODULE_NAME}}
// Verwendet von: store.ts, components
// ============================================

export interface {{ITEM_TYPE}} {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface {{ITEM_TYPE}}Filter {
  search?: string;
  sortBy?: 'title' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}
`;

// --------------------------------------------
// Store Template
// --------------------------------------------

export const STORE_TEMPLATE = `// ============================================
// store.ts - {{MODULE_NAME}} State Management
// 
// Zweck: Zustand für {{MODULE_NAME}}-Verwaltung
// Verwendet von: {{MODULE_NAME}}Page, Widgets
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { {{ITEM_TYPE}} } from './types';

// --------------------------------------------
// State Interface
// --------------------------------------------

interface {{STORE_NAME}}State {
  items: {{ITEM_TYPE}}[];
  selectedId: string | null;
  isModalOpen: boolean;
}

// --------------------------------------------
// Actions Interface
// --------------------------------------------

interface {{STORE_NAME}}Actions {
  addItem: (item: Omit<{{ITEM_TYPE}}, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateItem: (id: string, updates: Partial<{{ITEM_TYPE}}>) => void;
  deleteItem: (id: string) => void;
  selectItem: (id: string | null) => void;
  openModal: () => void;
  closeModal: () => void;
}

type {{STORE_NAME}}Store = {{STORE_NAME}}State & {{STORE_NAME}}Actions;

// --------------------------------------------
// Store erstellen
// --------------------------------------------

export const use{{STORE_NAME}}Store = create<{{STORE_NAME}}Store>()(
  persist(
    (set) => ({
      // Initial State
      items: [],
      selectedId: null,
      isModalOpen: false,
      
      // Actions
      addItem: (item) => set((state) => ({
        items: [...state.items, {
          ...item,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
      })),
      
      updateItem: (id, updates) => set((state) => ({
        items: state.items.map((item) =>
          item.id === id 
            ? { ...item, ...updates, updatedAt: new Date() }
            : item
        ),
      })),
      
      deleteItem: (id) => set((state) => ({
        items: state.items.filter((item) => item.id !== id),
        selectedId: state.selectedId === id ? null : state.selectedId,
      })),
      
      selectItem: (id) => set({ selectedId: id }),
      
      openModal: () => set({ isModalOpen: true }),
      closeModal: () => set({ isModalOpen: false }),
    }),
    {
      name: 'lifeos-{{MODULE_ID}}',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({ items: state.items }),
    }
  )
);

// --------------------------------------------
// Hydration Helper
// --------------------------------------------

export const hydrate{{STORE_NAME}}Store = () => {
  if (typeof window !== 'undefined') {
    use{{STORE_NAME}}Store.persist.rehydrate();
  }
};

// --------------------------------------------
// Selectors
// --------------------------------------------

export const use{{ITEM_TYPE}}s = () => 
  use{{STORE_NAME}}Store((state) => state.items);

export const useSelected{{ITEM_TYPE}} = () => 
  use{{STORE_NAME}}Store((state) => 
    state.items.find(item => item.id === state.selectedId)
  );
`;

// --------------------------------------------
// Page Component Template
// --------------------------------------------

export const PAGE_TEMPLATE = `'use client';

// ============================================
// {{MODULE_NAME}}Page.tsx - Hauptkomponente
// 
// Zweck: Hauptseite für {{MODULE_NAME}}
// Verwendet von: LifeOS Module System
// ============================================

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, X } from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { use{{STORE_NAME}}Store, hydrate{{STORE_NAME}}Store } from '../store';

// --------------------------------------------
// Komponente: {{MODULE_NAME}}Page
// --------------------------------------------

export function {{MODULE_NAME}}Page() {
  const { surface, container, accentColor, textColor, designStyle } = useThemeStyles();
  const [newItemTitle, setNewItemTitle] = useState('');
  
  // Store Hydration
  useEffect(() => {
    hydrate{{STORE_NAME}}Store();
  }, []);
  
  // Store Selektoren
  const items = use{{STORE_NAME}}Store((state) => state.items);
  const isModalOpen = use{{STORE_NAME}}Store((state) => state.isModalOpen);
  const addItem = use{{STORE_NAME}}Store((state) => state.addItem);
  const deleteItem = use{{STORE_NAME}}Store((state) => state.deleteItem);
  const openModal = use{{STORE_NAME}}Store((state) => state.openModal);
  const closeModal = use{{STORE_NAME}}Store((state) => state.closeModal);
  
  // Handler
  const handleAddItem = () => {
    if (newItemTitle.trim()) {
      addItem({ title: newItemTitle.trim() });
      setNewItemTitle('');
      closeModal();
    }
  };
  
  return (
    <div className="flex h-full items-start justify-center overflow-y-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl"
      >
        {/* Header */}
        <div 
          className="mb-6 p-6"
          style={{
            ...container.base,
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '1.5rem',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2" style={{ color: textColor }}>
                {{MODULE_NAME}}
              </h1>
              <p style={{ color: textColor, opacity: 0.6 }}>
                Verwalte deine {{ITEM_TYPE_LOWER}}s
              </p>
            </div>
            <button
              onClick={openModal}
              className="px-4 py-2 rounded-lg flex items-center gap-2"
              style={{
                background: accentColor,
                color: '#fff',
                boxShadow: designStyle === 'brutal' ? '3px 3px 0 #000' : \`0 2px 10px \${accentColor}40\`,
              }}
            >
              <Plus className="h-4 w-4" />
              Neu
            </button>
          </div>
        </div>
        
        {/* Liste */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-lg mb-2" style={{ color: textColor, opacity: 0.5 }}>
              Noch keine {{ITEM_TYPE_LOWER}}s
            </p>
            <button
              onClick={openModal}
              className="px-6 py-3 rounded-lg"
              style={{ background: accentColor, color: '#fff' }}
            >
              Erste(n) {{ITEM_TYPE_LOWER}} erstellen
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4"
                style={{
                  ...surface.base,
                  borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
                }}
              >
                <span style={{ color: textColor }}>{item.title}</span>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="p-2 rounded-lg transition-colors hover:bg-white/10"
                  style={{ color: textColor, opacity: 0.5 }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
        
        {/* Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
              onClick={closeModal}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="p-6 w-full max-w-md mx-4"
                style={{
                  ...surface.base,
                  borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-xl font-bold mb-4" style={{ color: textColor }}>
                  Neu erstellen
                </h2>
                <input
                  type="text"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder="Titel..."
                  className="w-full px-4 py-3 rounded-lg outline-none mb-4"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: textColor,
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    onClick={closeModal}
                    className="flex-1 py-2 rounded-lg"
                    style={{ background: 'rgba(255, 255, 255, 0.1)', color: textColor }}
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleAddItem}
                    className="flex-1 py-2 rounded-lg"
                    style={{ background: accentColor, color: '#fff' }}
                    disabled={!newItemTitle.trim()}
                  >
                    Erstellen
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
`;

// --------------------------------------------
// Widget Template
// --------------------------------------------

export const WIDGET_TEMPLATE = `'use client';

// ============================================
// {{MODULE_NAME}}Widget.tsx - Dashboard Widget
// 
// Zweck: Kompakte Übersicht für das Dashboard
// Verwendet von: Dashboard, Widget System
// ============================================

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useThemeStyles } from '@/lib/theme';
import { use{{STORE_NAME}}Store, hydrate{{STORE_NAME}}Store } from '../store';

// --------------------------------------------
// Props Interface
// --------------------------------------------

interface {{MODULE_NAME}}WidgetProps {
  limit?: number;
  showHeader?: boolean;
}

// --------------------------------------------
// Komponente: {{MODULE_NAME}}Widget
// --------------------------------------------

export function {{MODULE_NAME}}Widget({ 
  limit = 5, 
  showHeader = true 
}: {{MODULE_NAME}}WidgetProps) {
  const { surface, accentColor, textColor, designStyle } = useThemeStyles();
  
  // Store Hydration
  useEffect(() => {
    hydrate{{STORE_NAME}}Store();
  }, []);
  
  const items = use{{STORE_NAME}}Store((state) => state.items);
  const displayItems = items.slice(0, limit);
  
  return (
    <div className="p-4 h-full" style={surface.base}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium text-sm" style={{ color: textColor }}>
            {{MODULE_NAME}}
          </span>
          <Link 
            href="/{{MODULE_ID}}"
            className="text-xs flex items-center gap-1 transition-colors hover:opacity-100"
            style={{ color: textColor, opacity: 0.5 }}
          >
            Alle
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Items */}
      {displayItems.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm" style={{ color: textColor, opacity: 0.4 }}>
            Keine {{ITEM_TYPE_LOWER}}s
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-2 rounded-lg"
              style={{ background: 'rgba(255, 255, 255, 0.05)' }}
            >
              <p className="text-sm truncate" style={{ color: textColor }}>
                {item.title}
              </p>
            </motion.div>
          ))}
        </div>
      )}
      
      {/* Counter */}
      <div className="mt-3 pt-3 border-t border-white/10">
        <p className="text-xs" style={{ color: textColor, opacity: 0.4 }}>
          {items.length} {{ITEM_TYPE_LOWER}}s insgesamt
        </p>
      </div>
    </div>
  );
}
`;

// --------------------------------------------
// Index Template
// --------------------------------------------

export const INDEX_TEMPLATE = `// ============================================
// index.ts - {{MODULE_NAME}} Module Entry
// 
// Zweck: Haupt-Exports des Moduls
// Verwendet von: LifeOS Dashboard
// ============================================

export type * from './types';
export { use{{STORE_NAME}}Store, hydrate{{STORE_NAME}}Store } from './store';
export { {{MODULE_NAME}}Page } from './components';
`;

// --------------------------------------------
// Components Index Template
// --------------------------------------------

export const COMPONENTS_INDEX_TEMPLATE = `// ============================================
// index.ts - Component Exports
// ============================================

export { {{MODULE_NAME}}Page } from './{{MODULE_NAME}}Page';
`;

// --------------------------------------------
// Widgets Index Template
// --------------------------------------------

export const WIDGETS_INDEX_TEMPLATE = `// ============================================
// index.ts - Widget Exports
// ============================================

export { {{MODULE_NAME}}Widget } from './{{MODULE_NAME}}Widget';
`;

// --------------------------------------------
// Template Helper: Platzhalter ersetzen
// --------------------------------------------

export function applyTemplate(
  template: string,
  replacements: {
    moduleId: string;
    moduleName: string;
    storeName: string;
    itemType: string;
    itemTypeLower: string;
  }
): string {
  return template
    .replace(/{{MODULE_ID}}/g, replacements.moduleId)
    .replace(/{{MODULE_NAME}}/g, replacements.moduleName)
    .replace(/{{STORE_NAME}}/g, replacements.storeName)
    .replace(/{{ITEM_TYPE}}/g, replacements.itemType)
    .replace(/{{ITEM_TYPE_LOWER}}/g, replacements.itemTypeLower);
}

// --------------------------------------------
// Vordefinierte Modul-Templates
// --------------------------------------------

export const PREDEFINED_TEMPLATES: ModuleTemplate[] = [
  {
    id: 'list-manager',
    name: 'Listen-Manager',
    description: 'Einfache Liste mit CRUD-Operationen',
    category: 'productivity',
    icon: 'List',
    tags: ['liste', 'todo', 'aufgaben'],
    templates: {
      types: TYPES_TEMPLATE,
      store: STORE_TEMPLATE,
      page: PAGE_TEMPLATE,
      widget: WIDGET_TEMPLATE,
      index: INDEX_TEMPLATE,
    },
  },
  {
    id: 'tracker',
    name: 'Tracker',
    description: 'Verfolge Gewohnheiten, Fortschritte oder Metriken',
    category: 'health',
    icon: 'TrendingUp',
    tags: ['tracker', 'gewohnheiten', 'habits', 'fortschritt'],
    templates: {
      types: TYPES_TEMPLATE,
      store: STORE_TEMPLATE,
      page: PAGE_TEMPLATE,
      widget: WIDGET_TEMPLATE,
      index: INDEX_TEMPLATE,
    },
  },
  {
    id: 'notes',
    name: 'Notizen',
    description: 'Notizen mit Tags und Kategorien',
    category: 'productivity',
    icon: 'StickyNote',
    tags: ['notizen', 'notes', 'memo'],
    templates: {
      types: TYPES_TEMPLATE,
      store: STORE_TEMPLATE,
      page: PAGE_TEMPLATE,
      widget: WIDGET_TEMPLATE,
      index: INDEX_TEMPLATE,
    },
  },
];

