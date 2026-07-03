'use client';

// ============================================
// ToolsEditor.tsx - Agent-Tools Editor
// 
// Zweck: Zeigt und bearbeitet die Agent-Tools eines Moduls
//        Ermöglicht das Hinzufügen, Bearbeiten und Löschen von Tools
// Verwendet von: Builder Page
// ============================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wrench, 
  Plus, 
  Trash2, 
  Edit2, 
  ChevronDown,
  ChevronRight,
  Code,
  Play,
  Copy,
  Check,
} from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { useBuilderTools, useBuilderStore } from '@/lib/lab';
import type { ModuleTool } from '@/lib/lab';

// --------------------------------------------
// Tool-Kategorie Farben
// --------------------------------------------

const CATEGORY_COLORS: Record<string, string> = {
  read: '#10b981',    // Grün
  write: '#3b82f6',   // Blau
  update: '#f59e0b',  // Orange
  delete: '#ef4444',  // Rot
  action: '#8b5cf6',  // Lila
  query: '#06b6d4',   // Cyan
};

const CATEGORY_LABELS: Record<string, string> = {
  read: 'Lesen',
  write: 'Erstellen',
  update: 'Aktualisieren',
  delete: 'Löschen',
  action: 'Aktion',
  query: 'Abfrage',
};

// --------------------------------------------
// Komponente: ToolCard
// --------------------------------------------

interface ToolCardProps {
  tool: ModuleTool;
  onEdit: () => void;
  onDelete: () => void;
}

