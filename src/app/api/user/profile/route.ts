// ============================================
// route.ts - User Profile API
// 
// Zweck: GET/PUT für User-Profil-Daten
// Endpoints: GET /api/user/profile, PUT /api/user/profile
// Verwendet von: Profil-Seite, Agent (für User-Context)
// ============================================

import { NextResponse } from 'next/server';
import {
  getOrCreateDefaultUser,
  updateUser,
  DEFAULT_USER_ID,
} from '@/lib/services/user-service';
import { isSupportedLocale } from '@/lib/i18n/config';

// --------------------------------------------
// GET /api/user/profile
// Gibt den User mit allen Preferences zurück
// --------------------------------------------

export async function GET() {
  try {
    const user = await getOrCreateDefaultUser();
    
    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Fehler beim Laden des Profils:', error);
    return NextResponse.json(
      { success: false, error: 'Profil konnte nicht geladen werden' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// PUT /api/user/profile
// Aktualisiert Profil-Felder (Partial Update)
// Body: { name?, email?, avatar?, bio?, status?, timezone?, language? }
// --------------------------------------------

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    // Nur erlaubte Felder durchlassen
    const allowedFields = ['name', 'email', 'avatar', 'bio', 'status', 'timezone', 'language'];
    const updateData: Record<string, unknown> = {};
    
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }
    
    // Validierung: Name darf nicht leer sein
    if ('name' in updateData && (!updateData.name || String(updateData.name).trim() === '')) {
      return NextResponse.json(
        { success: false, error: 'Name darf nicht leer sein' },
        { status: 400 }
      );
    }
    
    // Validierung: Status muss gültig sein
    if ('status' in updateData) {
      const validStatuses = ['online', 'away', 'busy', 'offline'];
      if (!validStatuses.includes(String(updateData.status))) {
        return NextResponse.json(
          { success: false, error: `Status muss einer von ${validStatuses.join(', ')} sein` },
          { status: 400 }
        );
      }
    }
    
    // Validierung: Bio max 160 Zeichen
    if ('bio' in updateData && updateData.bio && String(updateData.bio).length > 160) {
      return NextResponse.json(
        { success: false, error: 'Bio darf maximal 160 Zeichen lang sein' },
        { status: 400 }
      );
    }

    // Validierung: Sprache muss unterstützt sein
    if ('language' in updateData && !isSupportedLocale(String(updateData.language))) {
      return NextResponse.json(
        { success: false, error: 'Sprache muss "de" oder "en" sein' },
        { status: 400 }
      );
    }
    
    const user = await updateUser(DEFAULT_USER_ID, updateData);
    
    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Profils:', error);
    return NextResponse.json(
      { success: false, error: 'Profil konnte nicht aktualisiert werden' },
      { status: 500 }
    );
  }
}
