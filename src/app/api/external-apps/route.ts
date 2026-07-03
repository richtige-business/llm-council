// ============================================
// /api/external-apps - Externe App Installationen
//
// Zweck: CRUD fuer installierte externe Web-Apps
// Verwendet von: Library, ModuleProvider Hydration
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_USER_ID, getOrCreateDefaultUser } from '@/lib/services/user-service';
import {
  deleteExternalApp,
  listExternalApps,
  upsertExternalApp,
} from '@/lib/services/external-app-service';

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export async function GET() {
  try {
    await getOrCreateDefaultUser();
    const apps = await listExternalApps(DEFAULT_USER_ID);
    return NextResponse.json({ success: true, apps });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'EXTERNAL_APPS_READ_FAILED',
        message:
          error instanceof Error
            ? error.message
            : 'Externe Apps konnten nicht geladen werden.',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await getOrCreateDefaultUser();
    const body = await request.json().catch(() => ({}));

    const moduleId = readString((body as { moduleId?: unknown }).moduleId).trim();
    const name = readString((body as { name?: unknown }).name).trim();
    const url = readString((body as { url?: unknown }).url).trim();

    if (!moduleId || !name || !url) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_PAYLOAD',
          message: 'moduleId, name und url sind erforderlich.',
        },
        { status: 400 }
      );
    }

    const app = await upsertExternalApp(DEFAULT_USER_ID, {
      moduleId,
      catalogId: readString((body as { catalogId?: unknown }).catalogId) || null,
      name,
      icon: readString((body as { icon?: unknown }).icon) || 'Globe',
      color: readString((body as { color?: unknown }).color) || '#6366f1',
      url,
      userUrl: readString((body as { userUrl?: unknown }).userUrl) || null,
    });

    return NextResponse.json({ success: true, app });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'EXTERNAL_APP_CREATE_FAILED',
        message:
          error instanceof Error
            ? error.message
            : 'Externe App konnte nicht gespeichert werden.',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await getOrCreateDefaultUser();
    const body = await request.json().catch(() => ({}));
    const moduleId = readString((body as { moduleId?: unknown }).moduleId).trim();

    if (!moduleId) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_PAYLOAD',
          message: 'moduleId ist erforderlich.',
        },
        { status: 400 }
      );
    }

    await deleteExternalApp(DEFAULT_USER_ID, moduleId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'EXTERNAL_APP_DELETE_FAILED',
        message:
          error instanceof Error
            ? error.message
            : 'Externe App konnte nicht entfernt werden.',
      },
      { status: 500 }
    );
  }
}
