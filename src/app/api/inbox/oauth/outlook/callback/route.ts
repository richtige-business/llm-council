// ============================================
// callback/route.ts - Outlook OAuth Callback Route
// 
// Zweck: Empfängt den Authorization Code von Microsoft
//        Tauscht ihn gegen Tokens und speichert das Konto
// Route: GET /api/inbox/oauth/outlook/callback
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { encrypt } from '@/lib/crypto';
import {
  exchangeCodeForTokens,
  getMicrosoftUserInfo,
} from '@/lib/oauth/microsoft';

// --------------------------------------------
// GET Handler
// Wird von Microsoft nach erfolgreicher Anmeldung aufgerufen
// --------------------------------------------

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  
  // Base-URL für Redirects
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  // --------------------------------------------
  // Fehlerbehandlung
  // --------------------------------------------
  
  if (error) {
    console.error('Microsoft OAuth Fehler:', error, errorDescription);
    return NextResponse.redirect(
      `${baseUrl}/inbox?error=microsoft_denied&message=${encodeURIComponent(errorDescription || error)}`
    );
  }
  
  if (!code) {
    console.error('Kein Authorization Code von Microsoft erhalten');
    return NextResponse.redirect(
      `${baseUrl}/inbox?error=no_code`
    );
  }
  
  try {
    // --------------------------------------------
    // Token Exchange
    // --------------------------------------------
    
    const tokens = await exchangeCodeForTokens(code);
    
    // --------------------------------------------
    // User-Info abrufen
    // --------------------------------------------
    
    const userInfo = await getMicrosoftUserInfo(tokens.accessToken);
    
    // --------------------------------------------
    // Konto in der Datenbank speichern
    // --------------------------------------------
    
    const tokenExpiry = new Date(Date.now() + tokens.expiresIn * 1000);
    
    const existingAccount = await prisma.emailAccount.findUnique({
      where: { email: userInfo.email },
    });
    
    if (existingAccount) {
      // Konto aktualisieren
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
      
      console.log(`Outlook-Konto aktualisiert: ${userInfo.email}`);
    } else {
      // Neues Konto erstellen
      await prisma.emailAccount.create({
        data: {
          provider: 'outlook',
          email: userInfo.email,
          displayName: userInfo.displayName || userInfo.email.split('@')[0],
          accessToken: encrypt(tokens.accessToken),
          refreshToken: tokens.refreshToken 
            ? encrypt(tokens.refreshToken) 
            : null,
          tokenExpiry,
          isActive: true,
        },
      });
      
      console.log(`Neues Outlook-Konto erstellt: ${userInfo.email}`);
    }
    
    // --------------------------------------------
    // Erfolgs-Redirect
    // --------------------------------------------
    
    return NextResponse.redirect(
      `${baseUrl}/inbox?success=outlook_connected&email=${encodeURIComponent(userInfo.email)}`
    );
    
  } catch (err) {
    console.error('Fehler beim Outlook OAuth Callback:', err);
    
    const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
    
    return NextResponse.redirect(
      `${baseUrl}/inbox?error=oauth_failed&message=${encodeURIComponent(errorMessage)}`
    );
  }
}











