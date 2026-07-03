// ============================================
// route.ts - API Route für Training-Modelle
// 
// Zweck: CRUD-Operationen für trainierte Modelle
// Verwendet von: Training-Modul UI
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { CreateModelRequest } from '@/modules/training/types';

// --------------------------------------------
// GET - Alle Modelle abrufen
// --------------------------------------------

export async function GET() {
  try {
    const models = await prisma.trainingModel.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            trainingJobs: true,
            sandboxSessions: true,
          },
        },
      },
    });

    // Config und Metrics von JSON-String zu Objekt parsen
    const parsedModels = models.map((model) => ({
      ...model,
      config: model.config ? JSON.parse(model.config) : null,
      metrics: model.metrics ? JSON.parse(model.metrics) : null,
      jobCount: model._count.trainingJobs,
      sessionCount: model._count.sandboxSessions,
    }));

    return NextResponse.json({ models: parsedModels });
  } catch (error) {
    console.error('Fehler beim Abrufen der Modelle:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Modelle' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// POST - Neues Modell erstellen
// --------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body: CreateModelRequest = await request.json();

    // Validierung
    if (!body.name || !body.baseModel || !body.type) {
      return NextResponse.json(
        { error: 'Name, Basis-Modell und Typ sind erforderlich' },
        { status: 400 }
      );
    }

    // Modell erstellen
    const model = await prisma.trainingModel.create({
      data: {
        name: body.name,
        description: body.description || null,
        baseModel: body.baseModel,
        type: body.type,
        icon: body.icon || 'Brain',
        color: body.color || '#8b5cf6',
        status: 'draft',
      },
    });

    return NextResponse.json({ model }, { status: 201 });
  } catch (error) {
    console.error('Fehler beim Erstellen des Modells:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Modells' },
      { status: 500 }
    );
  }
}








