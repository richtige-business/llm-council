// ============================================
// route.ts - Lab Debug Command API
//
// Zweck: Sicherer Command-Endpunkt fuer den Module Builder Debug-Loop
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { runLabDebugCommand } from '@/lib/lab/debug/command-runner';
import type { RunLabDebugCommandInput } from '@/lib/lab/debug/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<RunLabDebugCommandInput>;

    if (!body?.command || typeof body.command !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'command ist erforderlich',
        },
        { status: 400 },
      );
    }

    const result = await runLabDebugCommand({
      command: body.command,
      args: body.args,
      cwd: body.cwd,
      confirmMutating: body.confirmMutating,
    });

    return NextResponse.json(result, {
      status: result.success ? 200 : result.requiresApproval ? 403 : 422,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Debug-Fehler',
      },
      { status: 500 },
    );
  }
}
