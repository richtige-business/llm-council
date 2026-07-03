// ============================================
// components/index.ts - Komponenten-Exports
// 
// Zweck: Zentraler Export für alle Training-Komponenten
// Verwendet von: Training-Modul, App-Router
// ============================================

// Haupt-Seiten
export { TrainingPage } from './TrainingPage';
export { TrainingEntryScreen } from './TrainingEntryScreen';
export { TrainingModeSelector } from './TrainingModeSelector';
export { TrainingWorkspaceShell } from './TrainingWorkspaceShell';

// Card-Komponenten
export { ModelCard } from './ModelCard';
export { DatasetCard } from './DatasetCard';
export { JobCard } from './JobCard';
export { SandboxCard } from './SandboxCard';

// Modals
export { CreateModelModal } from './CreateModelModal';
export { CreateDatasetModal } from './CreateDatasetModal';
export { CreateSandboxModal } from './CreateSandboxModal';

// Sandbox-Komponenten
export { SandboxView } from './SandboxView';
export { SwipeFeedback } from './SwipeFeedback';

// Navigation und Workspaces
export { LLMTrainingWorkspace } from './llm/LLMTrainingWorkspace';
export { LLMRunBuilder } from './llm/LLMRunBuilder';
export { AgentTrainingWorkspace } from './agent/AgentTrainingWorkspace';
export { AgentTrainingEmptyState } from './agent/AgentTrainingEmptyState';
export { DatasetStudioWorkspace } from './dataset/DatasetStudioWorkspace';

// Animationen
export { DistillationAnimation } from './animations/DistillationAnimation';
export { FineTuningBenchPressAnimation } from './animations/FineTuningBenchPressAnimation';

