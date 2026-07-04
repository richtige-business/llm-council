// ============================================
// classify-intent/route.ts - Intent-Klassifikation via LLM
//
// Zweck: Erkennt ob der User möchte, dass der Agent eine Aktion ausführt
//        (z.B. Termin erstellen, Browser öffnen) oder nur chatten will.
//        Nutzt ein schnelles/günstiges Modell (Claude Haiku).
// Verwendet von: AgentsPage.tsx (handleSendMessage)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createLLMClient, getDefaultProvider } from '@/lib/llm/client';
import { createLogger } from '@/lib/logger';

const log = createLogger('ClassifyIntent');

// --------------------------------------------
// System-Prompt für Intent-Klassifikation
// Kurz und präzise — minimiert Token-Verbrauch
// --------------------------------------------
const CLASSIFY_SYSTEM_PROMPT = `You are an intent classifier. Analyze the user's message and determine:
1. Is the user asking the AI to PERFORM AN ACTION (create event, open page, send email, navigate browser, create file, launch app, etc.) or just CHATTING/ASKING A QUESTION?
2. If it's an action, which module is most likely involved?

Available modules:
- calendar: Creating/editing events, appointments, reminders
- inbox: Sending/reading emails, composing messages
- browser: Opening websites, navigating the web, searching online
- todo-list: Creating/managing tasks, to-do items
- training: Workout/fitness related actions

Respond with ONLY valid JSON, no markdown:
{"isAction": true/false, "detectedModule": "calendar"|"inbox"|"browser"|"todo-list"|"training"|null, "confidence": 0.0-1.0}

Examples:
- "Erstelle einen Termin für morgen 10 Uhr" → {"isAction": true, "detectedModule": "calendar", "confidence": 0.95}
- "Was denkst du über KI?" → {"isAction": false, "detectedModule": null, "confidence": 0.9}
- "Öffne Google" → {"isAction": true, "detectedModule": "browser", "confidence": 0.95}
- "Wie wird das Wetter?" → {"isAction": false, "detectedModule": null, "confidence": 0.8}
- "Schreibe eine E-Mail an Max" → {"isAction": true, "detectedModule": "inbox", "confidence": 0.9}`;

// --------------------------------------------
// Schnelles Modell für die Klassifikation
// Haiku ist das günstigste/schnellste Claude-Modell
// --------------------------------------------
const CLASSIFICATION_MODEL = 'claude-3-haiku-20240307';

// --------------------------------------------
// POST Handler
// Klassifiziert die User-Nachricht
// --------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Nachricht fehlt oder ist ungültig' },
        { status: 400 }
      );
    }

    // Sehr kurze Nachrichten sind selten Aktionen
    if (message.trim().length < 3) {
      return NextResponse.json({
        isAction: false,
        detectedModule: null,
        confidence: 1.0,
      });
    }

    const provider = getDefaultProvider();
    const llmClient = createLLMClient(provider);

    log.debug('Klassifiziere Intent', { messageLength: message.length });

    const response = await llmClient.generate({
      model: CLASSIFICATION_MODEL,
      messages: [
        { role: 'user', content: message },
      ],
      system: CLASSIFY_SYSTEM_PROMPT,
      maxTokens: 100,
      temperature: 0,
    });

    // Response parsen (JSON aus dem LLM-Output extrahieren)
    const responseText = response.message;

    let result = { isAction: false, detectedModule: null as string | null, confidence: 0.5 };

    try {
      // JSON aus dem Response extrahieren (auch wenn Markdown drumrum ist)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result = {
          isAction: Boolean(parsed.isAction),
          detectedModule: parsed.detectedModule || null,
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        };
      }
    } catch (parseError) {
      log.warn('JSON-Parsing fehlgeschlagen, Fallback auf Chat-Modus', { responseText });
    }

    log.debug('Intent klassifiziert', result);

    return NextResponse.json(result);

  } catch (error) {
    log.error('Fehler bei Intent-Klassifikation', error);
    // Bei Fehlern: Fallback auf normalen Chat (kein Action-Vorschlag)
    return NextResponse.json({
      isAction: false,
      detectedModule: null,
      confidence: 0,
    });
  }
}
