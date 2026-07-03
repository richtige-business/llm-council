// ============================================
// /api/streams/create - Stream-Session erstellen
//
// Zweck: Erstellt eine Cloud-Stream-Session ueber den Stream-Manager
// Verwendet von: stream-api.ts createStreamSession()
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { STREAM_MANAGER_SERVICE_URL } from '@/lib/external-apps/constants';
import {
  upsertStreamSession,
} from '@/lib/external-apps/server/stream-session-registry';

interface CreateStreamPayload {
  moduleId?: string;
  targetUrl?: string;
  persistSession?: boolean;
  resolution?: string;
}

interface StreamManagerStartResponse {
  success?: boolean;
  session?: {
    sessionId: string;
    targetUrl?: string;
    status?: string;
    viewerUrl?: string;
  };
  message?: string;
  dockerAvailable?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as CreateStreamPayload;
    const moduleId = (body.moduleId || '').trim();
    const targetUrl = (body.targetUrl || '').trim();

    if (!moduleId || !targetUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_PAYLOAD',
          message: 'moduleId und targetUrl sind erforderlich.',
        },
        { status: 400 }
      );
    }

    const sessionId = `stream-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const startResponse = await fetch(`${STREAM_MANAGER_SERVICE_URL}/api/container/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appName: moduleId,
        sessionId,
        url: targetUrl,
        resolution: body.resolution,
      }),
    });

    const startData = (await startResponse.json().catch(() => ({}))) as StreamManagerStartResponse;

    if (!startResponse.ok || !startData.session?.sessionId || !startData.session.viewerUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'STREAM_START_FAILED',
          message: startData.message || 'Stream-Session konnte nicht gestartet werden.',
          dockerAvailable: startData.dockerAvailable ?? true,
        },
        { status: startData.dockerAvailable === false ? 503 : 500 }
      );
    }

    const forwardedHost =
      request.headers.get('x-forwarded-host') ||
      request.headers.get('host') ||
      request.nextUrl.host;
    const forwardedProto =
      request.headers.get('x-forwarded-proto') ||
      request.nextUrl.protocol.replace(':', '');
    const publicHostname = forwardedHost.split(':')[0] || request.nextUrl.hostname;
    const publicOrigin = `${forwardedProto}://${forwardedHost}`;
    const directViewerUrl = startData.session.viewerUrl;
    const directViewerSearch = (() => {
      try {
        return new URL(directViewerUrl).search;
      } catch {
        return '';
      }
    })();
    const useDirectViewerUrl = ['localhost', '127.0.0.1'].includes(publicHostname);
    const proxiedViewerUrl = `${publicOrigin}/stream/${startData.session.sessionId}/${directViewerSearch}`;
    const resolvedViewerUrl = useDirectViewerUrl
      ? directViewerUrl
      : proxiedViewerUrl;

    const session = upsertStreamSession({
      sessionId: startData.session.sessionId,
      moduleId,
      targetUrl,
      viewerUrl: resolvedViewerUrl,
      status: 'ready',
    });

    return NextResponse.json({
      sessionId: session.sessionId,
      status: session.status,
      viewerUrl: session.viewerUrl,
      targetUrl: session.targetUrl,
      moduleId: session.moduleId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'STREAM_CREATE_FAILED',
        message:
          error instanceof Error
            ? error.message
            : 'Stream-Session konnte nicht erstellt werden.',
      },
      { status: 500 }
    );
  }
}
