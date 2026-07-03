// ============================================
// /api/streams/health - Stream API Health
//
// Zweck: Health-Endpoint fuer Frontend Stream Checks
// Verwendet von: stream-api.ts
// ============================================

import { NextResponse } from 'next/server';
import { STREAM_MANAGER_SERVICE_URL } from '@/lib/external-apps/constants';
import { listStreamSessions } from '@/lib/external-apps/server/stream-session-registry';

export async function GET() {
  try {
    const response = await fetch(`${STREAM_MANAGER_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          status: 'degraded',
          streamApi: 'ok',
          streamManager: 'unreachable',
          appRunner: 'unreachable',
          activeSessions: listStreamSessions().length,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'ok',
      streamApi: 'ok',
      streamManager: 'ok',
      appRunner: 'ok',
      activeSessions: listStreamSessions().length,
    });
  } catch {
    return NextResponse.json(
      {
        status: 'degraded',
        streamApi: 'ok',
        streamManager: 'unreachable',
        appRunner: 'unreachable',
        activeSessions: listStreamSessions().length,
      },
      { status: 503 }
    );
  }
}
