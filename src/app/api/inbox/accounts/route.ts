// ============================================
// route.ts - Email Accounts API
// 
// Zweck: Verwaltung der verbundenen E-Mail-Konten
// Route: GET/DELETE /api/inbox/accounts
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// --------------------------------------------
// GET Handler
// Alle verbundenen Konten abrufen
// --------------------------------------------

export async function GET() {
  try {
    const accounts = await prisma.emailAccount.findMany({
      select: {
        id: true,
        provider: true,
        email: true,
        displayName: true,
        labelId: true,
        label: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
            isSystem: true,
          },
        },
        isActive: true,
        lastSyncAt: true,
        syncError: true,
        createdAt: true,
        // Keine sensiblen Daten wie Tokens zurückgeben!
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    
    // Formatierte Antwort
    const formattedAccounts = accounts.map(account => ({
      id: account.id,
      provider: account.provider,
      email: account.email,
      displayName: account.displayName,
      labelId: account.labelId,
      label: account.label,
      isActive: account.isActive,
      lastSyncAt: account.lastSyncAt,
      syncError: account.syncError,
      messageCount: account._count.messages,
      createdAt: account.createdAt,
    }));
    
    return NextResponse.json({ accounts: formattedAccounts });
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Konten:', error);
    
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Konten' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// PATCH Handler
// Konto aktualisieren (Label zuweisen, etc.)
// --------------------------------------------

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, labelId, displayName } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Account-ID ist erforderlich' },
        { status: 400 }
      );
    }

    // Prüfe ob Konto existiert
    const existing = await prisma.emailAccount.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Konto nicht gefunden' },
        { status: 404 }
      );
    }

    // Wenn labelId angegeben, prüfe ob Label existiert
    if (labelId !== undefined && labelId !== null) {
      const label = await prisma.accountLabel.findUnique({
        where: { id: labelId },
      });

      if (!label) {
        return NextResponse.json(
          { error: 'Label nicht gefunden' },
          { status: 404 }
        );
      }
    }

    // Aktualisiere Konto
    const account = await prisma.emailAccount.update({
      where: { id },
      data: {
        ...(labelId !== undefined && { labelId: labelId || null }),
        ...(displayName !== undefined && { displayName: displayName || null }),
      },
      select: {
        id: true,
        provider: true,
        email: true,
        displayName: true,
        labelId: true,
        label: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
            isSystem: true,
          },
        },
        isActive: true,
        lastSyncAt: true,
        syncError: true,
        createdAt: true,
        _count: {
          select: { messages: true },
        },
      },
    });

    return NextResponse.json({
      account: {
        id: account.id,
        provider: account.provider,
        email: account.email,
        displayName: account.displayName,
        labelId: account.labelId,
        label: account.label,
        isActive: account.isActive,
        lastSyncAt: account.lastSyncAt,
        syncError: account.syncError,
        messageCount: account._count.messages,
        createdAt: account.createdAt,
      },
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Kontos:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Kontos' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// DELETE Handler
// Konto löschen (mit Query-Parameter ?id=xxx)
// --------------------------------------------

export async function DELETE(request: NextRequest) {
  try {
    const accountId = request.nextUrl.searchParams.get('id');
    
    if (!accountId) {
      return NextResponse.json(
        { error: 'Account-ID ist erforderlich' },
        { status: 400 }
      );
    }
    
    // Konto finden
    const account = await prisma.emailAccount.findUnique({
      where: { id: accountId },
    });
    
    if (!account) {
      return NextResponse.json(
        { error: 'Konto nicht gefunden' },
        { status: 404 }
      );
    }
    
    // Konto und alle zugehörigen Nachrichten löschen (Cascade)
    await prisma.emailAccount.delete({
      where: { id: accountId },
    });
    
    return NextResponse.json({
      success: true,
      message: `Konto ${account.email} wurde gelöscht`,
    });
    
  } catch (error) {
    console.error('Fehler beim Löschen des Kontos:', error);
    
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Kontos' },
      { status: 500 }
    );
  }
}




