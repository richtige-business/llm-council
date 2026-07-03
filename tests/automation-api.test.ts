import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockListWorkspaceBases = vi.fn();
const mockGetOrCreateDefaultUser = vi.fn();
const mockInitializeToolRegistry = vi.fn();
const mockToolList = vi.fn();
const mockToolGet = vi.fn();
const mockToolExecute = vi.fn();

vi.mock('@/lib/services/base-service', () => ({
  listWorkspaceBases: (...args: unknown[]) => mockListWorkspaceBases(...args),
}));

vi.mock('@/lib/services/user-service', () => ({
  DEFAULT_USER_ID: 'user-default',
  getOrCreateDefaultUser: (...args: unknown[]) => mockGetOrCreateDefaultUser(...args),
}));

vi.mock('@/lib/agent/init-server', () => ({
  initializeToolRegistry: (...args: unknown[]) => mockInitializeToolRegistry(...args),
}));

vi.mock('@/lib/agent/registry/tool-registry', () => ({
  toolRegistry: {
    list: (...args: unknown[]) => mockToolList(...args),
    get: (...args: unknown[]) => mockToolGet(...args),
    execute: (...args: unknown[]) => mockToolExecute(...args),
  },
}));

describe('Automation API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOrCreateDefaultUser.mockResolvedValue(undefined);
    mockInitializeToolRegistry.mockReturnValue(undefined);
  });

  it('liefert Tool-Katalog nur für Module der Base', async () => {
    mockListWorkspaceBases.mockResolvedValue([
      { id: 'base-1', moduleIds: ['calendar'], connections: [] },
    ]);
    mockToolList.mockReturnValue([
      { id: 'calendar.createEvent', module: 'calendar', name: 'Create', description: 'x', inputSchema: { type: 'object', properties: {} } },
      { id: 'inbox.open', module: 'inbox', name: 'Inbox', description: 'y', inputSchema: { type: 'object', properties: {} } },
    ]);

    const { GET } = await import('@/app/api/automation/tools/route');
    const request = new NextRequest('http://localhost/api/automation/tools?baseId=base-1');
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.tools).toHaveLength(1);
    expect(payload.tools[0].id).toBe('calendar.createEvent');
  });

  it('blockt Tool-Ausführung für Module außerhalb der Base', async () => {
    mockListWorkspaceBases.mockResolvedValue([
      {
        id: 'base-1',
        moduleIds: ['calendar'],
        connections: [
          {
            connectionType: 'workflow.v1',
            rule: { version: 1, workflowId: 'wf-1', nodes: [], edges: [], isActive: true, triggerConfig: { kind: 'manual' } },
          },
        ],
      },
    ]);

    const { POST } = await import('@/app/api/automation/execute/route');
    const request = new NextRequest('http://localhost/api/automation/execute', {
      method: 'POST',
      body: JSON.stringify({
        baseId: 'base-1',
        workflowId: 'wf-1',
        moduleId: 'inbox',
        toolId: 'inbox.open',
        input: {},
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toBe('MODULE_NOT_ALLOWED');
  });

  it('führt erlaubtes Tool aus und liefert frontendAction zurück', async () => {
    mockListWorkspaceBases.mockResolvedValue([
      {
        id: 'base-1',
        moduleIds: ['calendar'],
        connections: [
          {
            connectionType: 'workflow.v1',
            rule: { version: 1, workflowId: 'wf-1', nodes: [], edges: [], isActive: true, triggerConfig: { kind: 'manual' } },
          },
        ],
      },
    ]);
    mockToolGet.mockReturnValue({
      id: 'calendar.open',
      module: 'calendar',
      createAction: () => ({ type: 'calendar.openTab', module: 'calendar', payload: {}, executed: false, timestamp: Date.now() }),
    });
    mockToolExecute.mockResolvedValue({ success: true, data: { ok: true } });

    const { POST } = await import('@/app/api/automation/execute/route');
    const request = new NextRequest('http://localhost/api/automation/execute', {
      method: 'POST',
      body: JSON.stringify({
        baseId: 'base-1',
        workflowId: 'wf-1',
        moduleId: 'calendar',
        toolId: 'calendar.open',
        input: {},
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.frontendAction?.type).toBe('calendar.openTab');
    expect(mockToolExecute).toHaveBeenCalledTimes(1);
  });
});
