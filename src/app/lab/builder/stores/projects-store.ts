// ============================================
// LifeOS Module Builder - Projects Store
// 
// Zweck: Speichert alle Builder-Projekte mit erweiterten Einstellungen
// Features: API Keys, Tools, Metadaten, Custom Prompts
// Persistiert in localStorage
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// --------------------------------------------
// Typen für API Keys
// --------------------------------------------

export interface ApiKeyConfig {
  id: string;
  name: string;              // z.B. "OpenAI", "Spotify"
  key: string;               // Der API Key (verschleiert gespeichert)
  service: string;           // Service-Identifier
  description?: string;      // Wofür wird er verwendet?
  isConfigured: boolean;
}

// --------------------------------------------
// Typen für Module Tools/Actions
// --------------------------------------------

export interface ModuleToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  default?: any;
}

export interface ModuleTool {
  id: string;
  name: string;              // z.B. "add_contact"
  description: string;       // Was macht dieses Tool?
  parameters: ModuleToolParameter[];
  returns?: {
    type: string;
    description: string;
  };
  // Für Agent-Orchestrierung
  canBeCalledBy: 'agents' | 'modules' | 'both';
}

export interface ModuleEvent {
  id: string;
  name: string;              // z.B. "contact_created"
  description: string;
  payload: ModuleToolParameter[];
}

// --------------------------------------------
// Typen für Metadaten
// --------------------------------------------

export interface ModuleMetadata {
  id: string;
  name: string;
  description: string;
  icon: string;              // Lucide Icon Name
  category: 'productivity' | 'health' | 'finance' | 'social' | 'creative' | 'games' | 'tools' | 'other';
  version: string;
  author: string;
  tags: string[];
  // Erweiterte Metadaten
  license?: string;
  repository?: string;
  homepage?: string;
}

// --------------------------------------------
// Typen für Custom Prompt
// --------------------------------------------

export interface CustomPromptConfig {
  enabled: boolean;
  systemPrompt: string;      // Zusätzlicher Kontext für die AI
  constraints: string[];     // Spezielle Einschränkungen
  examples: string[];        // Beispiel-Interaktionen
}

// --------------------------------------------
// Actionable Options (für Discuss-Mode)
// --------------------------------------------

export interface ActionOption {
  id: string;
  label: string;
  description: string;
  buildPrompt: string;
}

// --------------------------------------------
// Chat-Nachricht
// --------------------------------------------

export interface ProjectMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  options?: ActionOption[];
}

export interface ProjectBaseBinding {
  enabled: boolean;
  baseId: string;
  baseName: string;
  baseDescription: string;
  source: 'existing' | 'new';
}

// --------------------------------------------
// Haupttyp: Builder Project
// --------------------------------------------

export interface BuilderProject {
  id: string;
  name: string;
  description: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
  
  // Chat-Nachrichten
  messages: ProjectMessage[];
  
  // Generierte Dateien
  files: Record<string, {
    type: 'file' | 'folder';
    content?: string;
  }>;
  
  // Status
  status: 'draft' | 'building' | 'completed' | 'published';
  
  // Veröffentlichungs-Info
  publishInfo?: {
    visibility: 'private' | 'public';
    publishedAt: string;
    version: string;
  };
  
  // =====================================
  // ERWEITERTE EINSTELLUNGEN
  // =====================================
  
  // Modul-Metadaten
  moduleInfo?: ModuleMetadata;
  
  // API Keys für externe Dienste
  apiKeys: ApiKeyConfig[];
  
  // Tools/Actions für Agent-Orchestrierung
  tools: ModuleTool[];
  
  // Events die das Modul emittiert
  events: ModuleEvent[];
  
  // Custom System Prompt
  customPrompt: CustomPromptConfig;

  // Optionale Base-Bindung fuer den gesamten Projekt-Lifecycle
  baseBinding?: ProjectBaseBinding;
}

interface ProjectsState {
  projects: BuilderProject[];
  currentProjectId: string | null;
  
  // Basis-Actions
  createProject: (
    name: string,
    description?: string,
    options?: { baseBinding?: ProjectBaseBinding }
  ) => string;
  updateProject: (id: string, updates: Partial<BuilderProject>) => void;
  deleteProject: (id: string) => void;
  setCurrentProject: (id: string | null) => void;
  getCurrentProject: () => BuilderProject | null;
  
  // Nachrichten
  addMessage: (projectId: string, message: Omit<ProjectMessage, 'id' | 'timestamp'>) => void;
  updateMessage: (projectId: string, messageId: string, content: string, options?: ActionOption[]) => void;
  
  // Dateien
  setFile: (projectId: string, path: string, content: string) => void;
  clearFiles: (projectId: string) => void;
  
  // Modul-Info / Metadaten
  setModuleInfo: (projectId: string, info: ModuleMetadata | undefined) => void;
  updateModuleMetadata: (projectId: string, updates: Partial<ModuleMetadata>) => void;
  
