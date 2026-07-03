import { NextRequest, NextResponse } from 'next/server';
import { toolRegistry } from '@/lib/agent/registry/tool-registry';
import { initializeToolRegistry } from '@/lib/agent/init-server';
import { DEFAULT_USER_ID, getOrCreateDefaultUser } from '@/lib/services/user-service';
import { listWorkspaceBases } from '@/lib/services/base-service';
import { normalizeWorkflowRule } from '@/lib/automation/types';

interface ExecuteAutomationRequest {
  baseId: string;
  workflowId: string;
  moduleId: string;
  toolId: string;
  input?: Record<string, unknown>;
}

function readPayload(payload: unknown): ExecuteAutomationRequest {
  if (!payload || typeof payload !== 'object') {
    return { baseId: '', workflowId: '', moduleId: '', toolId: '', input: {} };
  }

  const body = payload as Record<string, unknown>;
  return {
    baseId: typeof body.baseId === 'string' ? body.baseId : '',
    workflowId: typeof body.workflowId === 'string' ? body.workflowId : '',
    moduleId: typeof body.moduleId === 'string' ? body.moduleId : '',
    toolId: typeof body.toolId === 'string' ? body.toolId : '',
    input:
      body.input && typeof body.input === 'object' && !Array.isArray(body.input)
        ? (body.input as Record<string, unknown>)
        : {},
  };
}

export async function POST(request: NextRequest) {
  try {
    await getOrCreateDefaultUser();
    initializeToolRegistry();

    const payload = readPayload(await request.json().catch(() => ({})));
    if (!payload.baseId || !payload.workflowId || !payload.moduleId || !payload.toolId) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_PAYLOAD',
          message: 'baseId, workflowId, moduleId und toolId sind erforderlich.',
        },
        { status: 400 }
      );
    }

    const bases = await listWorkspaceBases(DEFAULT_USER_ID);
    const base = bases.find((entry) => entry.id === payload.baseId);
    if (!base) {
      return NextResponse.json(
        { success: false, error: 'BASE_NOT_FOUND', message: 'Base wurde nicht gefunden.' },
        { status: 404 }
      );
    }

    const workflowConnection = base.connections.find((connection) => {
      if (connection.connectionType !== 'workflow.v1') return false;
      const rule = normalizeWorkflowRule(connection.rule);
      return rule?.workflowId === payload.workflowId;
    });

    if (!workflowConnection) {
      return NextResponse.json(
        { success: false, error: 'WORKFLOW_NOT_FOUND', message: 'Workflow wurde nicht gefunden.' },
        { status: 404 }
      );
    }

    if (!base.moduleIds.includes(payload.moduleId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'MODULE_NOT_ALLOWED',
          message: 'Das Zielmodul ist nicht Teil dieser Base.',
        },
        { status: 403 }
      );
    }

    const tool = toolRegistry.get(payload.toolId);
    if (!tool) {
      return NextResponse.json(
        { success: false, error: 'TOOL_NOT_FOUND', message: 'Tool wurde nicht gefunden.' },
        { status: 404 }
      );
    }

    if (tool.module !== payload.moduleId) {
      return NextResponse.json(
        {
          success: false,
          error: 'TOOL_MODULE_MISMATCH',
          message: 'Tool gehört nicht zum angegebenen Modul.',
        },
        { status: 400 }
      );
    }

    const toolResult = await toolRegistry.execute(payload.toolId, payload.input || {}, {
      userId: DEFAULT_USER_ID,
      requestingModuleId: `base:${payload.baseId}`,
      traceId: crypto.randomUUID(),
    });

    const frontendAction = tool.createAction?.(payload.input || {}, toolResult) || null;

    return NextResponse.json({
      success: true,
      baseId: payload.baseId,
      workflowId: payload.workflowId,
      moduleId: payload.moduleId,
      toolId: payload.toolId,
      toolResult,
      frontendAction,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'AUTOMATION_EXECUTE_FAILED',
        message: error instanceof Error ? error.message : 'Workflow-Aktion konnte nicht ausgeführt werden.',
      },
      { status: 500 }
    );
  }
}
