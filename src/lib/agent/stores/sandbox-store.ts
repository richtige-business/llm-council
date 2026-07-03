// ============================================
// sandbox-store.ts - Teaching Sandbox State Management
// 
// Zweck: Verwaltet den Sandbox-Modus für "Teach by Doing"
//        Isolierter State mit Mock-Daten
// Verwendet von: SandboxOverlay, AgentSettings
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// --------------------------------------------
// Typen für aufgezeichnete Aktionen
// --------------------------------------------

export interface RecordedAction {
  id: string;
  timestamp: number;
  type: 'click' | 'input' | 'change' | 'submit' | 'navigation' | 'keypress' | 'select';
  target: {
    selector: string;
    tagName: string;
    text?: string;
    placeholder?: string;
    ariaLabel?: string;
    dataAgentId?: string;
    className?: string;
  };
  value?: string;
  key?: string;
  url?: string;
}

// --------------------------------------------
// Typen für gelernte Workflows
// --------------------------------------------

export interface WorkflowVariable {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'email' | 'select';
  description?: string;
  defaultValue?: string;
  required: boolean;
  // Wo wurde der Wert extrahiert?
  sourceStep: number;
  sourceField: string;
}

export interface LearnedWorkflow {
  id: string;
  name: string;
  description: string;
  triggerPhrases: string[];
  steps: RecordedAction[];
  variables: WorkflowVariable[];
  createdAt: string;
  lastUsedAt?: string;
  successCount: number;
  failureCount: number;
  moduleId: string;
}

// --------------------------------------------
// Mock Data Typen
// --------------------------------------------

export interface MockCalendarEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  description?: string;
  category?: string;
}

export interface MockEmail {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: string;
  read: boolean;
}

export interface MockContact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
}

export interface SandboxMockData {
  events: MockCalendarEvent[];
  emails: MockEmail[];
  contacts: MockContact[];
}

// --------------------------------------------
// Custom Tool Typen
// --------------------------------------------

export type CustomToolActionType = 
  | { type: 'click'; selector: string }
  | { type: 'navigation'; url: string }
  | { type: 'input'; selector: string; value: string }
  | { type: 'workflow'; workflowId: string }
  | { type: 'api'; endpoint: string; method: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: string };

export interface CustomTool {
  id: string;
  name: string;
  description: string;
  moduleId: string;
  action: CustomToolActionType;
  parameters: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean';
    description: string;
    required: boolean;
    default?: string;
  }>;
  createdAt: string;
  enabled: boolean;
}

// --------------------------------------------
// Discovered Element Typen
// --------------------------------------------

export interface DiscoveredElement {
  id: string;
  selector: string;
  tagName: string;
  text?: string;
  ariaLabel?: string;
  dataAgentId?: string;
  role?: string;
  type?: string; // input type
  placeholder?: string;
  suggestedAction: 'click' | 'input' | 'select' | 'navigate';
  confidence: number; // 0-1, wie sicher sind wir dass das ein Tool sein könnte
}

// --------------------------------------------
// Store State Interface
// --------------------------------------------

interface SandboxState {
  // ========================================
  // Sandbox Modus
  // ========================================
  isActive: boolean;
  isRecording: boolean;
  recordedActions: RecordedAction[];
  
  // Mock Data für Sandbox
  mockData: SandboxMockData;
  
  // Analysierter Workflow (nach Recording)
  analyzedWorkflow: LearnedWorkflow | null;
  
  // ========================================
  // Gelernte Workflows (persistent)
  // ========================================
  learnedWorkflows: LearnedWorkflow[];
  
  // ========================================
  // Custom Tools (persistent)
  // ========================================
  customTools: CustomTool[];
  
  // ========================================
  // Discovery
  // ========================================
  discoveredElements: DiscoveredElement[];
  isDiscovering: boolean;
  
  // ========================================
  // Actions - Sandbox
  // ========================================
  enterSandbox: () => void;
  exitSandbox: () => void;
  startRecording: () => void;
  stopRecording: () => void;
  addRecordedAction: (action: Omit<RecordedAction, 'id' | 'timestamp'>) => void;
  clearRecording: () => void;
  setAnalyzedWorkflow: (workflow: LearnedWorkflow | null) => void;
  resetMockData: () => void;
  
  // ========================================
  // Actions - Workflows
  // ========================================
  saveWorkflow: (workflow: LearnedWorkflow) => void;
  updateWorkflow: (id: string, updates: Partial<LearnedWorkflow>) => void;
  deleteWorkflow: (id: string) => void;
  incrementWorkflowSuccess: (id: string) => void;
  incrementWorkflowFailure: (id: string) => void;
  
