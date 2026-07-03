// ============================================
// route.ts - API Route für Feedback (Swipes)
// 
// Zweck: Feedback zu Sandbox-Prompts speichern
// Verwendet von: SwipeFeedback UI
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { CreateFeedbackRequest } from '@/modules/training/types';

// --------------------------------------------
// GET - Alle Feedbacks abrufen (für DPO-Dataset)
// --------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rating = searchParams.get('rating');
    const usedForTraining = searchParams.get('usedForTraining');
    const sessionId = searchParams.get('sessionId');

    const where: Record<string, unknown> = {};
    if (rating) where.rating = rating;
    if (usedForTraining !== null) where.usedForTraining = usedForTraining === 'true';
    
    // Wenn sessionId angegeben, über Prompt filtern
    if (sessionId) {
      where.prompt = {
        sessionId,
      };
    }

    const feedbacks = await prisma.sandboxFeedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        prompt: {
          select: {
            id: true,
            input: true,
            output: true,
            sessionId: true,
            outputType: true,
          },
        },
      },
    });

    return NextResponse.json({ feedbacks });
  } catch (error) {
    console.error('Fehler beim Abrufen der Feedbacks:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Feedbacks' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// POST - Neues Feedback erstellen
// --------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body: CreateFeedbackRequest = await request.json();

    // Validierung
    if (!body.promptId || !body.rating) {
      return NextResponse.json(
        { error: 'Prompt-ID und Rating sind erforderlich' },
        { status: 400 }
      );
    }

    // Valide Ratings
    const validRatings = ['good', 'bad', 'edited'];
    if (!validRatings.includes(body.rating)) {
      return NextResponse.json(
        { error: 'Ungültiges Rating' },
        { status: 400 }
      );
    }

    // Prüfen ob Prompt existiert
    const prompt = await prisma.sandboxPrompt.findUnique({
      where: { id: body.promptId },
      include: {
        feedback: true,
      },
    });

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt nicht gefunden' },
        { status: 404 }
      );
    }

    // Falls bereits Feedback existiert, aktualisieren
    if (prompt.feedback) {
      const updatedFeedback = await prisma.sandboxFeedback.update({
        where: { id: prompt.feedback.id },
        data: {
          rating: body.rating,
          editedOutput: body.editedOutput || null,
          notes: body.notes || null,
          // Bei Änderung: nicht mehr als "used" markieren
          usedForTraining: false,
          usedInJobId: null,
        },
        include: {
          prompt: {
            select: {
              id: true,
              input: true,
              output: true,
            },
          },
        },
      });

      // Feedback-Count der Session nicht ändern (bereits gezählt)
      return NextResponse.json({ feedback: updatedFeedback });
    }

    // Neues Feedback erstellen
    const feedback = await prisma.sandboxFeedback.create({
      data: {
        promptId: body.promptId,
        rating: body.rating,
        editedOutput: body.editedOutput || null,
        notes: body.notes || null,
        usedForTraining: false,
      },
      include: {
        prompt: {
          select: {
            id: true,
            input: true,
            output: true,
            sessionId: true,
          },
        },
      },
    });

    // Feedback-Count der Session erhöhen
    await prisma.sandboxSession.update({
      where: { id: feedback.prompt.sessionId },
      data: {
        feedbackCount: { increment: 1 },
      },
    });

    return NextResponse.json({ feedback }, { status: 201 });
  } catch (error) {
    console.error('Fehler beim Erstellen des Feedbacks:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Feedbacks' },
      { status: 500 }
    );
  }
}