function ToolCard({ tool, onEdit, onDelete }: ToolCardProps) {
  const { surface, textColor, designStyle } = useThemeStyles();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const categoryColor = CATEGORY_COLORS[tool.category] || '#6b7280';
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(tool.implementation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="overflow-hidden"
      style={{
        ...surface.base,
        borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
        border: `1px solid ${categoryColor}30`,
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Kategorie-Badge */}
          <span 
            className="px-2 py-0.5 text-xs font-medium shrink-0"
            style={{
              background: `${categoryColor}20`,
              color: categoryColor,
              borderRadius: '9999px',
            }}
          >
            {CATEGORY_LABELS[tool.category]}
          </span>
          
          {/* Tool-Name */}
          <span className="font-medium truncate" style={{ color: textColor }}>
            {tool.name}
          </span>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {/* Parameter-Count */}
          <span className="text-xs" style={{ color: textColor, opacity: 0.5 }}>
            {tool.parameters.length} Parameter
          </span>
          
          {/* Expand Icon */}
          {expanded ? (
            <ChevronDown className="h-4 w-4" style={{ color: textColor, opacity: 0.5 }} />
          ) : (
            <ChevronRight className="h-4 w-4" style={{ color: textColor, opacity: 0.5 }} />
          )}
        </div>
      </div>
      
      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/10"
          >
            <div className="p-3 space-y-3">
              {/* Beschreibung */}
              <div>
                <p className="text-xs mb-1" style={{ color: textColor, opacity: 0.5 }}>
                  Beschreibung
                </p>
                <p className="text-sm" style={{ color: textColor }}>
                  {tool.description}
                </p>
              </div>
              
              {/* Parameter */}
              {tool.parameters.length > 0 && (
                <div>
                  <p className="text-xs mb-2" style={{ color: textColor, opacity: 0.5 }}>
                    Parameter
                  </p>
                  <div className="space-y-1">
                    {tool.parameters.map((param) => (
                      <div 
                        key={param.name}
                        className="flex items-center gap-2 text-xs"
                      >
                        <code 
                          className="px-1.5 py-0.5"
                          style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '0.25rem',
                            color: categoryColor,
                          }}
                        >
                          {param.name}
                        </code>
                        <span style={{ color: textColor, opacity: 0.5 }}>
                          {param.type}
                        </span>
                        {param.required && (
                          <span className="text-red-400">*</span>
                        )}
                        <span style={{ color: textColor, opacity: 0.4 }}>
                          - {param.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Return Type */}
              <div>
                <p className="text-xs mb-1" style={{ color: textColor, opacity: 0.5 }}>
                  Rückgabe
                </p>
                <p className="text-sm" style={{ color: textColor }}>
                  <code 
                    className="px-1.5 py-0.5 mr-2"
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '0.25rem',
                    }}
                  >
                    {tool.returns.type}
                  </code>
                  {tool.returns.description}
                </p>
              </div>
              
              {/* Implementation Preview */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs" style={{ color: textColor, opacity: 0.5 }}>
                    Implementierung
                  </p>
                  <button
                    onClick={handleCopy}
                    className="text-xs flex items-center gap-1 px-2 py-0.5 rounded transition-colors hover:bg-white/10"
                    style={{ color: textColor, opacity: 0.5 }}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-green-400" />
                        Kopiert
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Kopieren
                      </>
                    )}
                  </button>
                </div>
                <pre 
                  className="text-xs p-2 overflow-x-auto"
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '0.375rem',
                    color: textColor,
                    opacity: 0.8,
                  }}
                >
                  {tool.implementation.slice(0, 200)}
                  {tool.implementation.length > 200 && '...'}
                </pre>
              </div>
              
              {/* Examples */}
              {tool.examples.length > 0 && (
                <div>
                  <p className="text-xs mb-1" style={{ color: textColor, opacity: 0.5 }}>
                    Beispiele ({tool.examples.length})
                  </p>
                  <div className="text-xs" style={{ color: textColor, opacity: 0.6 }}>
                    {tool.examples[0].description}
                  </div>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-white/10">
                <button
                  onClick={onDelete}
                  className="flex-1 py-1.5 text-xs flex items-center justify-center gap-1 rounded transition-colors hover:bg-red-500/20"
                  style={{ color: '#ef4444' }}
                >
                  <Trash2 className="h-3 w-3" />
                  Löschen
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --------------------------------------------
// Komponente: ToolsEditor
// --------------------------------------------

export function ToolsEditor() {
  const { surface, container, textColor, accentColor, designStyle } = useThemeStyles();
  const tools = useBuilderTools();
  const removeTool = useBuilderStore((s) => s.removeTool);
  
  // Gruppe Tools nach Kategorie
  const toolsByCategory = tools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, ModuleTool[]>);
  
  if (tools.length === 0) {
    return (
      <div 
        className="p-4 h-full"
        style={{
          ...container.base,
          borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
        }}
      >
        <div className="flex flex-col items-center justify-center h-full text-center">
          <Wrench className="h-12 w-12 mb-3" style={{ color: textColor, opacity: 0.2 }} />
          <h3 className="font-medium mb-1" style={{ color: textColor }}>
            Keine Agent-Tools
          </h3>
          <p className="text-sm max-w-xs" style={{ color: textColor, opacity: 0.5 }}>
            Beschreibe dein Modul im Chat und der Agent erstellt automatisch passende Tools für die Orchestrierung.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className="h-full overflow-hidden flex flex-col"
      style={{
        ...container.base,
        borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4" style={{ color: accentColor }} />
          <span className="font-medium text-sm" style={{ color: textColor }}>
            Agent-Tools
          </span>
          <span 
            className="text-xs px-1.5 py-0.5"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: textColor,
              opacity: 0.6,
              borderRadius: '9999px',
            }}
          >
            {tools.length}
          </span>
        </div>
      </div>
      
      {/* Tools List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {Object.entries(toolsByCategory).map(([category, categoryTools]) => (
          <div key={category}>
            <h4 
              className="text-xs font-medium mb-2 px-1"
              style={{ color: CATEGORY_COLORS[category], opacity: 0.8 }}
            >
              {CATEGORY_LABELS[category]} ({categoryTools.length})
            </h4>
            <div className="space-y-2">
              {categoryTools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  onEdit={() => {}}
                  onDelete={() => removeTool(tool.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* Footer Info */}
      <div className="p-3 border-t border-white/10 shrink-0">
        <p className="text-xs" style={{ color: textColor, opacity: 0.4 }}>
          Diese Tools können von anderen Agents aufgerufen werden, um dein Modul zu steuern.
        </p>
      </div>
    </div>
  );
}



