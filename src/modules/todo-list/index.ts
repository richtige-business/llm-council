// ============================================
// Todo Liste - Modul Index
// 
// Zweck: Re-exports aller öffentlichen APIs
// Verwendet von: LifeOS Kernel
// ============================================

export { TodoPage } from './components';
export { TodoWidget } from './widgets';
export { useTodoStore } from './store';
export { moduleTools, moduleSystemPrompt } from './tools';
export * from './types';
export * from './constants';

// Modul-Metadaten
export const moduleMetadata = {
  id: 'todo-list',
  name: 'Todo Liste',
  version: '1.0.0',
};