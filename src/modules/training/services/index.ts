// ============================================
// services/index.ts - Service Exports
// 
// Zweck: Zentrale Exports für alle Training-Services
// Verwendet von: API Routes, Komponenten
// ============================================

// Mock Trainer
export {
  startMockTraining,
  stopMockTraining,
  getMockTrainingStatus,
  estimateMockCost,
} from './mock-trainer';

// Mock Inference
export {
  runMockInference,
  type InferenceResponse,
} from './mock-inference';

// Synthetischer Daten Generator
export {
  generateSyntheticData,
  estimateGenerationCost,
} from './synthetic-generator';








