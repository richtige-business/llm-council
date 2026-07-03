// ============================================
// LifeOS Module Builder - Module Settings Panel
// 
// Zweck: Einstellungen für generierte Module
//        - Widgets anpassen
//        - System Prompt bearbeiten
//        - Tools/APIs verwalten
//        - Integrationen konfigurieren
// ============================================

'use client';

import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings2,
  LayoutGrid,
  MessageSquare,
  Wrench,
  Key,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Code2,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --------------------------------------------
// Types
// --------------------------------------------

interface ThemeStyles {
  surface?: { base: React.CSSProperties };
  container?: { base: React.CSSProperties };
  button?: { base: React.CSSProperties };
  accentColor?: string;
  designStyle?: 'glass' | 'brutal' | 'neo';
  textColor?: string;
}

interface WidgetConfig {
  id: string;
  name: string;
  size: '1x1' | '2x1' | '2x2' | '3x2' | '4x2';
  enabled: boolean;
}

interface ToolConfig {
  id: string;
  name: string;
  description: string;
  parameters: { name: string; type: string; required: boolean }[];
  enabled: boolean;
}

interface ApiKeyConfig {
  id: string;
  name: string;
  service: string;
  value: string;
  isSet: boolean;
}

interface ModuleSettingsData {
  widgets: WidgetConfig[];
  systemPrompt: string;
  tools: ToolConfig[];
  apiKeys: ApiKeyConfig[];
}

interface ModuleSettingsProps {
  moduleInfo?: {
    id?: string;
    name?: string;
    description?: string;
  };
  files: Record<string, { type: string; content?: string }>;
  themeStyles?: ThemeStyles;
  onSettingsChange?: (settings: ModuleSettingsData) => void;
}

// --------------------------------------------
// Komponente
// --------------------------------------------

