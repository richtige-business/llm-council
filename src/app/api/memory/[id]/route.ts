// ============================================
// [id]/route.ts - Memory Detail API Route
// 
// Zweck: Einzelnes Memory verwalten
//        DELETE: Memory löschen
// Verwendet von: MemoryPanel
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { deleteMemory } from '@/lib/services/memory-service';

// --------------------------------------------
// DELETE: Einzelnes Memory löschen
// Parameter: id (aus URL)
// --------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Memory-ID ist erforderlich' },
        { status: 400 }
      );
    }
    
    await deleteMemory(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Memory DELETE Fehler:', error);
    return NextResponse.json(
      { error: 'Memory konnte nicht gelöscht werden', details: String(error) },
      { status: 500 }
    );
  }
}
