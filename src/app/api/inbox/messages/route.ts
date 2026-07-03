// ============================================
// route.ts - Messages API
// 
// Zweck: CRUD-Operationen für Nachrichten
//        Zwei-Wege-Sync: Änderungen werden auch an Gmail/Outlook gesendet
// Route: GET/POST/PATCH/DELETE /api/inbox/messages
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { 
  modifyGmailMessage, 
  trashGmailMessage, 
  untrashGmailMessage,
  GMAIL_LABELS,
  refreshAccessToken as refreshGoogleToken 
} from '@/lib/oauth/google';

// --------------------------------------------
// GET Handler
// Nachrichten abrufen mit Filterung und Pagination
// --------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Filter-Parameter
    const accountId = searchParams.get('accountId');
    const folder = searchParams.get('folder');  // null = alle Ordner
    const type = searchParams.get('type');  // 'email' oder 'system'
    const isRead = searchParams.get('isRead');
    const search = searchParams.get('search');
    
    // Pagination
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Where-Clause aufbauen
    const where: Record<string, unknown> = {
      isDeleted: false,
    };
    
    // Nur filtern wenn folder explizit angegeben (nicht 'all')
    if (folder && folder !== 'all') {
      where.folder = folder;
    }

    if (accountId) where.accountId = accountId;
    if (type) where.type = type;
    if (isRead !== null) where.isRead = isRead === 'true';
    
    // Suchfilter
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { sender: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Nachrichten abrufen (inkl. benutzerdefinierte Labels aus MessageLabel)
    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          account: {
            select: {
              id: true,
              email: true,
              displayName: true,
              provider: true,
            },
          },
          // NEU: Lade auch benutzerdefinierte Labels aus der MessageLabel-Tabelle
          messageLabels: {
            include: {
              label: true,
            },
          },
        },
      }),
      prisma.message.count({ where }),
    ]);

    // Nachrichten formatieren
    const formattedMessages = messages.map(msg => {
      // Gmail-Labels aus dem JSON-Feld
      const gmailLabels = msg.labels ? JSON.parse(msg.labels) : [];
      
      // Benutzerdefinierte LifeOS-Labels aus der MessageLabel-Tabelle
      // Diese werden als IDs zum labels-Array hinzugefügt
      const customLabelIds = msg.messageLabels?.map(ml => ml.labelId) || [];
      
      // Kombiniere beide Label-Typen
      const allLabels = [...gmailLabels, ...customLabelIds];
      
      return {
        id: msg.id,
        accountId: msg.accountId,
        type: msg.type,
        subject: msg.subject,
        body: msg.body,
        bodyHtml: msg.bodyHtml,
        snippet: msg.snippet,
        sender: msg.sender,
        senderName: msg.senderName,
        recipients: msg.recipients ? JSON.parse(msg.recipients) : [],
        cc: msg.cc ? JSON.parse(msg.cc) : [],
        bcc: msg.bcc ? JSON.parse(msg.bcc) : [],
        isRead: msg.isRead,
        isStarred: msg.isStarred,
        isArchived: msg.isArchived,
        isDeleted: msg.isDeleted,
        folder: msg.folder,
        labels: allLabels,  // Enthält jetzt auch benutzerdefinierte Label-IDs
        priority: msg.priority,
        source: msg.source,
        actionUrl: msg.actionUrl,
        hasAttachments: msg.hasAttachments,
        attachments: msg.attachments ? JSON.parse(msg.attachments) : [],
        threadId: msg.threadId,
        externalId: msg.externalId,
        receivedAt: msg.receivedAt.toISOString(),
        createdAt: msg.createdAt.toISOString(),
        account: msg.account,
      };
    });

    return NextResponse.json({
      messages: formattedMessages,
      total,
      limit,
      offset,
    });

  } catch (error) {
    console.error('Fehler beim Abrufen der Nachrichten:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Nachrichten' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// PATCH Handler
// Nachricht aktualisieren (z.B. als gelesen markieren)
// Zwei-Wege-Sync: Änderungen werden auch an Gmail gesendet
// --------------------------------------------

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Nachrichten-ID ist erforderlich' },
        { status: 400 }
      );
    }

    // Nachricht mit Konto laden für Zwei-Wege-Sync
    const existingMessage = await prisma.message.findUnique({
      where: { id },
      include: { account: true },
    });

    if (!existingMessage) {
      return NextResponse.json(
        { error: 'Nachricht nicht gefunden' },
        { status: 404 }
      );
    }

    // Erlaubte Felder zum Aktualisieren
    const allowedFields = ['isRead', 'isStarred', 'isArchived', 'isDeleted', 'folder', 'labels'];
    const sanitizedUpdates: Record<string, unknown> = {};
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        sanitizedUpdates[field] = field === 'labels' 
          ? JSON.stringify(updates[field])
          : updates[field];
      }
    }

    // --------------------------------------------
    // Zwei-Wege-Sync: Gmail API aufrufen
    // --------------------------------------------
    if (existingMessage.account?.provider === 'gmail' && existingMessage.externalId) {
      try {
        let accessToken = existingMessage.account.accessToken 
          ? decrypt(existingMessage.account.accessToken)
          : null;

        if (accessToken) {
          const addLabels: string[] = [];
          const removeLabels: string[] = [];

          // Als gelesen/ungelesen markieren
          if (updates.isRead === true) {
            removeLabels.push(GMAIL_LABELS.UNREAD);
          } else if (updates.isRead === false) {
            addLabels.push(GMAIL_LABELS.UNREAD);
          }

          // Stern hinzufügen/entfernen
          if (updates.isStarred === true) {
            addLabels.push(GMAIL_LABELS.STARRED);
          } else if (updates.isStarred === false) {
            removeLabels.push(GMAIL_LABELS.STARRED);
          }

          // Archivieren (INBOX-Label entfernen)
          if (updates.folder === 'archive' || updates.isArchived === true) {
            removeLabels.push(GMAIL_LABELS.INBOX);
          }

          // Zurück in Inbox verschieben
          if (updates.folder === 'inbox' && existingMessage.folder === 'archive') {
            addLabels.push(GMAIL_LABELS.INBOX);
          }

          // Als Spam markieren
          if (updates.markAsSpam === true || updates.folder === 'spam') {
            addLabels.push(GMAIL_LABELS.SPAM);
            removeLabels.push(GMAIL_LABELS.INBOX);
          }

          // Spam-Markierung entfernen
          if (updates.unmarkAsSpam === true || (updates.folder === 'inbox' && existingMessage.folder === 'spam')) {
            removeLabels.push(GMAIL_LABELS.SPAM);
            addLabels.push(GMAIL_LABELS.INBOX);
          }

          // Gmail API aufrufen wenn es Änderungen gibt
          if (addLabels.length > 0 || removeLabels.length > 0) {
            await modifyGmailMessage(accessToken, existingMessage.externalId, addLabels, removeLabels);
            console.log(`Gmail Sync: Nachricht ${existingMessage.externalId} aktualisiert`);
          }
        }
      } catch (gmailError) {
        console.error('Gmail Sync Fehler (nicht kritisch):', gmailError);
        // Fehler beim Gmail-Sync ist nicht kritisch, lokale Änderung wird trotzdem gespeichert
      }
    }

    // Lokale Datenbank aktualisieren
    const message = await prisma.message.update({
      where: { id },
      data: sanitizedUpdates,
    });

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        isRead: message.isRead,
        isStarred: message.isStarred,
        folder: message.folder,
      },
    });

  } catch (error) {
    console.error('Fehler beim Aktualisieren der Nachricht:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren der Nachricht' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// DELETE Handler
// Nachricht löschen (soft delete oder hard delete)
// Zwei-Wege-Sync: Löschen wird auch an Gmail gesendet
// --------------------------------------------

export async function DELETE(request: NextRequest) {
  try {
    const messageId = request.nextUrl.searchParams.get('id');
    const permanent = request.nextUrl.searchParams.get('permanent') === 'true';

    if (!messageId) {
      return NextResponse.json(
        { error: 'Nachrichten-ID ist erforderlich' },
        { status: 400 }
      );
    }

    // Nachricht mit Konto laden für Zwei-Wege-Sync
    const existingMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: { account: true },
    });

    if (!existingMessage) {
      return NextResponse.json(
        { error: 'Nachricht nicht gefunden' },
        { status: 404 }
      );
    }

    // --------------------------------------------
    // Zwei-Wege-Sync: Gmail API aufrufen
    // --------------------------------------------
    if (existingMessage.account?.provider === 'gmail' && existingMessage.externalId) {
      try {
        const accessToken = existingMessage.account.accessToken 
          ? decrypt(existingMessage.account.accessToken)
          : null;

        if (accessToken && !permanent) {
          // In Papierkorb verschieben
          await trashGmailMessage(accessToken, existingMessage.externalId);
          console.log(`Gmail Sync: Nachricht ${existingMessage.externalId} in Papierkorb verschoben`);
        }
      } catch (gmailError) {
        console.error('Gmail Sync Fehler (nicht kritisch):', gmailError);
      }
    }

    if (permanent) {
      // Endgültig löschen (nur lokal)
      await prisma.message.delete({
        where: { id: messageId },
      });
    } else {
      // Soft delete (in Papierkorb verschieben)
      await prisma.message.update({
        where: { id: messageId },
        data: {
          isDeleted: true,
          folder: 'trash',
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: permanent ? 'Nachricht gelöscht' : 'Nachricht in Papierkorb verschoben',
    });

  } catch (error) {
    console.error('Fehler beim Löschen der Nachricht:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen der Nachricht' },
      { status: 500 }
    );
  }
}