  // ========================================
  // Actions - Custom Tools
  // ========================================
  addCustomTool: (tool: Omit<CustomTool, 'id' | 'createdAt'>) => void;
  updateCustomTool: (id: string, updates: Partial<CustomTool>) => void;
  deleteCustomTool: (id: string) => void;
  toggleCustomTool: (id: string) => void;
  
  // ========================================
  // Actions - Discovery
  // ========================================
  startDiscovery: () => void;
  stopDiscovery: () => void;
  setDiscoveredElements: (elements: DiscoveredElement[]) => void;
  createToolFromDiscovery: (element: DiscoveredElement) => void;
}

// --------------------------------------------
// Mock Data Generator
// --------------------------------------------

function generateMockData(): SandboxMockData {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return {
    events: [
      {
        id: 'mock-event-1',
        title: '📋 Team Meeting (Beispiel)',
        startDate: `${today.toISOString().split('T')[0]}T10:00:00`,
        endDate: `${today.toISOString().split('T')[0]}T11:00:00`,
        description: 'Wöchentliches Team-Meeting',
        category: 'work',
      },
      {
        id: 'mock-event-2',
        title: '🍽️ Mittagspause (Beispiel)',
        startDate: `${today.toISOString().split('T')[0]}T12:00:00`,
        endDate: `${today.toISOString().split('T')[0]}T13:00:00`,
        category: 'personal',
      },
      {
        id: 'mock-event-3',
        title: '📞 Call mit Kunde (Beispiel)',
        startDate: `${tomorrow.toISOString().split('T')[0]}T14:00:00`,
        endDate: `${tomorrow.toISOString().split('T')[0]}T15:00:00`,
        description: 'Projektbesprechung',
        category: 'work',
      },
    ],
    emails: [
      {
        id: 'mock-email-1',
        from: 'max.mustermann@beispiel.de',
        to: 'ich@lifeos.de',
        subject: 'Rechnung #12345 (Beispiel)',
        body: 'Guten Tag,\n\nanbei sende ich Ihnen die Rechnung für den vergangenen Monat.\n\nMit freundlichen Grüßen,\nMax Mustermann',
        date: today.toISOString(),
        read: false,
      },
      {
        id: 'mock-email-2',
        from: 'lisa.beispiel@firma.de',
        to: 'ich@lifeos.de',
        subject: 'Projektupdate (Beispiel)',
        body: 'Hi,\n\nhier ein kurzes Update zum aktuellen Projektstand...',
        date: today.toISOString(),
        read: true,
      },
    ],
    contacts: [
      { id: 'mock-contact-1', name: 'Max Mustermann', email: 'max@beispiel.de', phone: '+49 123 456789', company: 'Beispiel GmbH' },
      { id: 'mock-contact-2', name: 'Lisa Beispiel', email: 'lisa@firma.de', company: 'Firma AG' },
      { id: 'mock-contact-3', name: 'Tom Testmann', email: 'tom@test.de', phone: '+49 987 654321' },
    ],
  };
}

// --------------------------------------------
// Store erstellen
// --------------------------------------------

