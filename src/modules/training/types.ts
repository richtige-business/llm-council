// ============================================
// types.ts - AI Training Center Type Definitions
// 
// Zweck: TypeScript Interfaces für das Training-Modul
// Verwendet von: Store, Components, API Routes
// ============================================

// --------------------------------------------
// Basis-Enums und Typen
// --------------------------------------------

// Modell-Typ (Text, Bild, Video)
export type ModelType = 'text' | 'image' | 'video';

// Modell-Status
export type ModelStatus = 'draft' | 'training' | 'ready' | 'failed' | 'archived';

// Dataset-Typ
export type DatasetType = 'sft' | 'dpo' | 'classification';

// Dataset-Quelle
export type DatasetSource = 'upload' | 'synthetic' | 'library';

// Dataset-Status
export type DatasetStatus = 'draft' | 'processing' | 'ready' | 'error';

// Training-Methode
export type TrainingMethod = 'sft' | 'dpo';

// Job-Status
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

// GPU-Provider
export type GPUProvider = 'mock' | 'modal' | 'replicate' | 'runpod';

// Sandbox-Status
export type SandboxStatus = 'active' | 'paused' | 'completed' | 'expired';

// Feedback-Rating
export type FeedbackRating = 'good' | 'bad' | 'edited';

// Output-Typ in Sandbox
export type OutputType = 'text' | 'email' | 'image' | 'json' | 'code';

// Visualisierung fuer simulierte Trainingslaeufe
export type TrainingVisualizationKind = 'fine-tuning' | 'distillation' | 'preference';

// --------------------------------------------
// Training-Hub Navigation
// Mehrstufige Navigation fuer Entry-Screen und Workspaces
// --------------------------------------------

// Hauptbereiche im Training Center
export type TrainingCategory = 'llm' | 'agent' | 'dataset';

// LLM-Trainingsmodi
export type LLMTrainingSubmode =
  | 'example-tuning'
  | 'preference-training'
  | 'distillation';

// Agent-Trainingsmodi
export type AgentTrainingSubmode =
  | 'learning-mode'
  | 'policy-training'
  | 'agent-distillation';

// Dataset-Studio Modi
export type DatasetStudioSubmode =
  | 'upload'
  | 'synthetic'
  | 'extract'
  | 'quality';

// Alle Submodi zusammengefasst
export type TrainingSubmode =
  | LLMTrainingSubmode
  | AgentTrainingSubmode
  | DatasetStudioSubmode;

// Tabs innerhalb des LLM-Workspaces
export type LLMWorkspaceTab =
  | 'overview'
  | 'models'
  | 'runs'
  | 'eval'
  | 'sandbox';

// Tabs innerhalb des Agent-Workspaces
export type AgentWorkspaceTab =
  | 'overview'
  | 'learning'
  | 'policies'
  | 'runs'
  | 'replay'
  | 'eval';

// Tabs innerhalb des Dataset-Workspaces
export type DatasetWorkspaceTab =
  | 'sources'
  | 'transforms'
  | 'quality'
  | 'versions'
  | 'exports';

// Alle Workspace-Tabs zusammengefasst
export type TrainingWorkspaceTab =
  | LLMWorkspaceTab
  | AgentWorkspaceTab
  | DatasetWorkspaceTab;

// --------------------------------------------
// Trainiertes Modell (LoRA Adapter)
// --------------------------------------------

