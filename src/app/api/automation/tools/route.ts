import { NextRequest, NextResponse } from 'next/server';
import { toolRegistry } from '@/lib/agent/registry/tool-registry';
import { initializeToolRegistry } from '@/lib/agent/init-server';
import { DEFAULT_USER_ID, getOrCreateDefaultUser } from '@/lib/services/user-service';
import { listWorkspaceBases } from '@/lib/services/base-service';

export async function GET(request: NextRequest) {
  try {
    await getOrCreateDefaultUser();
    initializeToolRegistry();

    const baseId = request.nextUrl.searchParams.get('baseId')?.trim();
    if (!baseId) {
      return NextResponse.json(
        { success: false, error: 'BASE_ID_REQUIRED', message: 'baseId ist erforderlich.' },
        { status: 400 }
      );
    }

    const bases = await listWorkspaceBases(DEFAULT_USER_ID);
    const base = bases.find((entry) => entry.id === baseId);
    if (!base) {
      return NextResponse.json(
        { success: false, error: 'BASE_NOT_FOUND', message: 'Base wurde nicht gefunden.' },
        { status: 404 }
      );
    }

    const allowedModuleIds = new Set(base.moduleIds);
    const tools = toolRegistry
      .list()
      .filter((tool) => allowedModuleIds.has(tool.module))
      .map((tool) => ({
        id: tool.id,
        moduleId: tool.module,
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));

    const grouped = Array.from(
      tools.reduce((acc, tool) => {
        if (!acc.has(tool.moduleId)) {
          acc.set(tool.moduleId, []);
        }
        acc.get(tool.moduleId)!.push(tool);
        return acc;
      }, new Map<string, typeof tools>())
    ).map(([moduleId, moduleTools]) => ({
      moduleId,
      tools: moduleTools,
    }));

    return NextResponse.json({
      success: true,
      baseId,
      modules: grouped,
      tools,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'AUTOMATION_TOOLS_FAILED',
        message:
          error instanceof Error ? error.message : 'Automation-Toolkatalog konnte nicht geladen werden.',
      },
      { status: 500 }
    );
  }
}
