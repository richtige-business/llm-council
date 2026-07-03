// ============================================
// route.ts - E-Mail senden API
// 
// Zweck: Direkter E-Mail-Versand vom Frontend aus
//        Wird von der Generative UI nach Animation aufgerufen
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendGmailMessage, refreshAccessToken as refreshGoogleToken } from '@/lib/oauth/google';
import { sendSmtpEmail } from '@/lib/email/imap';
import { decrypt, encrypt } from '@/lib/crypto';

// --------------------------------------------
// POST - E-Mail senden
// --------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const { to, subject, body, cc, fromAccountEmail } = await request.json();

    // Validierung
    if (!to || !subject || !body) {
      return NextResponse.json(
        { success: false, error: 'Fehlende Felder: to, subject, body sind erforderlich' },
        { status: 400 }
      );
    }

    // Account aus DB holen
    const account = await prisma.emailAccount.findFirst({
      where: fromAccountEmail 
        ? { email: fromAccountEmail, isActive: true }
        : { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Kein E-Mail-Konto verbunden' },
        { status: 404 }
      );
    }

    // Je nach Provider unterschiedlich senden
    if (account.provider === 'gmail') {
      // Tokens entschlüsseln
      let accessToken: string | null = null;
      let decryptedRefreshToken: string | null = null;
      
      try {
        if (account.accessToken) {
          accessToken = decrypt(account.accessToken);
        }
        if (account.refreshToken) {
          decryptedRefreshToken = decrypt(account.refreshToken);
        }
      } catch (decryptError) {
        console.error('❌ Fehler beim Entschlüsseln der Tokens:', decryptError);
        return NextResponse.json(
          { success: false, error: 'Token-Entschlüsselung fehlgeschlagen' },
          { status: 401 }
        );
      }
      
      // Hilfsfunktion zum Refreshen des Tokens
      const refreshTokenFn = async (): Promise<string | null> => {
        if (!decryptedRefreshToken) {
          return null;
        }
        
        try {
          const tokens = await refreshGoogleToken(decryptedRefreshToken);
          
          await prisma.emailAccount.update({
            where: { id: account.id },
            data: {
              accessToken: encrypt(tokens.accessToken),
              tokenExpiry: new Date(Date.now() + tokens.expiresIn * 1000),
              syncError: null,
            },
          });
          
          return tokens.accessToken;
        } catch (refreshError) {
          console.error('❌ Token refresh fehlgeschlagen:', refreshError);
          
          await prisma.emailAccount.update({
            where: { id: account.id },
            data: {
              syncError: 'Token refresh fehlgeschlagen',
            },
          });
          
          return null;
        }
      };
      
      // Token Status prüfen
      const tokenExpiry = account.tokenExpiry ? new Date(account.tokenExpiry) : null;
      const tokenExpired = tokenExpiry && tokenExpiry < new Date();
      
      // Proaktiv refreshen wenn nötig
      if (tokenExpired || !accessToken) {
        const newToken = await refreshTokenFn();
        if (newToken) {
          accessToken = newToken;
        } else {
          return NextResponse.json(
            { success: false, error: 'Gmail-Token abgelaufen. Bitte Konto neu verbinden.' },
            { status: 401 }
          );
        }
      }

      // --------------------------------------------
      // RFC 2822 Email erstellen (EINFACHER Ansatz)
      // Body als Klartext, nur finale Message base64url-encoded
      // --------------------------------------------
      const domain = account.email.split('@')[1];
      const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2)}@${domain}>`;
      const dateFormatted = new Date().toUTCString();
      
      // Subject mit UTF-8 encoding (für Umlaute etc.)
      const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`;
      
      // Boundary für MIME (falls später Attachments)
      const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      
      // E-Mail als Klartext aufbauen (RFC 2822)
      // WICHTIG: Jede Zeile muss mit \r\n enden!
      const emailParts = [
        `MIME-Version: 1.0`,
        `Date: ${dateFormatted}`,
        `Message-ID: ${messageId}`,
        `Subject: ${encodedSubject}`,
        `From: ${account.displayName || account.email} <${account.email}>`,
        `To: ${to}`,
        cc ? `Cc: ${cc}` : null,
        `Content-Type: text/plain; charset="UTF-8"`,
        `Content-Transfer-Encoding: 8bit`,
        ``,  // Leere Zeile zwischen Header und Body
        body, // Body als Klartext
      ].filter(line => line !== null).join('\r\n');
      
      // Debug: Zeige die rohe E-Mail
      console.log('DEBUG_RAW_EMAIL:', emailParts.substring(0, 500));
      
      // Base64url encoding für Gmail API
      // (Standard Base64, dann URL-safe machen)
      const rawMessage = Buffer.from(emailParts, 'utf-8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Senden
      let sentMessageId: string | null = null;
      try {
        const result = await sendGmailMessage(accessToken!, rawMessage);
        sentMessageId = result?.id || null;
        console.log(`✅ Email gesendet via API von ${account.email} an ${to}`);
      } catch (sendError) {
        // Bei 401: Token refreshen und nochmal
        if (sendError instanceof Error && sendError.message.includes('401')) {
          const newToken = await refreshTokenFn();
          
          if (newToken) {
            const result = await sendGmailMessage(newToken, rawMessage);
            sentMessageId = result?.id || null;
          } else {
            throw new Error('Token-Refresh fehlgeschlagen');
          }
        } else {
          throw sendError;
        }
      }

      // In DB speichern
      const sentMessage = await prisma.message.create({
        data: {
          accountId: account.id,
          type: 'email',
          subject: subject,
          body: body,
          snippet: body.substring(0, 100),
          sender: account.email,
          senderName: account.displayName || account.email,
          recipients: JSON.stringify([to]),
          cc: cc ? JSON.stringify(cc.split(',').map((e: string) => e.trim())) : null,
          folder: 'sent',
          isRead: true,
          externalId: sentMessageId,
          source: 'gmail',
          receivedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          messageId: sentMessage.id,
          to,
          subject,
          from: account.email,
          fromName: account.displayName || account.email,
          sentAt: new Date().toISOString(),
        },
      });

    } else if (account.provider === 'imap' && account.smtpHost && account.imapPassword) {
      // IMAP/SMTP Versand
      await sendSmtpEmail(
        {
          host: account.smtpHost,
          port: account.smtpPort || 587,
          user: account.email,
          password: account.imapPassword,
        },
        {
          to,
          cc: cc || undefined,
          subject,
          text: body,
        }
      );

      const sentMessage = await prisma.message.create({
        data: {
          accountId: account.id,
          type: 'email',
          subject: subject,
          body: body,
          snippet: body.substring(0, 100),
          sender: account.email,
          senderName: account.displayName || account.email,
          recipients: JSON.stringify([to]),
          cc: cc ? JSON.stringify(cc.split(',').map((e: string) => e.trim())) : null,
          folder: 'sent',
          isRead: true,
          source: 'imap',
          receivedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          messageId: sentMessage.id,
          to,
          subject,
          from: account.email,
          fromName: account.displayName || account.email,
          sentAt: new Date().toISOString(),
        },
      });

    } else {
      return NextResponse.json(
        { success: false, error: 'Konto unterstützt keinen Versand' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('❌ Fehler beim E-Mail-Versand:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
}
