// ============================================
// /api/streams/pool - Pool-Status
//
// Zweck: Liefert einen einfachen Pool-/Load-Status fuer UI und Monitoring
// ============================================

import { NextResponse } from 'next/server';
import { listStreamSessions } from '@/lib/external-apps/server/stream-session-registry';

export async function GET() {
  const sessions = listStreamSessions();
  const capacity = 40;
  const active = sessions.length;
  const warm = Math.max(0, Math.min(8, capacity - active));

  return NextResponse.json({
    warm,
    active,
    capacity,
  });
}
