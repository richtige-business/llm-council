// ============================================
// seed/route.ts - Seed System-Labels
// 
// Zweck: Erstellt vordefinierte System-Labels beim ersten Aufruf
// Verwendet von: App-Start, AccountBar
// ============================================

import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

// Vordefinierte System-Labels
const SYSTEM_LABELS = [
  { name: 'Privat', color: '#10B981', icon: '👤' },    // Grün
  { name: 'Business', color: '#6366F1', icon: '💼' },   // Indigo
  { name: 'Education', color: '#F59E0B', icon: '🎓' },  // Amber
];

// --------------------------------------------
// POST: System-Labels erstellen (falls nicht vorhanden)
// --------------------------------------------

export async function POST() {
  try {
    const upsertedLabels = [];

    for (const labelData of SYSTEM_LABELS) {
      // Upsert: Erstellt oder ignoriert bei Existenz
      const label = await prisma.accountLabel.upsert({
        where: { name: labelData.name },
        update: {}, // Keine Änderungen wenn bereits vorhanden
        create: {
          name: labelData.name,
          color: labelData.color,
          icon: labelData.icon,
          isSystem: true,
        },
      });
      upsertedLabels.push(label);
    }

    return NextResponse.json({
      success: true,
      labels: upsertedLabels,
    });
  } catch (error) {
    console.error('Fehler beim Seeden der System-Labels:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen der System-Labels' },
      { status: 500 }
    );
  }
}

