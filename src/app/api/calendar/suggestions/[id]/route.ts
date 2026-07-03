// ============================================
// route.ts - Einzelner Terminvorschlag
// 
// Zweck: Details eines Terminvorschlags abrufen oder löschen
// Endpunkt: GET/DELETE /api/calendar/suggestions/[id]
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSuggestionById, prepareCalendarEventData } from '@/lib/calendar';

// --------------------------------------------
// GET - Terminvorschlag abrufen
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
    
    // Event-Daten für Preview vorbereiten
    const eventData = prepareCalendarEventData(suggestion);
    
    return NextResponse.json({
      suggestion,
      eventData,
      message: {
        subject: suggestion.message.subject,
        sender: suggestion.message.sender,
        senderName: suggestion.message.senderName,
      },
    });
    
  } catch (error) {
    console.error('Terminvorschlag laden fehlgeschlagen:', error);
    return NextResponse.json(
      { error: 'Terminvorschlag konnte nicht geladen werden' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// DELETE - Terminvorschlag löschen
// --------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Prüfe ob Vorschlag existiert
    const suggestion = await prisma.calendarSuggestion.findUnique({
      where: { id },
    });
    
    if (!suggestion) {
      return NextResponse.json(
        { error: 'Terminvorschlag nicht gefunden' },
        { status: 404 }
      );
    }
    
    // Vorschlag löschen
    await prisma.calendarSuggestion.delete({
      where: { id },
    });
    
    // Nachricht aktualisieren (hasCalendarAction zurücksetzen wenn keine anderen Vorschläge)
    const remainingSuggestions = await prisma.calendarSuggestion.count({
      where: { messageId: suggestion.messageId },
    });
    
    if (remainingSuggestions === 0) {
      await prisma.message.update({
        where: { id: suggestion.messageId },
        data: { 
          hasCalendarAction: false,
          calendarActionProcessed: false,
        },
      });
    }
    
    return NextResponse.json({
      deleted: true,
      id,
    });
    
  } catch (error) {
    console.error('Terminvorschlag löschen fehlgeschlagen:', error);
    return NextResponse.json(
      { error: 'Terminvorschlag konnte nicht gelöscht werden' },
      { status: 500 }
    );
  }
}
