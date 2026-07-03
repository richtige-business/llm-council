// ============================================
// /api/dashboard-documents/[documentId] - Einzeldatei-API
//
// Zweck: Liefert ein einzelnes Dashboard-Dokument per ID
//        (fuer Datei-Vorschau im Tab-System).
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_USER_ID, getOrCreateDefaultUser } from '@/lib/services/user-service';
import { getDashboardDocument } from '@/lib/services/dashboard-folder-service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    await getOrCreateDefaultUser();
    const { documentId } = await params;
    const document = await getDashboardDocument(DEFAULT_USER_ID, documentId);

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Datei nicht gefunden.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, document });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'DASHBOARD_DOCUMENT_READ_FAILED',
        message: error instanceof Error ? error.message : 'Datei konnte nicht geladen werden.',
      },
      { status: 500 }
    );
  }
}
