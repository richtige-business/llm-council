// ============================================
// LifeOS Module Builder - Project Settings Panel
// 
// Zweck: Verwaltung von Metadaten, API Keys, Tools, Events, Custom Prompt
// Verwendet von: Projekt-Chat-Seite
// ============================================

'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  X,
  FileText,
  Key,
  Wrench,
  Bell,
  MessageSquare,
  Plus,
  Trash2,
  Save,
  Check,
  ChevronDown,
  Sparkles,
  Crown,
  Gamepad2,
  Calculator,
  Users,
  Heart,
  Palette,
  Folder,
  Blocks,
} from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import {
  useProjectsStore,
  type ApiKeyConfig,
  type ModuleTool,
  type ModuleEvent,
  type ModuleMetadata,
} from '../../stores/projects-store';
import { useLLMConfigStore } from '../../stores/llm-config-store';
import type { LLMProvider } from '@/lib/llm/types';
import { LLMTab } from './LLMTab';

// --------------------------------------------
// Icon-Auswahl für Module
// --------------------------------------------

const AVAILABLE_ICONS = [
  { name: 'Blocks', icon: Blocks, label: 'Blocks' },
  { name: 'Sparkles', icon: Sparkles, label: 'Sparkles' },
  { name: 'Crown', icon: Crown, label: 'Crown' },
  { name: 'Gamepad2', icon: Gamepad2, label: 'Game' },
  { name: 'Calculator', icon: Calculator, label: 'Calculator' },
  { name: 'Users', icon: Users, label: 'Users' },
  { name: 'Heart', icon: Heart, label: 'Heart' },
  { name: 'Palette', icon: Palette, label: 'Palette' },
  { name: 'Folder', icon: Folder, label: 'Folder' },
  { name: 'FileText', icon: FileText, label: 'Document' },
  { name: 'Settings', icon: Settings, label: 'Settings' },
  { name: 'Wrench', icon: Wrench, label: 'Tool' },
];

const CATEGORIES = [
  { value: 'productivity', label: '📊 Produktivität' },
  { value: 'health', label: '💪 Gesundheit' },
  { value: 'finance', label: '💰 Finanzen' },
  { value: 'social', label: '👥 Sozial' },
  { value: 'creative', label: '🎨 Kreativ' },
  { value: 'games', label: '🎮 Spiele' },
  { value: 'tools', label: '🔧 Tools' },
  { value: 'other', label: '📦 Andere' },
];

// --------------------------------------------
// Tabs
// --------------------------------------------

type SettingsTab = 'metadata' | 'apikeys' | 'tools' | 'events' | 'prompt' | 'llm';

const TABS: { id: SettingsTab; label: string; icon: typeof Settings }[] = [
  { id: 'metadata', label: 'Metadaten', icon: FileText },
  { id: 'apikeys', label: 'API Keys', icon: Key },
  { id: 'tools', label: 'Tools', icon: Wrench },
  { id: 'events', label: 'Events', icon: Bell },
  { id: 'prompt', label: 'System Prompt', icon: MessageSquare },
  { id: 'llm', label: 'LLM', icon: Sparkles },
];

// --------------------------------------------
// Props
// --------------------------------------------

interface ProjectSettingsProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

// --------------------------------------------
// Haupt-Komponente
// --------------------------------------------

