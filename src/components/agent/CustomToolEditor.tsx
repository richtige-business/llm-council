// ============================================
// CustomToolEditor.tsx - Editor für Custom Tools
// 
// Zweck: UI zum Erstellen und Bearbeiten von Custom Tools
// Verwendet von: AgentSettingsModal
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Plus, 
  Trash2, 
  Save,
  MousePointer,
  Link,
  Type,
  Code,
  Workflow,
} from 'lucide-react';
import { 
  useSandboxStore,
  type CustomTool,
  type CustomToolActionType,
} from '@/lib/agent/stores/sandbox-store';

// --------------------------------------------
// Props Interface
// --------------------------------------------

interface Props {
  tool?: CustomTool;
  moduleId: string;
  onClose: () => void;
  onSave: (tool: Omit<CustomTool, 'id' | 'createdAt'>) => void;
}

// --------------------------------------------
// Action Type Options
// --------------------------------------------

const ACTION_TYPES = [
  { type: 'click', label: 'Click', icon: MousePointer, description: 'Klickt auf ein Element' },
  { type: 'navigation', label: 'Navigation', icon: Link, description: 'Navigiert zu einer URL' },
  { type: 'input', label: 'Input', icon: Type, description: 'Gibt Text in ein Feld ein' },
  { type: 'api', label: 'API Call', icon: Code, description: 'Ruft eine API auf' },
] as const;

// --------------------------------------------
// Komponente
// --------------------------------------------

