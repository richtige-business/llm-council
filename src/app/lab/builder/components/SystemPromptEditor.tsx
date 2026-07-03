'use client';

// ============================================
// SystemPromptEditor.tsx - System Prompt Editor
// 
// Zweck: Zeigt und bearbeitet den System Prompt eines Moduls
//        Dieser Prompt erklärt anderen Agents was das Modul kann
// Verwendet von: Builder Page
// ============================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, 
  Check, 
  X,
  AlertCircle,
  Lightbulb,
  Target,
  XCircle,
  MessageSquare,
  Database,
  Gauge,
} from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { useBuilderSystemPrompt, useBuilderStore } from '@/lib/lab';

// --------------------------------------------
// Section Komponente
// --------------------------------------------

interface SectionProps {
  icon: React.ElementType;
  title: string;
  color: string;
  children: React.ReactNode;
}

function Section({ icon: Icon, title, color, children }: SectionProps) {
  const { textColor, designStyle } = useThemeStyles();
  
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4" style={{ color }} />
        <h4 className="text-sm font-medium" style={{ color: textColor }}>
          {title}
        </h4>
      </div>
      {children}
    </div>
  );
}

// --------------------------------------------
// List Item Komponente
// --------------------------------------------

interface ListItemProps {
  text: string;
  color: string;
  icon?: 'check' | 'x' | 'target' | 'alert';
}

function ListItem({ text, color, icon = 'check' }: ListItemProps) {
  const { textColor, designStyle } = useThemeStyles();
  
  const IconComponent = {
    check: Check,
    x: X,
    target: Target,
    alert: AlertCircle,
  }[icon];
  
  return (
    <div className="flex items-start gap-2 py-1">
      <IconComponent 
        className="h-3.5 w-3.5 mt-0.5 shrink-0" 
        style={{ color }} 
      />
      <span className="text-sm" style={{ color: textColor, opacity: 0.8 }}>
        {text}
      </span>
    </div>
  );
}

// --------------------------------------------
// Komponente: SystemPromptEditor
// --------------------------------------------

