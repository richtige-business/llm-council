// ============================================
// Fake Kernel - Stub-Implementation für A-2/A-3/A-4
// 
// Zweck: Ermöglicht Entwicklung gegen Kernel-API vor Kernel-Freeze
// Verwendet von: Browser, Inbox, LAB, Agent (Woche 1-2)
// ============================================

import type { LifeOSKernel, ToolDefinition, ModuleManifest, Event, TraceRecord, Permission, ExecutionContext, ToolResult, TraceFilter, EventHandler } from './types';

// --------------------------------------------
// Fake-Implementation (minimal, no-op)
// Alle Methoden loggen nur und returnen Success
// --------------------------------------------

export const fakeKernel: LifeOSKernel = {
  // Modul-Lifecycle
  modules: {
    install: async (manifest: ModuleManifest) => {
      console.log(`[FAKE KERNEL] Installing module: ${manifest.id} v${manifest.version}`);
    },
    enable: async (moduleId: string) => {
      console.log(`[FAKE KERNEL] Enabling module: ${moduleId}`);
    },
    disable: async (moduleId: string) => {
      console.log(`[FAKE KERNEL] Disabling module: ${moduleId}`);
    },
    uninstall: async (moduleId: string) => {
      console.log(`[FAKE KERNEL] Uninstalling module: ${moduleId}`);
    },
    get: (id: string) => {
      console.log(`[FAKE KERNEL] Get module: ${id}`);
      return null;
    },
    list: () => {
      console.log(`[FAKE KERNEL] List modules`);
      return [];
    },
  },
  
  // Tool-System
  tools: {
    register: (tool: ToolDefinition) => {
      console.log(`[FAKE KERNEL] Registering tool: ${tool.id}`);
    },
    unregister: (toolId: string) => {
      console.log(`[FAKE KERNEL] Unregistering tool: ${toolId}`);
    },
    execute: async (toolId: string, input: unknown, context: ExecutionContext): Promise<ToolResult> => {
      console.log(`[FAKE KERNEL] Executing tool: ${toolId}`, { input, context });
      // Simuliere erfolgreiche Ausführung
      return {
        success: true,
        data: { fake: true, message: `Tool ${toolId} executed (fake)` },
      };
    },
    list: (moduleId?: string) => {
      console.log(`[FAKE KERNEL] List tools`, { moduleId });
      return [];
    },
  },
  
  // Event-Bus
  events: {
    publish: (event: Event) => {
      console.log(`[FAKE KERNEL] Publishing event: ${event.type}`, event.payload);
    },
    subscribe: (eventType: string, handler: EventHandler) => {
      console.log(`[FAKE KERNEL] Subscribing to event: ${eventType}`);
      // Return unsubscribe function (no-op)
      return () => {
        console.log(`[FAKE KERNEL] Unsubscribing from event: ${eventType}`);
      };
    },
  },
  
  // Permissions
  permissions: {
    check: (moduleId: string, permission: Permission) => {
      console.log(`[FAKE KERNEL] Permission check: ${moduleId} → ${permission}`);
      return true; // Immer erlaubt (Fake)
    },
    grant: (moduleId: string, permission: Permission) => {
      console.log(`[FAKE KERNEL] Granting permission: ${moduleId} → ${permission}`);
    },
    revoke: (moduleId: string, permission: Permission) => {
      console.log(`[FAKE KERNEL] Revoking permission: ${moduleId} → ${permission}`);
    },
    request: async (moduleId: string, permissions: Permission[], reason: string) => {
      console.log(`[FAKE KERNEL] Requesting permissions for ${moduleId}:`, permissions, reason);
      return true; // User approved (Fake)
    },
  },
  
  // Storage
  storage: {
    get: async <T,>(moduleId: string, key: string): Promise<T | null> => {
      console.log(`[FAKE KERNEL] Storage get: ${moduleId} / ${key}`);
      return null;
    },
    set: async <T,>(moduleId: string, key: string, value: T): Promise<void> => {
      console.log(`[FAKE KERNEL] Storage set: ${moduleId} / ${key}`, value);
    },
    delete: async (moduleId: string, key: string): Promise<void> => {
      console.log(`[FAKE KERNEL] Storage delete: ${moduleId} / ${key}`);
    },
  },
  
  // Audit
  audit: {
    write: (record: TraceRecord) => {
      console.log(`[FAKE KERNEL] Audit write:`, record.toolId, record.durationMs + 'ms');
    },
    query: (filter?: TraceFilter) => {
      console.log(`[FAKE KERNEL] Audit query:`, filter);
      return [];
    },
  },
  
  // Meta
  version: '0.0.0-fake-kernel',
};

// --------------------------------------------
// Export als Standard
// A-2/A-3/A-4 können importieren:
// import { kernel } from '@/lib/kernel-stub'
// --------------------------------------------

export default fakeKernel;