export function CustomToolEditor({ tool, moduleId, onClose, onSave }: Props) {
  const [mounted, setMounted] = useState(false);
  
  // Form State
  const [name, setName] = useState(tool?.name || '');
  const [description, setDescription] = useState(tool?.description || '');
  const [actionType, setActionType] = useState<CustomToolActionType['type']>(
    tool?.action.type || 'click'
  );
  
  // Action-spezifische Felder
  const [selector, setSelector] = useState(
    tool?.action.type === 'click' ? tool.action.selector : 
    tool?.action.type === 'input' ? tool.action.selector : ''
  );
  const [url, setUrl] = useState(
    tool?.action.type === 'navigation' ? tool.action.url : ''
  );
  const [inputValue, setInputValue] = useState(
    tool?.action.type === 'input' ? tool.action.value : ''
  );
  const [apiEndpoint, setApiEndpoint] = useState(
    tool?.action.type === 'api' ? tool.action.endpoint : ''
  );
  const [apiMethod, setApiMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>(
    tool?.action.type === 'api' ? tool.action.method : 'GET'
  );
  const [apiBody, setApiBody] = useState(
    tool?.action.type === 'api' ? tool.action.body || '' : ''
  );
  
  // Parameters
  const [parameters, setParameters] = useState(tool?.parameters || []);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Form validieren
  const isValid = () => {
    if (!name.trim() || !description.trim()) return false;
    
    switch (actionType) {
      case 'click':
        return selector.trim().length > 0;
      case 'navigation':
        return url.trim().length > 0;
      case 'input':
        return selector.trim().length > 0;
      case 'api':
        return apiEndpoint.trim().length > 0;
      default:
        return false;
    }
  };
  
  // Speichern
  const handleSave = () => {
    if (!isValid()) return;
    
    let action: CustomToolActionType;
    
    switch (actionType) {
      case 'click':
        action = { type: 'click', selector };
        break;
      case 'navigation':
        action = { type: 'navigation', url };
        break;
      case 'input':
        action = { type: 'input', selector, value: inputValue };
        break;
      case 'api':
        action = { type: 'api', endpoint: apiEndpoint, method: apiMethod, body: apiBody || undefined };
        break;
      default:
        return;
    }
    
    onSave({
      name,
      description,
      moduleId,
      action,
      parameters,
      enabled: true,
    });
    
    onClose();
  };
  
  // Parameter hinzufügen
  const addParameter = () => {
    setParameters([
      ...parameters,
      {
        name: '',
        type: 'string' as const,
        description: '',
        required: false,
      },
    ]);
  };
  
  // Parameter entfernen
  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };
  
  // Parameter aktualisieren
  const updateParameter = (index: number, updates: Partial<typeof parameters[0]>) => {
    setParameters(parameters.map((p, i) => (i === index ? { ...p, ...updates } : p)));
  };
  
  if (!mounted) return null;
  
  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100000] flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        
        {/* Modal */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative w-full max-w-lg bg-gradient-to-b from-[#1e1e2d] to-[#14141f] rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <h2 className="text-white font-semibold">
              {tool ? 'Tool bearbeiten' : 'Neues Custom Tool'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Name */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. CRM Kontakt öffnen"
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            
            {/* Description */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Beschreibung</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Was macht dieses Tool?"
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 resize-none"
              />
            </div>
            
            {/* Action Type */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Aktion</label>
              <div className="grid grid-cols-2 gap-2">
                {ACTION_TYPES.map((at) => (
                  <button
                    key={at.type}
                    onClick={() => setActionType(at.type)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      actionType === at.type
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    <at.icon size={18} />
                    <div className="text-left">
                      <div className="text-sm font-medium">{at.label}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Action-spezifische Felder */}
            <div className="space-y-4 pt-2">
              {actionType === 'click' && (
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    CSS Selector
                  </label>
                  <input
                    type="text"
                    value={selector}
                    onChange={(e) => setSelector(e.target.value)}
                    placeholder='z.B. [data-agent-button="submit"] oder #myButton'
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 font-mono text-sm focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              )}
              
              {actionType === 'navigation' && (
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">URL</label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="z.B. /calendar oder https://example.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              )}
              
              {actionType === 'input' && (
                <>
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      CSS Selector
                    </label>
                    <input
                      type="text"
                      value={selector}
                      onChange={(e) => setSelector(e.target.value)}
                      placeholder='z.B. [data-agent-input="title"] oder input[name="email"]'
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 font-mono text-sm focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Wert (optional)
                    </label>
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Fester Wert oder leer für Parameter"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                </>
              )}
              
              {actionType === 'api' && (
                <>
                  <div className="flex gap-2">
                    <div className="w-28">
                      <label className="block text-white/80 text-sm font-medium mb-2">Methode</label>
                      <select
                        value={apiMethod}
                        onChange={(e) => setApiMethod(e.target.value as typeof apiMethod)}
                        className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-white/80 text-sm font-medium mb-2">Endpoint</label>
                      <input
                        type="text"
                        value={apiEndpoint}
                        onChange={(e) => setApiEndpoint(e.target.value)}
                        placeholder="/api/custom/action"
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                  </div>
                  {(apiMethod === 'POST' || apiMethod === 'PUT') && (
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">
                        Body (JSON)
                      </label>
                      <textarea
                        value={apiBody}
                        onChange={(e) => setApiBody(e.target.value)}
                        placeholder='{"key": "value"}'
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 font-mono text-sm focus:outline-none focus:border-cyan-500/50 resize-none"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Parameters */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-white/80 text-sm font-medium">Parameter</label>
                <button
                  onClick={addParameter}
                  className="flex items-center gap-1 text-cyan-400 text-sm hover:text-cyan-300 transition-colors"
                >
                  <Plus size={14} />
                  Hinzufügen
                </button>
              </div>
              
              {parameters.length === 0 ? (
                <p className="text-white/40 text-sm py-2">Keine Parameter definiert</p>
              ) : (
                <div className="space-y-2">
                  {parameters.map((param, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <input
                        type="text"
                        value={param.name}
                        onChange={(e) => updateParameter(idx, { name: e.target.value })}
                        placeholder="Name"
                        className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
                      />
                      <select
                        value={param.type}
                        onChange={(e) => updateParameter(idx, { type: e.target.value as 'string' | 'number' | 'boolean' })}
                        className="w-24 px-2 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                      >
                        <option value="string">Text</option>
                        <option value="number">Zahl</option>
                        <option value="boolean">Boolean</option>
                      </select>
                      <button
                        onClick={() => removeParameter(idx)}
                        className="p-2 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/10">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-white/70 hover:text-white transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={!isValid()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan-500 text-white font-medium hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              Speichern
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
  
  return createPortal(modalContent, document.body);
}

export default CustomToolEditor;


