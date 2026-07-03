// ============================================
// route.ts - Terminvorschlag annehmen
// 
// Zweck: Akzeptiert einen Terminvorschlag und erstellt Kalender-Event
//        Prüft vorher auf Duplikate
// Endpunkt: POST /api/calendar/suggestions/[id]/accept
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { 
  getSuggestionById, 
  acceptSuggestion, 
  checkForDuplicates,
  prepareCalendarEventData,
} from '@/lib/calendar';

// --------------------------------------------
// POST - Terminvorschlag annehmen
// Body: { 
//   eventId: string,           // ID des erstellten Events (Frontend erstellt)
//   existingEvents?: CalendarEvent[]  // Für Duplikat-Check
// }
// --------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { eventId, existingEvents, skipDuplicateCheck } = body;
    
    // Vorschlag laden
    const suggestion = await getSuggestionById(id);
    
    if (!suggestion) {
      return NextResponse.json(
        { error: 'Terminvorschlag nicht gefunden' },
        { status: 404 }
      );
    }
    
    // Prüfe Status
    if (suggestion.status !== 'pending') {
      return NextResponse.json(
        { 
          error: 'Terminvorschlag bereits verarbeitet',
          status: suggestion.status,
        },
        { status: 400 }
      );
    }
    
    // Duplikat-Check (wenn Events übergeben wurden)
    if (!skipDuplicateCheck && existingEvents && Array.isArray(existingEvents)) {
      const duplicateResult = checkForDuplicates(suggestion, existingEvents);
      
      if (duplicateResult.isDuplicate) {
        return NextResponse.json({
          warning: 'duplicate_found',
          message: `Ein ähnlicher Termin existiert bereits: "${duplicateResult.existingEventTitle}"`,
          matchReason: duplicateResult.matchReason,
          existingEventId: duplicateResult.existingEventId,
          // Event-Daten trotzdem zurückgeben, falls User trotzdem erstellen will
          eventData: prepareCalendarEventData(suggestion),
        }, { status: 200 });
      }
    }
    
    // Wenn eventId übergeben wurde, wurde das Event bereits im Frontend erstellt
    if (eventId) {
      const updatedSuggestion = await acceptSuggestion(id, eventId);
      
      return NextResponse.json({
        success: true,
        suggestion: updatedSuggestion,
        message: 'Terminvorschlag akzeptiert und Termin erstellt',
      });
    }
    
    // Wenn keine eventId: Nur Event-Daten für Frontend vorbereiten
    const eventData = prepareCalendarEventData(suggestion);
    
    return NextResponse.json({
      requiresCreation: true,
      eventData,
      suggestionId: id,
      message: 'Event-Daten vorbereitet. Bitte Event erstellen und mit eventId bestätigen.',
    });
    
  } catch (error) {
    console.error('Terminvorschlag akzeptieren fehlgeschlagen:', error);
    return NextResponse.json(
      { error: 'Terminvorschlag konnte nicht akzeptiert werden' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// GET - Event-Daten für Vorschlag abrufen
// Nützlich um Preview zu zeigen
// --------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const suggestion = await getSuggestionById(id);
    
    if (!suggestion) {
      return NextResponse.json(
        { error: 'Terminvorschlag nicht gefunden' },
        { status: 404 }
      );
    }
    
    const eventData = prepareCalendarEventData(suggestion);
    
    return NextResponse.json({
      suggestion,
      eventData,
      message: suggestion.message,
    });
    
  } catch (error) {
    console.error('Terminvorschlag laden fehlgeschlagen:', error);
    return NextResponse.json(
      { error: 'Terminvorschlag konnte nicht geladen werden' },
      { status: 500 }
    );
  }
}
