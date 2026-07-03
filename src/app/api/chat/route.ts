// ============================================
// route.ts - API Route für Claude Chat
// 
// Zweck: Stellt die Verbindung zur Claude API her
// Verwendet von: ChatWidget
// ============================================

import { NextRequest, NextResponse } from 'next/server';

// --------------------------------------------
// API Key aus Environment Variables
// Wird sicher von .env.local geladen
// --------------------------------------------

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.warn('ANTHROPIC_API_KEY ist nicht gesetzt! Claude Chat wird nicht funktionieren.');
}

// --------------------------------------------
// POST Handler - Chat-Nachricht verarbeiten
// --------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // API Key prüfen (auch zur Laufzeit, falls .env.local erst nach Start geladen wurde)
    const apiKey = process.env.ANTHROPIC_API_KEY || ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY fehlt! Stelle sicher dass .env.local existiert und der Server neu gestartet wurde.');
      return NextResponse.json(
        { error: 'API Key nicht konfiguriert. Bitte .env.local überprüfen und Server neu starten.' },
        { status: 500 }
      );
    }

    // Request Body parsen
    const body = await request.json();
    const { messages } = body;

    // Validierung
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages müssen ein Array sein' },
        { status: 400 }
      );
    }

    // System Prompt für Claude
    // Definiert wie Claude sich verhalten soll
    const systemPrompt = `Du bist ein hilfreicher Assistent für LifeOS, eine Produktivitäts-App.
Deine Aufgabe ist es, dem User bei Fragen zu helfen und Aktionen in der App auszuführen.

Wichtige Regeln:
- Antworte immer auf Deutsch
- Sei freundlich und hilfsbereit
- Wenn der User nach Aktionen fragt (z.B. "Schreib Mail an Max"), erkläre was du tun würdest
- Verwende Emojis sparsam aber passend
- Antworte prägnant und nicht zu lang`;

    // Nachrichten für Claude formatieren
    // Anthropic erwartet ein spezielles Format
    const formattedMessages = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    // API Call an Claude
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        system: systemPrompt,
        messages: formattedMessages,
      }),
    });

    // Response prüfen
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Claude API Fehler:', response.status, errorData);
      return NextResponse.json(
        { error: 'Fehler bei Claude API', details: errorData },
        { status: response.status }
      );
    }

    // Response parsen
    const data = await response.json();
    
    // Text aus Response extrahieren
    // Claude gibt den Text in einem speziellen Format zurück
    const content = data.content?.[0]?.text || 'Entschuldigung, ich konnte keine Antwort generieren.';

    return NextResponse.json({
      message: content,
    });

  } catch (error) {
    console.error('Chat API Fehler:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler', details: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
}

