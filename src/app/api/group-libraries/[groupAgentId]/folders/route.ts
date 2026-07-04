// ============================================
// /api/group-libraries/[groupAgentId]/folders - Gruppenordner API
//
// Zweck: Legt neue Ordner in der serverseitigen Gruppen-
//        Bibliothek an, ohne dass zuerst ein Import noetig ist
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_USER_ID, getOrCreateDefaultUser } from '@/lib/services/user-service';
import { createGroupFolder, ensureGroupLibrary } from '@/lib/services/group-library-service';

interface RouteContext {
  params: Promise<{ groupAgentId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await getOrCreateDefaultUser();
    const { groupAgentId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const library = await ensureGroupLibrary(DEFAULT_USER_ID, {
      groupAgentId,
      name: body?.libraryName || groupAgentId,
      description: body?.description || '',
      objective: body?.objective || '',
    });
    const folder = await createGroupFolder(DEFAULT_USER_ID, library.id, {
      name: body?.name || 'Neuer Ordner',
      color: body?.color,
      parentFolderId: body?.parentFolderId || null,
      relativePath: body?.relativePath || body?.name || 'Neuer Ordner',
    });

    return NextResponse.json({ success: true, library, folder });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'GROUP_FOLDER_CREATE_FAILED',
        message: error instanceof Error ? error.message : 'Gruppenordner konnte nicht erstellt werden.',
      },
      { status: 500 }
    );
  }
}
