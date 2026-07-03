// ============================================
// route.ts - API Route für Training Jobs
// 
// Zweck: Training Jobs erstellen und auflisten
// Verwendet von: Training-Modul UI
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { StartTrainingRequest } from '@/modules/training/types';
import { DEFAULT_TRAINING_CONFIG } from '@/modules/training/constants';

// --------------------------------------------
// GET - Alle Jobs abrufen
// --------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const modelId = searchParams.get('modelId');

    const where: Record<string, string> = {};
    if (status) where.status = status;
    if (modelId) where.modelId = modelId;

    const jobs = await prisma.trainingJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        model: {
          select: { id: true, name: true, type: true, icon: true, color: true },
        },
        dataset: {
          select: { id: true, name: true, type: true, rowCount: true },
        },
      },
    });

    // JSON-Felder parsen
    const parsedJobs = jobs.map((job) => ({
      ...job,
      config: job.config ? JSON.parse(job.config) : null,
      logs: job.logs ? JSON.parse(job.logs) : [],
      metrics: job.metrics ? JSON.parse(job.metrics) : null,
    }));

    return NextResponse.json({ jobs: parsedJobs });
  } catch (error) {
    console.error('Fehler beim Abrufen der Jobs:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Jobs' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// POST - Neuen Training Job starten
// --------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body: StartTrainingRequest = await request.json();

    // Validierung
    if (!body.modelId || !body.datasetId) {
      return NextResponse.json(
        { error: 'Modell-ID und Dataset-ID sind erforderlich' },
        { status: 400 }
      );
    }

    // Prüfen ob Modell existiert
    const model = await prisma.trainingModel.findUnique({
      where: { id: body.modelId },
    });

    if (!model) {
      return NextResponse.json(
        { error: 'Modell nicht gefunden' },
        { status: 404 }
      );
    }

    // Prüfen ob Dataset existiert und ready ist
    const dataset = await prisma.dataset.findUnique({
      where: { id: body.datasetId },
    });

    if (!dataset) {
      return NextResponse.json(
        { error: 'Dataset nicht gefunden' },
        { status: 404 }
      );
    }

    if (dataset.status !== 'ready') {
      return NextResponse.json(
        { error: 'Dataset ist nicht bereit für Training' },
        { status: 400 }
      );
    }

    // Trainings-Methode validieren
    const method = body.method || 'sft';
    if (method === 'dpo' && dataset.type !== 'dpo') {
      return NextResponse.json(
        { error: 'DPO-Training benötigt ein DPO-Dataset' },
        { status: 400 }
      );
    }

    // Konfiguration zusammenführen
    const config = {
      ...DEFAULT_TRAINING_CONFIG,
      ...body.config,
    };

    // Kosten schätzen (Mock: 0)
    const estimatedCost = body.gpuProvider === 'mock' ? 0 : 
      Math.round(dataset.rowCount * config.epochs * 0.5); // ~0.5 Cent pro Sample*Epoch

    // Job erstellen
    const job = await prisma.trainingJob.create({
      data: {
        modelId: body.modelId,
        datasetId: body.datasetId,
        method,
        status: 'queued',
        progress: 0,
        currentEpoch: 0,
        totalEpochs: config.epochs,
        config: JSON.stringify(config),
        logs: JSON.stringify([
          {
            timestamp: Date.now(),
            level: 'info',
            message: 'Training Job erstellt',
          },
        ]),
        estimatedCost,
        gpuProvider: body.gpuProvider || 'mock',
      },
      include: {
        model: {
          select: { id: true, name: true, type: true },
        },
        dataset: {
          select: { id: true, name: true, type: true, rowCount: true },
        },
      },
    });

    // Modell-Status aktualisieren
    await prisma.trainingModel.update({
      where: { id: body.modelId },
      data: { status: 'training' },
    });

    // Bei Mock-Provider: Sofort Simulation starten
    let responseJob = job;

    if (job.gpuProvider === 'mock') {
      // Training wird asynchron simuliert (siehe /api/training/jobs/[id]/simulate)
      // Hier setzen wir nur den Status auf "running"
      responseJob = await prisma.trainingJob.update({
        where: { id: job.id },
        data: {
          status: 'running',
          startedAt: new Date(),
          logs: JSON.stringify([
            {
              timestamp: Date.now(),
              level: 'info',
              message: 'Training Job erstellt',
            },
            {
              timestamp: Date.now(),
              level: 'info',
              message: 'Mock-Training gestartet',
            },
          ]),
        },
        include: {
          model: {
            select: { id: true, name: true, type: true, icon: true, color: true },
          },
          dataset: {
            select: { id: true, name: true, type: true, rowCount: true },
          },
        },
      });
    }

    // JSON-Felder parsen für Response
    const parsedJob = {
      ...responseJob,
      config: responseJob.config ? JSON.parse(responseJob.config) : null,
      logs: responseJob.logs ? JSON.parse(responseJob.logs) : [],
      metrics: responseJob.metrics ? JSON.parse(responseJob.metrics) : null,
    };

    return NextResponse.json({ job: parsedJob }, { status: 201 });
  } catch (error) {
    console.error('Fehler beim Erstellen des Jobs:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Jobs' },
      { status: 500 }
    );
  }
}








