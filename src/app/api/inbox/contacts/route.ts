// ============================================
// contacts/route.ts - API für Kontakte
// 
// Zweck: CRUD-Operationen für Kontakte
//        Unterstützt mehrere E-Mail-Adressen und Account-Verknüpfungen
// Verwendet von: ContactsPanel, FilterDropdown, ContactDetailModal
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';

// --------------------------------------------
// Typ für Kontakt mit Beziehungen (aus Prisma)
// Wird von formatContact() erwartet
// --------------------------------------------

type ContactWithRelations = Prisma.ContactGetPayload<{
  include: {
    emails: true;
    linkedAccounts: { include: { account: true } };
  };
}>;

// Typ für einzelne E-Mail-Adresse
type ContactEmailRecord = ContactWithRelations['emails'][number];

// Typ für verknüpfte Accounts
type LinkedAccountRecord = ContactWithRelations['linkedAccounts'][number];

// --------------------------------------------
// Hilfsfunktion: Kontakt mit allen Beziehungen formatieren
// --------------------------------------------

function formatContact(contact: ContactWithRelations) {
  // Primäre E-Mail aus emails Array ermitteln
  const primaryEmail = contact.emails?.find((e: ContactEmailRecord) => e.isPrimary)?.email 
    || contact.emails?.[0]?.email 
    || contact.email;

  return {
    id: contact.id,
    email: primaryEmail,  // Haupt-E-Mail für Abwärtskompatibilität
    name: contact.name,
    category: contact.category,
    messageCount: contact.messageCount,
    isConfirmed: contact.isConfirmed,
    company: contact.company,
    phone: contact.phone,
    notes: contact.notes,
    avatarUrl: contact.avatarUrl,
    isFavorite: contact.isFavorite,
    // Mehrere E-Mails
    emails: contact.emails?.map((e: ContactEmailRecord) => ({
      id: e.id,
      contactId: e.contactId,
      email: e.email,
      label: e.label,
      isPrimary: e.isPrimary,
      createdAt: e.createdAt.toISOString(),
    })) || [],
    // Verknüpfte Accounts
    linkedAccounts: contact.linkedAccounts?.map((la: LinkedAccountRecord) => ({
      id: la.id,
      contactId: la.contactId,
      accountId: la.accountId,
      account: la.account ? {
        id: la.account.id,
        email: la.account.email,
        displayName: la.account.displayName,
        provider: la.account.provider,
      } : null,
      messageCount: la.messageCount,
      lastInteraction: la.lastInteraction?.toISOString() || null,
      createdAt: la.createdAt.toISOString(),
    })) || [],
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
  };
}

