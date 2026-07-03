// ============================================
// route.ts - API Route für Sandbox Sessions
// 
// Zweck: Sandbox Sessions erstellen und auflisten
// Verwendet von: Sandbox UI
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { CreateSandboxRequest } from '@/modules/training/types';

// --------------------------------------------
// GET - Alle Sessions abrufen
// --------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: Record<string, string> = {};
    if (status) where.status = status;

    const sessions = await prisma.sandboxSession.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        model: {
          select: { id: true, name: true, type: true, icon: true, color: true },
        },
        _count: {
          select: { prompts: true },
        },
      },
    });

    // JSON-Felder parsen
    const parsedSessions = sessions.map((session) => ({
      ...session,
      mockData: session.mockData ? JSON.parse(session.mockData) : null,
      promptCount: session._count.prompts,
    }));

    return NextResponse.json({ sessions: parsedSessions });
  } catch (error) {
    console.error('Fehler beim Abrufen der Sessions:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Sessions' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// POST - Neue Sandbox Session erstellen
// --------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body: CreateSandboxRequest = await request.json();

    // Falls modelId angegeben, prüfen ob Modell existiert
    if (body.modelId) {
      const model = await prisma.trainingModel.findUnique({
        where: { id: body.modelId },
      });

      if (!model) {
        return NextResponse.json(
          { error: 'Modell nicht gefunden' },
          { status: 404 }
        );
      }
    }

    // Session erstellen
    const session = await prisma.sandboxSession.create({
      data: {
        modelId: body.modelId || null,
        baseModel: body.baseModel || 'claude-3-haiku',
        name: body.name || `Session ${new Date().toLocaleString('de-DE')}`,
        status: 'active',
        systemPrompt: body.systemPrompt || null,
        mockData: body.mockData ? JSON.stringify(body.mockData) : null,
        feedbackCount: 0,
        timeoutMinutes: 5,
        lastActivityAt: new Date(),
      },
      include: {
        model: {
          select: { id: true, name: true, type: true, icon: true, color: true },
        },
      },
    });

    // JSON-Felder parsen
    const parsedSession = {
      ...session,
      mockData: session.mockData ? JSON.parse(session.mockData) : null,
    };

    return NextResponse.json({ session: parsedSession }, { status: 201 });
  } catch (error) {
    console.error('Fehler beim Erstellen der Session:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen der Session' },
      { status: 500 }
    );
  }
}








