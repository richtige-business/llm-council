// ============================================
// web-search-tools.ts - Web-Search Tool (Tavily)
//
// Zweck: Gibt Council-Mitgliedern mit aktiviertem "Web Search"-Skill
//        die Faehigkeit, selbststaendig im Web zu recherchieren.
// Verwendet von: Tool Registry (init-server.ts), Council-Runtime
// ============================================

import type { ModuleTool, ModuleToolResult } from '@/lib/agent/types';

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
}

interface TavilyResponse {
  results?: TavilySearchResult[];
  answer?: string;
}

async function performTavilySearch(query: string, maxResults: number): Promise<ModuleToolResult> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'TAVILY_API_KEY ist nicht konfiguriert. Web-Suche ist nicht verfuegbar.',
      },
    };
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: Math.min(Math.max(maxResults, 1), 8),
        include_answer: true,
      }),
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: `Tavily-Suche fehlgeschlagen (${response.status}): ${details.slice(0, 200)}`,
        },
      };
    }

    const data = (await response.json()) as TavilyResponse;

    return {
      success: true,
      data: {
        answer: data.answer || null,
        results: (data.results || []).map((result) => ({
          title: result.title,
          url: result.url,
          snippet: result.content,
        })),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Unbekannter Fehler bei der Web-Suche',
      },
    };
  }
}

export const webSearchModuleTools: ModuleTool[] = [
  {
    id: 'web.search',
    name: 'Web Search',
    description:
      'Durchsucht das aktuelle Web nach Informationen. Nutze dieses Tool, wenn du aktuelle, ' +
      'faktische oder dir unbekannte Informationen brauchst, um die Frage fundiert zu beantworten. ' +
      'Entscheide selbst, ob eine Suche noetig ist.',
    module: 'web',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Die Suchanfrage, z.B. "aktuelle Inflationsrate Deutschland 2026"',
        },
        maxResults: {
          type: 'number',
          description: 'Maximale Anzahl an Ergebnissen (Standard 5, max 8)',
        },
      },
      required: ['query'],
    },
    effects: ['network'],
    requiresConfirmation: false,
    isIdempotent: true,
    execute: async (input) => {
      const { query, maxResults } = input as { query: string; maxResults?: number };
      return performTavilySearch(query, maxResults ?? 5);
    },
  },
];
