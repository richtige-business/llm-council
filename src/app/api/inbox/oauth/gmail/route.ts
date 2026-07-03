// ============================================
// route.ts - Gmail OAuth Start Route
// 
// Zweck: Startet den Google OAuth2-Flow
//        Leitet den Nutzer zur Google-Anmeldeseite
// Route: GET /api/inbox/oauth/gmail
// ============================================

import { NextResponse } from 'next/server';
import { getGoogleAuthUrl } from '@/lib/oauth/google';
import { randomBytes } from 'crypto';

// --------------------------------------------
// GET Handler
// Generiert die OAuth-URL und leitet weiter
// --------------------------------------------

export async function GET() {
  try {
    // Prüfe ob OAuth Credentials vorhanden sind
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('Gmail OAuth: GOOGLE_CLIENT_ID und/oder GOOGLE_CLIENT_SECRET fehlen in .env');
      
      // Fehler-Redirect zur Inbox-Seite mit spezifischer Fehlermeldung
      // Versuche NEXT_PUBLIC_APP_URL oder baue die URL aus dem Request-Header
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const errorUrl = new URL('/inbox', baseUrl);
      errorUrl.searchParams.set('error', 'oauth_not_configured');
      errorUrl.searchParams.set('provider', 'gmail');
      
      return NextResponse.redirect(errorUrl);
    }
    
    // State für CSRF-Schutz generieren
    // In einer echten App würde man das in einer Session speichern
    const state = randomBytes(32).toString('hex');
    
    // Google OAuth URL generieren
    const authUrl = getGoogleAuthUrl(state);
    
    // Redirect zur Google-Anmeldeseite
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Fehler beim Starten des Gmail OAuth-Flows:', error);
    
    // Fehler-Redirect zur Inbox-Seite mit Fehlermeldung
    const errorUrl = new URL('/inbox', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
    errorUrl.searchParams.set('error', 'oauth_start_failed');
    
    return NextResponse.redirect(errorUrl);
  }
}

