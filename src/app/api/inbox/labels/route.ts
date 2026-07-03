// ============================================
// route.ts - Labels API
// 
// Zweck: CRUD für benutzerdefinierte LifeOS-Labels
// Route: GET/POST/PATCH/DELETE /api/inbox/labels
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// --------------------------------------------
// GET Handler
// Alle Labels abrufen
// --------------------------------------------

export async function GET() {
  try {
    const labels = await prisma.inboxLabel.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    // Labels formatieren mit Nachrichtenanzahl
    const formattedLabels = labels.map(label => ({
      id: label.id,
      name: label.name,
      color: label.color,
      icon: label.icon,
      sortOrder: label.sortOrder,
      isSystem: label.isSystem,
      messageCount: label._count.messages,
      createdAt: label.createdAt.toISOString(),
    }));

    return NextResponse.json({
      labels: formattedLabels,
    });

  } catch (error) {
    console.error('Fehler beim Abrufen der Labels:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Labels' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// POST Handler
// Neues Label erstellen
// --------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, color, icon } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Label-Name ist erforderlich' },
        { status: 400 }
      );
    }

    // Prüfen ob Label mit diesem Namen schon existiert
    const existing = await prisma.inboxLabel.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Ein Label mit diesem Namen existiert bereits' },
        { status: 409 }
      );
    }

    // Höchste sortOrder ermitteln
    const maxOrder = await prisma.inboxLabel.aggregate({
      _max: { sortOrder: true },
    });

    const label = await prisma.inboxLabel.create({
      data: {
        name: name.trim(),
        color: color || '#6366f1',
        icon: icon || null,
        sortOrder: (maxOrder._max.sortOrder || 0) + 1,
      },
    });

    return NextResponse.json({
      success: true,
      label: {
        id: label.id,
        name: label.name,
        color: label.color,
        icon: label.icon,
        sortOrder: label.sortOrder,
        isSystem: label.isSystem,
        messageCount: 0,
        createdAt: label.createdAt.toISOString(),
      },
    });

  } catch (error) {
    console.error('Fehler beim Erstellen des Labels:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Labels' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// PATCH Handler
// Label aktualisieren
// --------------------------------------------

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, color, icon, sortOrder } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Label-ID ist erforderlich' },
        { status: 400 }
      );
    }

    // Prüfen ob Label existiert
    const existing = await prisma.inboxLabel.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Label nicht gefunden' },
        { status: 404 }
      );
    }

    // System-Labels können nur eingeschränkt bearbeitet werden
    if (existing.isSystem && name !== undefined && name !== existing.name) {
      return NextResponse.json(
        { error: 'System-Labels können nicht umbenannt werden' },
        { status: 403 }
      );
    }

    // Bei Namensänderung: Prüfen ob neuer Name schon existiert
    if (name && name !== existing.name) {
      const duplicate = await prisma.inboxLabel.findUnique({
        where: { name: name.trim() },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: 'Ein Label mit diesem Namen existiert bereits' },
          { status: 409 }
        );
      }
    }

    const label = await prisma.inboxLabel.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return NextResponse.json({
      success: true,
      label: {
        id: label.id,
        name: label.name,
        color: label.color,
        icon: label.icon,
        sortOrder: label.sortOrder,
        isSystem: label.isSystem,
      },
    });

  } catch (error) {
    console.error('Fehler beim Aktualisieren des Labels:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Labels' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// DELETE Handler
// Label löschen
// --------------------------------------------

export async function DELETE(request: NextRequest) {
  try {
    const labelId = request.nextUrl.searchParams.get('id');

    if (!labelId) {
      return NextResponse.json(
        { error: 'Label-ID ist erforderlich' },
        { status: 400 }
      );
    }

    // Prüfen ob Label existiert und kein System-Label ist
    const existing = await prisma.inboxLabel.findUnique({
      where: { id: labelId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Label nicht gefunden' },
        { status: 404 }
      );
    }

    if (existing.isSystem) {
      return NextResponse.json(
        { error: 'System-Labels können nicht gelöscht werden' },
        { status: 403 }
      );
    }

    // Label löschen (Cascade löscht auch MessageLabel-Einträge)
    await prisma.inboxLabel.delete({
      where: { id: labelId },
    });

    return NextResponse.json({
      success: true,
      message: 'Label gelöscht',
    });

  } catch (error) {
    console.error('Fehler beim Löschen des Labels:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Labels' },
      { status: 500 }
    );
  }
}








