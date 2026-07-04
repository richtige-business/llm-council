// ============================================
// message-analyzer.ts - KI-basierte Nachrichtenanalyse
// 
// Zweck: Analysiert E-Mails mittels OpenAI/Anthropic API
//        - Kategorisiert als privat/geschäftlich
//        - Bestimmt Dringlichkeit (1-5)
//        - Erkennt Terminvorschläge
//        - Extrahiert Meeting-Links
// Verwendet von: Sync-Prozesse, API Routes
// ============================================

// --------------------------------------------
// Typen für die Analyse
// --------------------------------------------

/**
 * Ergebnis der KI-Analyse einer Nachricht
 */
export interface MessageAnalysis {
  // Kategorie: privat oder geschäftlich
  category: 'private' | 'business';
  
  // Dringlichkeit auf einer Skala von 1-5
  // 1 = unwichtig (Newsletter, Werbung)
  // 2 = niedrig (informativ, keine Aktion nötig)
  // 3 = normal (standard E-Mail)
  // 4 = wichtig (erfordert Aufmerksamkeit)
  // 5 = dringend (sofortige Aktion erforderlich)
  urgency: 1 | 2 | 3 | 4 | 5;
  
  // Erkannter Terminvorschlag (falls vorhanden)
  calendarSuggestion?: {
    title: string;
    date?: string;         // ISO-Format: "2024-01-15"
    time?: string;         // Format: "14:00"
    endTime?: string;      // Format: "15:30"
    meetingLink?: string;  // Zoom, Teams, Google Meet Link
    location?: string;     // Physischer Ort
    description?: string;  // Kurze Zusammenfassung
    confidence: number;    // 0.0 - 1.0
  };
  
  // Erkannter Kontakt-Name aus der Signatur
  suggestedContactName?: string;
  
  // Kurze Zusammenfassung der Nachricht
  summary?: string;
}

/**
 * Input für die Analyse
 */
export interface MessageInput {
  subject: string;
  body: string;
  sender: string;
  senderName?: string | null;
  receivedAt: string;
}

/**
 * Batch-Analyse Input
 */
export interface BatchAnalysisInput {
  messages: Array<MessageInput & { id: string }>;
}

// --------------------------------------------
// Meeting-Link Patterns
// Reguläre Ausdrücke für bekannte Meeting-Dienste
// --------------------------------------------

const MEETING_LINK_PATTERNS = [
  // Zoom
  /https?:\/\/(?:[\w-]+\.)?zoom\.us\/(?:j|my)\/[\w-]+(?:\?pwd=[\w-]+)?/gi,
  // Google Meet
  /https?:\/\/meet\.google\.com\/[\w-]+/gi,
  // Microsoft Teams
  /https?:\/\/teams\.microsoft\.com\/l\/meetup-join\/[\w%+-]+/gi,
  // Webex
  /https?:\/\/(?:[\w-]+\.)?webex\.com\/(?:meet|join)\/[\w-]+/gi,
  // Jitsi
  /https?:\/\/(?:meet\.jit\.si|[\w-]+\.jitsi\.net)\/[\w-]+/gi,
  // Skype
  /https?:\/\/join\.skype\.com\/[\w-]+/gi,
  // GoToMeeting
  /https?:\/\/(?:[\w-]+\.)?gotomeeting\.com\/join\/\d+/gi,
];

/**
 * Extrahiert Meeting-Links aus dem Text
 */
export function extractMeetingLinks(text: string): string[] {
  const links: string[] = [];
  
  for (const pattern of MEETING_LINK_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      links.push(...matches);
    }
  }
  
  // Deduplizieren
  return [...new Set(links)];
}

// --------------------------------------------
// System-Prompt für die KI
// --------------------------------------------

