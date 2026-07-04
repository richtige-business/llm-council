// ============================================
// /api/dashboard-folders/import - Dashboard Import API
//
// Zweck: Importiert Dateien und ganze Ordnerbaeume direkt
//        auf ein Dashboard oder in einen Dashboard-Ordner.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_USER_ID, getOrCreateDefaultUser } from '@/lib/services/user-service';
import { importDashboardEntries } from '@/lib/services/dashboard-folder-service';

export async function POST(request: NextRequest) {
  try {
    await getOrCreateDefaultUser();
    const body = await request.json();
    const result = await importDashboardEntries(DEFAULT_USER_ID, {
      surfaceType: body?.surfaceType === 'base' ? 'base' : 'home',
      surfaceId: String(body?.surfaceId || 'main'),
      parentFolderId: body?.parentFolderId ? String(body.parentFolderId) : null,
      x: typeof body?.x === 'number' ? body.x : undefined,
      y: typeof body?.y === 'number' ? body.y : undefined,
      files: Array.isArray(body?.files) ? body.files : [],
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'DASHBOARD_IMPORT_FAILED',
        message: error instanceof Error ? error.message : 'Import konnte nicht verarbeitet werden.',
      },
      { status: 500 }
    );
  }
}
