// ============================================
// route.ts - Memory API Route
// 
// Zweck: CRUD-Operationen für Agent-Memories
//        GET: Memories laden (optional mit Kategorie-Filter)
//        POST: Neues Memory speichern
// Verwendet von: MemoryPanel, Agent-System
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { listMemories, saveMemory, recallMemories } from '@/lib/services/memory-service';
import { DEFAULT_USER_ID } from '@/lib/services/user-service';

// --------------------------------------------
// GET: Memories laden
// Query-Parameter: category (optional), search (optional)
// --------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search');
    
    let memories;
    
    if (search) {
      // Keyword-basierte Suche
      memories = await recallMemories(DEFAULT_USER_ID, search);
    } else {
      // Alle Memories laden (optional gefiltert nach Kategorie)
      memories = await listMemories(DEFAULT_USER_ID, category);
    }
    
    return NextResponse.json({ memories });
  } catch (error) {
    console.error('Memory GET Fehler:', error);
    return NextResponse.json(
      { error: 'Memories konnten nicht geladen werden', details: String(error) },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// POST: Neues Memory speichern
// Body: { category, key, value, source?, confidence? }
// --------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, key, value, source, confidence } = body;
    
    if (!category || !key || value === undefined) {
      return NextResponse.json(
        { error: 'category, key und value sind erforderlich' },
        { status: 400 }
      );
    }
    
    const memory = await saveMemory({
      userId: DEFAULT_USER_ID,
      category,
      key,
      value,
      source: source || 'explicit',
      confidence: confidence ?? 1.0,
    });
    
    return NextResponse.json({ memory });
  } catch (error) {
    console.error('Memory POST Fehler:', error);
    return NextResponse.json(
      { error: 'Memory konnte nicht gespeichert werden', details: String(error) },
      { status: 500 }
    );
  }
}
