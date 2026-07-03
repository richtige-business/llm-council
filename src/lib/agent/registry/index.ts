// ============================================
// index.ts - Registry Exports
// 
// Zweck: Zentrale Exports für Tool und Action Registry
// Verwendet von: API Route, Module, useAgentExecutor
// ============================================

// Tool Registry
export { 
  toolRegistry, 
  registerTools, 
  executeTool,
  getClaudeToolDefinitions,
} from './tool-registry';

// Action Registry
export { 
  actionRegistry, 
  registerActionHandler, 
  executeAction,
} from './action-registry';