export interface TrainingModel {
  id: string;
  name: string;
  description: string | null;
  baseModel: string;
  type: ModelType;
  status: ModelStatus;
  loraPath: string | null;
  config: TrainingConfig | null;
  metrics: ModelMetrics | null;
  icon: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

// Trainings-Konfiguration
export interface TrainingConfig {
  learningRate: number;
  epochs: number;
  batchSize: number;
  loraRank: number;
  loraAlpha: number;
  warmupSteps: number;
  maxSteps: number | null;
  gradientAccumulation: number;
  // Simulations-Metadaten fuer die UI
  visualizationKind?: TrainingVisualizationKind;
  teacherModelId?: string | null;
  teacherModelName?: string | null;
  studentModelId?: string | null;
  studentModelName?: string | null;
}

// Modell-Metriken nach Training
export interface ModelMetrics {
  finalLoss: number;
  accuracy?: number;
  evalLoss?: number;
  trainingTime: number; // in Sekunden
  totalSteps: number;
}

// --------------------------------------------
// Dataset und Dataset-Rows
// --------------------------------------------

export interface Dataset {
  id: string;
  name: string;
  description: string | null;
  type: DatasetType;
  source: DatasetSource;
  rowCount: number;
  status: DatasetStatus;
  schema: DatasetSchema | null;
  metadata: DatasetMetadata | null;
  piiScanned: boolean;
  piiWarnings: PIIWarning[] | null;
  createdAt: Date;
  updatedAt: Date;
}

// Dataset-Schema Definition
export interface DatasetSchema {
  fields: {
    name: string;
    type: 'string' | 'number' | 'boolean';
    required: boolean;
    description?: string;
  }[];
}

// Dataset-Metadaten
export interface DatasetMetadata {
  language?: string;
  domain?: string;
  tags?: string[];
  originalFileName?: string;
}

// PII-Warnung
export interface PIIWarning {
  rowId: string;
  field: string;
  type: 'email' | 'phone' | 'creditcard' | 'ssn' | 'name' | 'address';
  value: string;
  suggestion: string;
}

// Einzelne Zeile im Dataset
export interface DatasetRow {
  id: string;
  datasetId: string;
  // SFT-Felder
  input: string;
  output: string | null;
  // DPO-Felder
  chosenOutput: string | null;
  rejectedOutput: string | null;
  // Classification
  label: string | null;
  // Metadaten
  isGolden: boolean;
  isSynthetic: boolean;
  qualityScore: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

// --------------------------------------------
// Training Job
// --------------------------------------------

export interface TrainingJob {
  id: string;
  modelId: string;
  datasetId: string;
  method: TrainingMethod;
  status: JobStatus;
  progress: number;
  currentEpoch: number;
  totalEpochs: number;
  config: TrainingConfig | null;
  logs: TrainingLogEntry[];
  metrics: JobMetrics | null;
  error: string | null;
  estimatedCost: number;
  actualCost: number;
  gpuProvider: GPUProvider;
  externalJobId: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Log-Eintrag während Training
export interface TrainingLogEntry {
  timestamp: number;
  level: 'info' | 'warning' | 'error';
  message: string;
  step?: number;
  loss?: number;
  learningRate?: number;
}

// Job-Metriken
export interface JobMetrics {
  trainLoss: number;
  evalLoss?: number;
  trainingSamples: number;
  stepsPerSecond: number;
  gpuMemoryUsed: number; // in MB
}

// --------------------------------------------
// Sandbox Session
// --------------------------------------------

export interface SandboxSession {
  id: string;
  modelId: string | null;
  baseModel: string;
  name: string | null;
  status: SandboxStatus;
  mockData: SandboxMockData | null;
  systemPrompt: string | null;
  feedbackCount: number;
  lastActivityAt: Date;
  timeoutMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

// Mock-Daten für die Sandbox
export interface SandboxMockData {
  contacts?: MockContact[];
  emails?: MockEmail[];
  calendar?: MockCalendarEvent[];
  customData?: Record<string, unknown>;
}

export interface MockContact {
  id: string;
  name: string;
  email: string;
  company?: string;
}

export interface MockEmail {
  id: string;
  from: string;
  subject: string;
  body: string;
  date: string;
}

export interface MockCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
}

// --------------------------------------------
// Sandbox Prompt und Feedback
// --------------------------------------------

export interface SandboxPrompt {
  id: string;
  sessionId: string;
  input: string;
  output: string | null;
  chainOfThought: ChainOfThoughtStep[] | null;
  toolCalls: ToolCall[] | null;
  outputType: OutputType;
  createdAt: Date;
  feedback?: SandboxFeedback | null;
}

// Chain-of-Thought Schritt
export interface ChainOfThoughtStep {
  step: number;
  type: 'thinking' | 'tool_call' | 'result' | 'output';
  content: string;
  timestamp: number;
}

// Tool-Call
export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  output: unknown;
  duration: number; // in ms
}

// Feedback zu einem Prompt
export interface SandboxFeedback {
  id: string;
  promptId: string;
  rating: FeedbackRating;
  editedOutput: string | null;
  notes: string | null;
  usedForTraining: boolean;
  usedInJobId: string | null;
  createdAt: Date;
}

// --------------------------------------------
// Budget und Kosten
// --------------------------------------------

export interface BudgetLimit {
  id: string;
  type: 'training' | 'inference' | 'total';
  limitCents: number;
  usedCents: number;
  period: 'daily' | 'weekly' | 'monthly' | 'total';
  isActive: boolean;
  action: 'warn' | 'block';
  resetAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// --------------------------------------------
// API Request/Response Types
// --------------------------------------------

// Modell erstellen
export interface CreateModelRequest {
  name: string;
  description?: string;
  baseModel: string;
  type: ModelType;
  icon?: string;
  color?: string;
}

// Dataset erstellen
export interface CreateDatasetRequest {
  name: string;
  description?: string;
  type: DatasetType;
  source?: DatasetSource;
}

// Dataset-Rows hinzufügen
export interface AddDatasetRowsRequest {
  rows: Omit<DatasetRow, 'id' | 'datasetId' | 'createdAt'>[];
}

// Training Job starten
export interface StartTrainingRequest {
  modelId: string;
  datasetId: string;
  method: TrainingMethod;
  config?: Partial<TrainingConfig>;
  gpuProvider?: GPUProvider;
}

// Sandbox Session starten
export interface CreateSandboxRequest {
  modelId?: string;
  baseModel?: string;
  name?: string;
  systemPrompt?: string;
  mockData?: SandboxMockData;
}

// Sandbox Inference Request
export interface SandboxInferenceRequest {
  sessionId: string;
  input: string;
}

// Feedback erstellen
export interface CreateFeedbackRequest {
  promptId: string;
  rating: FeedbackRating;
  editedOutput?: string;
  notes?: string;
}

// Synthetische Daten generieren
export interface GenerateSyntheticRequest {
  datasetId: string;
  goldenExamples: string[]; // IDs der Golden Examples
  count: number; // Anzahl zu generierender Beispiele
  temperature?: number;
}

// --------------------------------------------
// Store Types
// --------------------------------------------

export interface TrainingState {
  // Modelle
  models: TrainingModel[];
  selectedModelId: string | null;
  modelsLoading: boolean;
  
