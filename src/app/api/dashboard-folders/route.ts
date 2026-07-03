// ============================================
// /api/dashboard-folders - Dashboard-Ordner API
//
// Zweck: Liest, erstellt, aktualisiert und loescht
//        serverseitige Dashboard-Ordner pro Surface
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_USER_ID, getOrCreateDefaultUser } from '@/lib/services/user-service';
import {
  createDashboardFolder,
  deleteDashboardFolder,
  listDashboardTree,
  updateDashboardFolder,
} from '@/lib/services/dashboard-folder-service';

export async function GET(request: NextRequest) {
  try {
    await getOrCreateDefaultUser();
    const surfaceType = request.nextUrl.searchParams.get('surfaceType') === 'base' ? 'base' : 'home';
    const surfaceId = request.nextUrl.searchParams.get('surfaceId') || 'main';
    const tree = await listDashboardTree(DEFAULT_USER_ID, surfaceType, surfaceId);
    return NextResponse.json({ success: true, folders: tree.folders, documents: tree.documents });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'DASHBOARD_FOLDERS_READ_FAILED',
        message: error instanceof Error ? error.message : 'Dashboard-Ordner konnten nicht geladen werden.',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await getOrCreateDefaultUser();
    const body = await request.json();
    const folder = await createDashboardFolder(DEFAULT_USER_ID, body);
    return NextResponse.json({ success: true, folder });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'DASHBOARD_FOLDER_CREATE_FAILED',
        message: error instanceof Error ? error.message : 'Dashboard-Ordner konnte nicht erstellt werden.',
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
        { success: false, error: 'DASHBOARD_FOLDER_ID_REQUIRED' },
        { status: 400 }
      );
    }
    const folder = await updateDashboardFolder(DEFAULT_USER_ID, String(body.id), body);
    return NextResponse.json({ success: true, folder });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'DASHBOARD_FOLDER_UPDATE_FAILED',
        message: error instanceof Error ? error.message : 'Dashboard-Ordner konnte nicht aktualisiert werden.',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await getOrCreateDefaultUser();
    const body = await request.json().catch(() => ({}));
    const folderId = body?.id || request.nextUrl.searchParams.get('id');
    if (!folderId) {
      return NextResponse.json(
        { success: false, error: 'DASHBOARD_FOLDER_ID_REQUIRED' },
        { status: 400 }
      );
    }
    await deleteDashboardFolder(DEFAULT_USER_ID, String(folderId));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'DASHBOARD_FOLDER_DELETE_FAILED',
        message: error instanceof Error ? error.message : 'Dashboard-Ordner konnte nicht geloescht werden.',
      },
      { status: 500 }
    );
  }
}
