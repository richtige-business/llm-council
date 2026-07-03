// ============================================
// LifeOS Module Builder - Zustand Stores Index
// 
// Zweck: Re-exportiert alle Builder-Stores
// Verwendet von: Builder-Komponenten
// ============================================

export * from './chat-store';
export * from './workbench-store';
export * from './files-store';
// ActionOption ist in chat-store und projects-store doppelt definiert
// Deshalb exportieren wir hier spezifisch ohne ActionOption
export {
  useProjectsStore,
  type ApiKeyConfig,
  type ModuleToolParameter,
  type ModuleTool,
  type ModuleEvent,
  type ModuleMetadata,
  type CustomPromptConfig,
  type ProjectMessage,
  type BuilderProject,
} from './projects-store';

