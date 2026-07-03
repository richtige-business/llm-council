// ============================================
// route.ts - Kontakte API Route
// 
// Zweck: CRUD-Operationen für Kontakte
//        - GET: Kontakte abrufen (mit Filtern)
//        - POST: Neuen Kontakt erstellen
//        - PATCH: Kontakt aktualisieren
//        - DELETE: Kontakt löschen
// Endpunkt: /api/contacts
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { 
  getContacts, 
  findOrCreateContact, 
  updateContactCategory,
  deleteContact,
  linkAllMessagesFromSender,
} from '@/lib/contacts';

// --------------------------------------------
// GET - Kontakte abrufen
// Query-Parameter:
//   - category: 'private' | 'business' | 'unknown'
//   - search: Suchbegriff (E-Mail oder Name)
//   - limit: Anzahl (default: 50)
//   - offset: Offset für Pagination
// --------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const category = searchParams.get('category') as 'private' | 'business' | 'unknown' | null;
    const search = searchParams.get('search') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const { contacts, total } = await getContacts({
      category: category || undefined,
      search,
      limit,
      offset,
    });
    
    return NextResponse.json({
      contacts,
      total,
      limit,
      offset,
      hasMore: offset + contacts.length < total,
    });
    
  } catch (error) {
    console.error('Kontakte laden fehlgeschlagen:', error);
    return NextResponse.json(
      { error: 'Kontakte konnten nicht geladen werden' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// POST - Neuen Kontakt erstellen
// Body: { email, name?, category? }
// --------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, category } = body;
    
    // Validierung
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'E-Mail-Adresse erforderlich' },
        { status: 400 }
      );
    }
    
    // E-Mail-Format validieren
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Ungültige E-Mail-Adresse' },
        { status: 400 }
      );
    }
    
    // Kontakt erstellen
    const result = await findOrCreateContact({
      email: email.toLowerCase().trim(),
      name: name || undefined,
      category: category || undefined,
    });
    
    // Falls neuer Kontakt: Alle existierenden Nachrichten verknüpfen
    if (result.isNew && result.contact.email) {
      const linkedCount = await linkAllMessagesFromSender(
        result.contact.email,
        result.contact.id
      );
      
      return NextResponse.json({
        contact: result.contact,
        isNew: true,
        linkedMessages: linkedCount,
      }, { status: 201 });
    }
    
    return NextResponse.json({
      contact: result.contact,
      isNew: false,
      message: 'Kontakt existiert bereits',
    });
    
  } catch (error) {
    console.error('Kontakt erstellen fehlgeschlagen:', error);
    return NextResponse.json(
      { error: 'Kontakt konnte nicht erstellt werden' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// PATCH - Kontakt aktualisieren
// Body: { id, name?, category? }
// --------------------------------------------

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, category } = body;
    
    // Validierung
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Kontakt-ID erforderlich' },
        { status: 400 }
      );
    }
    
    // Prüfe ob Kontakt existiert
    const existingContact = await prisma.contact.findUnique({
      where: { id },
    });
    
    if (!existingContact) {
      return NextResponse.json(
        { error: 'Kontakt nicht gefunden' },
        { status: 404 }
      );
    }
    
    // Update vorbereiten
    const updateData: Record<string, unknown> = {
      isConfirmed: true, // User hat manuell bearbeitet
    };
    
    if (name !== undefined) {
      updateData.name = name || null;
    }
    
    if (category && ['private', 'business', 'unknown'].includes(category)) {
      updateData.category = category;
    }
    
    // Update durchführen
    const updatedContact = await prisma.contact.update({
      where: { id },
      data: updateData,
    });
    
    return NextResponse.json({
      contact: updatedContact,
      updated: true,
    });
    
  } catch (error) {
    console.error('Kontakt aktualisieren fehlgeschlagen:', error);
    return NextResponse.json(
      { error: 'Kontakt konnte nicht aktualisiert werden' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// DELETE - Kontakt löschen
// Query-Parameter: id
// --------------------------------------------

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    // Validierung
    if (!id) {
      return NextResponse.json(
        { error: 'Kontakt-ID erforderlich' },
        { status: 400 }
      );
    }
    
    // Prüfe ob Kontakt existiert
    const existingContact = await prisma.contact.findUnique({
      where: { id },
    });
    
    if (!existingContact) {
      return NextResponse.json(
        { error: 'Kontakt nicht gefunden' },
        { status: 404 }
      );
    }
    
    // Kontakt löschen
    await deleteContact(id);
    
    // Nachrichten-Verknüpfungen entfernen (contactId auf null setzen)
    await prisma.message.updateMany({
      where: { contactId: id },
      data: { contactId: null },
    });
    
    return NextResponse.json({
      deleted: true,
      id,
    });
    
  } catch (error) {
    console.error('Kontakt löschen fehlgeschlagen:', error);
    return NextResponse.json(
      { error: 'Kontakt konnte nicht gelöscht werden' },
      { status: 500 }
    );
  }
}
