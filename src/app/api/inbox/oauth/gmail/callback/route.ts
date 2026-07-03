// ============================================
// callback/route.ts - Gmail OAuth Callback Route
// 
// Zweck: Empfängt den Authorization Code von Google
//        Tauscht ihn gegen Tokens und speichert das Konto
// Route: GET /api/inbox/oauth/gmail/callback
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { encrypt } from '@/lib/crypto';
import {
  exchangeCodeForTokens,
  getGoogleUserInfo,
} from '@/lib/oauth/google';

// --------------------------------------------
// GET Handler
// Wird von Google nach erfolgreicher Anmeldung aufgerufen
// --------------------------------------------

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  
  // Base-URL für Redirects
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  // --------------------------------------------
  // Fehlerbehandlung
  // --------------------------------------------
  
  // Google hat einen Fehler zurückgegeben
  if (error) {
    console.error('Google OAuth Fehler:', error);
    return NextResponse.redirect(
      `${baseUrl}/inbox?error=google_denied&message=${encodeURIComponent(error)}`
    );
  }
  
  // Kein Authorization Code vorhanden
  if (!code) {
    console.error('Kein Authorization Code von Google erhalten');
    return NextResponse.redirect(
      `${baseUrl}/inbox?error=no_code`
    );
  }
  
  try {
    // --------------------------------------------
    // Token Exchange
    // Authorization Code gegen Access/Refresh Tokens tauschen
    // --------------------------------------------
    
    const tokens = await exchangeCodeForTokens(code);
    
    // --------------------------------------------
    // User-Info abrufen
    // E-Mail-Adresse und Name des Google-Kontos
    // --------------------------------------------
    
    const userInfo = await getGoogleUserInfo(tokens.accessToken);
    
    // --------------------------------------------
    // Konto in der Datenbank speichern
    // Tokens werden verschlüsselt gespeichert
    // --------------------------------------------
    
    // Token-Ablaufzeit berechnen
    const tokenExpiry = new Date(Date.now() + tokens.expiresIn * 1000);
    
    // Prüfen ob das Konto bereits existiert
    const existingAccount = await prisma.emailAccount.findUnique({
      where: { email: userInfo.email },
    });
    
    if (existingAccount) {
      // Konto aktualisieren (neue Tokens)
      await prisma.emailAccount.update({
        where: { id: existingAccount.id },
        data: {
          accessToken: encrypt(tokens.accessToken),
          refreshToken: tokens.refreshToken 
            ? encrypt(tokens.refreshToken) 
            : existingAccount.refreshToken,
          tokenExpiry,
          isActive: true,
          syncError: null,
          updatedAt: new Date(),
        },
      });
      
      console.log(`Gmail-Konto aktualisiert: ${userInfo.email}`);
    } else {
      // Neues Konto erstellen
      await prisma.emailAccount.create({
        data: {
          provider: 'gmail',
          email: userInfo.email,
          displayName: userInfo.name || userInfo.email.split('@')[0],
          accessToken: encrypt(tokens.accessToken),
          refreshToken: tokens.refreshToken 
            ? encrypt(tokens.refreshToken) 
            : null,
          tokenExpiry,
          isActive: true,
        },
      });
      
      console.log(`Neues Gmail-Konto erstellt: ${userInfo.email}`);
    }
    
    // --------------------------------------------
    // Erfolgs-Redirect
    // Zurück zur Inbox mit Erfolgsmeldung
    // --------------------------------------------
    
    return NextResponse.redirect(
      `${baseUrl}/inbox?success=gmail_connected&email=${encodeURIComponent(userInfo.email)}`
    );
    
  } catch (err) {
    console.error('Fehler beim Gmail OAuth Callback:', err);
    
    const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
    
    return NextResponse.redirect(
      `${baseUrl}/inbox?error=oauth_failed&message=${encodeURIComponent(errorMessage)}`
    );
  }
}