export function ProjectSettings({ projectId, isOpen, onClose }: ProjectSettingsProps) {
  const { surface, container, button, input, accentColor, textColor, designStyle } = useThemeStyles();
  const [activeTab, setActiveTab] = useState<SettingsTab>('metadata');
  
  // Store
  const project = useProjectsStore((s) => s.projects.find((p) => p.id === projectId));
  const updateModuleMetadata = useProjectsStore((s) => s.updateModuleMetadata);
  const addApiKey = useProjectsStore((s) => s.addApiKey);
  const updateApiKey = useProjectsStore((s) => s.updateApiKey);
  const removeApiKey = useProjectsStore((s) => s.removeApiKey);
  const addTool = useProjectsStore((s) => s.addTool);
  const updateTool = useProjectsStore((s) => s.updateTool);
  const removeTool = useProjectsStore((s) => s.removeTool);
  const addEvent = useProjectsStore((s) => s.addEvent);
  const removeEvent = useProjectsStore((s) => s.removeEvent);
  const updateCustomPrompt = useProjectsStore((s) => s.updateCustomPrompt);
  
  // LLM Config Store
  const getProjectConfig = useLLMConfigStore((s) => s.getProjectConfig);
  const setProjectConfig = useLLMConfigStore((s) => s.setProjectConfig);
  const llmConfig = getProjectConfig(projectId);
  
  if (!project) return null;
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl overflow-hidden flex flex-col"
            style={{
              ...container.base,
              borderRadius: 0,
              borderRight: 'none',
              borderTop: 'none',
              borderBottom: 'none',
            }}
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between p-4 border-b"
              style={{ borderColor: `${textColor}15` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${accentColor} 0%, #764ba2 100%)`,
                    borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
                  }}
                >
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold" style={{ color: textColor }}>
                    Modul-Einstellungen
                  </h2>
                  <p className="text-xs" style={{ color: textColor, opacity: 0.5 }}>
                    {project.name}
                  </p>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="p-2 rounded-lg transition-colors hover:bg-white/10"
                style={{ color: textColor }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Tabs */}
            <div 
              className="flex gap-1 p-2 border-b overflow-x-auto"
              style={{ borderColor: `${textColor}15` }}
            >
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
                    style={{
                      background: isActive ? `${accentColor}20` : 'transparent',
                      color: isActive ? accentColor : textColor,
                      opacity: isActive ? 1 : 0.7,
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'metadata' && (
                <MetadataTab
                  projectId={projectId}
                  metadata={project.moduleInfo}
                  onUpdate={updateModuleMetadata}
                />
              )}
              
              {activeTab === 'apikeys' && (
                <ApiKeysTab
                  projectId={projectId}
                  apiKeys={project.apiKeys || []}
                  onAdd={addApiKey}
                  onUpdate={updateApiKey}
                  onRemove={removeApiKey}
                />
              )}
              
              {activeTab === 'tools' && (
                <ToolsTab
                  projectId={projectId}
                  tools={project.tools || []}
                  onAdd={addTool}
                  onUpdate={updateTool}
                  onRemove={removeTool}
                />
              )}
              
              {activeTab === 'events' && (
                <EventsTab
                  projectId={projectId}
                  events={project.events || []}
                  onAdd={addEvent}
                  onRemove={removeEvent}
                />
              )}
              
              {activeTab === 'prompt' && (
                <CustomPromptTab
                  projectId={projectId}
                  config={project.customPrompt}
                  onUpdate={updateCustomPrompt}
                />
              )}
              
              {activeTab === 'llm' && (
                <LLMTab
                  projectId={projectId}
                  config={llmConfig}
                  onUpdate={setProjectConfig}
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// --------------------------------------------
// Metadaten Tab
// --------------------------------------------

function MetadataTab({
  projectId,
  metadata,
  onUpdate,
}: {
  projectId: string;
  metadata?: ModuleMetadata;
  onUpdate: (id: string, updates: Partial<ModuleMetadata>) => void;
}) {
  const { surface, input, accentColor, textColor, designStyle } = useThemeStyles();
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  
  const currentIcon = metadata?.icon || 'Blocks';
  const IconComponent = AVAILABLE_ICONS.find((i) => i.name === currentIcon)?.icon || Blocks;
  
  return (
    <div className="space-y-4">
      {/* Icon */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: textColor }}>
          Icon
        </label>
        <div className="relative">
          <button
            onClick={() => setIconPickerOpen(!iconPickerOpen)}
            className="flex items-center gap-3 w-full p-3 rounded-lg transition-colors"
            style={{
              ...input.base,
              borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
            }}
          >
            <div
              className="w-10 h-10 flex items-center justify-center rounded-lg"
              style={{
                background: `linear-gradient(135deg, ${accentColor} 0%, #764ba2 100%)`,
              }}
            >
              <IconComponent className="w-5 h-5 text-white" />
            </div>
            <span style={{ color: textColor }}>{currentIcon}</span>
            <ChevronDown className="w-4 h-4 ml-auto" style={{ color: textColor, opacity: 0.5 }} />
          </button>
          
          {iconPickerOpen && (
            <div
              className="absolute top-full left-0 right-0 mt-2 p-2 rounded-lg z-10 grid grid-cols-6 gap-2"
              style={{
                ...surface.base,
                borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
              }}
            >
              {AVAILABLE_ICONS.map((iconItem) => {
                const Icon = iconItem.icon;
                const isSelected = currentIcon === iconItem.name;
                
                return (
                  <button
                    key={iconItem.name}
                    onClick={() => {
                      onUpdate(projectId, { icon: iconItem.name });
                      setIconPickerOpen(false);
                    }}
                    className="p-2 rounded-lg transition-colors"
                    style={{
                      background: isSelected ? `${accentColor}30` : 'transparent',
                    }}
                    title={iconItem.label}
                  >
                    <Icon className="w-5 h-5 mx-auto" style={{ color: isSelected ? accentColor : textColor }} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Name */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: textColor }}>
          Name
        </label>
        <input
          type="text"
          value={metadata?.name || ''}
          onChange={(e) => onUpdate(projectId, { name: e.target.value })}
          placeholder="Mein Modul"
          className="w-full p-3"
          style={{
            ...input.base,
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
            color: textColor,
          }}
        />
      </div>
      
      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: textColor }}>
          Beschreibung
        </label>
        <textarea
          value={metadata?.description || ''}
          onChange={(e) => onUpdate(projectId, { description: e.target.value })}
          placeholder="Was macht dieses Modul?"
          rows={3}
          className="w-full p-3 resize-none"
          style={{
            ...input.base,
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
            color: textColor,
          }}
        />
      </div>
      
      {/* Category */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: textColor }}>
          Kategorie
        </label>
        <select
          value={metadata?.category || 'other'}
          onChange={(e) => onUpdate(projectId, { category: e.target.value as any })}
          className="w-full p-3"
          style={{
            ...input.base,
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
            color: textColor,
          }}
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>
      
      {/* Version */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: textColor }}>
          Version
        </label>
        <input
          type="text"
          value={metadata?.version || '1.0.0'}
          onChange={(e) => onUpdate(projectId, { version: e.target.value })}
          placeholder="1.0.0"
          className="w-full p-3"
          style={{
            ...input.base,
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
            color: textColor,
          }}
        />
      </div>
      
      {/* Author */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: textColor }}>
          Autor
        </label>
        <input
          type="text"
          value={metadata?.author || ''}
          onChange={(e) => onUpdate(projectId, { author: e.target.value })}
          placeholder="Dein Name"
          className="w-full p-3"
          style={{
            ...input.base,
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
            color: textColor,
          }}
        />
      </div>
      
      {/* Tags */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: textColor }}>
          Tags (kommagetrennt)
        </label>
        <input
          type="text"
          value={(metadata?.tags || []).join(', ')}
          onChange={(e) => onUpdate(projectId, { 
            tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) 
          })}
          placeholder="finance, tracker, budget"
          className="w-full p-3"
          style={{
            ...input.base,
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
            color: textColor,
          }}
        />
      </div>
    </div>
  );
}

