// ============================================
// route.ts - Terminvorschlag ablehnen
// 
// Zweck: Lehnt einen Terminvorschlag ab
// Endpunkt: POST /api/calendar/suggestions/[id]/decline
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getSuggestionById, declineSuggestion } from '@/lib/calendar';

// --------------------------------------------
// POST - Terminvorschlag ablehnen
// Body: { reason?: string }  (optional)
// --------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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
    
    // Vorschlag ablehnen
    const updatedSuggestion = await declineSuggestion(id);
    
    return NextResponse.json({
      success: true,
      suggestion: updatedSuggestion,
      message: 'Terminvorschlag abgelehnt',
    });
    
  } catch (error) {
    console.error('Terminvorschlag ablehnen fehlgeschlagen:', error);
    return NextResponse.json(
      { error: 'Terminvorschlag konnte nicht abgelehnt werden' },
      { status: 500 }
    );
  }
}
