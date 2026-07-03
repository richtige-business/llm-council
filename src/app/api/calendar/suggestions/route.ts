// ============================================
// route.ts - Terminvorschläge API Route
// 
// Zweck: Terminvorschläge aus E-Mails verwalten
//        - GET: Alle (pending) Vorschläge abrufen
//        - POST: Manuell einen Vorschlag erstellen
// Endpunkt: /api/calendar/suggestions
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { 
  getPendingSuggestions, 
  createCalendarSuggestion,
  expireOldSuggestions,
} from '@/lib/calendar';

// --------------------------------------------
// GET - Terminvorschläge abrufen
// Query-Parameter:
//   - status: 'pending' | 'accepted' | 'declined' | 'expired' | 'all'
//   - limit: Anzahl (default: 20)
// --------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Erst abgelaufene Vorschläge markieren
    await expireOldSuggestions();
    
    // Abfrage basierend auf Status
    let suggestions;
    
    if (status === 'all') {
      suggestions = await prisma.calendarSuggestion.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          message: {
            select: {
              id: true,
              subject: true,
              sender: true,
              senderName: true,
              receivedAt: true,
            },
          },
        },
      });
    } else if (status === 'pending') {
      suggestions = await getPendingSuggestions();
    } else {
      suggestions = await prisma.calendarSuggestion.findMany({
        where: { status },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          message: {
            select: {
              id: true,
              subject: true,
              sender: true,
              senderName: true,
              receivedAt: true,
            },
          },
        },
      });
    }
    
    // Anzahl pending für Badge
    const pendingCount = await prisma.calendarSuggestion.count({
      where: { status: 'pending' },
    });
    
    return NextResponse.json({
      suggestions,
      pendingCount,
      total: suggestions.length,
    });
    
  } catch (error) {
    console.error('Terminvorschläge laden fehlgeschlagen:', error);
    return NextResponse.json(
      { error: 'Terminvorschläge konnten nicht geladen werden' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// POST - Terminvorschlag manuell erstellen
// Body: { messageId, title, date?, time?, endTime?, meetingLink?, location?, description? }
// --------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      messageId, 
      title, 
      date, 
      time, 
      endTime, 
      meetingLink, 
      location, 
      description 
    } = body;
    
    // Validierung
    if (!messageId || typeof messageId !== 'string') {
      return NextResponse.json(
        { error: 'Nachrichten-ID erforderlich' },
        { status: 400 }
      );
    }
    
    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Titel erforderlich' },
        { status: 400 }
      );
    }
    
    // Prüfe ob Nachricht existiert
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });
    
    if (!message) {
      return NextResponse.json(
        { error: 'Nachricht nicht gefunden' },
        { status: 404 }
      );
    }
    
    // Prüfe ob bereits ein Vorschlag für diese Nachricht existiert
    const existingSuggestion = await prisma.calendarSuggestion.findFirst({
      where: { 
        messageId,
        status: 'pending',
      },
    });
    
    if (existingSuggestion) {
      return NextResponse.json(
        { 
          error: 'Vorschlag existiert bereits',
          existingSuggestion,
        },
        { status: 409 }
      );
    }
    
    // Vorschlag erstellen
    const suggestion = await createCalendarSuggestion({
      messageId,
      title,
      date,
      time,
      endTime,
      meetingLink,
      location,
      description,
      confidence: 1.0, // Manuell erstellt = 100% Konfidenz
    });
    
    return NextResponse.json({
      suggestion,
      created: true,
    }, { status: 201 });
    
  } catch (error) {
    console.error('Terminvorschlag erstellen fehlgeschlagen:', error);
    return NextResponse.json(
      { error: 'Terminvorschlag konnte nicht erstellt werden' },
      { status: 500 }
    );
  }
}
