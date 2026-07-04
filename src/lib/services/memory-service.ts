// ============================================
// memory-service.ts - Agent Memory Service
// 
// Zweck: CRUD-Operationen für das persistente Agent-Gedächtnis
//        Der Agent speichert Fakten, Präferenzen und Instruktionen
// Verwendet von: Memory Agent-Tools, Memory API, System-Prompt Builder
// ============================================

import { prisma } from '@/lib/db';
import { DEFAULT_USER_ID } from './user-service';

// --------------------------------------------
// Typen für den Memory-Service
// --------------------------------------------

export type MemoryCategory = 'preference' | 'fact' | 'instruction' | 'entity' | 'pattern';
export type MemorySource = 'explicit' | 'learned' | 'inferred';

export interface SaveMemoryInput {
  userId?: string;
  category: MemoryCategory;
  key: string;
  value: string | Record<string, unknown>;
  source?: MemorySource;
  confidence?: number;
}

// --------------------------------------------
// Memory speichern (Upsert)
// Erstellt ein neues Memory oder aktualisiert ein bestehendes
// bei gleichem userId + category + key
// --------------------------------------------

export async function saveMemory(input: SaveMemoryInput) {
  const {
    userId = DEFAULT_USER_ID,
    category,
    key,
    value,
    source = 'explicit',
    confidence = 1.0,
  } = input;
  
  // Wert als JSON-kompatibel aufbereiten
  const jsonValue = typeof value === 'string' ? value : value;
  
  return prisma.userMemory.upsert({
    where: {
      userId_category_key: { userId, category, key },
    },
    update: {
      value: jsonValue as never,
      source,
      confidence,
    },
    create: {
      userId,
      category,
      key,
      value: jsonValue as never,
      source,
      confidence,
    },
  });
}

// --------------------------------------------
// Memories suchen (Keyword-basiert)
// Sucht in key und value nach dem Query-String
// Phase 3 ersetzt dies durch Semantic Search (pgvector)
// --------------------------------------------

export async function recallMemories(userId: string = DEFAULT_USER_ID, query: string) {
  // Keyword-basierte Suche über key und value
  // In Phase 3 wird dies durch Semantic Search ersetzt
  const memories = await prisma.userMemory.findMany({
    where: {
      userId,
      OR: [
        { key: { contains: query, mode: 'insensitive' } },
        // Für String-Werte: Suche im JSON-Feld
        // Prisma unterstützt kein ILIKE auf Json direkt,
        // daher suchen wir auch über den Key
      ],
    },
    orderBy: [
      { confidence: 'desc' },
      { updatedAt: 'desc' },
    ],
    take: 10,
  });
  
  // Zusätzlich: Durchsuche alle Memories und filtere nach Value-Inhalt
  // (Workaround für fehlende JSON-Textsuche in Prisma)
  if (memories.length < 5) {
    const allMemories = await prisma.userMemory.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    
    const queryLower = query.toLowerCase();
    const valueMatches = allMemories.filter(m => {
      const valueStr = JSON.stringify(m.value).toLowerCase();
      return valueStr.includes(queryLower) && !memories.some(existing => existing.id === m.id);
    });
    
    memories.push(...valueMatches.slice(0, 10 - memories.length));
  }
  
  return memories;
}

// --------------------------------------------
// Alle Memories auflisten
// Optional nach Kategorie gefiltert
// --------------------------------------------

export async function listMemories(userId: string = DEFAULT_USER_ID, category?: string) {
  return prisma.userMemory.findMany({
    where: {
      userId,
      ...(category ? { category } : {}),
    },
    orderBy: [
      { category: 'asc' },
      { updatedAt: 'desc' },
    ],
  });
}

// --------------------------------------------
// Einzelnes Memory löschen
// --------------------------------------------

export async function deleteMemory(id: string) {
  return prisma.userMemory.delete({
    where: { id },
  });
}

// --------------------------------------------
// Top-N Memories laden (für System-Prompt Injection)
// Sortiert nach Wichtigkeit: confidence DESC, updatedAt DESC
// Begrenzt auf maxTokens (geschätzt ~4 chars/token)
// --------------------------------------------

export async function getTopMemories(
  userId: string = DEFAULT_USER_ID,
  limit: number = 20,
  maxChars: number = 2000
) {
  const memories = await prisma.userMemory.findMany({
    where: {
      userId,
      confidence: { gte: 0.3 }, // Nur Memories mit ausreichender Konfidenz
    },
    orderBy: [
      { confidence: 'desc' },
      { updatedAt: 'desc' },
    ],
    take: limit,
  });
  
  // Auf maxChars begrenzen
  let totalChars = 0;
  const filtered = [];
  
  for (const memory of memories) {
    const entryLength = memory.key.length + JSON.stringify(memory.value).length + 20;
    if (totalChars + entryLength > maxChars) break;
    totalChars += entryLength;
    filtered.push(memory);
  }
  
  return filtered;
}

// --------------------------------------------
// Memories als formatierten Prompt-Block
// Wird in den System-Prompt des Agents injiziert
// --------------------------------------------

export async function getMemoryPromptBlock(
  userId: string = DEFAULT_USER_ID,
  maxTokens: number = 500
): Promise<string> {
  // Geschätzt ~4 chars pro Token
  const maxChars = maxTokens * 4;
  const memories = await getTopMemories(userId, 20, maxChars);
  
  if (memories.length === 0) {
    return '';
  }
  
  // Formatiere als Prompt-Block
  const lines = memories.map(m => {
    const valueStr = typeof m.value === 'string' ? m.value : JSON.stringify(m.value);
    return `- [${m.category}] ${m.key}: ${valueStr}`;
  });
  
  return `# User Memories (from persistent storage)
${lines.join('\n')}`;
}

// --------------------------------------------
// Memory-Statistiken
// Für die Profil-Seite oder Agent-Monitoring
// --------------------------------------------

export async function getMemoryStats(userId: string = DEFAULT_USER_ID) {
  const [total, byCategory] = await Promise.all([
    prisma.userMemory.count({ where: { userId } }),
    prisma.userMemory.groupBy({
      by: ['category'],
      where: { userId },
      _count: true,
    }),
  ]);
  
  return {
    total,
    byCategory: Object.fromEntries(
      byCategory.map(g => [g.category, g._count])
    ),
  };
}
