// ============================================
// SandboxOverlay.tsx - Visual Feedback für Sandbox-Modus
// 
// Zweck: Zeigt an dass der Sandbox-Modus aktiv ist
//        und bietet Recording-Controls
// Verwendet von: Shell.tsx
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Circle, 
  Square, 
  X, 
  Play, 
  RotateCcw, 
  Save, 
  Trash2,
  Eye,
  EyeOff,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { 
  useSandboxStore,
  useIsSandboxActive,
  useIsRecording,
  useRecordedActions,
  useAnalyzedWorkflow,
} from '@/lib/agent/stores/sandbox-store';
import { useActionRecorder } from '@/lib/agent/sandbox/action-recorder';

// --------------------------------------------
// Recorded Action Item
// Zeigt eine einzelne aufgezeichnete Aktion
// --------------------------------------------

interface ActionItemProps {
  action: {
    id: string;
    type: string;
    target: {
      selector: string;
      text?: string;
      tagName: string;
    };
    value?: string;
    key?: string;
  };
  index: number;
}

function ActionItem({ action, index }: ActionItemProps) {
  const getActionIcon = () => {
    switch (action.type) {
      case 'click': return '👆';
      case 'input': return '⌨️';
      case 'change': return '🔄';
      case 'submit': return '📤';
      case 'keypress': return '⏎';
      default: return '•';
    }
  };
  
  const getActionLabel = () => {
    switch (action.type) {
      case 'click':
        return `Click: ${action.target.text?.slice(0, 30) || action.target.tagName}`;
      case 'input':
        return `Input: "${action.value?.slice(0, 20)}${(action.value?.length || 0) > 20 ? '...' : ''}"`;
      case 'change':
        return `Change: ${action.value}`;
      case 'submit':
        return 'Submit Form';
      case 'keypress':
        return `Key: ${action.key}`;
      default:
        return action.type;
    }
  };
  
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-white/5 text-sm">
      <span className="text-white/40 w-5 text-right">{index + 1}.</span>
      <span>{getActionIcon()}</span>
      <span className="text-white/80 flex-1 truncate">{getActionLabel()}</span>
    </div>
  );
}

// --------------------------------------------
// Recording Controls Panel
// --------------------------------------------