export const useSandboxStore = create<SandboxState>()(
  persist(
    (set, get) => ({
      // ========================================
      // Initial State
      // ========================================
      isActive: false,
      isRecording: false,
      recordedActions: [],
      mockData: generateMockData(),
      analyzedWorkflow: null,
      learnedWorkflows: [],
      customTools: [],
      discoveredElements: [],
      isDiscovering: false,
      
      // ========================================
      // Sandbox Actions
      // ========================================
      
      enterSandbox: () => {
        console.log('🏖️ Sandbox-Modus aktiviert');
        set({
          isActive: true,
          mockData: generateMockData(),
          recordedActions: [],
          analyzedWorkflow: null,
        });
      },
      
      exitSandbox: () => {
        console.log('🏖️ Sandbox-Modus beendet');
        set({
          isActive: false,
          isRecording: false,
          recordedActions: [],
          analyzedWorkflow: null,
        });
      },
      
      startRecording: () => {
        console.log('🎬 Recording gestartet');
        set({
          isRecording: true,
          recordedActions: [],
        });
      },
      
      stopRecording: () => {
        console.log('🎬 Recording gestoppt');
        console.log('📝 Aufgezeichnete Aktionen:', get().recordedActions.length);
        set({ isRecording: false });
      },
      
      addRecordedAction: (action) => {
        const newAction: RecordedAction = {
          ...action,
          id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
        };
        
        console.log('📝 Action aufgezeichnet:', newAction.type, newAction.target.selector);
        
        set((state) => ({
          recordedActions: [...state.recordedActions, newAction],
        }));
      },
      
      clearRecording: () => {
        set({ recordedActions: [], analyzedWorkflow: null });
      },
      
      setAnalyzedWorkflow: (workflow) => {
        set({ analyzedWorkflow: workflow });
      },
      
      resetMockData: () => {
        set({ mockData: generateMockData() });
      },
      
      // ========================================
      // Workflow Actions
      // ========================================
      
      saveWorkflow: (workflow) => {
        console.log('💾 Workflow gespeichert:', workflow.name);
        set((state) => ({
          learnedWorkflows: [...state.learnedWorkflows, workflow],
          analyzedWorkflow: null,
        }));
      },
      
      updateWorkflow: (id, updates) => {
        set((state) => ({
          learnedWorkflows: state.learnedWorkflows.map((w) =>
            w.id === id ? { ...w, ...updates } : w
          ),
        }));
      },
      
      deleteWorkflow: (id) => {
        set((state) => ({
          learnedWorkflows: state.learnedWorkflows.filter((w) => w.id !== id),
        }));
      },
      
      incrementWorkflowSuccess: (id) => {
        set((state) => ({
          learnedWorkflows: state.learnedWorkflows.map((w) =>
            w.id === id
              ? { ...w, successCount: w.successCount + 1, lastUsedAt: new Date().toISOString() }
              : w
          ),
        }));
      },
      
      incrementWorkflowFailure: (id) => {
        set((state) => ({
          learnedWorkflows: state.learnedWorkflows.map((w) =>
            w.id === id
              ? { ...w, failureCount: w.failureCount + 1, lastUsedAt: new Date().toISOString() }
              : w
          ),
        }));
      },
      
      // ========================================
      // Custom Tool Actions
      // ========================================
      
      addCustomTool: (tool) => {
        const newTool: CustomTool = {
          ...tool,
          id: `custom-tool-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        
        console.log('🔧 Custom Tool erstellt:', newTool.name);
        
        set((state) => ({
          customTools: [...state.customTools, newTool],
        }));
      },
      
      updateCustomTool: (id, updates) => {
        set((state) => ({
          customTools: state.customTools.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        }));
      },
      
      deleteCustomTool: (id) => {
        set((state) => ({
          customTools: state.customTools.filter((t) => t.id !== id),
        }));
      },
      
      toggleCustomTool: (id) => {
        set((state) => ({
          customTools: state.customTools.map((t) =>
            t.id === id ? { ...t, enabled: !t.enabled } : t
          ),
        }));
      },
      
      // ========================================
      // Discovery Actions
      // ========================================
      
      startDiscovery: () => {
        console.log('🔍 Discovery gestartet');
        set({ isDiscovering: true, discoveredElements: [] });
      },
      
      stopDiscovery: () => {
        console.log('🔍 Discovery gestoppt');
        set({ isDiscovering: false });
      },
      
      setDiscoveredElements: (elements) => {
        console.log('🔍 Elemente entdeckt:', elements.length);
        set({ discoveredElements: elements });
      },
      
      createToolFromDiscovery: (element) => {
        const tool: Omit<CustomTool, 'id' | 'createdAt'> = {
          name: element.text || element.ariaLabel || `Tool für ${element.tagName}`,
          description: `Automatisch entdeckt: ${element.suggestedAction} auf ${element.selector}`,
          moduleId: 'custom',
          action: element.suggestedAction === 'click'
            ? { type: 'click', selector: element.selector }
            : element.suggestedAction === 'navigate'
            ? { type: 'navigation', url: element.selector }
            : { type: 'input', selector: element.selector, value: '' },
          parameters: [],
          enabled: true,
        };
        
        get().addCustomTool(tool);
      },
    }),
    {
      name: 'lifeos-sandbox-store',
      // Nur persistente Daten speichern (nicht den aktiven Sandbox-Zustand)
      partialize: (state) => ({
        learnedWorkflows: state.learnedWorkflows,
        customTools: state.customTools,
      }),
    }
  )
);

// --------------------------------------------
// Selektoren
// --------------------------------------------

export const useIsSandboxActive = () => useSandboxStore((state) => state.isActive);
export const useIsRecording = () => useSandboxStore((state) => state.isRecording);
export const useRecordedActions = () => useSandboxStore((state) => state.recordedActions);
export const useMockData = () => useSandboxStore((state) => state.mockData);
export const useAnalyzedWorkflow = () => useSandboxStore((state) => state.analyzedWorkflow);
export const useLearnedWorkflows = () => useSandboxStore((state) => state.learnedWorkflows);
export const useCustomTools = () => useSandboxStore((state) => state.customTools);
export const useDiscoveredElements = () => useSandboxStore((state) => state.discoveredElements);
export const useIsDiscovering = () => useSandboxStore((state) => state.isDiscovering);