export function SystemPromptEditor() {
  const { surface, container, textColor, accentColor, designStyle } = useThemeStyles();
  const systemPrompt = useBuilderSystemPrompt();
  const updateSystemPrompt = useBuilderStore((s) => s.updateSystemPrompt);
  
  if (!systemPrompt) {
    return (
      <div 
        className="p-4 h-full"
        style={{
          ...container.base,
          borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
        }}
      >
        <div className="flex flex-col items-center justify-center h-full text-center">
          <Brain className="h-12 w-12 mb-3" style={{ color: textColor, opacity: 0.2 }} />
          <h3 className="font-medium mb-1" style={{ color: textColor }}>
            Kein System Prompt
          </h3>
          <p className="text-sm max-w-xs" style={{ color: textColor, opacity: 0.5 }}>
            Beschreibe dein Modul im Chat und der Agent erstellt automatisch einen System Prompt für die Agent-Orchestrierung.
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
          <Brain className="h-4 w-4" style={{ color: accentColor }} />
          <span className="font-medium text-sm" style={{ color: textColor }}>
            System Prompt
          </span>
        </div>
        
        {/* Priorität Badge */}
        <div className="flex items-center gap-1.5">
          <Gauge className="h-3.5 w-3.5" style={{ color: textColor, opacity: 0.5 }} />
          <span className="text-xs" style={{ color: textColor, opacity: 0.5 }}>
            Priorität: {systemPrompt.priority}/10
          </span>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Hauptbeschreibung */}
        <div 
          className="p-3 mb-4"
          style={{
            background: `${accentColor}10`,
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
            border: `1px solid ${accentColor}30`,
          }}
        >
          <p className="text-sm" style={{ color: textColor }}>
            {systemPrompt.description || 'Keine Beschreibung vorhanden'}
          </p>
        </div>
        
        {/* Capabilities */}
        {systemPrompt.capabilities.length > 0 && (
          <Section icon={Check} title="Fähigkeiten" color="#10b981">
            <div 
              className="p-2"
              style={{
                background: 'rgba(16, 185, 129, 0.05)',
                borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
              }}
            >
              {systemPrompt.capabilities.map((cap, i) => (
                <ListItem key={i} text={cap} color="#10b981" icon="check" />
              ))}
            </div>
          </Section>
        )}
        
        {/* Limitations */}
        {systemPrompt.limitations.length > 0 && (
          <Section icon={XCircle} title="Einschränkungen" color="#ef4444">
            <div 
              className="p-2"
              style={{
                background: 'rgba(239, 68, 68, 0.05)',
                borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
              }}
            >
              {systemPrompt.limitations.map((lim, i) => (
                <ListItem key={i} text={lim} color="#ef4444" icon="x" />
              ))}
            </div>
          </Section>
        )}
        
        {/* Use Cases */}
        {systemPrompt.useCases.length > 0 && (
          <Section icon={Target} title="Anwendungsfälle" color="#3b82f6">
            <div 
              className="p-2"
              style={{
                background: 'rgba(59, 130, 246, 0.05)',
                borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
              }}
            >
              {systemPrompt.useCases.map((uc, i) => (
                <ListItem key={i} text={uc} color="#3b82f6" icon="target" />
              ))}
            </div>
          </Section>
        )}
        
        {/* Anti-Patterns */}
        {systemPrompt.antiPatterns && systemPrompt.antiPatterns.length > 0 && (
          <Section icon={AlertCircle} title="Nicht verwenden bei" color="#f59e0b">
            <div 
              className="p-2"
              style={{
                background: 'rgba(245, 158, 11, 0.05)',
                borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
              }}
            >
              {systemPrompt.antiPatterns.map((ap, i) => (
                <ListItem key={i} text={ap} color="#f59e0b" icon="alert" />
              ))}
            </div>
          </Section>
        )}
        
        {/* Example Interactions */}
        {systemPrompt.exampleInteractions && systemPrompt.exampleInteractions.length > 0 && (
          <Section icon={MessageSquare} title="Beispiel-Interaktionen" color="#8b5cf6">
            <div className="space-y-2">
              {systemPrompt.exampleInteractions.map((ex, i) => (
                <div 
                  key={i}
                  className="p-2"
                  style={{
                    background: 'rgba(139, 92, 246, 0.05)',
                    borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
                  }}
                >
                  <p className="text-xs mb-1" style={{ color: '#8b5cf6' }}>
                    User: "{ex.userIntent}"
                  </p>
                  <p className="text-xs" style={{ color: textColor, opacity: 0.7 }}>
                    → {ex.agentAction}
                  </p>
                  {ex.toolsUsed && ex.toolsUsed.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {ex.toolsUsed.map((tool) => (
                        <span 
                          key={tool}
                          className="text-xs px-1.5 py-0.5"
                          style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '0.25rem',
                            color: textColor,
                            opacity: 0.6,
                          }}
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}
        
        {/* Data Context */}
        {systemPrompt.dataContext && (
          <Section icon={Database} title="Datenkontext" color="#06b6d4">
            <div 
              className="p-2"
              style={{
                background: 'rgba(6, 182, 212, 0.05)',
                borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
              }}
            >
              <p className="text-sm" style={{ color: textColor, opacity: 0.8 }}>
                {systemPrompt.dataContext}
              </p>
            </div>
          </Section>
        )}
      </div>
      
      {/* Footer Info */}
      <div className="p-3 border-t border-white/10 shrink-0">
        <p className="text-xs" style={{ color: textColor, opacity: 0.4 }}>
          Dieser Prompt erklärt anderen Agents, wie sie dein Modul verwenden sollten.
        </p>
      </div>
    </div>
  );
}



