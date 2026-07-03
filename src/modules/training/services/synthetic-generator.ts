// ============================================
// synthetic-generator.ts - Synthetische Daten Generator
// 
// Zweck: Generiert Trainings-Daten via Claude API
// Verwendet von: Dataset API
// ============================================

import type { DatasetRow, DatasetType } from '../types';

// --------------------------------------------
// Generator Konfiguration
// --------------------------------------------

interface GeneratorConfig {
  // Anzahl zu generierender Beispiele
  count: number;
  // Temperatur für Varianz
  temperature: number;
  // Dataset-Typ
  datasetType: DatasetType;
  // Golden Examples als Vorlage
  goldenExamples: Array<{
    input: string;
    output?: string;
    chosenOutput?: string;
    rejectedOutput?: string;
    label?: string;
  }>;
}

// --------------------------------------------
// Generator Response
// --------------------------------------------

interface GeneratorResponse {
  rows: Omit<DatasetRow, 'id' | 'datasetId' | 'createdAt'>[];
  duplicatesRemoved: number;
  errors: string[];
}

// --------------------------------------------
// System Prompts für verschiedene Dataset-Typen
// --------------------------------------------

const SYSTEM_PROMPTS: Record<DatasetType, string> = {
  sft: `Du bist ein Experte für das Erstellen von Trainings-Daten für Sprachmodelle.

Deine Aufgabe: Generiere hochwertige Input/Output-Paare basierend auf den gegebenen Beispielen.

Regeln:
1. Variiere die Inputs (andere Formulierungen, Szenarien, Namen)
2. Behalte den Stil und die Qualität der Outputs bei
3. Füge KEINE Halluzinationen oder falsche Fakten hinzu
4. Jedes Beispiel muss sinnvoll und realistisch sein

Gib die Ergebnisse als JSON-Array zurück.`,

  dpo: `Du bist ein Experte für das Erstellen von Präferenz-Daten für DPO-Training.

Deine Aufgabe: Generiere Tripel aus (Input, Bevorzugte Antwort, Abgelehnte Antwort).

Regeln:
1. Die bevorzugte Antwort folgt den Best Practices der Beispiele
2. Die abgelehnte Antwort hat klare Mängel (zu kurz, unhöflich, falsch, etc.)
3. Der Unterschied muss für Menschen erkennbar sein
4. Variiere die Szenarien und Inputs

Gib die Ergebnisse als JSON-Array zurück.`,

  classification: `Du bist ein Experte für das Erstellen von Klassifizierungs-Daten.

Deine Aufgabe: Generiere Text-Label-Paare basierend auf den gegebenen Beispielen.

Regeln:
1. Verwende NUR die Labels aus den Beispielen
2. Variiere die Texte (Formulierung, Länge, Kontext)
3. Jeder Text muss eindeutig zu seinem Label passen
4. Balance die Labels gleichmäßig

Gib die Ergebnisse als JSON-Array zurück.`,
};

// --------------------------------------------
// Synthetische Daten generieren
// --------------------------------------------

export async function generateSyntheticData(
  config: GeneratorConfig,
  apiKey: string
): Promise<GeneratorResponse> {
  const response: GeneratorResponse = {
    rows: [],
    duplicatesRemoved: 0,
    errors: [],
  };

  if (config.goldenExamples.length === 0) {
    response.errors.push('Mindestens ein Golden Example ist erforderlich');
    return response;
  }

  try {
    // Beispiele formatieren
    const examplesJson = JSON.stringify(config.goldenExamples, null, 2);

    // Prompt erstellen
    const userPrompt = createUserPrompt(config, examplesJson);

    // Claude API aufrufen
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4096,
        temperature: config.temperature,
        system: SYSTEM_PROMPTS[config.datasetType],
        messages: [
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      throw new Error(`Claude API Fehler: ${claudeResponse.status} - ${errorText}`);
    }

    const data = await claudeResponse.json();
    const content = data.content?.[0]?.text || '';

    // JSON aus Antwort extrahieren
    const generatedRows = parseGeneratedRows(content, config.datasetType);

    // Duplikate entfernen
    const uniqueRows = removeDuplicates(generatedRows, config.goldenExamples);
    response.duplicatesRemoved = generatedRows.length - uniqueRows.length;

    // Rows formatieren
    response.rows = uniqueRows.map(row => ({
      input: row.input,
      output: row.output || null,
      chosenOutput: row.chosenOutput || null,
      rejectedOutput: row.rejectedOutput || null,
      label: row.label || null,
      isGolden: false,
      isSynthetic: true,
      qualityScore: null,
      metadata: null,
    }));

  } catch (error) {
    response.errors.push(error instanceof Error ? error.message : 'Unbekannter Fehler');
  }

  return response;
}

