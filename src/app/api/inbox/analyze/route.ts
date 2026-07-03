// ============================================
// route.ts - KI-Analyse API Route
// 
// Zweck: Analysiert Nachrichten mittels KI
//        - Kategorisiert als privat/geschäftlich
//        - Bestimmt Dringlichkeit
//        - Erkennt Terminvorschläge
// Endpunkt: POST /api/inbox/analyze
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { 
  analyzeMessage, 
  analyzeMessagesBatch, 
  isAIConfigured, 
  getConfiguredProvider 
} from '@/lib/ai';
import { createSuggestionFromAnalysis } from '@/lib/calendar';
import { findOrCreateContact } from '@/lib/contacts';

// --------------------------------------------
// POST - Nachrichten analysieren
// --------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // Prüfe ob KI konfiguriert ist
    if (!isAIConfigured()) {
      return NextResponse.json(
        { 
          error: 'KI-Analyse nicht verfügbar',
          message: 'Bitte OPENAI_API_KEY oder ANTHROPIC_API_KEY in der .env Datei konfigurieren.',
        },
        { status: 503 }
      );
    }
    
    const body = await request.json();
    const { messageIds, single } = body;
    
    // Validierung
    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json(
        { error: 'messageIds Array erforderlich' },
        { status: 400 }
      );
    }
    
    // Limit auf 20 Nachrichten pro Request
    if (messageIds.length > 20) {
      return NextResponse.json(
        { error: 'Maximal 20 Nachrichten pro Request erlaubt' },
        { status: 400 }
      );
    }
    
    // Nachrichten aus der Datenbank laden
    const messages = await prisma.message.findMany({
      where: {
        id: { in: messageIds },
      },
      select: {
        id: true,
        subject: true,
        body: true,
        sender: true,
        senderName: true,
        receivedAt: true,
        category: true,
        urgency: true,
      },
    });
    
    if (messages.length === 0) {
      return NextResponse.json(
        { error: 'Keine Nachrichten gefunden' },
        { status: 404 }
      );
    }
    
    const provider = getConfiguredProvider()!;
    const results: Record<string, {
      category: string;
      urgency: number;
      hasCalendarSuggestion: boolean;
      suggestionId?: string;
    }> = {};
    
    // Einzelne Nachricht oder Batch
    if (single || messages.length === 1) {
      // Einzelanalyse
      for (const msg of messages) {
        const analysis = await analyzeMessage({
          subject: msg.subject,
          body: msg.body,
          sender: msg.sender,
          senderName: msg.senderName,
          receivedAt: msg.receivedAt.toISOString(),
        }, provider);
        
        // Nachricht in DB aktualisieren
        await prisma.message.update({
          where: { id: msg.id },
          data: {
            category: analysis.category,
            urgency: analysis.urgency,
            hasCalendarAction: !!analysis.calendarSuggestion,
          },
        });
        
        // Terminvorschlag erstellen falls erkannt
        let suggestionId: string | undefined;
        if (analysis.calendarSuggestion) {
          const suggestion = await createSuggestionFromAnalysis(msg.id, analysis);
          suggestionId = suggestion?.id;
        }
        
        // Kontakt erstellen/aktualisieren falls Name erkannt
        if (analysis.suggestedContactName) {
          await findOrCreateContact({
            email: msg.sender,
            name: analysis.suggestedContactName,
            category: analysis.category,
          });
        }
        
        results[msg.id] = {
          category: analysis.category,
          urgency: analysis.urgency,
          hasCalendarSuggestion: !!analysis.calendarSuggestion,
          suggestionId,
        };
      }
    } else {
      // Batch-Analyse
      const batchInput = {
        messages: messages.map(msg => ({
          id: msg.id,
          subject: msg.subject,
          body: msg.body,
          sender: msg.sender,
          senderName: msg.senderName,
          receivedAt: msg.receivedAt.toISOString(),
        })),
      };
      
      const analysisMap = await analyzeMessagesBatch(batchInput, provider);
      
      // Ergebnisse verarbeiten
      for (const [msgId, analysis] of analysisMap) {
        // Nachricht in DB aktualisieren
        await prisma.message.update({
          where: { id: msgId },
          data: {
            category: analysis.category,
            urgency: analysis.urgency,
            hasCalendarAction: !!analysis.calendarSuggestion,
          },
        });
        
        // Terminvorschlag erstellen falls erkannt
        let suggestionId: string | undefined;
        if (analysis.calendarSuggestion) {
          const suggestion = await createSuggestionFromAnalysis(msgId, analysis);
          suggestionId = suggestion?.id;
        }
        
        results[msgId] = {
          category: analysis.category,
          urgency: analysis.urgency,
          hasCalendarSuggestion: !!analysis.calendarSuggestion,
          suggestionId,
        };
      }
    }
    
    return NextResponse.json({
      success: true,
      analyzed: Object.keys(results).length,
      results,
    });
    
  } catch (error) {
    console.error('Analyse-Fehler:', error);
    return NextResponse.json(
      { 
        error: 'Analyse fehlgeschlagen',
        message: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// GET - Analyse-Status prüfen
// --------------------------------------------

export async function GET() {
  const isConfigured = isAIConfigured();
  const provider = getConfiguredProvider();
  
  return NextResponse.json({
    available: isConfigured,
    provider: provider || 'none',
    message: isConfigured 
      ? `KI-Analyse verfügbar (${provider})` 
      : 'KI-Analyse nicht konfiguriert. Bitte OPENAI_API_KEY oder ANTHROPIC_API_KEY setzen.',
  });
}
