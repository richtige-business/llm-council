// ============================================
// index.ts - Lab Module Export
// 
// Zweck: Re-exportiert alle Lab-bezogenen Module
// Verwendet von: Builder Page, Components
// ============================================

// Types
export * from './types';

// Store
export {
  useBuilderStore,
  useBuilderSession,
  useBuilderModule,
  useBuilderMessages,
  useBuilderFiles,
  useBuilderWidgets,
  useBuilderTools,
  useBuilderSystemPrompt,
  useSelectedFile,
  useIsGenerating,
  usePreviewState,
} from './builder-store';

// Templates (Legacy)
export {
  TYPES_TEMPLATE,
  STORE_TEMPLATE,
  PAGE_TEMPLATE,
  WIDGET_TEMPLATE,
  INDEX_TEMPLATE,
  COMPONENTS_INDEX_TEMPLATE,
  WIDGETS_INDEX_TEMPLATE,
  applyTemplate,
  PREDEFINED_TEMPLATES,
} from './templates/module-templates';

export type { ModuleTemplate } from './templates/module-templates';

// --------------------------------------------
// Neue Module-Architektur (Minimaler Vertrag)
// --------------------------------------------

// Modul-Vertrag & Validierung
export {
  validateModuleManifest,
  createMinimalManifest,
  createFullManifest,
  EXAMPLE_MANIFESTS,
  MODULE_STRUCTURE_DOCS,
} from './module-contract';

export type {
  MinimalModuleManifest,
  FullModuleManifest,
  ModulePermission,
  ValidationResult,
} from './module-contract';

// App-Typ Templates
export {
  GAME_TEMPLATE,
  DASHBOARD_TEMPLATE,
  FORUM_TEMPLATE,
  CRM_TEMPLATE,
  ALL_TEMPLATES,
  getTemplateById,
  TEMPLATE_OVERVIEW,
} from './llm/module-templates';

// Design-System Referenz
export {
  DESIGN_STYLES,
  THEME_HOOK_REFERENCE,
  CODE_PATTERNS,
  AGENT_QUICK_REFERENCE,
  COMMON_MISTAKES,
  RECOMMENDED_ICONS,
} from './llm/design-system-reference';

// System Prompts
export {
  getAskPrompt,
  getPlanPrompt,
  getDiscussPrompt,
  getModuleBuilderSystemPrompt,
  CONTINUE_PROMPT,
} from './llm/prompts';

export type { ChatMode } from './llm/prompts';

// --------------------------------------------
// LifeOS Rules (GitHub-Kollaboration)
// --------------------------------------------

export {
  SYSTEM_PROTECTED_PATHS,
  isSystemProtectedPath,
  LIFEOS_RULES_FILES,
  generateLifeOSRulesFiles,
  generateModuleReadme,
  validateModuleForGitHub,
  ensureRequiredFiles,
} from './lifeos-rules';

export type {
  LifeOSRulesFile,
  ModuleInfo,
  ValidationError,
} from './lifeos-rules';

