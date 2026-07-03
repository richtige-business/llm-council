// ============================================
// run/route.ts - Sandbox Inference Endpoint
// 
// Zweck: Prompt an Modell senden und Antwort erhalten
// Verwendet von: Sandbox UI
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { SandboxInferenceRequest, ChainOfThoughtStep, ToolCall } from '@/modules/training/types';

// --------------------------------------------
// POST - Inference in Sandbox ausführen
// --------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body: SandboxInferenceRequest = await request.json();

    // Validierung
    if (!body.input || typeof body.input !== 'string') {
      return NextResponse.json(
        { error: 'Input ist erforderlich' },
        { status: 400 }
      );
    }

    // Session laden
    const session = await prisma.sandboxSession.findUnique({
      where: { id: sessionId },
      include: {
        model: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session nicht gefunden' },
        { status: 404 }
      );
    }

    if (session.status !== 'active') {
      return NextResponse.json(
        { error: 'Session ist nicht aktiv' },
        { status: 400 }
      );
    }

    // Mock-Daten laden
    const mockData = session.mockData ? JSON.parse(session.mockData) : null;

    // Chain-of-Thought simulieren
    const chainOfThought: ChainOfThoughtStep[] = [];
    const toolCalls: ToolCall[] = [];
    const startTime = Date.now();

    // Schritt 1: Denken
    chainOfThought.push({
      step: 1,
      type: 'thinking',
      content: 'Analysiere die Anfrage...',
      timestamp: Date.now(),
    });

    // Schritt 2: Tool-Calls simulieren (basierend auf Input)
    if (body.input.toLowerCase().includes('mail') || body.input.toLowerCase().includes('email')) {
      const toolStart = Date.now();
      chainOfThought.push({
        step: 2,
        type: 'tool_call',
        content: 'Suche in E-Mails...',
        timestamp: Date.now(),
      });

      // Mock Tool-Call
      toolCalls.push({
        name: 'search_emails',
        input: { query: body.input },
        output: mockData?.emails || [],
        duration: 150,
      });

      chainOfThought.push({
        step: 3,
        type: 'result',
        content: `${mockData?.emails?.length || 0} E-Mails gefunden`,
        timestamp: Date.now(),
      });
    } else if (body.input.toLowerCase().includes('kontakt') || body.input.toLowerCase().includes('person')) {
      chainOfThought.push({
        step: 2,
        type: 'tool_call',
        content: 'Durchsuche Kontakte...',
        timestamp: Date.now(),
      });

      toolCalls.push({
        name: 'search_contacts',
        input: { query: body.input },
        output: mockData?.contacts || [],
        duration: 100,
      });

      chainOfThought.push({
        step: 3,
        type: 'result',
        content: `${mockData?.contacts?.length || 0} Kontakte gefunden`,
        timestamp: Date.now(),
      });
    } else if (body.input.toLowerCase().includes('termin') || body.input.toLowerCase().includes('kalender')) {
      chainOfThought.push({
        step: 2,
        type: 'tool_call',
        content: 'Prüfe Kalender...',
        timestamp: Date.now(),
      });

      toolCalls.push({
        name: 'search_calendar',
        input: { query: body.input },
        output: mockData?.calendar || [],
        duration: 120,
      });

      chainOfThought.push({
        step: 3,
        type: 'result',
        content: `${mockData?.calendar?.length || 0} Termine gefunden`,
        timestamp: Date.now(),
      });
    }

    // Schritt 4: Output generieren (Mock)
    chainOfThought.push({
      step: chainOfThought.length + 1,
      type: 'output',
      content: 'Generiere Antwort...',
      timestamp: Date.now(),
    });

    // Mock-Output basierend auf Input generieren
    const output = generateMockOutput(body.input, mockData, session.systemPrompt);

    // Output-Typ bestimmen
    let outputType: 'text' | 'email' | 'image' | 'json' | 'code' = 'text';
    if (body.input.toLowerCase().includes('mail') || body.input.toLowerCase().includes('email')) {
      outputType = 'email';
    } else if (body.input.toLowerCase().includes('code') || body.input.toLowerCase().includes('script')) {
      outputType = 'code';
    } else if (body.input.toLowerCase().includes('json') || body.input.toLowerCase().includes('daten')) {
      outputType = 'json';
    }

    // Prompt in DB speichern
    const prompt = await prisma.sandboxPrompt.create({
      data: {
        sessionId,
        input: body.input,
        output,
        chainOfThought: JSON.stringify(chainOfThought),
        toolCalls: JSON.stringify(toolCalls),
        outputType,
      },
    });

    // Session-Aktivität aktualisieren
    await prisma.sandboxSession.update({
      where: { id: sessionId },
      data: {
        lastActivityAt: new Date(),
      },
    });

    // Parsed Response
    const parsedPrompt = {
      ...prompt,
      chainOfThought,
      toolCalls,
      processingTime: Date.now() - startTime,
    };

    return NextResponse.json({ prompt: parsedPrompt });
  } catch (error) {
    console.error('Fehler bei Sandbox Inference:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Verarbeitung' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// Hilfsfunktion: Mock-Output generieren
// --------------------------------------------

function generateMockOutput(
  input: string,
  mockData: Record<string, unknown> | null,
  systemPrompt: string | null
): string {
  const lowerInput = input.toLowerCase();

  // E-Mail schreiben
  if (lowerInput.includes('schreib') && (lowerInput.includes('mail') || lowerInput.includes('email'))) {
    return `Betreff: Betreff hier einfügen

Sehr geehrte Damen und Herren,

vielen Dank für Ihre Nachricht. Ich werde mich umgehend um Ihr Anliegen kümmern.

Mit freundlichen Grüßen,
[Ihr Name]

---
Diese E-Mail wurde mit KI-Unterstützung erstellt.`;
  }

  // Kontakt suchen
  if (lowerInput.includes('kontakt') || lowerInput.includes('wer ist')) {
    const contacts = (mockData?.contacts as Array<{ name: string; email: string; company?: string }>) || [];
    if (contacts.length > 0) {
      const contact = contacts[0];
      return `Gefundener Kontakt:
- Name: ${contact.name}
- E-Mail: ${contact.email}
${contact.company ? `- Firma: ${contact.company}` : ''}`;
    }
    return 'Kein passender Kontakt gefunden.';
  }

  // Termin erstellen
  if (lowerInput.includes('termin') && lowerInput.includes('erstell')) {
    return `Termin erstellt:
- Titel: Neuer Termin
- Datum: [Wird aus Kontext ermittelt]
- Dauer: 1 Stunde

Möchtest du den Termin bestätigen?`;
  }

  // Code generieren
  if (lowerInput.includes('code') || lowerInput.includes('funktion')) {
    return `\`\`\`typescript
// Generierte Funktion
export function processData(input: string): string {
  // TODO: Implementierung hinzufügen
  return input.trim();
}
\`\`\``;
  }

  // Default-Antwort
  return `Ich habe deine Anfrage verstanden: "${input}"

${systemPrompt ? `Basierend auf meinen Anweisungen (${systemPrompt.substring(0, 50)}...) ` : ''}werde ich dir dabei helfen.

Was möchtest du als nächstes tun?`;
}








