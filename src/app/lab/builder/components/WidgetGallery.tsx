'use client';

// ============================================
// WidgetGallery.tsx - Widget-Vorschau Gallery
// 
// Zweck: Zeigt alle generierten Widgets
//        Ermöglicht Vorschau in verschiedenen Größen
// Verwendet von: Builder Page
// ============================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutGrid, 
  Maximize2, 
  Minimize2,
  Settings,
  Trash2,
  Plus,
} from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { useBuilderWidgets, useBuilderStore } from '@/lib/lab';
import type { BuilderWidget } from '@/lib/lab';
import type { WidgetSize } from '@/types';

// --------------------------------------------
// Widget Size Konfiguration
// --------------------------------------------

const WIDGET_SIZES: Record<WidgetSize, { cols: number; label: string }> = {
  small: { cols: 1, label: 'Klein' },
  medium: { cols: 2, label: 'Mittel' },
  large: { cols: 3, label: 'Groß' },
  full: { cols: 4, label: 'Voll' },
};

// --------------------------------------------
// Komponente: WidgetCard
// --------------------------------------------

interface WidgetCardProps {
  widget: BuilderWidget;
  onRemove: () => void;
  onEdit: () => void;
}

function WidgetCard({ widget, onRemove, onEdit }: WidgetCardProps) {
  const { surface, textColor, accentColor, designStyle } = useThemeStyles();
  const sizeConfig = WIDGET_SIZES[widget.size];
  
  return (
    <motion.div
      className="relative group"
      style={{
        gridColumn: `span ${Math.min(sizeConfig.cols, 2)}`,
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      layout
    >
      <div 
        className="h-full min-h-[120px] p-4 transition-all"
        style={{
          ...surface.base,
          borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
        }}
      >
        {/* Widget Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium" style={{ color: textColor }}>
            {widget.name}
          </span>
          <span 
            className="text-xs px-1.5 py-0.5"
            style={{
              background: `${accentColor}20`,
              color: accentColor,
              borderRadius: '9999px',
            }}
          >
            {sizeConfig.label}
          </span>
        </div>
        
        {/* Widget Preview (Placeholder) */}
        <div 
          className="flex items-center justify-center p-4"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
            border: '1px dashed rgba(255, 255, 255, 0.2)',
            minHeight: '60px',
          }}
        >
          <div className="text-center">
            <LayoutGrid className="h-6 w-6 mx-auto mb-1" style={{ color: textColor, opacity: 0.2 }} />
            <p className="text-xs" style={{ color: textColor, opacity: 0.3 }}>
              Widget Vorschau
            </p>
          </div>
        </div>
        
        {/* Status */}
        <div className="flex items-center justify-between mt-3">
          <span 
            className="text-xs flex items-center gap-1"
            style={{ color: widget.previewReady ? '#10b981' : textColor, opacity: widget.previewReady ? 1 : 0.4 }}
          >
            <span 
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: widget.previewReady ? '#10b981' : 'currentColor' }}
            />
            {widget.previewReady ? 'Bereit' : 'Generiert'}
          </span>
        </div>
      </div>
      
      {/* Hover Actions */}
      <div 
        className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background: 'rgba(0, 0, 0, 0.6)',
          borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
        }}
      >
        <button
          onClick={onEdit}
          className="p-2 rounded-lg transition-colors hover:bg-white/20"
          title="Bearbeiten"
        >
          <Settings className="h-5 w-5 text-white" />
        </button>
        <button
          onClick={onRemove}
          className="p-2 rounded-lg transition-colors hover:bg-red-500/50"
          title="Entfernen"
        >
          <Trash2 className="h-5 w-5 text-white" />
        </button>
      </div>
    </motion.div>
  );
}

// --------------------------------------------
// Komponente: WidgetGallery
// --------------------------------------------

export function WidgetGallery() {
  const { surface, container, textColor, accentColor, designStyle } = useThemeStyles();
  const widgets = useBuilderWidgets();
  const removeWidget = useBuilderStore((s) => s.removeWidget);
  
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  
  // Keine Widgets
  if (widgets.length === 0) {
    return (
      <div 
        className="p-4"
        style={{
          ...surface.base,
          borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
        }}
      >
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <LayoutGrid className="h-8 w-8 mb-2" style={{ color: textColor, opacity: 0.2 }} />
          <p className="text-sm mb-1" style={{ color: textColor, opacity: 0.5 }}>
            Keine Widgets erstellt
          </p>
          <p className="text-xs" style={{ color: textColor, opacity: 0.3 }}>
            Beschreibe im Chat, welches Widget du möchtest
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className="overflow-hidden"
      style={{
        ...container.base,
        borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4" style={{ color: accentColor }} />
          <span className="text-sm font-medium" style={{ color: textColor }}>
            Widgets
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
            {widgets.length}
          </span>
        </div>
      </div>
      
      {/* Widgets Grid */}
      <div className="p-3">
        <div className="grid grid-cols-2 gap-3">
          {widgets.map((widget) => (
            <WidgetCard
              key={widget.name}
              widget={widget}
              onRemove={() => removeWidget(widget.name)}
              onEdit={() => setSelectedWidget(widget.name)}
            />
          ))}
        </div>
      </div>
      
      {/* Size Legend */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-4 text-xs" style={{ color: textColor, opacity: 0.4 }}>
          {Object.entries(WIDGET_SIZES).map(([key, config]) => (
            <span key={key} className="flex items-center gap-1">
              <span 
                className="inline-block rounded"
                style={{
                  width: `${config.cols * 6}px`,
                  height: '8px',
                  background: accentColor,
                  opacity: 0.5,
                }}
              />
              {config.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}



