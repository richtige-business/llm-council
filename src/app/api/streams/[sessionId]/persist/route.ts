// ============================================
// /api/streams/[sessionId]/persist - Session persistieren
//
// Zweck: Markiert Session als persistiert (Placeholder fuer
//        zukuenftige Cookie-/Storage-Persistenz im Stream-Backend)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getStreamSession,
  markSessionPersisted,
} from '@/lib/external-apps/server/stream-session-registry';

export async function POST(
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

  const persisted = markSessionPersisted(sessionId);
  return NextResponse.json({
    success: true,
    sessionId,
    persistedAt: persisted?.lastPersistedAt || new Date().toISOString(),
  });
}
