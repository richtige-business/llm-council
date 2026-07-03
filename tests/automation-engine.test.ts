import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runWorkflow } from '@/lib/automation/engine';
import type { WorkflowRule } from '@/lib/automation/types';

const mockActionExecute = vi.fn();

vi.mock('@/lib/agent/registry/action-registry', () => ({
  actionRegistry: {
    execute: (...args: unknown[]) => mockActionExecute(...args),
  },
}));

function createWorkflow(): WorkflowRule {
  return {
    version: 1,
    workflowId: 'wf-1',
    name: 'Test Workflow',
    isActive: true,
    triggerConfig: { kind: 'manual' },
    nodes: [
      { id: 'trigger-1', type: 'trigger', label: 'Trigger', position: { x: 0, y: 0 }, config: { kind: 'manual' } },
      {
        id: 'cond-1',
        type: 'condition',
        label: 'Condition',
        position: { x: 200, y: 0 },
        config: { fieldPath: 'payload.amount', operator: 'gt', value: 5 },
      },
      {
        id: 'action-yes',
        type: 'action',
        label: 'Action Yes',
        position: { x: 420, y: -60 },
        config: { moduleId: 'calendar', toolId: 'calendar.open', input: { yes: true } },
      },
      {
        id: 'action-no',
        type: 'action',
        label: 'Action No',
        position: { x: 420, y: 60 },
        config: { moduleId: 'calendar', toolId: 'calendar.listEvents', input: { yes: false } },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'cond-1' },
      { id: 'e2', source: 'cond-1', sourceHandle: 'true', target: 'action-yes' },
      { id: 'e3', source: 'cond-1', sourceHandle: 'false', target: 'action-no' },
    ],
  };
}

describe('automation engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, toolResult: { success: true }, frontendAction: null }),
    } as unknown as Response);
  });

  it('führt bei erfüllter Condition den true-Branch aus', async () => {
    const workflow = createWorkflow();
    const result = await runWorkflow({
      baseId: 'base-1',
      workflow,
      initialPayload: { payload: { amount: 10 } },
    });

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string);
    expect(body.toolId).toBe('calendar.open');
  });

  it('führt bei nicht erfüllter Condition den false-Branch aus', async () => {
    const workflow = createWorkflow();
    const result = await runWorkflow({
      baseId: 'base-1',
      workflow,
      initialPayload: { payload: { amount: 1 } },
    });

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string);
    expect(body.toolId).toBe('calendar.listEvents');
  });

  it('stoppt bei Action-Fehler', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, message: 'boom' }),
    } as unknown as Response);

    const workflow = createWorkflow();
    const result = await runWorkflow({
      baseId: 'base-1',
      workflow,
      initialPayload: { payload: { amount: 10 } },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('boom');
  });
});