  // API Keys
  addApiKey: (projectId: string, apiKey: Omit<ApiKeyConfig, 'id'>) => void;
  updateApiKey: (projectId: string, keyId: string, updates: Partial<ApiKeyConfig>) => void;
  removeApiKey: (projectId: string, keyId: string) => void;
  
  // Tools
  addTool: (projectId: string, tool: Omit<ModuleTool, 'id'>) => void;
  updateTool: (projectId: string, toolId: string, updates: Partial<ModuleTool>) => void;
  removeTool: (projectId: string, toolId: string) => void;
  
  // Events
  addEvent: (projectId: string, event: Omit<ModuleEvent, 'id'>) => void;
  updateEvent: (projectId: string, eventId: string, updates: Partial<ModuleEvent>) => void;
  removeEvent: (projectId: string, eventId: string) => void;
  
  // Custom Prompt
  updateCustomPrompt: (projectId: string, config: Partial<CustomPromptConfig>) => void;
  
  // Veröffentlichung
  publishProject: (projectId: string, visibility: 'private' | 'public') => Promise<boolean>;
  unpublishProject: (projectId: string) => void;
}

// --------------------------------------------
// Store mit Persistenz
// --------------------------------------------

// --------------------------------------------
// Default-Werte für neue Projekte
// --------------------------------------------

const DEFAULT_CUSTOM_PROMPT: CustomPromptConfig = {
  enabled: false,
  systemPrompt: '',
  constraints: [],
  examples: [],
};

// --------------------------------------------
// Store mit Persistenz
// --------------------------------------------