// --------------------------------------------
// User Prompt erstellen
// --------------------------------------------

function createUserPrompt(config: GeneratorConfig, examplesJson: string): string {
  let prompt = `Hier sind ${config.goldenExamples.length} Beispiele:\n\n${examplesJson}\n\n`;

  prompt += `Generiere ${config.count} neue, ähnliche Beispiele.\n\n`;

  switch (config.datasetType) {
    case 'sft':
      prompt += `Jedes Beispiel muss "input" und "output" enthalten.\n`;
      prompt += `Format: [{"input": "...", "output": "..."}, ...]`;
      break;

    case 'dpo':
      prompt += `Jedes Beispiel muss "input", "chosenOutput" und "rejectedOutput" enthalten.\n`;
      prompt += `Format: [{"input": "...", "chosenOutput": "...", "rejectedOutput": "..."}, ...]`;
      break;

    case 'classification':
      prompt += `Jedes Beispiel muss "input" und "label" enthalten.\n`;
      prompt += `Verwende nur diese Labels: ${[...new Set(config.goldenExamples.map(e => e.label))].join(', ')}\n`;
      prompt += `Format: [{"input": "...", "label": "..."}, ...]`;
      break;
  }

  prompt += `\n\nAntworte NUR mit dem JSON-Array, ohne weitere Erklärungen.`;

  return prompt;
}

// --------------------------------------------
// Generierte Rows parsen
// --------------------------------------------

function parseGeneratedRows(
  content: string,
  datasetType: DatasetType
): Array<Record<string, string>> {
  try {
    // JSON-Array finden (zwischen [ und ])
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('Kein JSON-Array in Antwort gefunden');
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    if (!Array.isArray(parsed)) {
      console.error('Geparstes Ergebnis ist kein Array');
      return [];
    }

    // Validierung basierend auf Typ
    return parsed.filter(row => {
      if (typeof row !== 'object' || !row.input) return false;

      switch (datasetType) {
        case 'sft':
          return typeof row.output === 'string';
        case 'dpo':
          return typeof row.chosenOutput === 'string' && typeof row.rejectedOutput === 'string';
        case 'classification':
          return typeof row.label === 'string';
        default:
          return false;
      }
    });

  } catch (error) {
    console.error('JSON-Parse Fehler:', error);
    return [];
  }
}

// --------------------------------------------
// Duplikate entfernen
// --------------------------------------------

function removeDuplicates(
  generatedRows: Array<Record<string, string>>,
  goldenExamples: Array<Record<string, string | undefined>>
): Array<Record<string, string>> {
  // Set für schnelle Duplikat-Erkennung
  const existingInputs = new Set(goldenExamples.map(e => normalizeText(e.input || '')));
  const seenInputs = new Set<string>();

  return generatedRows.filter(row => {
    const normalizedInput = normalizeText(row.input);
    
    // Bereits in Golden Examples?
    if (existingInputs.has(normalizedInput)) {
      return false;
    }

    // Bereits in generierten Rows?
    if (seenInputs.has(normalizedInput)) {
      return false;
    }

    seenInputs.add(normalizedInput);
    return true;
  });
}

// Text normalisieren für Vergleich
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// --------------------------------------------
// Kostenschätzung
// --------------------------------------------

export function estimateGenerationCost(
  exampleCount: number,
  targetCount: number
): { inputTokens: number; outputTokens: number; estimatedCostCents: number } {
  // Grobe Schätzung: ~100 Tokens pro Beispiel Input, ~200 pro Output
  const inputTokens = exampleCount * 100 + 200; // Examples + System Prompt
  const outputTokens = targetCount * 200;

  // Claude 3 Haiku Preise (Stand 2024)
  // Input: $0.25 / 1M Tokens
  // Output: $1.25 / 1M Tokens
  const inputCost = (inputTokens / 1_000_000) * 25; // in Cents
  const outputCost = (outputTokens / 1_000_000) * 125;

  return {
    inputTokens,
    outputTokens,
    estimatedCostCents: Math.ceil(inputCost + outputCost),
  };
}








