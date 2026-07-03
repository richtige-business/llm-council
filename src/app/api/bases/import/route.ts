// ============================================
// /api/bases/import - Einmaliger Import lokaler Bases
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_USER_ID, getOrCreateDefaultUser } from '@/lib/services/user-service';
import {
  type BasePayload,
  importWorkspaceBasesIfEmpty,
  listWorkspaceBases,
  normalizeBasePayload,
} from '@/lib/services/base-service';

function readBasesPayload(payload: unknown): BasePayload[] {
  if (Array.isArray(payload)) return payload as BasePayload[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { bases?: unknown[] }).bases)) {
    return (payload as { bases: BasePayload[] }).bases;
  }
  return [];
}

export async function POST(request: NextRequest) {
  try {
    await getOrCreateDefaultUser();
    const body = await request.json().catch(() => ({}));
    const incomingBases = readBasesPayload(body).map((base) => normalizeBasePayload(base, true));

    const result = await importWorkspaceBasesIfEmpty(DEFAULT_USER_ID, incomingBases);
    const bases = await listWorkspaceBases(DEFAULT_USER_ID);

    return NextResponse.json({
      success: true,
      imported: result.imported,
      skipped: result.skipped,
      bases,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'BASES_IMPORT_FAILED',
        message: error instanceof Error ? error.message : 'Import fehlgeschlagen.',
      },
      { status: 500 }
    );
  }
}
