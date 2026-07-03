// ============================================
// route.ts - API Route für Datasets
// 
// Zweck: CRUD-Operationen für Trainings-Datensätze
// Verwendet von: Training-Modul UI
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { CreateDatasetRequest, AddDatasetRowsRequest } from '@/modules/training/types';

// --------------------------------------------
// GET - Alle Datasets abrufen
// --------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // Optional: nach Typ filtern
    const status = searchParams.get('status'); // Optional: nach Status filtern

    const where: Record<string, string> = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const datasets = await prisma.dataset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            rows: true,
            trainingJobs: true,
          },
        },
      },
    });

    // JSON-Felder parsen
    const parsedDatasets = datasets.map((dataset) => ({
      ...dataset,
      schema: dataset.schema ? JSON.parse(dataset.schema) : null,
      metadata: dataset.metadata ? JSON.parse(dataset.metadata) : null,
      piiWarnings: dataset.piiWarnings ? JSON.parse(dataset.piiWarnings) : null,
      rowCount: dataset._count.rows, // Echte Row-Anzahl
      jobCount: dataset._count.trainingJobs,
    }));

    return NextResponse.json({ datasets: parsedDatasets });
  } catch (error) {
    console.error('Fehler beim Abrufen der Datasets:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Datasets' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// POST - Neues Dataset erstellen
// --------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body: CreateDatasetRequest = await request.json();

    // Validierung
    if (!body.name || !body.type) {
      return NextResponse.json(
        { error: 'Name und Typ sind erforderlich' },
        { status: 400 }
      );
    }

    // Valide Typen prüfen
    const validTypes = ['sft', 'dpo', 'classification'];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: 'Ungültiger Dataset-Typ' },
        { status: 400 }
      );
    }

    // Dataset erstellen
    const dataset = await prisma.dataset.create({
      data: {
        name: body.name,
        description: body.description || null,
        type: body.type,
        source: body.source || 'upload',
        status: 'draft',
        rowCount: 0,
      },
    });

    return NextResponse.json({ dataset }, { status: 201 });
  } catch (error) {
    console.error('Fehler beim Erstellen des Datasets:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Datasets' },
      { status: 500 }
    );
  }
}








