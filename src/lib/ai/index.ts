// ============================================
// index.ts - AI Library Exports
// 
// Zweck: Zentrale Exports für KI-Funktionalitäten
// Verwendet von: API Routes, Sync-Prozesse
// ============================================

export {
  analyzeMessage,
  analyzeMessagesBatch,
  extractMeetingLinks,
  isAIConfigured,
  getConfiguredProvider,
} from './message-analyzer';

export type {
  MessageAnalysis,
  MessageInput,
  BatchAnalysisInput,
} from './message-analyzer';
