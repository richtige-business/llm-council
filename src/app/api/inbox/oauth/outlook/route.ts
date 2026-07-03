// ============================================
// route.ts - Outlook OAuth Start Route
// 
// Zweck: Startet den Microsoft OAuth2-Flow
//        Leitet den Nutzer zur Microsoft-Anmeldeseite
// Route: GET /api/inbox/oauth/outlook
// ============================================

import { NextResponse } from 'next/server';
import { getMicrosoftAuthUrl } from '@/lib/oauth/microsoft';
import { randomBytes } from 'crypto';

// --------------------------------------------
// GET Handler
// Generiert die OAuth-URL und leitet weiter
// --------------------------------------------

export async function GET() {
  try {
    // Prüfe ob OAuth Credentials vorhanden sind
    if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
      console.error('Outlook OAuth: MICROSOFT_CLIENT_ID und/oder MICROSOFT_CLIENT_SECRET fehlen in .env');
      
      // Fehler-Redirect zur Inbox-Seite mit spezifischer Fehlermeldung
      const errorUrl = new URL('/inbox', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
      errorUrl.searchParams.set('error', 'oauth_not_configured');
      errorUrl.searchParams.set('provider', 'outlook');
      
      return NextResponse.redirect(errorUrl);
    }
    
    // State für CSRF-Schutz generieren
    const state = randomBytes(32).toString('hex');
    
    // Microsoft OAuth URL generieren
    const authUrl = getMicrosoftAuthUrl(state);
    
    // Redirect zur Microsoft-Anmeldeseite
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Fehler beim Starten des Outlook OAuth-Flows:', error);
    
    // Fehler-Redirect zur Inbox-Seite
    const errorUrl = new URL('/inbox', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
    errorUrl.searchParams.set('error', 'oauth_start_failed');
    
    return NextResponse.redirect(errorUrl);
  }
}