function RecordingPanel() {
  const { isRecording, recordedActions, start, stop, clear } = useActionRecorder();
  const exitSandbox = useSandboxStore((state) => state.exitSandbox);
  const setAnalyzedWorkflow = useSandboxStore((state) => state.setAnalyzedWorkflow);
  const saveWorkflow = useSandboxStore((state) => state.saveWorkflow);
  
  const [showActions, setShowActions] = useState(true);
  const [workflowName, setWorkflowName] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  
  // Workflow analysieren (vereinfacht - könnte später Claude nutzen)
  const analyzeAndSave = async () => {
    if (recordedActions.length === 0) return;
    
    setIsAnalyzing(true);
    
    // Simpler Workflow erstellen (später: Claude-Analyse)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const workflow = {
      id: `workflow-${Date.now()}`,
      name: workflowName || `Workflow ${new Date().toLocaleDateString()}`,
      description: `${recordedActions.length} Schritte aufgezeichnet`,
      triggerPhrases: [workflowName.toLowerCase()],
      steps: recordedActions,
      variables: [],
      createdAt: new Date().toISOString(),
      successCount: 0,
      failureCount: 0,
      moduleId: 'custom',
    };
    
    setAnalyzedWorkflow(workflow);
    setIsAnalyzing(false);
    setShowSaveForm(true);
  };
  
  const handleSave = () => {
    const workflow = useSandboxStore.getState().analyzedWorkflow;
    if (workflow) {
      saveWorkflow({
        ...workflow,
        name: workflowName || workflow.name,
      });
      exitSandbox();
    }
  };
  
  return (
    <div 
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[99999]"
      data-sandbox-control="true"
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="bg-black/95 backdrop-blur-xl rounded-2xl border border-amber-500/30 shadow-2xl overflow-hidden"
        style={{ width: 380 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            {isRecording && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
            <span className="text-white font-medium text-sm">
              {isRecording ? 'Aufnahme läuft...' : showSaveForm ? 'Workflow speichern' : 'Teaching Sandbox'}
            </span>
          </div>
          <button
            onClick={exitSandbox}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4">
          {showSaveForm ? (
            // Save Form
            <div className="space-y-3">
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="Name des Workflows..."
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-amber-500/50"
                autoFocus
              />
              
              <div className="text-white/50 text-xs">
                {recordedActions.length} Schritte aufgezeichnet
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSaveForm(false)}
                  className="flex-1 px-3 py-2 rounded-lg bg-white/5 text-white/70 text-sm hover:bg-white/10 transition-colors"
                >
                  Zurück
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-3 py-2 rounded-lg bg-amber-500 text-black font-medium text-sm hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={14} />
                  Speichern
                </button>
              </div>
            </div>
          ) : (
            // Recording Controls
            <div className="space-y-3">
              {/* Action Buttons */}
              <div className="flex gap-2">
                {!isRecording ? (
                  <button
                    onClick={start}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium text-sm hover:bg-red-400 transition-colors"
                  >
                    <Circle size={14} className="fill-current" />
                    Aufnahme starten
                  </button>
                ) : (
                  <button
                    onClick={stop}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black font-medium text-sm hover:bg-white/90 transition-colors"
                  >
                    <Square size={14} className="fill-current" />
                    Aufnahme stoppen
                  </button>
                )}
              </div>
              
              {/* Recorded Actions */}
              {recordedActions.length > 0 && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowActions(!showActions)}
                    className="flex items-center justify-between w-full text-white/60 text-xs hover:text-white/80 transition-colors"
                  >
                    <span>{recordedActions.length} Aktionen aufgezeichnet</span>
                    {showActions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  
                  <AnimatePresence>
                    {showActions && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                          {recordedActions.map((action, idx) => (
                            <ActionItem key={action.id} action={action} index={idx} />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Actions Toolbar */}
                  {!isRecording && (
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={clear}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-white/70 text-sm hover:bg-white/10 transition-colors"
                      >
                        <Trash2 size={14} />
                        Löschen
                      </button>
                      <button
                        onClick={analyzeAndSave}
                        disabled={isAnalyzing}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-500/20 text-amber-300 text-sm hover:bg-amber-500/30 transition-colors border border-amber-500/30 disabled:opacity-50"
                      >
                        {isAnalyzing ? (
                          <span className="w-4 h-4 border-2 border-amber-300/30 border-t-amber-300 rounded-full animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                        Als Workflow speichern
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Help Text */}
              {recordedActions.length === 0 && !isRecording && (
                <p className="text-white/40 text-xs text-center py-2">
                  Starte die Aufnahme und führe die Aktionen durch, die der Agent lernen soll.
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// --------------------------------------------
// Main Sandbox Overlay Component
// --------------------------------------------

export function SandboxOverlay() {
  const [mounted, setMounted] = useState(false);
  const isActive = useIsSandboxActive();
  const isRecording = useIsRecording();
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted || !isActive) return null;
  
  const overlayContent = (
    <AnimatePresence>
      {isActive && (
        <>
          {/* Border um den gesamten Screen */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-[99998]"
            style={{
              border: '4px solid rgba(251, 191, 36, 0.5)',
              borderRadius: '8px',
            }}
            data-sandbox-control="true"
          />
          
          {/* Badge oben */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999]"
            data-sandbox-control="true"
          >
            <div className="bg-amber-500 text-black px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
              🏖️ SANDBOX MODUS
              {isRecording && (
                <span className="ml-2 text-red-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                  REC
                </span>
              )}
            </div>
          </motion.div>
          
          {/* Control Panel */}
          <RecordingPanel />
        </>
      )}
    </AnimatePresence>
  );
  
  return createPortal(overlayContent, document.body);
}

export default SandboxOverlay;


