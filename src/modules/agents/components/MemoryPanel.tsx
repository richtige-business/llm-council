// ============================================
// MemoryPanel.tsx - Agent Memory Verwaltung
// 
// Zweck: Zeigt gespeicherte Agent-Memories an
//        Ermöglicht Bearbeiten und Löschen
//        Verbindung zur Datenbank über API
// Verwendet von: AgentsPage.tsx (als Drawer/Panel)
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  X,
  Trash2,
  RefreshCw,
  Tag,
  Star,
  BookOpen,
  User,
  Lightbulb,
  TrendingUp,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';

// --------------------------------------------
// Memory-Typen (spiegelt Prisma-Schema wider)
// --------------------------------------------

interface Memory {
  id: string;
  category: string;
  key: string;
  value: string | Record<string, unknown>;
  source: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
}

// Kategorie-Metadaten für visuelle Darstellung
const CATEGORY_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  preference: { label: 'Präferenzen', icon: Star, color: '#f59e0b' },
  fact: { label: 'Fakten', icon: BookOpen, color: '#3b82f6' },
  instruction: { label: 'Anweisungen', icon: Lightbulb, color: '#8b5cf6' },
  entity: { label: 'Entitäten', icon: User, color: '#10b981' },
  pattern: { label: 'Muster', icon: TrendingUp, color: '#ec4899' },
};

// --------------------------------------------
// Props
// --------------------------------------------

interface MemoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// --------------------------------------------
// Komponente: MemoryPanel
// Seitliches Panel zur Memory-Verwaltung
// --------------------------------------------

export function MemoryPanel({ isOpen, onClose }: MemoryPanelProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['preference', 'fact', 'instruction', 'entity', 'pattern']));
  
  const { surface, accentColor, textColor, designStyle } = useThemeStyles();

  // ----------------------------------------
  // Memories von API laden
  // ----------------------------------------
  const loadMemories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = selectedCategory ? `?category=${selectedCategory}` : '';
      const response = await fetch(`/api/memory${params}`);
      
      if (!response.ok) {
        throw new Error(`Fehler beim Laden: ${response.status}`);
      }
      
      const data = await response.json();
      setMemories(data.memories || []);
    } catch (err) {
      console.error('Memory-Laden fehlgeschlagen:', err);
      setError('Memories konnten nicht geladen werden. Ist die Datenbank verbunden?');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory]);

  // Beim Öffnen laden
  useEffect(() => {
    if (isOpen) {
      loadMemories();
    }
  }, [isOpen, loadMemories]);

  // ----------------------------------------
  // Memory löschen
  // ----------------------------------------
  const handleDelete = async (memoryId: string) => {
    try {
      const response = await fetch(`/api/memory/${memoryId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setMemories(prev => prev.filter(m => m.id !== memoryId));
      }
    } catch (err) {
      console.error('Memory-Löschen fehlgeschlagen:', err);
    }
  };

  // Kategorie-Toggle
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Memories nach Kategorie gruppieren
  const groupedMemories = memories.reduce<Record<string, Memory[]>>((acc, memory) => {
    const cat = memory.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(memory);
    return acc;
  }, {});

  // Wert-Formatierung
  const formatValue = (value: string | Record<string, unknown>): string => {
    if (typeof value === 'string') return value;
    return JSON.stringify(value, null, 2);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel (von rechts) */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-96 max-w-[90vw] overflow-hidden"
            style={{
              ...surface.base,
              borderRadius: 0,
              borderLeft: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {/* ----------------------------------------
                Header
                ---------------------------------------- */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5" style={{ color: accentColor }} />
                <h2 className="text-sm font-semibold" style={{ color: textColor }}>
                  Agent Memory
                </h2>
                <span className="text-xs text-white/30">
                  {memories.length} Einträge
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={loadMemories}
                  disabled={isLoading}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
                  title="Aktualisieren"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={onClose}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* ----------------------------------------
                Kategorie-Filter
                ---------------------------------------- */}
            <div className="flex gap-1 p-3 border-b border-white/10 overflow-x-auto">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-colors ${
                  !selectedCategory
                    ? 'bg-white/15 text-white'
                    : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                }`}
              >
                Alle
              </button>
              {Object.entries(CATEGORY_META).map(([key, meta]) => {
                const CategoryIcon = meta.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key === selectedCategory ? null : key)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === key
                        ? 'bg-white/15 text-white'
                        : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                    }`}
                  >
                    <CategoryIcon className="h-2.5 w-2.5" style={{ color: meta.color }} />
                    {meta.label}
                  </button>
                );
              })}
            </div>

            {/* ----------------------------------------
                Memory-Liste
                ---------------------------------------- */}
            <div className="flex-1 overflow-y-auto p-3" style={{ maxHeight: 'calc(100vh - 140px)' }}>
              {isLoading && memories.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-white/30" />
                </div>
              ) : error ? (
                <div className="py-8 text-center">
                  <Brain className="mx-auto h-8 w-8 mb-2 text-white/15" />
                  <p className="text-xs text-white/40">{error}</p>
                  <button
                    onClick={loadMemories}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-white/10 text-xs text-white/60 hover:bg-white/20 transition-colors"
                  >
                    Erneut versuchen
                  </button>
                </div>
              ) : memories.length === 0 ? (
                <div className="py-8 text-center">
                  <Brain className="mx-auto h-8 w-8 mb-2 text-white/15" />
                  <p className="text-xs text-white/40">Keine Memories gespeichert</p>
                  <p className="text-[10px] text-white/25 mt-1">
                    Der Agent lernt aus Gesprächen und speichert Fakten, Präferenzen und Muster.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(groupedMemories).map(([category, categoryMemories]) => {
                    const meta = CATEGORY_META[category] || { label: category, icon: Tag, color: '#6b7280' };
                    const CategoryIcon = meta.icon;
                    const isExpanded = expandedCategories.has(category);

                    return (
                      <div key={category} className="rounded-lg bg-white/5 overflow-hidden">
                        {/* Kategorie-Header */}
                        <button
                          onClick={() => toggleCategory(category)}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors"
                        >
                          <CategoryIcon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                          <span className="text-xs font-medium text-white/70 flex-1 text-left">
                            {meta.label}
                          </span>
                          <span className="text-[10px] text-white/30">{categoryMemories.length}</span>
                          <ChevronDown className={`h-3 w-3 text-white/30 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                        </button>

                        {/* Memory-Einträge */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-3 pb-2 space-y-1">
                                {categoryMemories.map(memory => (
                                  <div
                                    key={memory.id}
                                    className="group flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[11px] font-medium text-white/60">{memory.key}</p>
                                      <p className="text-[10px] text-white/40 mt-0.5 break-words">
                                        {formatValue(memory.value)}
                                      </p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[9px] text-white/20">
                                          {memory.source} · {(memory.confidence * 100).toFixed(0)}%
                                        </span>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleDelete(memory.id)}
                                      className="flex h-5 w-5 items-center justify-center rounded text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                                      title="Memory löschen"
                                    >
                                      <Trash2 className="h-2.5 w-2.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
