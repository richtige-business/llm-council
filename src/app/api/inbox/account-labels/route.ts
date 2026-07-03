// ============================================
// account-labels/route.ts - API für Konto-Labels
// 
// Zweck: CRUD-Operationen für AccountLabel
//        Labels für E-Mail-Konten (Privat, Business, Education)
// Verwendet von: AccountBar, Konto-Verwaltung
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

// --------------------------------------------
// GET: Alle Konto-Labels abrufen
// --------------------------------------------

export async function GET() {
  try {
    const labels = await prisma.accountLabel.findMany({
      orderBy: [
        { isSystem: 'desc' },  // System-Labels zuerst
        { name: 'asc' },
      ],
      include: {
        _count: {
          select: { accounts: true },
        },
      },
    });

    // Formatiere die Antwort
    const formattedLabels = labels.map((label: (typeof labels)[number]) => ({
      id: label.id,
      name: label.name,
      color: label.color,
      icon: label.icon,
      isSystem: label.isSystem,
      accountCount: label._count.accounts,
      createdAt: label.createdAt.toISOString(),
    }));

    return NextResponse.json({ labels: formattedLabels });
  } catch (error) {
    console.error('Fehler beim Laden der Konto-Labels:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Labels' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// POST: Neues Konto-Label erstellen
// --------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, color, icon } = body;

    // Validierung
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name ist erforderlich' },
        { status: 400 }
      );
    }

    // Prüfe ob Label bereits existiert
    const existing = await prisma.accountLabel.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Ein Label mit diesem Namen existiert bereits' },
        { status: 409 }
      );
    }

    // Erstelle neues Label
    const label = await prisma.accountLabel.create({
      data: {
        name: name.trim(),
        color: color || '#6366f1',
        icon: icon || null,
        isSystem: false,
      },
    });

    return NextResponse.json({
      label: {
        id: label.id,
        name: label.name,
        color: label.color,
        icon: label.icon,
        isSystem: label.isSystem,
        accountCount: 0,
        createdAt: label.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Konto-Labels:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Labels' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// PATCH: Konto-Label aktualisieren
// --------------------------------------------

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, color, icon } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Label-ID ist erforderlich' },
        { status: 400 }
      );
    }

    // Prüfe ob Label existiert
    const existing = await prisma.accountLabel.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Label nicht gefunden' },
        { status: 404 }
      );
    }

    // System-Labels können nicht umbenannt werden
    if (existing.isSystem && name && name !== existing.name) {
      return NextResponse.json(
        { error: 'System-Labels können nicht umbenannt werden' },
        { status: 403 }
      );
    }

    // Aktualisiere Label
    const label = await prisma.accountLabel.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(color && { color }),
        ...(icon !== undefined && { icon }),
      },
      include: {
        _count: {
          select: { accounts: true },
        },
      },
    });

    return NextResponse.json({
      label: {
        id: label.id,
        name: label.name,
        color: label.color,
        icon: label.icon,
        isSystem: label.isSystem,
        accountCount: label._count.accounts,
        createdAt: label.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Konto-Labels:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Labels' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// DELETE: Konto-Label löschen
// --------------------------------------------

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Label-ID ist erforderlich' },
        { status: 400 }
      );
    }

    // Prüfe ob Label existiert
    const existing = await prisma.accountLabel.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Label nicht gefunden' },
        { status: 404 }
      );
    }

    // System-Labels können nicht gelöscht werden
    if (existing.isSystem) {
      return NextResponse.json(
        { error: 'System-Labels können nicht gelöscht werden' },
        { status: 403 }
      );
    }

    // Lösche Label (Konten werden automatisch auf null gesetzt durch onDelete: SetNull)
    await prisma.accountLabel.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Löschen des Konto-Labels:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Labels' },
      { status: 500 }
    );
  }
}