// --------------------------------------------
// API Keys Tab
// --------------------------------------------

function ApiKeysTab({
  projectId,
  apiKeys,
  onAdd,
  onUpdate,
  onRemove,
}: {
  projectId: string;
  apiKeys: ApiKeyConfig[];
  onAdd: (id: string, key: Omit<ApiKeyConfig, 'id'>) => void;
  onUpdate: (id: string, keyId: string, updates: Partial<ApiKeyConfig>) => void;
  onRemove: (id: string, keyId: string) => void;
}) {
  const { surface, input, button, accentColor, textColor, designStyle } = useThemeStyles();
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyService, setNewKeyService] = useState('');
  
  const handleAddKey = () => {
    if (!newKeyName || !newKeyValue) return;
    
    onAdd(projectId, {
      name: newKeyName,
      key: newKeyValue,
      service: newKeyService || newKeyName.toLowerCase().replace(/\s+/g, '-'),
      isConfigured: true,
    });
    
    setNewKeyName('');
    setNewKeyValue('');
    setNewKeyService('');
  };
  
  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: textColor, opacity: 0.6 }}>
        Füge API Keys für externe Dienste hinzu, die dein Modul nutzt (z.B. OpenAI, Spotify, etc.)
      </p>
      
      {/* Existing Keys */}
      {apiKeys.map((key) => (
        <div
          key={key.id}
          className="p-4 rounded-lg"
          style={{
            ...surface.base,
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4" style={{ color: accentColor }} />
              <span className="font-medium" style={{ color: textColor }}>{key.name}</span>
            </div>
            <button
              onClick={() => onRemove(projectId, key.id)}
              className="p-1 rounded hover:bg-red-500/20 transition-colors"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          </div>
          <div className="text-xs" style={{ color: textColor, opacity: 0.5 }}>
            Service: {key.service}
          </div>
          <div className="text-xs font-mono mt-1" style={{ color: textColor, opacity: 0.5 }}>
            {key.key.slice(0, 8)}...{key.key.slice(-4)}
          </div>
        </div>
      ))}
      
      {/* Add New Key */}
      <div
        className="p-4 rounded-lg border-2 border-dashed"
        style={{
          borderColor: `${textColor}20`,
          borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
        }}
      >
        <h4 className="font-medium mb-3" style={{ color: textColor }}>
          Neuen API Key hinzufügen
        </h4>
        
        <div className="space-y-3">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Name (z.B. OpenAI)"
            className="w-full p-2 text-sm"
            style={{
              ...input.base,
              borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
              color: textColor,
            }}
          />
          
          <input
            type="text"
            value={newKeyService}
            onChange={(e) => setNewKeyService(e.target.value)}
            placeholder="Service ID (z.B. openai)"
            className="w-full p-2 text-sm"
            style={{
              ...input.base,
              borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
              color: textColor,
            }}
          />
          
          <input
            type="password"
            value={newKeyValue}
            onChange={(e) => setNewKeyValue(e.target.value)}
            placeholder="API Key"
            className="w-full p-2 text-sm font-mono"
            style={{
              ...input.base,
              borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
              color: textColor,
            }}
          />
          
          <button
            onClick={handleAddKey}
            disabled={!newKeyName || !newKeyValue}
            className="w-full flex items-center justify-center gap-2 p-2 text-sm font-medium transition-all"
            style={{
              background: newKeyName && newKeyValue 
                ? `linear-gradient(135deg, ${accentColor} 0%, #764ba2 100%)`
                : `${textColor}10`,
              color: newKeyName && newKeyValue ? '#fff' : textColor,
              opacity: newKeyName && newKeyValue ? 1 : 0.5,
              borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
            }}
          >
            <Plus className="w-4 h-4" />
            Hinzufügen
          </button>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------
// Tools Tab
// --------------------------------------------

function ToolsTab({
  projectId,
  tools,
  onAdd,
  onUpdate,
  onRemove,
}: {
  projectId: string;
  tools: ModuleTool[];
  onAdd: (id: string, tool: Omit<ModuleTool, 'id'>) => void;
  onUpdate: (id: string, toolId: string, updates: Partial<ModuleTool>) => void;
  onRemove: (id: string, toolId: string) => void;
}) {
  const { surface, input, accentColor, textColor, designStyle } = useThemeStyles();
  const [newToolName, setNewToolName] = useState('');
  const [newToolDesc, setNewToolDesc] = useState('');
  
  const handleAddTool = () => {
    if (!newToolName) return;
    
    onAdd(projectId, {
      name: newToolName.toLowerCase().replace(/\s+/g, '_'),
      description: newToolDesc,
      parameters: [],
      canBeCalledBy: 'both',
    });
    
    setNewToolName('');
    setNewToolDesc('');
  };
  
  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: textColor, opacity: 0.6 }}>
        Tools sind Aktionen, die von AI-Agents oder anderen Modulen aufgerufen werden können.
      </p>
      
      {/* Existing Tools */}
      {tools.map((tool) => (
        <div
          key={tool.id}
          className="p-4 rounded-lg"
          style={{
            ...surface.base,
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4" style={{ color: accentColor }} />
              <code className="font-mono text-sm" style={{ color: accentColor }}>
                {tool.name}
              </code>
            </div>
            <button
              onClick={() => onRemove(projectId, tool.id)}
              className="p-1 rounded hover:bg-red-500/20 transition-colors"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          </div>
          <p className="text-sm" style={{ color: textColor, opacity: 0.7 }}>
            {tool.description || 'Keine Beschreibung'}
          </p>
          <div className="mt-2 text-xs" style={{ color: textColor, opacity: 0.5 }}>
            Aufrufbar von: {tool.canBeCalledBy === 'both' ? 'Agents & Module' : tool.canBeCalledBy}
          </div>
        </div>
      ))}
      
      {/* Add New Tool */}
      <div
        className="p-4 rounded-lg border-2 border-dashed"
        style={{
          borderColor: `${textColor}20`,
          borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
        }}
      >
        <h4 className="font-medium mb-3" style={{ color: textColor }}>
          Neues Tool definieren
        </h4>
        
        <div className="space-y-3">
          <input
            type="text"
            value={newToolName}
            onChange={(e) => setNewToolName(e.target.value)}
            placeholder="Tool Name (z.B. add_contact)"
            className="w-full p-2 text-sm font-mono"
            style={{
              ...input.base,
              borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
              color: textColor,
            }}
          />
          
          <textarea
            value={newToolDesc}
            onChange={(e) => setNewToolDesc(e.target.value)}
            placeholder="Beschreibung (Was macht dieses Tool?)"
            rows={2}
            className="w-full p-2 text-sm resize-none"
            style={{
              ...input.base,
              borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
              color: textColor,
            }}
          />
          
          <button
            onClick={handleAddTool}
            disabled={!newToolName}
            className="w-full flex items-center justify-center gap-2 p-2 text-sm font-medium transition-all"
            style={{
              background: newToolName 
                ? `linear-gradient(135deg, ${accentColor} 0%, #764ba2 100%)`
                : `${textColor}10`,
              color: newToolName ? '#fff' : textColor,
              opacity: newToolName ? 1 : 0.5,
              borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
            }}
          >
            <Plus className="w-4 h-4" />
            Tool hinzufügen
          </button>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------
// Events Tab
// --------------------------------------------

function EventsTab({
  projectId,
  events,
  onAdd,
  onRemove,
}: {
  projectId: string;
  events: ModuleEvent[];
  onAdd: (id: string, event: Omit<ModuleEvent, 'id'>) => void;
  onRemove: (id: string, eventId: string) => void;
}) {
  const { surface, input, accentColor, textColor, designStyle } = useThemeStyles();
  const [newEventName, setNewEventName] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  
  const handleAddEvent = () => {
    if (!newEventName) return;
    
    onAdd(projectId, {
      name: newEventName.toLowerCase().replace(/\s+/g, '_'),
      description: newEventDesc,
      payload: [],
    });
    
    setNewEventName('');
    setNewEventDesc('');
  };
  
  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: textColor, opacity: 0.6 }}>
        Events werden emittiert, wenn etwas in deinem Modul passiert. Andere Module können darauf reagieren.
      </p>
      
      {/* Existing Events */}
      {events.map((event) => (
        <div
          key={event.id}
          className="p-4 rounded-lg"
          style={{
            ...surface.base,
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" style={{ color: accentColor }} />
              <code className="font-mono text-sm" style={{ color: accentColor }}>
                {event.name}
              </code>
            </div>
            <button
              onClick={() => onRemove(projectId, event.id)}
              className="p-1 rounded hover:bg-red-500/20 transition-colors"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          </div>
          <p className="text-sm" style={{ color: textColor, opacity: 0.7 }}>
            {event.description || 'Keine Beschreibung'}
          </p>
        </div>
      ))}
      
      {/* Add New Event */}
      <div
        className="p-4 rounded-lg border-2 border-dashed"
        style={{
          borderColor: `${textColor}20`,
          borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
        }}
      >
        <h4 className="font-medium mb-3" style={{ color: textColor }}>
          Neues Event definieren
        </h4>
        
        <div className="space-y-3">
          <input
            type="text"
            value={newEventName}
            onChange={(e) => setNewEventName(e.target.value)}
            placeholder="Event Name (z.B. contact_created)"
            className="w-full p-2 text-sm font-mono"
            style={{
              ...input.base,
              borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
              color: textColor,
            }}
          />
          
          <textarea
            value={newEventDesc}
            onChange={(e) => setNewEventDesc(e.target.value)}
            placeholder="Beschreibung (Wann wird dieses Event ausgelöst?)"
            rows={2}
            className="w-full p-2 text-sm resize-none"
            style={{
              ...input.base,
              borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
              color: textColor,
            }}
          />
          
          <button
            onClick={handleAddEvent}
            disabled={!newEventName}
            className="w-full flex items-center justify-center gap-2 p-2 text-sm font-medium transition-all"
            style={{
              background: newEventName 
                ? `linear-gradient(135deg, ${accentColor} 0%, #764ba2 100%)`
                : `${textColor}10`,
              color: newEventName ? '#fff' : textColor,
              opacity: newEventName ? 1 : 0.5,
              borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
            }}
          >
            <Plus className="w-4 h-4" />
            Event hinzufügen
          </button>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------
// Custom Prompt Tab
// --------------------------------------------

function CustomPromptTab({
  projectId,
  config,
  onUpdate,
}: {
  projectId: string;
  config: { enabled: boolean; systemPrompt: string; constraints: string[]; examples: string[] };
  onUpdate: (id: string, updates: Partial<typeof config>) => void;
}) {
  const { surface, input, accentColor, textColor, designStyle } = useThemeStyles();
  
  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: textColor, opacity: 0.6 }}>
        Füge zusätzlichen Kontext für die AI hinzu, um besseren Code für dieses Modul zu generieren.
      </p>
      
      {/* Enable Toggle */}
      <div className="flex items-center justify-between">
        <span style={{ color: textColor }}>Custom Prompt aktivieren</span>
        <button
          onClick={() => onUpdate(projectId, { enabled: !config.enabled })}
          className="w-12 h-6 rounded-full transition-colors relative"
          style={{
            background: config.enabled ? accentColor : `${textColor}20`,
          }}
        >
          <div
            className="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform"
            style={{
              left: config.enabled ? 'calc(100% - 20px)' : '4px',
            }}
          />
        </button>
      </div>
      
      {config.enabled && (
        <>
          {/* System Prompt */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: textColor }}>
              Zusätzlicher System Prompt
            </label>
            <textarea
              value={config.systemPrompt}
              onChange={(e) => onUpdate(projectId, { systemPrompt: e.target.value })}
              placeholder="z.B. 'Dieses Modul ist ein Schachspiel. Implementiere ALLE Regeln vollständig, inkl. En passant, Rochade, Bauernumwandlung.'"
              rows={5}
              className="w-full p-3 resize-none"
              style={{
                ...input.base,
                borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
                color: textColor,
              }}
            />
          </div>
          
          {/* Constraints */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: textColor }}>
              Einschränkungen (eine pro Zeile)
            </label>
            <textarea
              value={config.constraints.join('\n')}
              onChange={(e) => onUpdate(projectId, { 
                constraints: e.target.value.split('\n').filter(Boolean) 
              })}
              placeholder="z.B.&#10;- Keine externen APIs verwenden&#10;- Nur Canvas für Grafiken"
              rows={4}
              className="w-full p-3 resize-none"
              style={{
                ...input.base,
                borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
                color: textColor,
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default ProjectSettings;




