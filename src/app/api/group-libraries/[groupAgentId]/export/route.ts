// ============================================
// /api/group-libraries/[groupAgentId]/export - Gruppenexport API
//
// Zweck: Exportiert die Gruppenbibliothek als ZIP-Datei
//        fuer den Download auf den Desktop
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { zipSync, strToU8 } from 'fflate';
import { DEFAULT_USER_ID, getOrCreateDefaultUser } from '@/lib/services/user-service';
import { getGroupLibraryTree } from '@/lib/services/group-library-service';

interface RouteContext {
  params: Promise<{ groupAgentId: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await getOrCreateDefaultUser();
    const { groupAgentId } = await context.params;
    const { library, documents } = await getGroupLibraryTree(DEFAULT_USER_ID, groupAgentId);

    if (!library) {
      return NextResponse.json(
        { success: false, error: 'GROUP_LIBRARY_NOT_FOUND' },
        { status: 404 }
      );
    }

    const zipEntries: Record<string, Uint8Array> = {};
    if (documents.length === 0) {
      zipEntries['README.txt'] = strToU8(
        `Die Gruppenbibliothek "${library.name}" enthaelt aktuell keine Dokumente.`
      );
    } else {
      documents.forEach((document) => {
        const filePath = (document.relativePath || document.name || `document-${document.id}.txt`).replace(/^\/+/, '');
        const content = document.contentBase64
          ? Uint8Array.from(Buffer.from(document.contentBase64, 'base64'))
          : strToU8(document.contentText || '');
        zipEntries[filePath] = content;
      });
    }

    const zip = zipSync(zipEntries, { level: 6 });
    const zipBody = Uint8Array.from(zip);

    return new NextResponse(zipBody, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${library.name.replace(/[^a-zA-Z0-9-_]+/g, '_')}.zip"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'GROUP_LIBRARY_EXPORT_FAILED',
        message: error instanceof Error ? error.message : 'Gruppenbibliothek konnte nicht exportiert werden.',
      },
      { status: 500 }
    );
  }
}
