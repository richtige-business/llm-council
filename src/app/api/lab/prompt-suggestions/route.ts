// ============================================
// route.ts - Builder Prompt Suggestions API
//
// Zweck:
// - Liefert randomisierte Vorschlaege fuer die Builder-Startseite
// - Fuellt die Datenbank initial mit Default-Vorschlaegen
// Endpunkt: /api/lab/prompt-suggestions
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  DEFAULT_BUILDER_PROMPT_SUGGESTIONS,
  shuffleArray,
} from '@/lib/lab/prompt-suggestions';

const MIN_LIMIT = 1;
const MAX_LIMIT = 30;
const DEFAULT_LIMIT = 12;

async function ensureSeededSuggestions() {
  const existing = await prisma.builderPromptSuggestion.count();
  if (existing > 0) return;

  await prisma.builderPromptSuggestion.createMany({
    data: DEFAULT_BUILDER_PROMPT_SUGGESTIONS.map((item) => ({
      text: item.text,
      category: item.category,
      isActive: true,
    })),
    skipDuplicates: true,
  });
}

function parseLimit(raw: string | null): number {
  const parsed = Number(raw ?? DEFAULT_LIMIT);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  const rounded = Math.floor(parsed);
  return Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, rounded));
}

export async function GET(request: NextRequest) {
  try {
    const limit = parseLimit(new URL(request.url).searchParams.get('limit'));

    await ensureSeededSuggestions();

    const allSuggestions = await prisma.builderPromptSuggestion.findMany({
      where: { isActive: true },
      select: {
        id: true,
        text: true,
        category: true,
      },
    });

    const suggestions = shuffleArray(allSuggestions).slice(0, limit);

    return NextResponse.json({
      suggestions,
      totalAvailable: allSuggestions.length,
    });
  } catch (error) {
    console.error('Builder prompt suggestions konnten nicht geladen werden:', error);

    // Fallback: Liefere die statische Liste, falls DB/Schema noch nicht migriert ist.
    const fallback = shuffleArray(DEFAULT_BUILDER_PROMPT_SUGGESTIONS).slice(0, DEFAULT_LIMIT);
    return NextResponse.json(
      {
        suggestions: fallback.map((item, index) => ({
          id: `fallback-${index}`,
          text: item.text,
          category: item.category,
        })),
        totalAvailable: DEFAULT_BUILDER_PROMPT_SUGGESTIONS.length,
        source: 'fallback',
      },
      { status: 200 }
    );
  }
}
