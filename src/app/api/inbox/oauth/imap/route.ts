// ============================================
// route.ts - IMAP Account Route
// 
// Zweck: IMAP/SMTP Konto hinzufügen (für GMX, Web.de, etc.)
//        Im Gegensatz zu OAuth werden hier direkte Credentials verwendet
// Route: POST /api/inbox/oauth/imap
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { encrypt } from '@/lib/crypto';
import { detectProvider, KNOWN_PROVIDERS } from '@/lib/email/providers';
import { testImapConnection, testSmtpConnection } from '@/lib/email/imap';

// --------------------------------------------
// Typen für die API
// --------------------------------------------

interface ImapAccountRequest {
  email: string;
  password: string;
  displayName?: string;
  // Optional: Manuelle Server-Konfiguration
  imapHost?: string;
  imapPort?: number;
  smtpHost?: string;
  smtpPort?: number;
}

// --------------------------------------------
// POST Handler
// Neues IMAP-Konto hinzufügen
// --------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body: ImapAccountRequest = await request.json();
    
    // Validierung
    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: 'E-Mail und Passwort sind erforderlich' },
        { status: 400 }
      );
    }
    
    // --------------------------------------------
    // Server-Konfiguration ermitteln
    // Entweder aus den Known Providers oder manuell
    // --------------------------------------------
    
    let imapHost = body.imapHost;
    let imapPort = body.imapPort || 993;
    let smtpHost = body.smtpHost;
    let smtpPort = body.smtpPort || 587;
    
    // Versuche den Provider automatisch zu erkennen
    const detectedProvider = detectProvider(body.email);
    
    if (detectedProvider && !body.imapHost) {
      imapHost = detectedProvider.imapHost;
      imapPort = detectedProvider.imapPort;
      smtpHost = detectedProvider.smtpHost;
      smtpPort = detectedProvider.smtpPort;
    }
    
    // Wenn kein Provider erkannt wurde und keine manuelle Konfiguration
    if (!imapHost || !smtpHost) {
      return NextResponse.json(
        { 
          error: 'E-Mail-Provider nicht erkannt',
          message: 'Bitte IMAP und SMTP Server manuell angeben',
          knownProviders: Object.keys(KNOWN_PROVIDERS),
        },
        { status: 400 }
      );
    }
    
    // --------------------------------------------
    // Verbindung testen
    // --------------------------------------------
    
    const imapConfig = {
      host: imapHost,
      port: imapPort,
      user: body.email,
      password: body.password,
    };
    
    const smtpConfig = {
      host: smtpHost,
      port: smtpPort,
      user: body.email,
      password: body.password,
    };
    
    // IMAP-Verbindung testen
    const imapWorks = await testImapConnection(imapConfig);
    if (!imapWorks) {
      return NextResponse.json(
        { 
          error: 'IMAP-Verbindung fehlgeschlagen',
          message: 'Überprüfe E-Mail-Adresse, Passwort und Server-Einstellungen',
        },
        { status: 401 }
      );
    }
    
    // SMTP-Verbindung testen
    const smtpWorks = await testSmtpConnection(smtpConfig);
    if (!smtpWorks) {
      // SMTP ist optional - Warnung statt Fehler
      console.warn(`SMTP-Verbindung fehlgeschlagen für ${body.email}`);
    }
    
    // --------------------------------------------
    // Konto in der Datenbank speichern
    // Passwort wird verschlüsselt gespeichert
    // --------------------------------------------
    
    const existingAccount = await prisma.emailAccount.findUnique({
      where: { email: body.email },
    });
    
    if (existingAccount) {
      // Konto aktualisieren
      await prisma.emailAccount.update({
        where: { id: existingAccount.id },
        data: {
          provider: 'imap',
          displayName: body.displayName || existingAccount.displayName,
          imapHost,
          imapPort,
          smtpHost,
          smtpPort,
          imapPassword: encrypt(body.password),
          isActive: true,
          syncError: null,
          updatedAt: new Date(),
        },
      });
      
      return NextResponse.json({
        success: true,
        message: 'Konto aktualisiert',
        email: body.email,
      });
    }
    
    // Neues Konto erstellen
    await prisma.emailAccount.create({
      data: {
        provider: 'imap',
        email: body.email,
        displayName: body.displayName || body.email.split('@')[0],
        imapHost,
        imapPort,
        smtpHost,
        smtpPort,
        imapPassword: encrypt(body.password),
        isActive: true,
      },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Konto erstellt',
      email: body.email,
      provider: detectedProvider?.name || 'IMAP',
    });
    
  } catch (error) {
    console.error('Fehler beim Erstellen des IMAP-Kontos:', error);
    
    return NextResponse.json(
      { 
        error: 'Interner Serverfehler',
        message: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// GET Handler
// Liste der unterstützten Provider zurückgeben
// --------------------------------------------

export async function GET() {
  return NextResponse.json({
    providers: Object.entries(KNOWN_PROVIDERS).map(([domain, config]) => ({
      domain,
      ...config,
    })),
  });
}

