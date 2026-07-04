// ============================================
// /api/group-libraries/[groupAgentId]/import - Ordnerimport API
//
// Zweck: Importiert komplette Ordnerbaeume in die
//        serverseitige Gruppenbibliothek
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_USER_ID, getOrCreateDefaultUser } from '@/lib/services/user-service';
import { importGroupFolderTree } from '@/lib/services/group-library-service';

interface RouteContext {
  params: Promise<{ groupAgentId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await getOrCreateDefaultUser();
    const { groupAgentId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const files = Array.isArray(body?.files) ? body.files : [];
    const result = await importGroupFolderTree(
      DEFAULT_USER_ID,
      groupAgentId,
      body?.libraryName || body?.groupName || groupAgentId,
      files
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'GROUP_LIBRARY_IMPORT_FAILED',
        message: error instanceof Error ? error.message : 'Ordnerstruktur konnte nicht importiert werden.',
      },
      { status: 500 }
    );
  }
}
