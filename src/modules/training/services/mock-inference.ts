// ============================================
// mock-inference.ts - Mock Inference Service
// 
// Zweck: Simuliert Modell-Inference für MVP
// Verwendet von: Sandbox API
// ============================================

import type { SandboxMockData, ChainOfThoughtStep, ToolCall, OutputType } from '../types';

// --------------------------------------------
// Mock Inference Konfiguration
// --------------------------------------------

const MOCK_CONFIG = {
  // Simulierte Latenz in ms
  baseLatency: 500,
  latencyVariance: 300,
  // Token-Generierung pro Sekunde
  tokensPerSecond: 50,
};

// --------------------------------------------
// Inference Response
// --------------------------------------------

export interface InferenceResponse {
  output: string;
  outputType: OutputType;
  chainOfThought: ChainOfThoughtStep[];
  toolCalls: ToolCall[];
  processingTime: number;
}

// --------------------------------------------
// Mock Inference ausführen
// --------------------------------------------

export async function runMockInference(
  input: string,
  systemPrompt: string | null,
  mockData: SandboxMockData | null
): Promise<InferenceResponse> {
  const startTime = Date.now();
  const chainOfThought: ChainOfThoughtStep[] = [];
  const toolCalls: ToolCall[] = [];

  // Schritt 1: Analyse
  await simulateDelay(200);
  chainOfThought.push({
    step: 1,
    type: 'thinking',
    content: 'Analysiere die Anfrage...',
    timestamp: Date.now(),
  });

  // Input analysieren
  const lowerInput = input.toLowerCase();
  let outputType: OutputType = 'text';
  let output = '';

  // --------------------------------------------
  // E-Mail erkennen
  // --------------------------------------------

  if (lowerInput.includes('mail') || lowerInput.includes('email') || lowerInput.includes('schreib')) {
    outputType = 'email';
    
    chainOfThought.push({
      step: 2,
      type: 'thinking',
      content: 'Erkenne E-Mail-Anfrage. Suche nach relevanten Kontakten...',
      timestamp: Date.now(),
    });

    // Mock Tool Call
    await simulateDelay(150);
    const contacts = mockData?.contacts || [];
    toolCalls.push({
      name: 'search_contacts',
      input: { query: input },
      output: contacts,
      duration: 150,
    });

    chainOfThought.push({
      step: 3,
      type: 'result',
      content: `${contacts.length} Kontakte gefunden`,
      timestamp: Date.now(),
    });

    // E-Mail generieren
    const recipient = extractRecipient(input, contacts);
    output = generateMockEmail(input, recipient, systemPrompt);
  }

  // --------------------------------------------
  // Kalender/Termin erkennen
  // --------------------------------------------

  else if (lowerInput.includes('termin') || lowerInput.includes('kalender') || lowerInput.includes('meeting')) {
    outputType = 'json';
    
    chainOfThought.push({
      step: 2,
      type: 'tool_call',
      content: 'Prüfe Kalender...',
      timestamp: Date.now(),
    });

    await simulateDelay(120);
    const events = mockData?.calendar || [];
    toolCalls.push({
      name: 'search_calendar',
      input: { query: input },
      output: events,
      duration: 120,
    });

    chainOfThought.push({
      step: 3,
      type: 'result',
      content: `${events.length} Termine gefunden`,
      timestamp: Date.now(),
    });

    output = generateCalendarResponse(input, events);
  }

  // --------------------------------------------
  // Code erkennen
  // --------------------------------------------

  else if (lowerInput.includes('code') || lowerInput.includes('funktion') || lowerInput.includes('script')) {
    outputType = 'code';
    
    chainOfThought.push({
      step: 2,
      type: 'thinking',
      content: 'Erkenne Code-Anfrage. Generiere TypeScript...',
      timestamp: Date.now(),
    });

    await simulateDelay(300);
    output = generateMockCode(input);
  }

  // --------------------------------------------
  // JSON/Daten erkennen
  // --------------------------------------------

  else if (lowerInput.includes('json') || lowerInput.includes('daten') || lowerInput.includes('liste')) {
    outputType = 'json';
    
    chainOfThought.push({
      step: 2,
      type: 'thinking',
      content: 'Generiere strukturierte Daten...',
      timestamp: Date.now(),
    });

    await simulateDelay(200);
    output = generateMockJson(input);
  }

  // --------------------------------------------
  // Default: Text-Antwort
  // --------------------------------------------

  else {
    chainOfThought.push({
      step: 2,
      type: 'thinking',
      content: 'Generiere Text-Antwort...',
      timestamp: Date.now(),
    });

    await simulateDelay(300);
    output = generateMockTextResponse(input, systemPrompt, mockData);
  }

  // Finaler Schritt
  chainOfThought.push({
    step: chainOfThought.length + 1,
    type: 'output',
    content: 'Antwort generiert',
    timestamp: Date.now(),
  });

  return {
    output,
    outputType,
    chainOfThought,
    toolCalls,
    processingTime: Date.now() - startTime,
  };
}