export const useProjectsStore = create<ProjectsState>()(
  persist(
    (set, get) => {
      return {
      projects: [],
      currentProjectId: null,
      
      // Neues Projekt erstellen
      createProject: (name, description = '', options) => {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        
        const newProject: BuilderProject = {
          id,
          name,
          description,
          createdAt: now,
          updatedAt: now,
          messages: [],
          files: {},
          status: 'draft',
          // Neue erweiterte Felder
          apiKeys: [],
          tools: [],
          events: [],
          customPrompt: { ...DEFAULT_CUSTOM_PROMPT },
          baseBinding: options?.baseBinding,
          // moduleInfo wird später gesetzt, wenn das Modul generiert wird
          moduleInfo: undefined,
        };
        
        set((state) => ({
          projects: [newProject, ...state.projects],
          currentProjectId: id,
        }));
        
        return id;
      },
      
      // Projekt aktualisieren
      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id
              ? { ...p, ...updates, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },
      
      // Projekt löschen
      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
        }));
      },
      
      // Aktuelles Projekt setzen
      setCurrentProject: (id) => {
        set({ currentProjectId: id });
      },
      
      // Aktuelles Projekt holen
      getCurrentProject: () => {
        const { projects, currentProjectId } = get();
        return projects.find((p) => p.id === currentProjectId) || null;
      },
      
      // Nachricht hinzufügen
      addMessage: (projectId, message) => {
        const newMessage = {
          ...message,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        };
        
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  messages: [...p.messages, newMessage],
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },
      
      // Nachricht aktualisieren
      updateMessage: (projectId, messageId, content, options) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  messages: p.messages.map((m) =>
                    m.id === messageId 
                      ? { ...m, content, ...(options !== undefined && { options }) } 
                      : m
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },
      
      // Datei setzen
      setFile: (projectId, path, content) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  files: {
                    ...p.files,
                    [path]: { type: 'file', content },
                  },
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },
      
      // Dateien löschen
      clearFiles: (projectId) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, files: {}, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },
      
      // Modul-Info setzen
      setModuleInfo: (projectId, info) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  moduleInfo: info,
                  name: info?.name || p.name,
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },
      
      // Metadaten aktualisieren
      updateModuleMetadata: (projectId, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  moduleInfo: p.moduleInfo 
                    ? { ...p.moduleInfo, ...updates }
                    : { 
                        id: p.id, 
                        name: p.name, 
                        description: p.description,
                        icon: 'Blocks',
                        category: 'other' as const,
                        version: '1.0.0',
                        author: 'User',
                        tags: [],
                        ...updates 
                      },
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },
      
      // =====================================
      // API Keys Management
      // =====================================
      
      addApiKey: (projectId, apiKey) => {
        const newKey: ApiKeyConfig = {
          ...apiKey,
          id: crypto.randomUUID(),
        };
        
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  apiKeys: [...(p.apiKeys || []), newKey],
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },
      
      updateApiKey: (projectId, keyId, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  apiKeys: (p.apiKeys || []).map((k) =>
                    k.id === keyId ? { ...k, ...updates } : k
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },
      
      removeApiKey: (projectId, keyId) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  apiKeys: (p.apiKeys || []).filter((k) => k.id !== keyId),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },
      
      // =====================================
      // Tools Management
      // =====================================
      
      addTool: (projectId, tool) => {
        const newTool: ModuleTool = {
          ...tool,
          id: crypto.randomUUID(),
        };
        
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  tools: [...(p.tools || []), newTool],
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },
      
      updateTool: (projectId, toolId, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  tools: (p.tools || []).map((t) =>
                    t.id === toolId ? { ...t, ...updates } : t
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },
      
      removeTool: (projectId, toolId) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  tools: (p.tools || []).filter((t) => t.id !== toolId),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },
      
      // =====================================
      // Events Management
      // =====================================
      
      addEvent: (projectId, event) => {
        const newEvent: ModuleEvent = {
          ...event,
          id: crypto.randomUUID(),
        };
        
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  events: [...(p.events || []), newEvent],
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },
      
      updateEvent: (projectId, eventId, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  events: (p.events || []).map((e) =>
                    e.id === eventId ? { ...e, ...updates } : e
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },
      
      removeEvent: (projectId, eventId) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  events: (p.events || []).filter((e) => e.id !== eventId),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },
      
      // =====================================
      // Custom Prompt Management
      // =====================================
      
      updateCustomPrompt: (projectId, config) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  customPrompt: { ...(p.customPrompt || DEFAULT_CUSTOM_PROMPT), ...config },
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },
      
      // =====================================
      // Veröffentlichung
      // =====================================
      
      publishProject: async (projectId, visibility) => {
        const project = get().projects.find((p) => p.id === projectId);
        if (!project) return false;

        // Konvertiere files von Record zu Array-Format
        const filesArray = Object.entries(project.files || {})
          .filter(([_, entry]) => entry?.type === 'file')
          .map(([path, entry]) => ({
            path,
            content: (entry as { content: string }).content,
          }));
        
        // API aufrufen um Modul zu veröffentlichen
        const response = await fetch('/api/lab/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            module: {
              id: project.moduleInfo?.id || project.id,
              name: project.moduleInfo?.name || project.name,
              description: project.moduleInfo?.description || project.description,
              icon: project.moduleInfo?.icon || 'Blocks',
              category: project.moduleInfo?.category || 'productivity',
              version: project.moduleInfo?.version || '1.0.0',
              baseId:
                project.baseBinding?.enabled && project.baseBinding.baseId
                  ? project.baseBinding.baseId
                  : undefined,
              files: filesArray,
              tools: project.tools,
            },
            overwrite: true, // Bei Veröffentlichung immer überschreiben
            visibility, // NEU: private oder public
          }),
        });
        
        if (!response.ok) {
          let errorMessage = 'Veröffentlichung fehlgeschlagen';
          try {
            const errorData = await response.json();
            const details = errorData?.message || errorData?.error;
            if (typeof details === 'string' && details.trim().length > 0) {
              errorMessage = details;
            }

            if (Array.isArray(errorData?.invalidImports) && errorData.invalidImports.length > 0) {
              const importHints = errorData.invalidImports
                .slice(0, 5)
                .map((entry: { filePath: string; icon: string; line: number }) => `- ${entry.filePath}:${entry.line} → ${entry.icon}`)
                .join('\n');
              errorMessage = `${errorMessage}\n\nUngültige Icon-Imports:\n${importHints}`;
            }
          } catch {
            // JSON parse kann fehlschlagen; dann bleibt default errorMessage
          }
          throw new Error(errorMessage);
        }
        
        // Status aktualisieren
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  status: 'published' as const,
                  publishInfo: {
                    visibility,
                    publishedAt: new Date().toISOString(),
                    version: project.moduleInfo?.version || '1.0.0',
                  },
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
        
        return true;
      },
      
      unpublishProject: (projectId) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  status: 'completed' as const,
                  publishInfo: undefined,
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },
      };
    },
    {
      name: 'lifeos-builder-projects',
      // Migration für bestehende Projekte
      migrate: (persistedState: any, version: number) => {
        if (persistedState.projects) {
          persistedState.projects = persistedState.projects.map((p: any) => ({
            ...p,
            apiKeys: p.apiKeys || [],
            tools: p.tools || [],
            events: p.events || [],
            customPrompt: p.customPrompt || DEFAULT_CUSTOM_PROMPT,
            baseBinding: p.baseBinding
              ? {
                  enabled: p.baseBinding.enabled !== false,
                  baseId: p.baseBinding.baseId || '',
                  baseName: p.baseBinding.baseName || '',
                  baseDescription: p.baseBinding.baseDescription || '',
                  source: p.baseBinding.source === 'new' ? 'new' : 'existing',
                }
              : undefined,
            // Migration: 'activated' → 'published' mit publishInfo
            status: p.status === 'activated' ? 'published' : (p.status || 'draft'),
            publishInfo: p.status === 'activated' 
              ? { visibility: 'private', publishedAt: p.updatedAt, version: '1.0.0' }
              : p.publishInfo,
          }));
        }
        return persistedState;
      },
      version: 4, // Erhöht für Base-Binding Migration
    }
  )
);
