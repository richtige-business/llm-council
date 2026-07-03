// ============================================
// /api/external-apps/[moduleId] - Einzelne externe App
//
// Zweck: Lesen und Aktualisieren einzelner App-Konfigurationen
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_USER_ID, getOrCreateDefaultUser } from '@/lib/services/user-service';
import { getExternalApp, updateExternalApp } from '@/lib/services/external-app-service';

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    await getOrCreateDefaultUser();
    const { moduleId } = await params;
    const app = await getExternalApp(DEFAULT_USER_ID, moduleId);

    if (!app) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Externe App nicht gefunden.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, app });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'EXTERNAL_APP_READ_FAILED',
        message:
          error instanceof Error
            ? error.message
            : 'Externe App konnte nicht gelesen werden.',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    await getOrCreateDefaultUser();
    const { moduleId } = await params;
    const body = await request.json().catch(() => ({}));

    const app = await updateExternalApp(DEFAULT_USER_ID, moduleId, {
      catalogId: readString((body as { catalogId?: unknown }).catalogId),
      name: readString((body as { name?: unknown }).name),
      icon: readString((body as { icon?: unknown }).icon),
      color: readString((body as { color?: unknown }).color),
      url: readString((body as { url?: unknown }).url),
      userUrl: readString((body as { userUrl?: unknown }).userUrl),
    });

    return NextResponse.json({ success: true, app });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'EXTERNAL_APP_UPDATE_FAILED',
        message:
          error instanceof Error
            ? error.message
            : 'Externe App konnte nicht aktualisiert werden.',
      },
      { status: 500 }
    );
  }
}