const SYSTEM_PROMPT = `Du bist ein E-Mail-Analyse-Assistent. Analysiere die gegebene E-Mail und extrahiere strukturierte Informationen.

WICHTIG: Antworte NUR mit validem JSON, keine Erklärungen oder zusätzlicher Text.

Analysiere folgende Aspekte:

1. KATEGORIE (category):
   - "private": Persönliche E-Mails von Freunden, Familie, bekannten Personen
   - "business": Geschäftliche E-Mails, Newsletter, Bestellungen, Support, Firmen

2. DRINGLICHKEIT (urgency): Zahl von 1-5
   - 1: Newsletter, Werbung, automatische Benachrichtigungen
   - 2: Informativ, keine Aktion erforderlich
   - 3: Standard-E-Mail, normale Priorität
   - 4: Wichtig, erfordert Aufmerksamkeit
   - 5: Dringend, erfordert sofortige Aktion (Deadlines, Notfälle)

3. TERMINVORSCHLAG (calendarSuggestion): Falls ein Termin vorgeschlagen wird:
   - title: Passender Titel für den Termin
   - date: Datum im Format "YYYY-MM-DD" (falls erkennbar)
   - time: Uhrzeit im Format "HH:MM" (falls erkennbar)
   - endTime: End-Uhrzeit im Format "HH:MM" (falls erkennbar)
   - location: Ort (falls genannt)
   - description: Kurze Beschreibung des Kontexts
   - confidence: Wie sicher bist du? (0.0-1.0)

4. KONTAKTNAME (suggestedContactName): Name des Absenders aus der Signatur

5. ZUSAMMENFASSUNG (summary): 1-2 Sätze Zusammenfassung

Antworte im JSON-Format:
{
  "category": "private" | "business",
  "urgency": 1-5,
  "calendarSuggestion": { ... } | null,
  "suggestedContactName": "Name" | null,
  "summary": "Zusammenfassung"
}`;

// --------------------------------------------
// OpenAI Integration
// --------------------------------------------

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

/**
 * Ruft die OpenAI API auf
 */
async function callOpenAI(messages: OpenAIMessage[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY ist nicht konfiguriert');
  }
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // Kostengünstiges Modell für schnelle Analyse
      messages,
      temperature: 0.3, // Niedrige Temperatur für konsistente Ergebnisse
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API Fehler: ${error}`);
  }
  
  const data = await response.json() as OpenAIResponse;
  return data.choices[0]?.message?.content || '{}';
}

// --------------------------------------------
// Anthropic Integration (Alternative)
// --------------------------------------------

interface AnthropicResponse {
  content: Array<{
    text: string;
  }>;
}

/**
 * Ruft die Anthropic API auf (Alternative zu OpenAI)
 */
async function callAnthropic(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY ist nicht konfiguriert');
  }
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307', // Schnelles, günstiges Modell
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: prompt },
      ],
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API Fehler: ${error}`);
  }
  
  const data = await response.json() as AnthropicResponse;
  return data.content[0]?.text || '{}';
}

// --------------------------------------------
// Haupt-Analyse-Funktionen
// --------------------------------------------

/**
 * Formatiert eine Nachricht für die KI-Analyse
 */
function formatMessageForAnalysis(message: MessageInput): string {
  const parts = [
    `BETREFF: ${message.subject}`,
    `VON: ${message.senderName ? `${message.senderName} <${message.sender}>` : message.sender}`,
    `DATUM: ${message.receivedAt}`,
    '',
    'INHALT:',
    message.body.slice(0, 3000), // Begrenzen auf 3000 Zeichen für Kosten
  ];
  
  return parts.join('\n');
}

/**
 * Parst die KI-Antwort in ein strukturiertes Objekt
 */
function parseAnalysisResponse(responseText: string): MessageAnalysis {
  try {
    const parsed = JSON.parse(responseText);
    
    // Validierung und Defaults
    const result: MessageAnalysis = {
      category: parsed.category === 'private' ? 'private' : 'business',
      urgency: Math.min(5, Math.max(1, parseInt(parsed.urgency) || 3)) as 1 | 2 | 3 | 4 | 5,
    };
    
    // Terminvorschlag hinzufügen falls vorhanden
    if (parsed.calendarSuggestion && parsed.calendarSuggestion.title) {
      result.calendarSuggestion = {
        title: parsed.calendarSuggestion.title,
        date: parsed.calendarSuggestion.date || undefined,
        time: parsed.calendarSuggestion.time || undefined,
        endTime: parsed.calendarSuggestion.endTime || undefined,
        meetingLink: parsed.calendarSuggestion.meetingLink || undefined,
        location: parsed.calendarSuggestion.location || undefined,
        description: parsed.calendarSuggestion.description || undefined,
        confidence: parseFloat(parsed.calendarSuggestion.confidence) || 0.5,
      };
    }
    
    // Kontaktname hinzufügen falls vorhanden
    if (parsed.suggestedContactName) {
      result.suggestedContactName = parsed.suggestedContactName;
    }
    
    // Zusammenfassung hinzufügen
    if (parsed.summary) {
      result.summary = parsed.summary;
    }
    
    return result;
  } catch (error) {
    console.error('Fehler beim Parsen der KI-Antwort:', error);
    // Fallback auf Defaults
    return {
      category: 'business',
      urgency: 3,
    };
  }
}

/**
 * Analysiert eine einzelne Nachricht
 */
