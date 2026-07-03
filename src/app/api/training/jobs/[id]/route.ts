// ============================================
// route.ts - API Route fuer einzelne Training Jobs
//
// Zweck: Aktualisiert simulierte Runs und markiert Jobs als
//        abgebrochen, abgeschlossen oder fehlgeschlagen
// Verwendet von: JobCard, Training-Simulation
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// --------------------------------------------
// PATCH - Simulierten Job aktualisieren
// Verarbeitet Fortschritt, Logs, Status und Metriken
// --------------------------------------------

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const existingJob = await prisma.trainingJob.findUnique({
      where: { id },
    });

    if (!existingJob) {
      return NextResponse.json(
        { error: 'Training Job nicht gefunden' },
        { status: 404 }
      );
    }

    const existingLogs = existingJob.logs ? JSON.parse(existingJob.logs) : [];
    const mergedLogs = body.log ? [...existingLogs, body.log] : existingLogs;
    const nextStatus = body.status || existingJob.status;
    const shouldFinalize =
      nextStatus === 'completed' ||
      nextStatus === 'failed' ||
      nextStatus === 'cancelled';

    const updatedJob = await prisma.trainingJob.update({
      where: { id },
      data: {
        progress: body.progress ?? existingJob.progress,
        currentEpoch: body.currentEpoch ?? existingJob.currentEpoch,
        status: nextStatus,
        logs: JSON.stringify(mergedLogs),
        metrics: body.metrics ? JSON.stringify(body.metrics) : existingJob.metrics,
        error: body.error ?? existingJob.error,
        completedAt: shouldFinalize ? new Date() : existingJob.completedAt,
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

    if (shouldFinalize) {
      await prisma.trainingModel.update({
        where: { id: updatedJob.modelId },
        data: {
          status: nextStatus === 'completed' ? 'ready' : 'failed',
          metrics: body.metrics ? JSON.stringify(body.metrics) : undefined,
        },
      });
    }

    return NextResponse.json({
      job: {
        ...updatedJob,
        config: updatedJob.config ? JSON.parse(updatedJob.config) : null,
        logs: updatedJob.logs ? JSON.parse(updatedJob.logs) : [],
        metrics: updatedJob.metrics ? JSON.parse(updatedJob.metrics) : null,
      },
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Jobs:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Jobs' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// DELETE - Job abbrechen
// Bricht einen laufenden Simulations-Run ab, ohne ihn zu loeschen
// --------------------------------------------

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const existingJob = await prisma.trainingJob.findUnique({
      where: { id },
    });

    if (!existingJob) {
      return NextResponse.json(
        { error: 'Training Job nicht gefunden' },
        { status: 404 }
      );
    }

    const existingLogs = existingJob.logs ? JSON.parse(existingJob.logs) : [];
    const updatedJob = await prisma.trainingJob.update({
      where: { id },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
        logs: JSON.stringify([
          ...existingLogs,
          {
            timestamp: Date.now(),
            level: 'warning',
            message: 'Run manuell abgebrochen',
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

    await prisma.trainingModel.update({
      where: { id: updatedJob.modelId },
      data: { status: 'ready' },
    });

    return NextResponse.json({
      job: {
        ...updatedJob,
        config: updatedJob.config ? JSON.parse(updatedJob.config) : null,
        logs: updatedJob.logs ? JSON.parse(updatedJob.logs) : [],
        metrics: updatedJob.metrics ? JSON.parse(updatedJob.metrics) : null,
      },
    });
  } catch (error) {
    console.error('Fehler beim Abbrechen des Jobs:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abbrechen des Jobs' },
      { status: 500 }
    );
  }
}
