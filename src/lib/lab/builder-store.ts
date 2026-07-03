// ============================================
// builder-store.ts - Module Builder State Management
// 
// Zweck: Zentraler Zustand für den Vibe-Coding Builder
//        Verwaltet Chat, Module, Files und Preview
// Verwendet von: Builder Page, Builder Components
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { 
  BuildingModule, 
  BuilderMessage, 
  BuilderSession,
  ModuleFile,
  BuilderWidget,
  ModuleEventDefinition,
  ModuleTool,
  ModuleSystemPrompt,
  PreviewState,
  ModuleAPI,
  ModuleManifest,
} from './types';
import { validateModuleAPI } from './module-runtime';

// --------------------------------------------
// Store State Interface
// --------------------------------------------

interface BuilderState {
  // Aktuelle Session
  session: BuilderSession;
  // Preview-Status
  preview: PreviewState;
  // Ob gerade generiert wird
  isGenerating: boolean;
  // Gespeicherte Sessions (für späteres Fortsetzen)
  savedSessions: BuilderSession[];
}

// --------------------------------------------
// Store Actions Interface
// --------------------------------------------

interface BuilderActions {
  // === Session Management ===
  startNewSession: () => void;
  loadSession: (sessionId: string) => void;
  saveCurrentSession: () => void;
  deleteSession: (sessionId: string) => void;
  
  // === Chat ===
  addMessage: (message: Omit<BuilderMessage, 'timestamp'> & { id?: string }) => void;
  updateMessage: (messageId: string, updates: Partial<BuilderMessage>) => void;
  clearChat: () => void;
  
  // === Module ===
  initModule: (moduleInfo: Partial<BuildingModule>) => void;
  updateModule: (updates: Partial<BuildingModule>) => void;
  setModuleStatus: (status: BuildingModule['status'], error?: string) => void;
  
  // === Files ===
  addFile: (file: ModuleFile) => void;
  updateFile: (path: string, content: string) => void;
  deleteFile: (path: string) => void;
  selectFile: (path: string | null) => void;
  
  // === Widgets ===
  addWidget: (widget: BuilderWidget) => void;
  updateWidget: (name: string, updates: Partial<BuilderWidget>) => void;
  removeWidget: (name: string) => void;
  
  // === Events ===
  addEvent: (event: ModuleEventDefinition) => void;
  removeEvent: (eventName: string) => void;
  
  // === Tools (Agent-Orchestrierung) ===
  addTool: (tool: ModuleTool) => void;
  updateTool: (toolId: string, updates: Partial<ModuleTool>) => void;
  removeTool: (toolId: string) => void;
  
  // === System Prompt ===
  updateSystemPrompt: (updates: Partial<ModuleSystemPrompt>) => void;
  
  // === Preview ===
  setPreviewActive: (active: boolean) => void;
  addCompileError: (error: string) => void;
  addRuntimeError: (error: string) => void;
  clearPreviewErrors: () => void;
  
  // === UI ===
  setActiveTab: (tab: BuilderSession['activeTab']) => void;
  setGenerating: (generating: boolean) => void;
  
  // === Bulk Operations ===
  applyGeneratedChanges: (
    files: ModuleFile[],
    widgets?: BuilderWidget[],
    events?: ModuleEventDefinition[],
    tools?: ModuleTool[],
    systemPrompt?: Partial<ModuleSystemPrompt>,
    moduleInfo?: Partial<BuildingModule>
  ) => void;
  
  // === Export ===
  getModuleExport: () => BuildingModule | null;
  resetBuilder: () => void;
  
  // === API Extraction ===
  extractAPIFromManifest: () => ModuleAPI | null;
  getAPIValidationErrors: () => string[];
}

// --------------------------------------------
// Initial State
// --------------------------------------------

const createInitialSession = (): BuilderSession => ({
  id: crypto.randomUUID(),
  messages: [],
  module: null,
  selectedFile: null,
  activeTab: 'chat',
  startedAt: Date.now(),
});