// --------------------------------------------
// Hilfsfunktionen
// --------------------------------------------

async function simulateDelay(ms: number): Promise<void> {
  const variance = Math.random() * MOCK_CONFIG.latencyVariance;
  await new Promise(resolve => setTimeout(resolve, ms + variance));
}

function extractRecipient(
  input: string,
  contacts: Array<{ name: string; email: string }>
): { name: string; email: string } | null {
  // Einfache Namensextraktion
  for (const contact of contacts) {
    if (input.toLowerCase().includes(contact.name.toLowerCase())) {
      return contact;
    }
  }
  return contacts[0] || null;
}

function generateMockEmail(
  input: string,
  recipient: { name: string; email: string } | null,
  systemPrompt: string | null
): string {
  const recipientName = recipient?.name || '[Name]';
  const isInformal = systemPrompt?.toLowerCase().includes('informal') || 
                     systemPrompt?.toLowerCase().includes('freundlich');

  if (isInformal) {
    return `Betreff: Kurze Frage

Hey ${recipientName},

wie geht's dir? Wollte mich kurz bei dir melden.

${input.includes('frage') ? 'Kannst du mir bei einer Sache helfen?' : 'Lass uns bald mal wieder telefonieren!'}

Viele Grüße!`;
  }

  return `Betreff: ${input.includes('meeting') ? 'Meeting-Anfrage' : 'Anfrage'}

Sehr geehrte/r ${recipientName},

vielen Dank für Ihre Nachricht. Ich melde mich bezüglich Ihrer Anfrage.

${input.includes('termin') ? 'Gerne können wir einen Termin für ein Gespräch vereinbaren.' : 'Bitte lassen Sie mich wissen, wie ich Ihnen weiterhelfen kann.'}

Mit freundlichen Grüßen`;
}

function generateCalendarResponse(
  input: string,
  events: Array<{ title: string; start: string; end: string }>
): string {
  if (input.includes('erstell') || input.includes('neu')) {
    return JSON.stringify({
      action: 'create_event',
      event: {
        title: 'Neuer Termin',
        start: new Date(Date.now() + 86400000).toISOString(), // Morgen
        end: new Date(Date.now() + 90000000).toISOString(),
        status: 'pending_confirmation',
      },
    }, null, 2);
  }

  return JSON.stringify({
    action: 'list_events',
    events: events.length > 0 ? events : [
      {
        title: 'Beispiel-Termin',
        start: new Date().toISOString(),
        end: new Date(Date.now() + 3600000).toISOString(),
      },
    ],
    count: events.length || 1,
  }, null, 2);
}

function generateMockCode(input: string): string {
  if (input.includes('api') || input.includes('fetch')) {
    return `// API-Funktion
export async function fetchData(endpoint: string): Promise<unknown> {
  try {
    const response = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(\`HTTP Error: \${response.status}\`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Fetch failed:', error);
    throw error;
  }
}`;
  }

  return `// Generierte Funktion
export function processInput(input: string): string {
  // Eingabe validieren
  if (!input || typeof input !== 'string') {
    throw new Error('Ungültige Eingabe');
  }
  
  // Verarbeitung
  const processed = input
    .trim()
    .toLowerCase()
    .replace(/\\s+/g, '-');
  
  return processed;
}`;
}

function generateMockJson(input: string): string {
  return JSON.stringify({
    generated: true,
    timestamp: new Date().toISOString(),
    query: input,
    result: {
      items: [
        { id: 1, name: 'Element 1', value: 100 },
        { id: 2, name: 'Element 2', value: 200 },
        { id: 3, name: 'Element 3', value: 300 },
      ],
      total: 3,
    },
  }, null, 2);
}

function generateMockTextResponse(
  input: string,
  systemPrompt: string | null,
  mockData: SandboxMockData | null
): string {
  // Kontextbezogene Antwort
  if (input.includes('hilf') || input.includes('help')) {
    return `Gerne helfe ich dir! Hier sind einige Dinge, die ich tun kann:

1. E-Mails verfassen und beantworten
2. Termine im Kalender verwalten
3. Kontakte suchen und anzeigen
4. Code generieren
5. Daten analysieren

Was möchtest du als nächstes machen?`;
  }

  if (input.includes('wer bist') || input.includes('was kannst')) {
    return `Ich bin ein KI-Assistent in der LifeOS Sandbox.

${systemPrompt ? `Meine Anweisungen: ${systemPrompt}` : 'Ich wurde ohne spezielle Anweisungen gestartet.'}

In dieser Sandbox kann ich sicher getestet werden, ohne echte Aktionen auszuführen. Alle Daten sind Mock-Daten.`;
  }

  // Default
  return `Ich habe deine Anfrage verstanden: "${input}"

${mockData ? 'Ich habe Zugriff auf Mock-Daten für Tests.' : ''}

Was soll ich als nächstes tun?`;
}