// --------------------------------------------
// GET: Alle Kontakte abrufen
// Query-Parameter:
//   - search: Suchbegriff (Name oder E-Mail)
//   - category: Filterung nach Kategorie
//   - favorites: Nur Favoriten (true/false)
//   - accountId: Nur Kontakte aus bestimmtem Account
//   - limit: Max. Anzahl (Standard: 100)
// --------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const favoritesOnly = searchParams.get('favorites') === 'true';
    const accountId = searchParams.get('accountId');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // Basis-Filter aufbauen
    const where: Prisma.ContactWhereInput = {};

    // Suchfilter - suche in Name, Haupt-Email und verknüpften Emails
    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
        { emails: { some: { email: { contains: search.trim(), mode: 'insensitive' } } } },
      ];
    }

    // Kategorie-Filter
    if (category && category !== 'all') {
      where.category = category;
    }

    // Favoriten-Filter
    if (favoritesOnly) {
      where.isFavorite = true;
    }

    // Account-Filter: Nur Kontakte die mit diesem Account verknüpft sind
    if (accountId) {
      where.linkedAccounts = {
        some: { accountId },
      };
    }

    const contacts = await prisma.contact.findMany({
      where,
      include: {
        emails: {
          orderBy: [
            { isPrimary: 'desc' },
            { createdAt: 'asc' },
          ],
        },
        linkedAccounts: {
          include: {
            account: {
              select: {
                id: true,
                email: true,
                displayName: true,
                provider: true,
              },
            },
          },
        },
      },
      orderBy: [
        { isFavorite: 'desc' },      // Favoriten zuerst
        { messageCount: 'desc' },     // Häufigste Kontakte zuerst
        { name: 'asc' },              // Alphabetisch
      ],
      take: limit,
    });

    // Formatierte Antwort
    const formattedContacts = contacts.map(formatContact);

    return NextResponse.json({ 
      contacts: formattedContacts,
      total: formattedContacts.length,
    });
  } catch (error) {
    console.error('Fehler beim Laden der Kontakte:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Kontakte' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// POST: Neuen Kontakt erstellen
// Body:
//   - emails: Array von { email, label?, isPrimary? }
//   - name, category, company, phone, notes, avatarUrl, isFavorite
//   - linkedAccountIds: Array von Account-IDs
// --------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      email,           // Legacy: Einzelne E-Mail
      emails,          // Neu: Array von E-Mails
      name, 
      category, 
      company, 
      phone, 
      notes, 
      avatarUrl, 
      isFavorite,
      linkedAccountIds,  // Array von Account-IDs zum Verknüpfen
    } = body;

    // E-Mails Array aufbauen
    let emailList: Array<{ email: string; label: string; isPrimary: boolean }> = [];
    
    if (emails && Array.isArray(emails) && emails.length > 0) {
      // Neue Struktur: Array von E-Mails
      emailList = emails.map((e: { email?: string; label?: string; isPrimary?: boolean }, index: number) => ({
        email: e.email?.trim().toLowerCase(),
        label: e.label || 'Andere',
        isPrimary: e.isPrimary ?? index === 0,  // Erste ist standardmäßig primär
      }));
    } else if (email && typeof email === 'string' && email.includes('@')) {
      // Legacy: Einzelne E-Mail
      emailList = [{
        email: email.trim().toLowerCase(),
        label: 'Andere',
        isPrimary: true,
      }];
    } else {
      return NextResponse.json(
        { error: 'Mindestens eine gültige E-Mail-Adresse ist erforderlich' },
        { status: 400 }
      );
    }

    // Validiere alle E-Mails
    for (const e of emailList) {
      if (!e.email || !e.email.includes('@')) {
        return NextResponse.json(
          { error: `Ungültige E-Mail-Adresse: ${e.email}` },
          { status: 400 }
        );
      }
    }

    // Prüfe ob E-Mails bereits existieren (in ContactEmail oder Contact.email)
    const existingEmails = await prisma.contactEmail.findMany({
      where: { email: { in: emailList.map(e => e.email) } },
    });

    if (existingEmails.length > 0) {
      return NextResponse.json(
        { error: `E-Mail bereits vergeben: ${existingEmails.map(e => e.email).join(', ')}` },
        { status: 409 }
      );
    }

    // Haupt-E-Mail für Abwärtskompatibilität
    const primaryEmail = emailList.find(e => e.isPrimary)?.email || emailList[0].email;

    // Erstelle Kontakt mit allen E-Mails und Account-Verknüpfungen
    const contact = await prisma.contact.create({
      data: {
        email: primaryEmail,  // Legacy-Feld
        name: name?.trim() || null,
        category: category || 'unknown',
        company: company?.trim() || null,
        phone: phone?.trim() || null,
        notes: notes?.trim() || null,
        avatarUrl: avatarUrl || null,
        isFavorite: isFavorite || false,
        isConfirmed: true,
        // E-Mails erstellen
        emails: {
          create: emailList.map(e => ({
            email: e.email,
            label: e.label,
            isPrimary: e.isPrimary,
          })),
        },
        // Account-Verknüpfungen erstellen
        ...(linkedAccountIds && linkedAccountIds.length > 0 && {
          linkedAccounts: {
            create: linkedAccountIds.map((accountId: string) => ({
              accountId,
            })),
          },
        }),
      },
      include: {
        emails: true,
        linkedAccounts: {
          include: {
            account: {
              select: {
                id: true,
                email: true,
                displayName: true,
                provider: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ contact: formatContact(contact) });
  } catch (error) {
    console.error('Fehler beim Erstellen des Kontakts:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Kontakts' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// PATCH: Kontakt aktualisieren
// Body:
//   - id: Kontakt-ID (erforderlich)
//   - name, category, company, phone, notes, avatarUrl, isFavorite
//   - addEmails: Array von { email, label?, isPrimary? } zum Hinzufügen
//   - removeEmailIds: Array von E-Mail-IDs zum Entfernen
//   - updateEmails: Array von { id, label?, isPrimary? } zum Aktualisieren
//   - addAccountIds: Array von Account-IDs zum Verknüpfen
//   - removeAccountIds: Array von Account-IDs zum Entfernen
// --------------------------------------------

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      id, 
      name, 
      category, 
      company, 
      phone, 
      notes, 
      avatarUrl, 
      isFavorite, 
      isConfirmed,
      // E-Mail-Operationen
      addEmails,
      removeEmailIds,
      updateEmails,
      // Account-Operationen
      addAccountIds,
      removeAccountIds,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Kontakt-ID ist erforderlich' },
        { status: 400 }
      );
    }

    // Prüfe ob Kontakt existiert
    const existing = await prisma.contact.findUnique({
      where: { id },
      include: { emails: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Kontakt nicht gefunden' },
        { status: 404 }
      );
    }

    // Transaktionale Updates
    await prisma.$transaction(async (tx) => {
      // 1. E-Mails hinzufügen
      if (addEmails && Array.isArray(addEmails) && addEmails.length > 0) {
        for (const emailData of addEmails) {
          const email = emailData.email?.trim().toLowerCase();
          if (!email || !email.includes('@')) continue;

          // Prüfe ob E-Mail bereits existiert
          const exists = await tx.contactEmail.findUnique({ where: { email } });
          if (exists) continue;

          await tx.contactEmail.create({
            data: {
              contactId: id,
              email,
              label: emailData.label || 'Andere',
              isPrimary: emailData.isPrimary ?? false,
            },
          });
        }
      }

      // 2. E-Mails entfernen
      if (removeEmailIds && Array.isArray(removeEmailIds) && removeEmailIds.length > 0) {
        await tx.contactEmail.deleteMany({
          where: {
            id: { in: removeEmailIds },
            contactId: id,
          },
        });
      }

      // 3. E-Mails aktualisieren
      if (updateEmails && Array.isArray(updateEmails)) {
        for (const emailUpdate of updateEmails) {
          if (!emailUpdate.id) continue;
          
          // Wenn diese E-Mail zur primären wird, alle anderen auf nicht-primär setzen
          if (emailUpdate.isPrimary) {
            await tx.contactEmail.updateMany({
              where: { contactId: id, NOT: { id: emailUpdate.id } },
              data: { isPrimary: false },
            });
          }

          await tx.contactEmail.update({
            where: { id: emailUpdate.id },
            data: {
              ...(emailUpdate.label !== undefined && { label: emailUpdate.label }),
              ...(emailUpdate.isPrimary !== undefined && { isPrimary: emailUpdate.isPrimary }),
            },
          });
        }
      }

      // 4. Accounts verknüpfen
      if (addAccountIds && Array.isArray(addAccountIds) && addAccountIds.length > 0) {
        for (const accountId of addAccountIds) {
          // Prüfe ob Verknüpfung bereits existiert
          const exists = await tx.contactAccount.findUnique({
            where: { contactId_accountId: { contactId: id, accountId } },
          });
          if (exists) continue;

          await tx.contactAccount.create({
            data: { contactId: id, accountId },
          });
        }
      }

      // 5. Account-Verknüpfungen entfernen
      if (removeAccountIds && Array.isArray(removeAccountIds) && removeAccountIds.length > 0) {
        await tx.contactAccount.deleteMany({
          where: {
            contactId: id,
            accountId: { in: removeAccountIds },
          },
        });
      }

      // 6. Kontakt-Grunddaten aktualisieren
      const updateData: Prisma.ContactUpdateInput = {};
      if (name !== undefined) updateData.name = name?.trim() || null;
      if (category !== undefined) updateData.category = category;
      if (company !== undefined) updateData.company = company?.trim() || null;
      if (phone !== undefined) updateData.phone = phone?.trim() || null;
      if (notes !== undefined) updateData.notes = notes?.trim() || null;
      if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
      if (isFavorite !== undefined) updateData.isFavorite = isFavorite;
      if (isConfirmed !== undefined) updateData.isConfirmed = isConfirmed;

      if (Object.keys(updateData).length > 0) {
        await tx.contact.update({
          where: { id },
          data: updateData,
        });
      }
    });

    // Aktualisierten Kontakt laden
    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        emails: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        linkedAccounts: {
          include: {
            account: {
              select: {
                id: true,
                email: true,
                displayName: true,
                provider: true,
              },
            },
          },
        },
      },
    });

    // Haupt-E-Mail im Contact-Feld aktualisieren (für Abwärtskompatibilität)
    const primaryEmail = contact?.emails.find(e => e.isPrimary)?.email 
      || contact?.emails[0]?.email;
    
    if (primaryEmail && contact?.email !== primaryEmail) {
      await prisma.contact.update({
        where: { id },
        data: { email: primaryEmail },
      });
    }

    return NextResponse.json({ contact: formatContact(contact) });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Kontakts:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Kontakts' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// DELETE: Kontakt löschen
// Löscht auch alle verknüpften E-Mails und Account-Verknüpfungen (Cascade)
// --------------------------------------------

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Kontakt-ID ist erforderlich' },
        { status: 400 }
      );
    }

    // Prüfe ob Kontakt existiert
    const existing = await prisma.contact.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Kontakt nicht gefunden' },
        { status: 404 }
      );
    }

    // Lösche Kontakt (E-Mails und Account-Verknüpfungen werden per Cascade gelöscht)
    await prisma.contact.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Löschen des Kontakts:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Kontakts' },
      { status: 500 }
    );
  }
}
