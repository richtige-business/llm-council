// ============================================
// route.ts - Agent Memory API
// 
// Zweck: REST API für Agent-Memories (CRUD)
// Endpoints: GET, POST, DELETE /api/agent/memory
// Verwendet von: Memory Agent-Tools, Profil-Seite (Memory-Tab)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  saveMemory,
  recallMemories,
  listMemories,
  deleteMemory,
  getMemoryStats,
} from '@/lib/services/memory-service';
import { DEFAULT_USER_ID } from '@/lib/services/user-service';

// --------------------------------------------
// GET /api/agent/memory
// Lädt Memories - entweder alle, gefiltert oder als Suche
// Query-Params: ?category=preference, ?query=email, ?stats=true
// --------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || undefined;
    const query = searchParams.get('query');
    const stats = searchParams.get('stats') === 'true';
    
    // Statistiken zurückgeben
    if (stats) {
      const data = await getMemoryStats(DEFAULT_USER_ID);
      return NextResponse.json({ success: true, data });
    }
    
    // Suche nach Query
    if (query) {
      const memories = await recallMemories(DEFAULT_USER_ID, query);
      return NextResponse.json({ success: true, data: memories });
    }
    
    // Alle Memories (optional gefiltert)
    const memories = await listMemories(DEFAULT_USER_ID, category);
    return NextResponse.json({ success: true, data: memories });
    
  } catch (error) {
    console.error('Fehler beim Laden der Memories:', error);
    return NextResponse.json(
      { success: false, error: 'Memories konnten nicht geladen werden' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// POST /api/agent/memory
// Speichert ein neues Memory (oder aktualisiert bestehendes)
// Body: { category, key, value, source?, confidence? }
// --------------------------------------------

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { category, key, value, source, confidence } = body;
    
    // Validierung
    if (!category || !key || value === undefined) {
      return NextResponse.json(
        { success: false, error: 'category, key und value sind erforderlich' },
        { status: 400 }
      );
    }
    
    // Gültige Kategorien prüfen
    const validCategories = ['preference', 'fact', 'instruction', 'entity', 'pattern'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { success: false, error: `category muss einer von ${validCategories.join(', ')} sein` },
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
    
    return NextResponse.json({ success: true, data: memory });
    
  } catch (error) {
    console.error('Fehler beim Speichern des Memory:', error);
    return NextResponse.json(
      { success: false, error: 'Memory konnte nicht gespeichert werden' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// DELETE /api/agent/memory
// Löscht ein einzelnes Memory
// Body: { id: string }
// --------------------------------------------

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id ist erforderlich' },
        { status: 400 }
      );
    }
    
    await deleteMemory(id);
    
    return NextResponse.json({
      success: true,
      message: 'Memory gelöscht',
    });
    
  } catch (error) {
    console.error('Fehler beim Löschen des Memory:', error);
    return NextResponse.json(
      { success: false, error: 'Memory konnte nicht gelöscht werden' },
      { status: 500 }
    );
  }
}
