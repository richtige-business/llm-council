// ============================================
// ToolSourcesPanel.tsx - Tool-Quellen Einstellungen
// 
// Zweck: UI für System-Tools, Custom Tools, Workflows und Discovery
// Verwendet von: AgentSettingsModal
// ============================================

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wrench,
  Plus,
  Trash2,
  Edit2,
  Play,
  Search,
  GraduationCap,
  Workflow,
  Settings2,
  ChevronDown,
  ChevronUp,
  Eye,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import { 
  useSandboxStore,
  useCustomTools,
  useLearnedWorkflows,
  useDiscoveredElements,
  type CustomTool,
  type LearnedWorkflow,
} from '@/lib/agent/stores/sandbox-store';
import { useElementDiscovery, highlightDiscoveredElements, clearHighlights } from '@/lib/agent/sandbox/element-discovery';
import { CustomToolEditor } from './CustomToolEditor';
import type { ModuleTool } from '@/lib/agent/types';

// --------------------------------------------
// Props Interface
// --------------------------------------------

interface Props {
  moduleId: string;
  moduleTools: ModuleTool[];
  enabledTools: string[];
  onToolsChange: (tools: string[]) => void;
  accentColor: string;
}

// --------------------------------------------
// Custom Tool Item
// --------------------------------------------

