// ============================================
// index.ts - Haupt-Export für das Training-Modul
// 
// Zweck: Zentraler Einstiegspunkt für alle Exports
// Verwendet von: App-Layout, Sidebar, Lab-Page
// ============================================

// --------------------------------------------
// Re-Exports
// --------------------------------------------

// Types exportieren
export type {
  // Basis-Typen
  ModelType,
  ModelStatus,
  DatasetType,
  DatasetSource,
  DatasetStatus,
  TrainingMethod,
  JobStatus,
  GPUProvider,
  SandboxStatus,
  FeedbackRating,
  OutputType,
  TrainingVisualizationKind,
  TrainingCategory,
  LLMTrainingSubmode,
  AgentTrainingSubmode,
  DatasetStudioSubmode,
  TrainingSubmode,
  LLMWorkspaceTab,
  AgentWorkspaceTab,
  DatasetWorkspaceTab,
  TrainingWorkspaceTab,
  
  // Modell-Typen
  TrainingModel,
  TrainingConfig,
  ModelMetrics,
  
  // Dataset-Typen
  Dataset,
  DatasetSchema,
  DatasetMetadata,
  PIIWarning,
  DatasetRow,
  
  // Job-Typen
  TrainingJob,
  TrainingLogEntry,
  JobMetrics,
  
  // Sandbox-Typen
  SandboxSession,
  SandboxMockData,
  MockContact,
  MockEmail,
  MockCalendarEvent,
  SandboxPrompt,
  ChainOfThoughtStep,
  ToolCall,
  SandboxFeedback,
  
  // Budget
  BudgetLimit,
  
  // API-Typen
  CreateModelRequest,
  CreateDatasetRequest,
  AddDatasetRowsRequest,
  StartTrainingRequest,
  CreateSandboxRequest,
  SandboxInferenceRequest,
  CreateFeedbackRequest,
  GenerateSyntheticRequest,
  
  // Store-Typen
  TrainingState,
  TrainingActions,
  TrainingStore,
} from './types';

// Store und Selektoren exportieren
export {
  useTrainingStore,
  useSelectedModel,
  useSelectedDataset,
  useActiveSession,
  useActiveJob,
  useRunningJobs,
  useModelsByType,
  useDatasetsByType,
  useReadyDatasets,
  useActiveSessions,
  hydrateTrainingStore,
} from './store';

// Konstanten exportieren
export {
  TRAINING_MODULE_INFO,
  BASE_MODELS,
  DEFAULT_TRAINING_CONFIG,
  TRAINING_CONFIG_PRESETS,
  DATASET_TYPE_INFO,
  GPU_PROVIDER_INFO,
  TRAINING_METHOD_INFO,
  TRAINING_CATEGORY_INFO,
  TRAINING_SUBMODE_INFO,
  TRAINING_SUBMODES_BY_CATEGORY,
  TRAINING_WORKSPACE_TABS,
  TRAINING_DEFAULT_WORKSPACE_TAB,
  TRAINING_SUBMODE_DEFAULT_TAB,
  MODEL_TYPE_INFO,
  SANDBOX_MOCK_PRESETS,
  TRAINING_TABS,
  STATUS_COLORS,
  RATING_COLORS,
  COST_ESTIMATES,
} from './constants';

// --------------------------------------------
// Modul-Registration Funktion
// --------------------------------------------

import { TRAINING_MODULE_INFO } from './constants';
import type { Module, Tool, Widget } from '@/types';

/**
 * Erstellt das vollständige Modul-Objekt für die Registry
 */
export function createTrainingModule(): Module {
  const trainingModule: Module = {
    ...TRAINING_MODULE_INFO,
    
    // Tools (Hauptansichten im Modul)
    tools: [
      {
        id: 'training-main',
        moduleId: 'training',
        name: 'Training Center',
        description: 'Modelle trainieren und in der Sandbox testen',
        version: '1.0.0',
        icon: 'Brain',
        capabilities: ['view', 'create', 'edit', 'delete'],
        inputs: { fields: [] },
        outputs: { fields: [] },
        events: [
          {
            name: 'modelCreated',
            description: 'Wird ausgelöst wenn ein Modell erstellt wird',
            payload: { fields: [{ name: 'model', type: 'object', required: true }] },
          },
          {
            name: 'trainingStarted',
            description: 'Wird ausgelöst wenn ein Training gestartet wird',
            payload: { fields: [{ name: 'job', type: 'object', required: true }] },
          },
          {
            name: 'trainingCompleted',
            description: 'Wird ausgelöst wenn ein Training abgeschlossen ist',
            payload: { fields: [{ name: 'job', type: 'object', required: true }] },
          },
          {
            name: 'feedbackCollected',
            description: 'Wird ausgelöst wenn Feedback gesammelt wurde',
            payload: { fields: [{ name: 'feedback', type: 'object', required: true }] },
          },
        ],
        component: () => null,
        widgets: [],
      } as Tool,
    ],
    
    // Widgets für Dashboard
    widgets: [
      {
        id: 'training-status',
        toolId: 'training-main',
        name: 'Training Status',
        description: 'Zeigt aktive Trainings-Jobs',
        size: 'medium',
        refreshInterval: 5000, // Alle 5 Sekunden
        component: () => null,
      } as Widget,
      {
        id: 'models-overview',
        toolId: 'training-main',
        name: 'Modelle',
        description: 'Übersicht trainierter Modelle',
        size: 'small',
        component: () => null,
      } as Widget,
    ],
    
    isActive: true,
    order: 10, // Nach den Haupt-Modulen
  };
  
  return trainingModule;
}








