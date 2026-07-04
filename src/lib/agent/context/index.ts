// ============================================
// index.ts - Context Module Exports
// 
// Zweck: Zentrale Exports für Context-Funktionen
// Verwendet von: API Route
// ============================================

export { 
  collectAgentContext, 
  buildSystemPrompt,
  buildMinimalPrompt,
  enhancePromptWithContext,
} from './collector';