function CustomToolItem({ 
  tool, 
  onEdit, 
  onDelete, 
  onToggle,
  accentColor 
}: { 
  tool: CustomTool; 
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  accentColor: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${accentColor}20` }}
        >
          <Wrench size={14} style={{ color: accentColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-medium truncate">{tool.name}</div>
          <div className="text-white/50 text-xs truncate">{tool.description}</div>
        </div>
      </div>
      
      <div className="flex items-center gap-1 ml-2">
        <button
          onClick={onEdit}
          className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors"
        >
          <Trash2 size={14} />
        </button>
        <button
          onClick={onToggle}
          className={`ml-1 w-10 h-5 rounded-full relative transition-colors ${
            tool.enabled ? '' : 'bg-white/10'
          }`}
          style={{ background: tool.enabled ? accentColor : undefined }}
        >
          <div 
            className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
            style={{ left: tool.enabled ? 'calc(100% - 18px)' : '2px' }}
          />
        </button>
      </div>
    </div>
  );
}

// --------------------------------------------
// Workflow Item
// --------------------------------------------

function WorkflowItem({ 
  workflow, 
  onDelete,
  accentColor 
}: { 
  workflow: LearnedWorkflow; 
  onDelete: () => void;
  accentColor: string;
}) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${accentColor}20` }}
          >
            <Workflow size={14} style={{ color: accentColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium truncate">{workflow.name}</div>
            <div className="text-white/50 text-xs">
              {workflow.steps.length} Schritte · {workflow.successCount}x erfolgreich
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-2 rounded-lg hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors"
          >
            <Trash2 size={14} />
          </button>
          {expanded ? <ChevronUp size={16} className="text-white/50" /> : <ChevronDown size={16} className="text-white/50" />}
        </div>
      </div>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              <div className="text-white/40 text-xs">Trigger-Befehle:</div>
              <div className="flex flex-wrap gap-1">
                {workflow.triggerPhrases.map((phrase, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-xs">
                    "{phrase}"
                  </span>
                ))}
              </div>
              
              <div className="text-white/40 text-xs mt-2">Schritte:</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {workflow.steps.slice(0, 5).map((step, idx) => (
                  <div key={step.id} className="text-white/60 text-xs flex items-center gap-2">
                    <span className="text-white/30">{idx + 1}.</span>
                    <span>{step.type}: {step.target.text?.slice(0, 30) || step.target.selector.slice(0, 30)}</span>
                  </div>
                ))}
                {workflow.steps.length > 5 && (
                  <div className="text-white/40 text-xs">...und {workflow.steps.length - 5} weitere</div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --------------------------------------------
// Discovery Results
// --------------------------------------------

function DiscoveryResults({ 
  accentColor,
  onClose 
}: { 
  accentColor: string;
  onClose: () => void;
}) {
  const discoveredElements = useDiscoveredElements();
  const createTool = useSandboxStore((state) => state.createToolFromDiscovery);
  const [showHighlights, setShowHighlights] = useState(false);
  
  const toggleHighlights = () => {
    if (showHighlights) {
      clearHighlights();
    } else {
      highlightDiscoveredElements(discoveredElements);
    }
    setShowHighlights(!showHighlights);
  };
  
  if (discoveredElements.length === 0) {
    return (
      <div className="text-center py-6 text-white/40 text-sm">
        Keine interaktiven Elemente gefunden.
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-white/70 text-sm">{discoveredElements.length} Elemente gefunden</span>
        <button
          onClick={toggleHighlights}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            showHighlights 
              ? 'bg-amber-500/20 text-amber-300' 
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          <Eye size={14} />
          {showHighlights ? 'Highlights ausblenden' : 'Auf Seite zeigen'}
        </button>
      </div>
      
      <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
        {discoveredElements.map((element, idx) => (
          <div 
            key={element.id}
            className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-white/30 text-xs w-5">{idx + 1}.</span>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm truncate">
                  {element.text || element.ariaLabel || element.tagName}
                </div>
                <div className="text-white/40 text-xs truncate font-mono">
                  {element.selector.slice(0, 40)}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 ml-2">
              <span 
                className="px-2 py-0.5 rounded text-xs"
                style={{ 
                  background: `${accentColor}20`, 
                  color: accentColor,
                }}
              >
                {element.suggestedAction}
              </span>
              <button
                onClick={() => createTool(element)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                title="Als Custom Tool hinzufügen"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <button
        onClick={onClose}
        className="w-full py-2 rounded-lg bg-white/5 text-white/60 text-sm hover:bg-white/10 transition-colors"
      >
        Schließen
      </button>
    </div>
  );
}

// --------------------------------------------
// Main Component
// --------------------------------------------

export function ToolSourcesPanel({ 
  moduleId, 
  moduleTools, 
  enabledTools, 
  onToolsChange,
  accentColor 
}: Props) {
  const customTools = useCustomTools();
  const learnedWorkflows = useLearnedWorkflows();
  const { discover, isDiscovering, discoveredElements } = useElementDiscovery();
  
  const enterSandbox = useSandboxStore((state) => state.enterSandbox);
  const deleteWorkflow = useSandboxStore((state) => state.deleteWorkflow);
  const addCustomTool = useSandboxStore((state) => state.addCustomTool);
  const updateCustomTool = useSandboxStore((state) => state.updateCustomTool);
  const deleteCustomTool = useSandboxStore((state) => state.deleteCustomTool);
  const toggleCustomTool = useSandboxStore((state) => state.toggleCustomTool);
  
  const [showToolEditor, setShowToolEditor] = useState(false);
  const [editingTool, setEditingTool] = useState<CustomTool | undefined>();
  const [showSystemTools, setShowSystemTools] = useState(false);
  const [showDiscoveryResults, setShowDiscoveryResults] = useState(false);
  
  // Filter tools by module
  const moduleCustomTools = customTools.filter(t => t.moduleId === moduleId || t.moduleId === 'custom');
  const moduleWorkflows = learnedWorkflows.filter(w => w.moduleId === moduleId || w.moduleId === 'custom');
  
  // Handle Custom Tool Save
  const handleSaveTool = (tool: Omit<CustomTool, 'id' | 'createdAt'>) => {
    if (editingTool) {
      updateCustomTool(editingTool.id, tool);
    } else {
      addCustomTool(tool);
    }
    setEditingTool(undefined);
  };
  
  // Handle Discovery
  const handleDiscover = () => {
    discover();
    setShowDiscoveryResults(true);
  };
  
  return (
    <div className="space-y-6">
      {/* Section: System Tools */}
      <div>
        <button
          onClick={() => setShowSystemTools(!showSystemTools)}
          className="flex items-center justify-between w-full mb-3"
        >
          <div className="flex items-center gap-2">
            <Settings2 size={16} style={{ color: accentColor }} />
            <span className="text-white font-medium text-sm">System-Tools</span>
            <span className="text-white/40 text-xs">({moduleTools.length})</span>
          </div>
          {showSystemTools ? <ChevronUp size={16} className="text-white/50" /> : <ChevronDown size={16} className="text-white/50" />}
        </button>
        
        <AnimatePresence>
          {showSystemTools && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {moduleTools.length === 0 ? (
                <div className="text-center py-4 text-white/40 text-sm bg-white/5 rounded-xl">
                  Keine System-Tools für dieses Modul
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {moduleTools.map((tool) => {
                    const isEnabled = enabledTools.length === 0 || enabledTools.includes(tool.id);
                    return (
                      <button
                        key={tool.id}
                        onClick={() => {
                          if (enabledTools.length === 0) {
                            // Aktiviere alle außer diesem
                            onToolsChange(moduleTools.filter(t => t.id !== tool.id).map(t => t.id));
                          } else if (isEnabled) {
                            onToolsChange(enabledTools.filter(id => id !== tool.id));
                          } else {
                            onToolsChange([...enabledTools, tool.id]);
                          }
                        }}
                        className="flex items-center justify-between w-full p-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex-1 text-left">
                          <div className="text-white text-sm">{tool.id}</div>
                          <div className="text-white/50 text-xs truncate">{tool.description}</div>
                        </div>
                        <div 
                          className={`w-5 h-5 rounded flex items-center justify-center ${
                            isEnabled ? '' : 'bg-white/10'
                          }`}
                          style={{ background: isEnabled ? accentColor : undefined }}
                        >
                          {isEnabled && <Check size={12} className="text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Section: Custom Tools */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wrench size={16} style={{ color: accentColor }} />
            <span className="text-white font-medium text-sm">Custom Tools</span>
            <span className="text-white/40 text-xs">({moduleCustomTools.length})</span>
          </div>
          <button
            onClick={() => { setEditingTool(undefined); setShowToolEditor(true); }}
            className="flex items-center gap-1 text-sm hover:text-white transition-colors"
            style={{ color: accentColor }}
          >
            <Plus size={14} />
            Neu
          </button>
        </div>
        
        {moduleCustomTools.length === 0 ? (
          <div className="text-center py-4 text-white/40 text-sm bg-white/5 rounded-xl">
            Keine Custom Tools erstellt
          </div>
        ) : (
          <div className="space-y-2">
            {moduleCustomTools.map((tool) => (
              <CustomToolItem
                key={tool.id}
                tool={tool}
                accentColor={accentColor}
                onEdit={() => { setEditingTool(tool); setShowToolEditor(true); }}
                onDelete={() => deleteCustomTool(tool.id)}
                onToggle={() => toggleCustomTool(tool.id)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Section: Learned Workflows */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <GraduationCap size={16} style={{ color: accentColor }} />
            <span className="text-white font-medium text-sm">Gelernte Workflows</span>
            <span className="text-white/40 text-xs">({moduleWorkflows.length})</span>
          </div>
          <button
            onClick={enterSandbox}
            className="flex items-center gap-1 text-sm hover:text-white transition-colors"
            style={{ color: accentColor }}
          >
            <Play size={14} />
            Sandbox
          </button>
        </div>
        
        {moduleWorkflows.length === 0 ? (
          <div className="text-center py-4 bg-white/5 rounded-xl">
            <GraduationCap size={24} className="mx-auto mb-2 text-white/20" />
            <p className="text-white/40 text-sm mb-2">Noch keine Workflows gelernt</p>
            <button
              onClick={enterSandbox}
              className="text-sm px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: `${accentColor}20`, color: accentColor }}
            >
              Sandbox öffnen & lernen
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {moduleWorkflows.map((workflow) => (
              <WorkflowItem
                key={workflow.id}
                workflow={workflow}
                accentColor={accentColor}
                onDelete={() => deleteWorkflow(workflow.id)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Section: Discovery */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Search size={16} style={{ color: accentColor }} />
            <span className="text-white font-medium text-sm">Auto-Discovery</span>
          </div>
        </div>
        
        {showDiscoveryResults && discoveredElements.length > 0 ? (
          <DiscoveryResults 
            accentColor={accentColor} 
            onClose={() => { setShowDiscoveryResults(false); clearHighlights(); }}
          />
        ) : (
          <div className="text-center py-4 bg-white/5 rounded-xl">
            <Sparkles size={24} className="mx-auto mb-2 text-white/20" />
            <p className="text-white/40 text-sm mb-2">
              Scanne die aktuelle Seite nach möglichen Tools
            </p>
            <button
              onClick={handleDiscover}
              disabled={isDiscovering}
              className="text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2 mx-auto disabled:opacity-50"
              style={{ background: `${accentColor}20`, color: accentColor }}
            >
              {isDiscovering ? (
                <>
                  <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  Scanne...
                </>
              ) : (
                <>
                  <Search size={14} />
                  Seite scannen
                </>
              )}
            </button>
          </div>
        )}
      </div>
      
      {/* Custom Tool Editor Modal */}
      {showToolEditor && (
        <CustomToolEditor
          tool={editingTool}
          moduleId={moduleId}
          onClose={() => { setShowToolEditor(false); setEditingTool(undefined); }}
          onSave={handleSaveTool}
        />
      )}
    </div>
  );
}

export default ToolSourcesPanel;


