// ============================================
// route.ts - Label Assignment API
// 
// Zweck: Labels zu Nachrichten zuordnen/entfernen
// Route: POST/DELETE /api/inbox/labels/assign
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// --------------------------------------------
// POST Handler
// Label zu Nachricht zuordnen
// --------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, labelId, messageIds, labelIds } = body;

    // Entweder einzelne IDs oder Arrays
    const messages = messageIds || (messageId ? [messageId] : []);
    const labels = labelIds || (labelId ? [labelId] : []);

    if (messages.length === 0) {
      return NextResponse.json(
        { error: 'Mindestens eine Nachrichten-ID ist erforderlich' },
        { status: 400 }
      );
    }

    if (labels.length === 0) {
      return NextResponse.json(
        { error: 'Mindestens eine Label-ID ist erforderlich' },
        { status: 400 }
      );
    }

    // Alle Kombinationen erstellen (skipDuplicates ignoriert bestehende)
    const assignments = [];
    for (const msgId of messages) {
      for (const lblId of labels) {
        assignments.push({
          messageId: msgId,
          labelId: lblId,
        });
      }
    }

    await prisma.messageLabel.createMany({
      data: assignments,
      skipDuplicates: true,
    });

    return NextResponse.json({
      success: true,
      message: `${assignments.length} Label-Zuordnung(en) erstellt`,
      assignedCount: assignments.length,
    });

  } catch (error) {
    console.error('Fehler beim Zuordnen des Labels:', error);
    return NextResponse.json(
      { error: 'Fehler beim Zuordnen des Labels' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// DELETE Handler
// Label von Nachricht entfernen
// --------------------------------------------

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const messageId = searchParams.get('messageId');
    const labelId = searchParams.get('labelId');

    if (!messageId || !labelId) {
      return NextResponse.json(
        { error: 'messageId und labelId sind erforderlich' },
        { status: 400 }
      );
    }

    // Zuordnung löschen
    await prisma.messageLabel.deleteMany({
      where: {
        messageId,
        labelId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Label-Zuordnung entfernt',
    });

  } catch (error) {
    console.error('Fehler beim Entfernen des Labels:', error);
    return NextResponse.json(
      { error: 'Fehler beim Entfernen des Labels' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// GET Handler
// Labels einer Nachricht abrufen
// --------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const messageId = request.nextUrl.searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json(
        { error: 'messageId ist erforderlich' },
        { status: 400 }
      );
    }

    const assignments = await prisma.messageLabel.findMany({
      where: { messageId },
      include: {
        label: true,
      },
    });

    const labels = assignments.map(a => ({
      id: a.label.id,
      name: a.label.name,
      color: a.label.color,
      icon: a.label.icon,
      assignedAt: a.assignedAt.toISOString(),
    }));

    return NextResponse.json({
      messageId,
      labels,
    });

  } catch (error) {
    console.error('Fehler beim Abrufen der Labels:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Labels' },
      { status: 500 }
    );
  }
}