export const ModuleSettings = memo(function ModuleSettings({
  moduleInfo,
  files,
  themeStyles,
  onSettingsChange,
}: ModuleSettingsProps) {
  const { 
    surface, 
    container,
    button,
    accentColor = '#8b5cf6', 
    designStyle = 'glass', 
    textColor = '#ffffff' 
  } = themeStyles || {};
  
  // State für Accordion-Sektionen
  const [expandedSections, setExpandedSections] = useState<string[]>(['widgets', 'prompt']);
  
  // Extrahiere Daten aus den generierten Dateien
  const extractedData = extractModuleData(files);
  
  // Settings State
  const [settings, setSettings] = useState<ModuleSettingsData>({
    widgets: extractedData.widgets,
    systemPrompt: extractedData.systemPrompt,
    tools: extractedData.tools,
    apiKeys: [
      { id: '1', name: 'OpenAI API Key', service: 'openai', value: '', isSet: false },
      { id: '2', name: 'Anthropic API Key', service: 'anthropic', value: '', isSet: false },
    ],
  });
  
  // Editing States
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [tempPrompt, setTempPrompt] = useState(settings.systemPrompt);
  const [editingTool, setEditingTool] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Toggle Section
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  }, []);
  
  // Widget Toggle
  const toggleWidget = useCallback((widgetId: string) => {
    setSettings(prev => ({
      ...prev,
      widgets: prev.widgets.map(w => 
        w.id === widgetId ? { ...w, enabled: !w.enabled } : w
      ),
    }));
  }, []);
  
  // Widget Size Change
  const changeWidgetSize = useCallback((widgetId: string, size: WidgetConfig['size']) => {
    setSettings(prev => ({
      ...prev,
      widgets: prev.widgets.map(w => 
        w.id === widgetId ? { ...w, size } : w
      ),
    }));
  }, []);
  
  // Tool Toggle
  const toggleTool = useCallback((toolId: string) => {
    setSettings(prev => ({
      ...prev,
      tools: prev.tools.map(t => 
        t.id === toolId ? { ...t, enabled: !t.enabled } : t
      ),
    }));
  }, []);
  
  // Save Prompt
  const savePrompt = useCallback(() => {
    setSettings(prev => ({ ...prev, systemPrompt: tempPrompt }));
    setEditingPrompt(false);
  }, [tempPrompt]);
  
  // Copy to Clipboard
  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);
  
  // API Key setzen
  const setApiKey = useCallback((keyId: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      apiKeys: prev.apiKeys.map(k => 
        k.id === keyId ? { ...k, value, isSet: value.length > 0 } : k
      ),
    }));
  }, []);
  
  // Styles
  const sectionStyle: React.CSSProperties = {
    ...surface?.base,
    borderRadius: designStyle === 'brutal' ? '0.75rem' : '1rem',
    marginBottom: '12px',
    overflow: 'hidden',
  };
  
  const headerStyle: React.CSSProperties = {
    padding: '12px 16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: designStyle === 'brutal' ? 'rgba(0,0,0,0.1)' : 'transparent',
    borderBottom: expandedSections.length > 0 
      ? `1px solid ${designStyle === 'brutal' ? '#000' : 'rgba(255,255,255,0.05)'}` 
      : 'none',
  };
  
  // Render Section Header
  const renderSectionHeader = (
    id: string, 
    icon: React.ReactNode, 
    title: string, 
    badge?: string | number
  ) => (
    <div 
      style={headerStyle}
      onClick={() => toggleSection(id)}
    >
      <div className="flex items-center gap-3">
        <div 
          className="w-8 h-8 flex items-center justify-center rounded-lg"
          style={{ 
            background: `${accentColor}20`,
            color: accentColor,
          }}
        >
          {icon}
        </div>
        <span className="font-medium" style={{ color: textColor }}>{title}</span>
        {badge !== undefined && (
          <span 
            className="px-2 py-0.5 rounded-full text-xs"
            style={{ 
              background: `${accentColor}30`,
              color: accentColor,
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <motion.div
        animate={{ rotate: expandedSections.includes(id) ? 90 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <ChevronRight className="w-4 h-4" style={{ color: `${textColor}60` }} />
      </motion.div>
    </div>
  );
  
  return (
    <div className="h-full overflow-y-auto p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div 
          className="w-10 h-10 flex items-center justify-center rounded-xl"
          style={{ 
            background: `linear-gradient(135deg, ${accentColor} 0%, #764ba2 100%)`,
            boxShadow: designStyle === 'brutal' 
              ? '3px 3px 0 #000' 
              : `0 4px 15px ${accentColor}40`,
          }}
        >
          <Settings2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-semibold" style={{ color: textColor }}>
            Moduleinstellungen
          </h2>
          <p className="text-xs" style={{ color: `${textColor}60` }}>
            {moduleInfo?.name || 'Neues Modul'}
          </p>
        </div>
      </div>
      
      {/* Widgets Section */}
      <div style={sectionStyle}>
        {renderSectionHeader('widgets', <LayoutGrid className="w-4 h-4" />, 'Widgets', settings.widgets.length)}
        
        <AnimatePresence>
          {expandedSections.includes('widgets') && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-3">
                {settings.widgets.length === 0 ? (
                  <div 
                    className="text-center py-6 rounded-lg"
                    style={{ 
                      background: 'rgba(255,255,255,0.02)',
                      color: `${textColor}50`,
                    }}
                  >
                    <LayoutGrid className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Keine Widgets gefunden</p>
                    <p className="text-xs mt-1 opacity-70">
                      Füge Widget.tsx hinzu um Widgets zu erstellen
                    </p>
                  </div>
                ) : (
                  settings.widgets.map((widget) => (
                    <div 
                      key={widget.id}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ 
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${widget.enabled ? accentColor + '40' : 'rgba(255,255,255,0.05)'}`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleWidget(widget.id)}
                          className="w-5 h-5 rounded flex items-center justify-center transition-colors"
                          style={{ 
                            background: widget.enabled ? accentColor : 'rgba(255,255,255,0.1)',
                            border: widget.enabled ? 'none' : '1px solid rgba(255,255,255,0.2)',
                          }}
                        >
                          {widget.enabled && <Check className="w-3 h-3 text-white" />}
                        </button>
                        <div>
                          <p className="text-sm font-medium" style={{ color: textColor }}>
                            {widget.name}
                          </p>
                        </div>
                      </div>
                      
                      <select
                        value={widget.size}
                        onChange={(e) => changeWidgetSize(widget.id, e.target.value as WidgetConfig['size'])}
                        className="text-xs px-2 py-1 rounded outline-none"
                        style={{ 
                          background: 'rgba(255,255,255,0.1)',
                          color: textColor,
                          border: 'none',
                        }}
                      >
                        <option value="1x1">1×1</option>
                        <option value="2x1">2×1</option>
                        <option value="2x2">2×2</option>
                        <option value="3x2">3×2</option>
                        <option value="4x2">4×2</option>
                      </select>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* System Prompt Section */}
      <div style={sectionStyle}>
        {renderSectionHeader('prompt', <MessageSquare className="w-4 h-4" />, 'System Prompt')}
        
        <AnimatePresence>
          {expandedSections.includes('prompt') && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs" style={{ color: `${textColor}60` }}>
                    Definiert wie der KI-Agent mit diesem Modul interagiert
                  </p>
                  <div className="flex gap-2">
                    {!editingPrompt ? (
                      <>
                        <button
                          onClick={() => copyToClipboard(settings.systemPrompt, 'prompt')}
                          className="p-1.5 rounded transition-colors"
                          style={{ color: `${textColor}60` }}
                          title="Kopieren"
                        >
                          {copiedId === 'prompt' ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setTempPrompt(settings.systemPrompt);
                            setEditingPrompt(true);
                          }}
                          className="p-1.5 rounded transition-colors"
                          style={{ color: `${textColor}60` }}
                          title="Bearbeiten"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditingPrompt(false)}
                          className="p-1.5 rounded transition-colors"
                          style={{ color: '#ef4444' }}
                          title="Abbrechen"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <button
                          onClick={savePrompt}
                          className="p-1.5 rounded transition-colors"
                          style={{ color: '#22c55e' }}
                          title="Speichern"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                {editingPrompt ? (
                  <textarea
                    value={tempPrompt}
                    onChange={(e) => setTempPrompt(e.target.value)}
                    className="w-full h-48 p-3 rounded-lg text-sm outline-none resize-none"
                    style={{ 
                      background: 'rgba(0,0,0,0.3)',
                      color: textColor,
                      border: `1px solid ${accentColor}40`,
                    }}
                    placeholder="Beschreibe das Verhalten des Agenten..."
                  />
                ) : (
                  <div 
                    className="p-3 rounded-lg text-sm whitespace-pre-wrap max-h-48 overflow-y-auto"
                    style={{ 
                      background: 'rgba(0,0,0,0.2)',
                      color: `${textColor}90`,
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      lineHeight: '1.6',
                    }}
                  >
                    {settings.systemPrompt || (
                      <span style={{ color: `${textColor}40`, fontStyle: 'italic' }}>
                        Kein System Prompt definiert. Klicke auf "Bearbeiten" um einen hinzuzufügen.
                      </span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Tools Section */}
      <div style={sectionStyle}>
        {renderSectionHeader('tools', <Wrench className="w-4 h-4" />, 'Tools & Funktionen', settings.tools.filter(t => t.enabled).length)}
        
        <AnimatePresence>
          {expandedSections.includes('tools') && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-3">
                {settings.tools.length === 0 ? (
                  <div 
                    className="text-center py-6 rounded-lg"
                    style={{ 
                      background: 'rgba(255,255,255,0.02)',
                      color: `${textColor}50`,
                    }}
                  >
                    <Wrench className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Keine Tools definiert</p>
                    <p className="text-xs mt-1 opacity-70">
                      Tools werden aus dem Store automatisch extrahiert
                    </p>
                  </div>
                ) : (
                  settings.tools.map((tool) => (
                    <div 
                      key={tool.id}
                      className="p-3 rounded-lg"
                      style={{ 
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${tool.enabled ? accentColor + '40' : 'rgba(255,255,255,0.05)'}`,
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleTool(tool.id)}
                            className="w-5 h-5 rounded flex items-center justify-center transition-colors mt-0.5"
                            style={{ 
                              background: tool.enabled ? accentColor : 'rgba(255,255,255,0.1)',
                              border: tool.enabled ? 'none' : '1px solid rgba(255,255,255,0.2)',
                            }}
                          >
                            {tool.enabled && <Check className="w-3 h-3 text-white" />}
                          </button>
                          <div>
                            <p className="text-sm font-medium font-mono" style={{ color: textColor }}>
                              {tool.name}()
                            </p>
                            <p className="text-xs mt-1" style={{ color: `${textColor}60` }}>
                              {tool.description}
                            </p>
                            {tool.parameters.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {tool.parameters.map((param, i) => (
                                  <span 
                                    key={i}
                                    className="text-xs px-2 py-0.5 rounded"
                                    style={{ 
                                      background: 'rgba(255,255,255,0.1)',
                                      color: param.required ? accentColor : `${textColor}60`,
                                    }}
                                  >
                                    {param.name}: {param.type}
                                    {param.required && '*'}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <button
                          onClick={() => copyToClipboard(tool.name, tool.id)}
                          className="p-1.5 rounded transition-colors"
                          style={{ color: `${textColor}40` }}
                        >
                          {copiedId === tool.id ? (
                            <Check className="w-3.5 h-3.5 text-green-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                )}
                
                {/* Add Tool Button */}
                <button
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-lg text-sm transition-colors"
                  style={{ 
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px dashed rgba(255,255,255,0.1)',
                    color: `${textColor}50`,
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Tool hinzufügen
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* API Keys Section */}
      <div style={sectionStyle}>
        {renderSectionHeader('apikeys', <Key className="w-4 h-4" />, 'API-Schlüssel & Integrationen')}
        
        <AnimatePresence>
          {expandedSections.includes('apikeys') && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-3">
                <div 
                  className="flex items-start gap-2 p-3 rounded-lg"
                  style={{ 
                    background: `${accentColor}10`,
                    border: `1px solid ${accentColor}30`,
                  }}
                >
                  <AlertCircle className="w-4 h-4 mt-0.5" style={{ color: accentColor }} />
                  <p className="text-xs" style={{ color: `${textColor}80` }}>
                    API-Schlüssel werden sicher im lokalen Speicher gespeichert und nie an Server gesendet.
                  </p>
                </div>
                
                {settings.apiKeys.map((apiKey) => (
                  <div 
                    key={apiKey.id}
                    className="p-3 rounded-lg"
                    style={{ 
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4" style={{ color: accentColor }} />
                        <span className="text-sm font-medium" style={{ color: textColor }}>
                          {apiKey.name}
                        </span>
                      </div>
                      <span 
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ 
                          background: apiKey.isSet ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                          color: apiKey.isSet ? '#22c55e' : '#ef4444',
                        }}
                      >
                        {apiKey.isSet ? 'Konfiguriert' : 'Nicht gesetzt'}
                      </span>
                    </div>
                    
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder={`sk-...`}
                        value={apiKey.value}
                        onChange={(e) => setApiKey(apiKey.id, e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ 
                          background: 'rgba(0,0,0,0.3)',
                          color: textColor,
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                      />
                      <button
                        className="px-3 py-2 rounded-lg text-sm transition-colors"
                        style={{ 
                          background: accentColor,
                          color: '#fff',
                        }}
                      >
                        Speichern
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* Add Integration Button */}
                <button
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-lg text-sm transition-colors"
                  style={{ 
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px dashed rgba(255,255,255,0.1)',
                    color: `${textColor}50`,
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Integration hinzufügen
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

// --------------------------------------------
// Helper: Extrahiere Modul-Daten aus Dateien
// --------------------------------------------

function extractModuleData(files: Record<string, { type: string; content?: string }>): {
  widgets: WidgetConfig[];
  systemPrompt: string;
  tools: ToolConfig[];
} {
  const widgets: WidgetConfig[] = [];
  const tools: ToolConfig[] = [];
  let systemPrompt = '';
  
  // Durchsuche Dateien
  Object.entries(files).forEach(([path, entry]) => {
    if (entry.type !== 'file' || !entry.content) return;
    
    // Widget erkennen
    if (path.includes('Widget.tsx') || path.includes('widget.tsx')) {
      const widgetNameMatch = entry.content.match(/(?:function|const)\s+(\w+Widget)/);
      if (widgetNameMatch) {
        widgets.push({
          id: widgetNameMatch[1],
          name: widgetNameMatch[1].replace(/Widget$/, ''),
          size: '2x2',
          enabled: true,
        });
      }
    }
    
    // Tools aus Store extrahieren
    if (path.includes('store.ts') || path.includes('Store.ts')) {
      // Suche nach Funktionen im Store
      const functionMatches = entry.content.matchAll(
        /(\w+):\s*(?:\([^)]*\)\s*=>|async\s*\([^)]*\)\s*=>)/g
      );
      
      for (const match of functionMatches) {
        const funcName = match[1];
        // Ignoriere interne Zustand-Funktionen
        if (['set', 'get', 'subscribe', 'getState', 'setState'].includes(funcName)) continue;
        
        tools.push({
          id: funcName,
          name: funcName,
          description: `${funcName} Funktion aus dem Store`,
          parameters: [],
          enabled: true,
        });
      }
    }
    
    // module.json lesen für mehr Infos
    if (path.includes('module.json')) {
      try {
        const moduleData = JSON.parse(entry.content);
        if (moduleData.systemPrompt) {
          systemPrompt = moduleData.systemPrompt;
        }
        if (moduleData.tools) {
          moduleData.tools.forEach((t: ToolConfig) => {
            if (!tools.find(existing => existing.name === t.name)) {
              tools.push({ ...t, enabled: true });
            }
          });
        }
      } catch (e) {
        // JSON parse error - ignorieren
      }
    }
  });
  
  // Default System Prompt wenn keiner gefunden
  if (!systemPrompt && widgets.length > 0) {
    systemPrompt = `Du bist ein hilfreicher Assistent für dieses Modul.
Du kannst folgende Aktionen ausführen:
${tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

Antworte immer freundlich und auf Deutsch.`;
  }
  
  return { widgets, systemPrompt, tools };
}

export default ModuleSettings;