const initialState: BuilderState = {
  session: createInitialSession(),
  preview: {
    active: false,
    compileErrors: [],
    runtimeErrors: [],
    lastSuccessfulCompile: null,
  },
  isGenerating: false,
  savedSessions: [],
};

// --------------------------------------------
// Store Implementation
// --------------------------------------------

export const useBuilderStore = create<BuilderState & BuilderActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ========================================
      // Session Management
      // ========================================
      
      startNewSession: () => {
        const { session, savedSessions } = get();
        
        // Aktuelle Session speichern falls Modul existiert
        if (session.module) {
          set({
            savedSessions: [...savedSessions, session],
          });
        }
        
        // Neue Session starten
        set({
          session: createInitialSession(),
          preview: initialState.preview,
          isGenerating: false,
        });
      },

      loadSession: (sessionId: string) => {
        const { savedSessions } = get();
        const session = savedSessions.find(s => s.id === sessionId);
        
        if (session) {
          set({
            session,
            savedSessions: savedSessions.filter(s => s.id !== sessionId),
          });
        }
      },

      saveCurrentSession: () => {
        const { session, savedSessions } = get();
        
        if (session.module) {
          // Entferne alte Version falls vorhanden
          const filtered = savedSessions.filter(s => s.id !== session.id);
          set({
            savedSessions: [...filtered, session],
          });
        }
      },

      deleteSession: (sessionId: string) => {
        set((state) => ({
          savedSessions: state.savedSessions.filter(s => s.id !== sessionId),
        }));
      },

      // ========================================
      // Chat Actions
      // ========================================

      addMessage: (message) => {
        const newMessage: BuilderMessage = {
          ...message,
          id: message.id || crypto.randomUUID(),
          timestamp: Date.now(),
        };
        
        set((state) => ({
          session: {
            ...state.session,
            messages: [...state.session.messages, newMessage],
          },
        }));
        
        return newMessage.id;
      },

      updateMessage: (messageId, updates) => {
        set((state) => ({
          session: {
            ...state.session,
            messages: state.session.messages.map(m =>
              m.id === messageId ? { ...m, ...updates } : m
            ),
          },
        }));
      },

      clearChat: () => {
        set((state) => ({
          session: {
            ...state.session,
            messages: [],
          },
        }));
      },

      // ========================================
      // Module Actions
      // ========================================

      initModule: (moduleInfo) => {
        // Standard System Prompt für neue Module
        const defaultSystemPrompt: ModuleSystemPrompt = {
          description: moduleInfo.description || '',
          capabilities: [],
          limitations: [],
          useCases: [],
          antiPatterns: [],
          exampleInteractions: [],
          dataContext: '',
          priority: 5,
        };
        
        const newModule: BuildingModule = {
          id: moduleInfo.id || '',
          name: moduleInfo.name || '',
          description: moduleInfo.description || '',
          category: moduleInfo.category || 'productivity',
          icon: moduleInfo.icon || 'Blocks',
          version: moduleInfo.version || '1.0.0',
          files: [],
          widgets: [],
          events: [],
          tools: [],
          systemPrompt: moduleInfo.systemPrompt || defaultSystemPrompt,
          permissions: ['storage.read.self', 'storage.write.self'],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          status: 'drafting',
        };
        
        set((state) => ({
          session: {
            ...state.session,
            module: newModule,
          },
        }));
      },

      updateModule: (updates) => {
        set((state) => {
          if (!state.session.module) return state;
          
          return {
            session: {
              ...state.session,
              module: {
                ...state.session.module,
                ...updates,
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      setModuleStatus: (status, error) => {
        set((state) => {
          if (!state.session.module) return state;
          
          return {
            session: {
              ...state.session,
              module: {
                ...state.session.module,
                status,
                error,
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      // ========================================
      // File Actions
      // ========================================

      addFile: (file) => {
        set((state) => {
          if (!state.session.module) return state;
          
          // Prüfe ob Datei bereits existiert
          const existingIndex = state.session.module.files.findIndex(
            f => f.path === file.path
          );
          
          let newFiles: ModuleFile[];
          if (existingIndex >= 0) {
            // Aktualisiere existierende Datei
            newFiles = [...state.session.module.files];
            newFiles[existingIndex] = { ...file, updatedAt: Date.now() };
          } else {
            // Füge neue Datei hinzu
            newFiles = [...state.session.module.files, { ...file, updatedAt: Date.now() }];
          }
          
          return {
            session: {
              ...state.session,
              module: {
                ...state.session.module,
                files: newFiles,
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      updateFile: (path, content) => {
        set((state) => {
          if (!state.session.module) return state;
          
          return {
            session: {
              ...state.session,
              module: {
                ...state.session.module,
                files: state.session.module.files.map(f =>
                  f.path === path 
                    ? { ...f, content, updatedAt: Date.now() }
                    : f
                ),
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      deleteFile: (path) => {
        set((state) => {
          if (!state.session.module) return state;
          
          return {
            session: {
              ...state.session,
              module: {
                ...state.session.module,
                files: state.session.module.files.filter(f => f.path !== path),
                updatedAt: Date.now(),
              },
              selectedFile: state.session.selectedFile === path 
                ? null 
                : state.session.selectedFile,
            },
          };
        });
      },

      selectFile: (path) => {
        set((state) => ({
          session: {
            ...state.session,
            selectedFile: path,
            activeTab: path ? 'code' : state.session.activeTab,
          },
        }));
      },

      // ========================================
      // Widget Actions
      // ========================================

      addWidget: (widget) => {
        set((state) => {
          if (!state.session.module) return state;
          
          // Prüfe ob Widget bereits existiert
          const exists = state.session.module.widgets.some(
            w => w.name === widget.name
          );
          
          if (exists) {
            // Aktualisiere existierendes Widget
            return {
              session: {
                ...state.session,
                module: {
                  ...state.session.module,
                  widgets: state.session.module.widgets.map(w =>
                    w.name === widget.name ? widget : w
                  ),
                  updatedAt: Date.now(),
                },
              },
            };
          }
          
          return {
            session: {
              ...state.session,
              module: {
                ...state.session.module,
                widgets: [...state.session.module.widgets, widget],
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      updateWidget: (name, updates) => {
        set((state) => {
          if (!state.session.module) return state;
          
          return {
            session: {
              ...state.session,
              module: {
                ...state.session.module,
                widgets: state.session.module.widgets.map(w =>
                  w.name === name ? { ...w, ...updates } : w
                ),
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      removeWidget: (name) => {
        set((state) => {
          if (!state.session.module) return state;
          
          return {
            session: {
              ...state.session,
              module: {
                ...state.session.module,
                widgets: state.session.module.widgets.filter(w => w.name !== name),
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      // ========================================
      // Event Actions
      // ========================================

      addEvent: (event) => {
        set((state) => {
          if (!state.session.module) return state;
          
          return {
            session: {
              ...state.session,
              module: {
                ...state.session.module,
                events: [...state.session.module.events, event],
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      removeEvent: (eventName) => {
        set((state) => {
          if (!state.session.module) return state;
          
          return {
            session: {
              ...state.session,
              module: {
                ...state.session.module,
                events: state.session.module.events.filter(e => e.name !== eventName),
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      // ========================================
      // Tool Actions (Agent-Orchestrierung)
      // ========================================

      addTool: (tool) => {
        set((state) => {
          if (!state.session.module) return state;
          
          // Prüfe ob Tool bereits existiert
          const exists = state.session.module.tools.some(t => t.id === tool.id);
          
          if (exists) {
            // Aktualisiere existierendes Tool
            return {
              session: {
                ...state.session,
                module: {
                  ...state.session.module,
                  tools: state.session.module.tools.map(t =>
                    t.id === tool.id ? tool : t
                  ),
                  updatedAt: Date.now(),
                },
              },
            };
          }
          
          return {
            session: {
              ...state.session,
              module: {
                ...state.session.module,
                tools: [...state.session.module.tools, tool],
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      updateTool: (toolId, updates) => {
        set((state) => {
          if (!state.session.module) return state;
          
          return {
            session: {
              ...state.session,
              module: {
                ...state.session.module,
                tools: state.session.module.tools.map(t =>
                  t.id === toolId ? { ...t, ...updates } : t
                ),
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      removeTool: (toolId) => {
        set((state) => {
          if (!state.session.module) return state;
          
          return {
            session: {
              ...state.session,
              module: {
                ...state.session.module,
                tools: state.session.module.tools.filter(t => t.id !== toolId),
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      // ========================================
      // System Prompt Actions
      // ========================================

      updateSystemPrompt: (updates) => {
        set((state) => {
          if (!state.session.module) return state;
          
          return {
            session: {
              ...state.session,
              module: {
                ...state.session.module,
                systemPrompt: {
                  ...state.session.module.systemPrompt,
                  ...updates,
                },
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      // ========================================
      // Preview Actions
      // ========================================

      setPreviewActive: (active) => {
        set((state) => ({
          preview: {
            ...state.preview,
            active,
          },
        }));
      },

      addCompileError: (error) => {
        set((state) => ({
          preview: {
            ...state.preview,
            compileErrors: [...state.preview.compileErrors, error],
          },
        }));
      },

      addRuntimeError: (error) => {
        set((state) => ({
          preview: {
            ...state.preview,
            runtimeErrors: [...state.preview.runtimeErrors, error],
          },
        }));
      },

      clearPreviewErrors: () => {
        set((state) => ({
          preview: {
            ...state.preview,
            compileErrors: [],
            runtimeErrors: [],
          },
        }));
      },

      // ========================================
      // UI Actions
      // ========================================

      setActiveTab: (tab) => {
        set((state) => ({
          session: {
            ...state.session,
            activeTab: tab,
          },
        }));
      },

      setGenerating: (generating) => {
        set({ isGenerating: generating });
      },

      // ========================================
      // Bulk Operations
      // ========================================

      applyGeneratedChanges: (files, widgets, events, tools, systemPrompt, moduleInfo) => {
        set((state) => {
          // Falls kein Modul existiert, erstelle ein neues mit moduleInfo
          const baseModule: BuildingModule = state.session.module || {
            id: moduleInfo?.id || `module-${Date.now()}`,
            name: moduleInfo?.name || 'Neues Modul',
            description: moduleInfo?.description || '',
            version: moduleInfo?.version || '1.0.0',
            category: moduleInfo?.category || 'productivity',
            icon: moduleInfo?.icon || 'Box',
            status: 'generating',
            files: [],
            widgets: [],
            events: [],
            tools: [],
            permissions: [],
            systemPrompt: {
              description: '',
              capabilities: [],
              limitations: [],
              useCases: [],
              antiPatterns: [],
              exampleInteractions: [],
              dataContext: '',
              priority: 5,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          
          // Files aktualisieren/hinzufügen
          const existingFiles = [...baseModule.files];
          for (const file of files) {
            const existingIndex = existingFiles.findIndex(f => f.path === file.path);
            if (existingIndex >= 0) {
              existingFiles[existingIndex] = { ...file, updatedAt: Date.now() };
            } else {
              existingFiles.push({ ...file, updatedAt: Date.now() });
            }
          }
          
          // Widgets aktualisieren falls vorhanden
          let newWidgets = baseModule.widgets;
          if (widgets) {
            for (const widget of widgets) {
              const existingIndex = newWidgets.findIndex(w => w.name === widget.name);
              if (existingIndex >= 0) {
                newWidgets = newWidgets.map((w, i) => i === existingIndex ? widget : w);
              } else {
                newWidgets = [...newWidgets, widget];
              }
            }
          }
          
          // Events aktualisieren falls vorhanden
          let newEvents = baseModule.events;
          if (events) {
            for (const event of events) {
              const exists = newEvents.some(e => e.name === event.name);
              if (!exists) {
                newEvents = [...newEvents, event];
              }
            }
          }
          
          // Tools aktualisieren falls vorhanden
          let newTools = baseModule.tools;
          if (tools) {
            for (const tool of tools) {
              const existingIndex = newTools.findIndex(t => t.id === tool.id);
              if (existingIndex >= 0) {
                newTools = newTools.map((t, i) => i === existingIndex ? tool : t);
              } else {
                newTools = [...newTools, tool];
              }
            }
          }
          
          // System Prompt aktualisieren falls vorhanden
          const newSystemPrompt = systemPrompt 
            ? { ...baseModule.systemPrompt, ...systemPrompt }
            : baseModule.systemPrompt;
          
          return {
            session: {
              ...state.session,
              module: {
                ...baseModule,
                ...moduleInfo,
                files: existingFiles,
                widgets: newWidgets,
                events: newEvents,
                tools: newTools,
                systemPrompt: newSystemPrompt,
                updatedAt: Date.now(),
              },
            },
            preview: {
              ...state.preview,
              lastSuccessfulCompile: Date.now(),
            },
          };
        });
      },

      // ========================================
      // Export & Reset
      // ========================================

      getModuleExport: () => {
        return get().session.module;
      },

      resetBuilder: () => {
        set({
          ...initialState,
          session: createInitialSession(),
          savedSessions: get().savedSessions,
        });
      },
      
      // ========================================
      // API Extraction & Validation
      // ========================================
      
      extractAPIFromManifest: () => {
        const { session } = get();
        if (!session.module) return null;
        
        // Finde module.json in den Dateien
        const manifestFile = session.module.files.find(
          f => f.path.endsWith('module.json')
        );
        
        if (!manifestFile) return null;
        
        try {
          const manifest = JSON.parse(manifestFile.content) as ModuleManifest;
          return manifest.api || null;
        } catch (error) {
          console.error('[BuilderStore] Fehler beim Parsen von module.json:', error);
          return null;
        }
      },
      
      getAPIValidationErrors: () => {
        const { session } = get();
        if (!session.module) return ['Kein Modul vorhanden'];
        
        // Finde module.json in den Dateien
        const manifestFile = session.module.files.find(
          f => f.path.endsWith('module.json')
        );
        
        if (!manifestFile) return ['module.json nicht gefunden'];
        
        try {
          const manifest = JSON.parse(manifestFile.content) as ModuleManifest;
          
          if (!manifest.api) {
            return []; // API ist optional, also keine Fehler
          }
          
          return validateModuleAPI(manifest.api);
        } catch (error) {
          return [`JSON Parse Error: ${(error as Error).message}`];
        }
      },
    }),
    {
      name: 'lifeos-module-builder',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        savedSessions: state.savedSessions,
        // Aktuelle Session nicht persistieren (nur gespeicherte)
      }),
    }
  )
);

// ============================================
// Selectors (Performance-optimiert)
// ============================================

export const useBuilderSession = () => 
  useBuilderStore((state) => state.session);

export const useBuilderModule = () => 
  useBuilderStore((state) => state.session.module);

export const useBuilderMessages = () => 
  useBuilderStore((state) => state.session.messages);

// Leere Arrays als stabile Referenzen (vermeidet React-Infinite-Loop)
const EMPTY_FILES: ModuleFile[] = [];
const EMPTY_WIDGETS: BuilderWidget[] = [];
const EMPTY_TOOLS: ModuleTool[] = [];

export const useBuilderFiles = () => 
  useBuilderStore((state) => state.session.module?.files ?? EMPTY_FILES);

export const useBuilderWidgets = () => 
  useBuilderStore((state) => state.session.module?.widgets ?? EMPTY_WIDGETS);

export const useBuilderTools = () => 
  useBuilderStore((state) => state.session.module?.tools ?? EMPTY_TOOLS);

export const useBuilderSystemPrompt = () => 
  useBuilderStore((state) => state.session.module?.systemPrompt);

export const useSelectedFile = () => 
  useBuilderStore((state) => {
    const { selectedFile, module } = state.session;
    if (!selectedFile || !module) return null;
    return module.files.find(f => f.path === selectedFile) ?? null;
  });

export const useIsGenerating = () => 
  useBuilderStore((state) => state.isGenerating);

export const usePreviewState = () => 
  useBuilderStore((state) => state.preview);

