// ============================================
// /api/streams/[sessionId] - Session lesen/beenden
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { STREAM_MANAGER_SERVICE_URL } from '@/lib/external-apps/constants';
import {
  deleteStreamSession,
  getStreamSession,
  upsertStreamSession,
} from '@/lib/external-apps/server/stream-session-registry';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = getStreamSession(sessionId);
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'NOT_FOUND', message: 'Session nicht gefunden.' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    sessionId: session.sessionId,
    status: session.status,
    viewerUrl: session.viewerUrl,
    targetUrl: session.targetUrl,
    moduleId: session.moduleId,
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = getStreamSession(sessionId);
  if (!session) {
    return NextResponse.json({ success: true });
  }

  try {
    await fetch(`${STREAM_MANAGER_SERVICE_URL}/api/container/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    }).catch(() => undefined);

    deleteStreamSession(sessionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    // Session lokal trotzdem entfernen, damit UI nicht haengt
    upsertStreamSession({
      ...session,
      status: 'error',
    });
    return NextResponse.json(
      {
        success: false,
        error: 'STREAM_STOP_FAILED',
        message:
          error instanceof Error
            ? error.message
            : 'Session konnte nicht beendet werden.',
      },
      { status: 500 }
    );
  }
}
