// ============================================
// LifeOS Core Type Definitions
// ============================================

import type { ReactNode, ComponentType } from 'react';

// ============================================
// Schema Definitions for Contracts
// ============================================

export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date';
  required: boolean;
  description?: string;
  default?: unknown;
}

export interface SchemaDefinition {
  fields: SchemaField[];
}

export interface EventDefinition {
  name: string;
  description: string;
  payload: SchemaDefinition;
}

// ============================================
// Widget System
// ============================================

export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

export interface WidgetContract {
  id: string;
  toolId: string;
  name: string;
  description: string;
  size: WidgetSize;
  refreshInterval?: number;
  minWidth?: number;
  minHeight?: number;
}

export interface Widget extends WidgetContract {
  component: ComponentType<WidgetProps>;
}

export interface WidgetProps {
  id: string;
  size: WidgetSize;
  data?: unknown;
  onRefresh?: () => void;
}

// ============================================
// Tool System
// ============================================

export interface ToolContract {
  id: string;
  moduleId: string;
  name: string;
  description: string;
  version: string;
  icon: string;
  capabilities: string[];
  inputs: SchemaDefinition;
  outputs: SchemaDefinition;
  events: EventDefinition[];
}

export interface Tool extends ToolContract {
  component: ComponentType<ToolProps>;
  widgets: Widget[];
}

export interface ToolProps {
  id: string;
  moduleId: string;
}

// ============================================
// Module System
// ============================================

// --------------------------------------------
// ExternalAppConfig
// Konfiguration fuer externe Web-Apps die per Cloud-Browser
// gestreamt werden (WebRTC Browser Container)
// --------------------------------------------

export interface ExternalAppConfig {
  url: string;                    // Basis-URL der App (z.B. "https://notion.so")
  catalogId?: string;             // Referenz zum Katalog-Eintrag (z.B. "notion")
  userUrl?: string;               // User-spezifische URL (z.B. eigenes Workspace)
  sessionPersist?: boolean;       // Cookies/Login zwischen Sessions speichern
}

export interface ModuleContract {
  id: string;
  name: string;
  description: string;
  version: string;
  icon: string;
  category: ModuleCategory;
  author?: string;
  // Optional: Route/URL (fuer Web-Apps die Docker-Container-URL, fuer Built-ins die interne Route)
  route?: string;
  // Optional: Hierarchie und Base-Zuordnung (Phase 1)
  baseId?: string;
  parentModuleId?: string;
  subModuleIds?: string[];
  // Optional: Explizit freigegebene Schnittstellen für Verknüpfungen
  exposedActions?: ExposedAction[];
  exposedEvents?: ExposedEvent[];
  // Optional: Externe App-Konfiguration (Cloud-Browser-Streaming)
  externalApp?: ExternalAppConfig;
}

export interface ExposedAction {
  id: string;
  name: string;
  description: string;
  inputSchema: SchemaDefinition;
  outputSchema: SchemaDefinition;
}

export interface ExposedEvent {
  id: string;
  name: string;
  description: string;
  payloadSchema: SchemaDefinition;
}

export type ModuleCategory = 
  | 'productivity'
  | 'finance'
  | 'health'
  | 'social'
  | 'learning'
  | 'creative'
  | 'business'
  | 'personal'
  | 'system';

export interface Module extends ModuleContract {
  tools: Tool[];
  widgets: Widget[];
  isActive: boolean;
  order: number;
}

// ============================================
// Navigation & UI
// ============================================

export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: number;
  children?: NavigationItem[];
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

// ============================================
// App State
// ============================================

export interface AppState {
  sidebarExpanded: boolean;
  activeModuleId: string | null;
  activeToolId: string | null;
  theme: 'dark' | 'light' | 'system';
}

// ============================================
// Event Bus Types (for inter-tool communication)
// ============================================

export interface LifeOSEvent<T = unknown> {
  type: string;
  source: {
    moduleId: string;
    toolId: string;
  };
  payload: T;
  timestamp: number;
}

export type EventHandler<T = unknown> = (event: LifeOSEvent<T>) => void;

// ============================================
// Utility Types
// ============================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type WithChildren<T = object> = T & {
  children?: ReactNode;
};






