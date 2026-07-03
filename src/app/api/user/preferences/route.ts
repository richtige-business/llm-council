// ============================================
// route.ts - User Preferences API
// 
// Zweck: GET/PUT für User-Präferenzen
// Endpoints: GET /api/user/preferences, PUT /api/user/preferences
// Verwendet von: Profil-Seite, Agent (für User-Context)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getPreferences,
  getPreferencesGrouped,
  setPreference,
  deletePreference,
  DEFAULT_USER_ID,
} from '@/lib/services/user-service';

// --------------------------------------------
// GET /api/user/preferences
// Lädt alle Präferenzen, optional nach Domain gefiltert
// Query-Params: ?domain=scheduling&grouped=true
// --------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const domain = searchParams.get('domain') || undefined;
    const grouped = searchParams.get('grouped') === 'true';
    
    if (grouped) {
      // Gibt Präferenzen als verschachteltes Objekt zurück
      // z.B. { communication: { language: "de" }, scheduling: { duration: 30 } }
      const data = await getPreferencesGrouped(DEFAULT_USER_ID);
      return NextResponse.json({ success: true, data });
    }
    
    // Gibt Präferenzen als flaches Array zurück
    const preferences = await getPreferences(DEFAULT_USER_ID, domain);
    
    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error('Fehler beim Laden der Präferenzen:', error);
    return NextResponse.json(
      { success: false, error: 'Präferenzen konnten nicht geladen werden' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// PUT /api/user/preferences
// Setzt eine einzelne Präferenz (Upsert)
// Body: { domain: string, key: string, value: any }
// --------------------------------------------

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { domain, key, value } = body;
    
    // Validierung: Alle Felder müssen vorhanden sein
    if (!domain || !key || value === undefined) {
      return NextResponse.json(
        { success: false, error: 'domain, key und value sind erforderlich' },
        { status: 400 }
      );
    }
    
    // Validierung: Domain muss gültig sein
    const validDomains = ['communication', 'scheduling', 'ui', 'agent', 'privacy'];
    if (!validDomains.includes(domain)) {
      return NextResponse.json(
        { success: false, error: `Domain muss einer von ${validDomains.join(', ')} sein` },
        { status: 400 }
      );
    }
    
    const preference = await setPreference(DEFAULT_USER_ID, domain, key, value);
    
    return NextResponse.json({
      success: true,
      data: preference,
    });
  } catch (error) {
    console.error('Fehler beim Setzen der Präferenz:', error);
    return NextResponse.json(
      { success: false, error: 'Präferenz konnte nicht gespeichert werden' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// DELETE /api/user/preferences
// Löscht eine einzelne Präferenz
// Body: { domain: string, key: string }
// --------------------------------------------

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { domain, key } = body;
    
    if (!domain || !key) {
      return NextResponse.json(
        { success: false, error: 'domain und key sind erforderlich' },
        { status: 400 }
      );
    }
    
    await deletePreference(DEFAULT_USER_ID, domain, key);
    
    return NextResponse.json({
      success: true,
      message: `Präferenz ${domain}.${key} gelöscht`,
    });
  } catch (error) {
    console.error('Fehler beim Löschen der Präferenz:', error);
    return NextResponse.json(
      { success: false, error: 'Präferenz konnte nicht gelöscht werden' },
      { status: 500 }
    );
  }
}
