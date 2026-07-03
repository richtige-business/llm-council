// ============================================
// /api/bases - Persistente Bases API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_USER_ID, getOrCreateDefaultUser } from '@/lib/services/user-service';
import {
  type BasePayload,
  isDescriptionValid,
  listWorkspaceBases,
  normalizeBasePayload,
  replaceWorkspaceBases,
} from '@/lib/services/base-service';

function readBasesPayload(payload: unknown): BasePayload[] {
  if (Array.isArray(payload)) return payload as BasePayload[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { bases?: unknown[] }).bases)) {
    return (payload as { bases: BasePayload[] }).bases;
  }
  return [];
}

export async function GET() {
  try {
    await getOrCreateDefaultUser();
    const bases = await listWorkspaceBases(DEFAULT_USER_ID);
    return NextResponse.json({ success: true, bases });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'BASES_READ_FAILED',
        message: error instanceof Error ? error.message : 'Bases konnten nicht geladen werden.',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await getOrCreateDefaultUser();
    const body = await request.json().catch(() => ({}));
    const incomingBases = readBasesPayload(body);

    const normalized = incomingBases.map((base) => normalizeBasePayload(base, false));
    const invalid = normalized.find((base) => !isDescriptionValid(base.description));
    if (invalid) {
      return NextResponse.json(
        {
          success: false,
          error: 'BASE_DESCRIPTION_REQUIRED',
          message: `Base "${invalid.name || invalid.id}" benoetigt eine Beschreibung.`,
        },
        { status: 400 }
      );
    }

    await replaceWorkspaceBases(DEFAULT_USER_ID, normalized, false);
    const bases = await listWorkspaceBases(DEFAULT_USER_ID);
    return NextResponse.json({ success: true, bases });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'BASES_WRITE_FAILED',
        message: error instanceof Error ? error.message : 'Bases konnten nicht gespeichert werden.',
      },
      { status: 500 }
    );
  }
}
