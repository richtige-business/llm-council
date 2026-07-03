// ============================================
// /api/group-libraries/[groupAgentId] - Gruppenbibliothek API
//
// Zweck: Liest und aktualisiert die serverseitige Gruppen-
//        Datenbank fuer eine Agent-Gruppe
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_USER_ID, getOrCreateDefaultUser } from '@/lib/services/user-service';
import {
  ensureGroupLibrary,
  getGroupLibraryTree,
  updateGroupLibraryMeta,
} from '@/lib/services/group-library-service';

interface RouteContext {
  params: Promise<{ groupAgentId: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await getOrCreateDefaultUser();
    const { groupAgentId } = await context.params;
    const tree = await getGroupLibraryTree(DEFAULT_USER_ID, groupAgentId);
    return NextResponse.json({ success: true, ...tree });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'GROUP_LIBRARY_READ_FAILED',
        message: error instanceof Error ? error.message : 'Gruppenbibliothek konnte nicht geladen werden.',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await getOrCreateDefaultUser();
    const { groupAgentId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const library = await ensureGroupLibrary(DEFAULT_USER_ID, {
      groupAgentId,
      name: body?.name || groupAgentId,
      description: body?.description || '',
      objective: body?.objective || '',
    });
    return NextResponse.json({ success: true, library });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'GROUP_LIBRARY_CREATE_FAILED',
        message: error instanceof Error ? error.message : 'Gruppenbibliothek konnte nicht erstellt werden.',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await getOrCreateDefaultUser();
    const { groupAgentId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const library = await updateGroupLibraryMeta(DEFAULT_USER_ID, groupAgentId, {
      name: body?.name,
      description: body?.description,
      objective: body?.objective,
      linkedDashboardFolderId: body?.linkedDashboardFolderId,
    });
    return NextResponse.json({ success: true, library });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'GROUP_LIBRARY_UPDATE_FAILED',
        message: error instanceof Error ? error.message : 'Gruppenbibliothek konnte nicht aktualisiert werden.',
      },
      { status: 500 }
    );
  }
}