  // Datasets
  datasets: Dataset[];
  selectedDatasetId: string | null;
  datasetsLoading: boolean;
  
  // Jobs
  jobs: TrainingJob[];
  activeJobId: string | null;
  jobsLoading: boolean;
  
  // Sandbox
  sessions: SandboxSession[];
  activeSessionId: string | null;
  currentPrompts: SandboxPrompt[];
  sessionsLoading: boolean;
  
  // UI State
  activeCategory: TrainingCategory | null;
  activeSubmode: TrainingSubmode | null;
  activeWorkspaceTab: TrainingWorkspaceTab | null;
  lastCategory: TrainingCategory | null;
  lastSubmode: TrainingSubmode | null;
  showEntryOnOpen: boolean;
  activeTab: 'models' | 'datasets' | 'training' | 'sandbox';
  error: string | null;
}

export interface TrainingActions {
  // Modelle
  setModels: (models: TrainingModel[]) => void;
  addModel: (model: TrainingModel) => void;
  updateModel: (id: string, updates: Partial<TrainingModel>) => void;
  deleteModel: (id: string) => void;
  selectModel: (id: string | null) => void;
  
  // Datasets
  setDatasets: (datasets: Dataset[]) => void;
  addDataset: (dataset: Dataset) => void;
  updateDataset: (id: string, updates: Partial<Dataset>) => void;
  deleteDataset: (id: string) => void;
  selectDataset: (id: string | null) => void;
  
  // Jobs
  setJobs: (jobs: TrainingJob[]) => void;
  addJob: (job: TrainingJob) => void;
  updateJob: (id: string, updates: Partial<TrainingJob>) => void;
  setActiveJob: (id: string | null) => void;
  
  // Sandbox
  setSessions: (sessions: SandboxSession[]) => void;
  addSession: (session: SandboxSession) => void;
  updateSession: (id: string, updates: Partial<SandboxSession>) => void;
  setActiveSession: (id: string | null) => void;
  setCurrentPrompts: (prompts: SandboxPrompt[]) => void;
  addPrompt: (prompt: SandboxPrompt) => void;
  updatePrompt: (id: string, updates: Partial<SandboxPrompt>) => void;
  
  // UI
  setActiveCategory: (category: TrainingCategory | null) => void;
  setActiveSubmode: (submode: TrainingSubmode | null) => void;
  setActiveWorkspaceTab: (tab: TrainingWorkspaceTab | null) => void;
  setShowEntryOnOpen: (show: boolean) => void;
  resetHubNavigation: () => void;
  setActiveTab: (tab: TrainingState['activeTab']) => void;
  setError: (error: string | null) => void;
  setModelsLoading: (loading: boolean) => void;
  setDatasetsLoading: (loading: boolean) => void;
  setJobsLoading: (loading: boolean) => void;
  setSessionsLoading: (loading: boolean) => void;
}

export type TrainingStore = TrainingState & TrainingActions;