export async function analyzeMessage(
  message: MessageInput,
  provider: 'openai' | 'anthropic' = 'openai'
): Promise<MessageAnalysis> {
  const formattedMessage = formatMessageForAnalysis(message);
  
  // Vorab Meeting-Links extrahieren (unabhängig von KI)
  const meetingLinks = extractMeetingLinks(message.body);
  
  let responseText: string;
  
  if (provider === 'anthropic') {
    responseText = await callAnthropic(formattedMessage);
  } else {
    responseText = await callOpenAI([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: formattedMessage },
    ]);
  }
  
  const analysis = parseAnalysisResponse(responseText);
  
  // Meeting-Link hinzufügen falls gefunden und Terminvorschlag existiert
  if (meetingLinks.length > 0 && analysis.calendarSuggestion) {
    analysis.calendarSuggestion.meetingLink = meetingLinks[0];
  } else if (meetingLinks.length > 0 && !analysis.calendarSuggestion) {
    // Wenn Meeting-Link gefunden aber kein Terminvorschlag erkannt,
    // erstelle einen generischen Vorschlag
    analysis.calendarSuggestion = {
      title: `Meeting: ${message.subject}`,
      meetingLink: meetingLinks[0],
      confidence: 0.6,
    };
  }
  
  return analysis;
}

/**
 * Analysiert mehrere Nachrichten in einem Batch (kostensparend)
 */
export async function analyzeMessagesBatch(
  input: BatchAnalysisInput,
  provider: 'openai' | 'anthropic' = 'openai'
): Promise<Map<string, MessageAnalysis>> {
  const results = new Map<string, MessageAnalysis>();
  
  // Bei wenigen Nachrichten einzeln verarbeiten
  if (input.messages.length <= 3) {
    for (const msg of input.messages) {
      const analysis = await analyzeMessage(msg, provider);
      results.set(msg.id, analysis);
    }
    return results;
  }
  
  // Batch-Prompt erstellen
  const batchPrompt = input.messages
    .map((msg, index) => {
      return `--- NACHRICHT ${index + 1} (ID: ${msg.id}) ---\n${formatMessageForAnalysis(msg)}`;
    })
    .join('\n\n');
  
  const batchSystemPrompt = SYSTEM_PROMPT + `

Für BATCH-Analyse: Analysiere alle Nachrichten und antworte mit einem JSON-Array:
{
  "analyses": [
    { "id": "nachricht-id-1", "category": ..., "urgency": ..., ... },
    { "id": "nachricht-id-2", ... }
  ]
}`;
  
  try {
    let responseText: string;
    
    if (provider === 'anthropic') {
      // Anthropic Batch-Aufruf
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error('ANTHROPIC_API_KEY nicht konfiguriert');
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 4000,
          system: batchSystemPrompt,
          messages: [{ role: 'user', content: batchPrompt }],
        }),
      });
      
      if (!response.ok) throw new Error('Anthropic API Fehler');
      const data = await response.json() as AnthropicResponse;
      responseText = data.content[0]?.text || '{}';
    } else {
      // OpenAI Batch-Aufruf
      responseText = await callOpenAI([
        { role: 'system', content: batchSystemPrompt },
        { role: 'user', content: batchPrompt },
      ]);
    }
    
    // Batch-Antwort parsen
    const parsed = JSON.parse(responseText);
    
    if (Array.isArray(parsed.analyses)) {
      for (const item of parsed.analyses) {
        if (item.id) {
          const analysis = parseAnalysisResponse(JSON.stringify(item));
          
          // Meeting-Links extrahieren
          const originalMsg = input.messages.find(m => m.id === item.id);
          if (originalMsg) {
            const links = extractMeetingLinks(originalMsg.body);
            if (links.length > 0 && analysis.calendarSuggestion) {
              analysis.calendarSuggestion.meetingLink = links[0];
            }
          }
          
          results.set(item.id, analysis);
        }
      }
    }
  } catch (error) {
    console.error('Batch-Analyse fehlgeschlagen, fallback auf einzeln:', error);
    
    // Fallback: Einzeln analysieren
    for (const msg of input.messages) {
      try {
        const analysis = await analyzeMessage(msg, provider);
        results.set(msg.id, analysis);
      } catch (e) {
        // Bei Fehler: Defaults setzen
        results.set(msg.id, {
          category: 'business',
          urgency: 3,
        });
      }
    }
  }
  
  return results;
}

/**
 * Prüft ob ein KI-Provider konfiguriert ist
 */
export function isAIConfigured(): boolean {
  return !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

/**
 * Gibt den konfigurierten Provider zurück
 */
export function getConfiguredProvider(): 'openai' | 'anthropic' | null {
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  return null;
}
