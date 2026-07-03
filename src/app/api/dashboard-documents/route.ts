// ============================================
// /api/dashboard-documents - Dashboard-Datei API
//
// Zweck: Aktualisiert und loescht persistente Dateien auf dem
//        Dashboard oder in Dashboard-Ordnern.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_USER_ID, getOrCreateDefaultUser } from '@/lib/services/user-service';
import {
  createDashboardDocument,
  deleteDashboardDocument,
  updateDashboardDocument,
} from '@/lib/services/dashboard-folder-service';

export async function POST(request: NextRequest) {
  try {
    await getOrCreateDefaultUser();
    const body = await request.json();
    const document = await createDashboardDocument(DEFAULT_USER_ID, body);
    return NextResponse.json({ success: true, document });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'DASHBOARD_DOCUMENT_CREATE_FAILED',
        message: error instanceof Error ? error.message : 'Dashboard-Datei konnte nicht erstellt werden.',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await getOrCreateDefaultUser();
    const body = await request.json();
    if (!body?.id) {
      return NextResponse.json(
        { success: false, error: 'DASHBOARD_DOCUMENT_ID_REQUIRED' },
        { status: 400 }
      );
    }

    const document = await updateDashboardDocument(DEFAULT_USER_ID, String(body.id), body);
    return NextResponse.json({ success: true, document });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'DASHBOARD_DOCUMENT_UPDATE_FAILED',
        message: error instanceof Error ? error.message : 'Dashboard-Datei konnte nicht aktualisiert werden.',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await getOrCreateDefaultUser();
    const body = await request.json().catch(() => ({}));
    const documentId = body?.id || request.nextUrl.searchParams.get('id');
    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'DASHBOARD_DOCUMENT_ID_REQUIRED' },
        { status: 400 }
      );
    }

    await deleteDashboardDocument(DEFAULT_USER_ID, String(documentId));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'DASHBOARD_DOCUMENT_DELETE_FAILED',
        message: error instanceof Error ? error.message : 'Dashboard-Datei konnte nicht geloescht werden.',
      },
      { status: 500 }
    );
  }
}
