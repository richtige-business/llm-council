// ============================================
// tool-registry.test.ts - Tests für die Tool Registry
//
// Zweck: Prüft Registrierung, Abfrage und Ausführung von Tools
// Verwendet von: npm run test
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Inline-Mock für den Logger (wird vor dem Import von tool-registry benötigt)
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Import nach dem Mock
import { toolRegistry } from '@/lib/agent/registry/tool-registry';
import type { ModuleTool, ToolExecutionContext } from '@/lib/agent/types';

// --------------------------------------------
// Helper: Erstellt ein Test-Tool
// --------------------------------------------

function createMockTool(overrides?: Partial<ModuleTool>): ModuleTool {
  return {
    id: 'test.mockTool',
    module: 'test',
    name: 'mockTool',
    description: 'Ein Test-Tool',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Nachricht' },
      },
      required: ['message'],
    },
    execute: vi.fn().mockResolvedValue({ success: true, data: { result: 'ok' } }),
    ...overrides,
  };
}

// Test-Kontext für Ausführung
const mockContext: ToolExecutionContext = {
  userId: 'test-user',
  requestingModuleId: 'test',
  traceId: 'test-trace-123',
};

describe('ToolRegistry', () => {
  // Vor jedem Test die Registry zurücksetzen
  beforeEach(() => {
    toolRegistry.clear();
  });

  // --------------------------------------------
  // Registrierung
  // --------------------------------------------

  describe('register()', () => {
    it('registriert ein Tool', () => {
      const tool = createMockTool();
      toolRegistry.register([tool]);
      expect(toolRegistry.size).toBe(1);
      expect(toolRegistry.has('test.mockTool')).toBe(true);
    });

    it('registriert mehrere Tools gleichzeitig', () => {
      const tools = [
        createMockTool({ id: 'inbox.sendEmail', module: 'inbox', name: 'sendEmail' }),
        createMockTool({ id: 'inbox.listEmails', module: 'inbox', name: 'listEmails' }),
        createMockTool({ id: 'calendar.createEvent', module: 'calendar', name: 'createEvent' }),
      ];
      toolRegistry.register(tools);
      expect(toolRegistry.size).toBe(3);
    });

    it('überschreibt bestehende Tools mit gleicher ID', () => {
      const tool1 = createMockTool({ description: 'Version 1' });
      const tool2 = createMockTool({ description: 'Version 2' });
      toolRegistry.register([tool1]);
      toolRegistry.register([tool2]);
      expect(toolRegistry.size).toBe(1);
      expect(toolRegistry.get('test.mockTool')?.description).toBe('Version 2');
    });
  });

  // --------------------------------------------
  // Abfragen
  // --------------------------------------------

  describe('get() / has() / list()', () => {
    it('get() gibt das richtige Tool zurück', () => {
      const tool = createMockTool();
      toolRegistry.register([tool]);
      const retrieved = toolRegistry.get('test.mockTool');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('test.mockTool');
    });

    it('get() gibt undefined für unbekannte IDs', () => {
      expect(toolRegistry.get('nonexistent.tool')).toBeUndefined();
    });

    it('list() gibt alle Tools als Array', () => {
      toolRegistry.register([
        createMockTool({ id: 'a.tool1', module: 'a', name: 'tool1' }),
        createMockTool({ id: 'b.tool2', module: 'b', name: 'tool2' }),
      ]);
      const allTools = toolRegistry.list();
      expect(allTools).toHaveLength(2);
    });

    it('getByModule() filtert nach Modul', () => {
      toolRegistry.register([
        createMockTool({ id: 'inbox.send', module: 'inbox', name: 'send' }),
        createMockTool({ id: 'inbox.read', module: 'inbox', name: 'read' }),
        createMockTool({ id: 'calendar.create', module: 'calendar', name: 'create' }),
      ]);
      const inboxTools = toolRegistry.getByModule('inbox');
      expect(inboxTools).toHaveLength(2);
      expect(inboxTools.every(t => t.module === 'inbox')).toBe(true);
    });
  });

  // --------------------------------------------
  // Claude-Name-Konvertierung
  // --------------------------------------------

  describe('fromClaudeName()', () => {
    it('konvertiert Claude-Namen zurück (underscore -> punkt)', () => {
      const tool = createMockTool({ id: 'inbox.sendEmail' });
      toolRegistry.register([tool]);
      const originalId = toolRegistry.fromClaudeName('inbox_sendEmail');
      expect(originalId).toBe('inbox.sendEmail');
    });

    it('Fallback bei unbekanntem Tool', () => {
      const originalId = toolRegistry.fromClaudeName('unknown_tool');
      expect(originalId).toBe('unknown.tool');
    });
  });

  // --------------------------------------------
  // Ausführung
  // --------------------------------------------

  describe('execute()', () => {
    it('führt ein Tool erfolgreich aus', async () => {
      const tool = createMockTool();
      toolRegistry.register([tool]);
      
      const result = await toolRegistry.execute(
        'test.mockTool',
        { message: 'Hallo' },
        mockContext
      );
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ result: 'ok' });
      expect(tool.execute).toHaveBeenCalledWith({ message: 'Hallo' }, mockContext);
    });

    it('gibt Fehler zurück wenn Tool nicht gefunden', async () => {
      const result = await toolRegistry.execute(
        'nonexistent.tool',
        {},
        mockContext
      );
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TOOL_NOT_FOUND');
    });

    it('validiert Pflichtfelder', async () => {
      const tool = createMockTool();
      toolRegistry.register([tool]);
      
      // 'message' fehlt, ist aber required
      const result = await toolRegistry.execute(
        'test.mockTool',
        {},
        mockContext
      );
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('fängt Fehler bei Tool-Ausführung', async () => {
      const failingTool = createMockTool({
        execute: vi.fn().mockRejectedValue(new Error('Tool crashed!')),
      });
      toolRegistry.register([failingTool]);
      
      const result = await toolRegistry.execute(
        'test.mockTool',
        { message: 'test' },
        mockContext
      );
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EXECUTION_ERROR');
      expect(result.error?.message).toContain('Tool crashed!');
    });

    it('unterstützt Claude-Namensformat bei execute()', async () => {
      const tool = createMockTool({ id: 'inbox.sendEmail' });
      toolRegistry.register([tool]);
      
      // Aufrufen mit Claude-Name (underscore statt punkt)
      const result = await toolRegistry.execute(
        'inbox_sendEmail',
        { message: 'Test' },
        mockContext
      );
      expect(result.success).toBe(true);
    });
  });

  // --------------------------------------------
  // Utility
  // --------------------------------------------

  describe('clear() / markInitialized()', () => {
    it('clear() entfernt alle Tools', () => {
      toolRegistry.register([createMockTool()]);
      expect(toolRegistry.size).toBe(1);
      toolRegistry.clear();
      expect(toolRegistry.size).toBe(0);
      expect(toolRegistry.isInitialized()).toBe(false);
    });

    it('markInitialized() setzt Flag', () => {
      expect(toolRegistry.isInitialized()).toBe(false);
      toolRegistry.markInitialized();
      expect(toolRegistry.isInitialized()).toBe(true);
    });
  });
});
