// ============================================
// rows/route.ts - API Route für Dataset-Rows
// 
// Zweck: Rows hinzufügen (Upload, Einzeln)
// Verwendet von: DatasetUploader, Synthetic Generator
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// --------------------------------------------
// POST - Rows zu Dataset hinzufügen
// Unterstützt einzelne Rows und Batch-Upload
// --------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: datasetId } = await params;
    const body = await request.json();

    // Prüfen ob Dataset existiert
    const dataset = await prisma.dataset.findUnique({
      where: { id: datasetId },
    });

    if (!dataset) {
      return NextResponse.json(
        { error: 'Dataset nicht gefunden' },
        { status: 404 }
      );
    }

    // Rows aus Body extrahieren (einzeln oder Array)
    const rows = Array.isArray(body.rows) ? body.rows : [body];

    // Validierung basierend auf Dataset-Typ
    const validatedRows = [];
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowErrors = validateRow(row, dataset.type, i);
      
      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else {
        validatedRows.push({
          datasetId,
          input: row.input,
          output: row.output || null,
          chosenOutput: row.chosenOutput || null,
          rejectedOutput: row.rejectedOutput || null,
          label: row.label || null,
          isGolden: row.isGolden || false,
          isSynthetic: row.isSynthetic || false,
          qualityScore: row.qualityScore || null,
          metadata: row.metadata ? JSON.stringify(row.metadata) : null,
        });
      }
    }

    // Wenn Fehler, diese zurückgeben
    if (errors.length > 0 && validatedRows.length === 0) {
      return NextResponse.json(
        { error: 'Validierungsfehler', details: errors },
        { status: 400 }
      );
    }

    // Rows in Batches erstellen (für große Uploads)
    const BATCH_SIZE = 100;
    let createdCount = 0;

    for (let i = 0; i < validatedRows.length; i += BATCH_SIZE) {
      const batch = validatedRows.slice(i, i + BATCH_SIZE);
      const result = await prisma.datasetRow.createMany({
        data: batch,
      });
      createdCount += result.count;
    }

    // Row-Count im Dataset aktualisieren
    const newRowCount = await prisma.datasetRow.count({
      where: { datasetId },
    });

    await prisma.dataset.update({
      where: { id: datasetId },
      data: {
        rowCount: newRowCount,
        // Status auf "ready" setzen wenn Rows vorhanden
        status: newRowCount > 0 ? 'ready' : 'draft',
      },
    });

    return NextResponse.json({
      success: true,
      created: createdCount,
      errors: errors.length > 0 ? errors : undefined,
      totalRows: newRowCount,
    });
  } catch (error) {
    console.error('Fehler beim Hinzufügen von Rows:', error);
    return NextResponse.json(
      { error: 'Fehler beim Hinzufügen von Rows' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// DELETE - Alle Rows eines Datasets löschen
// --------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: datasetId } = await params;

    // Prüfen ob Dataset existiert
    const dataset = await prisma.dataset.findUnique({
      where: { id: datasetId },
    });

    if (!dataset) {
      return NextResponse.json(
        { error: 'Dataset nicht gefunden' },
        { status: 404 }
      );
    }

    // Alle Rows löschen
    const result = await prisma.datasetRow.deleteMany({
      where: { datasetId },
    });

    // Row-Count aktualisieren
    await prisma.dataset.update({
      where: { id: datasetId },
      data: {
        rowCount: 0,
        status: 'draft',
      },
    });

    return NextResponse.json({
      success: true,
      deleted: result.count,
    });
  } catch (error) {
    console.error('Fehler beim Löschen der Rows:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen der Rows' },
      { status: 500 }
    );
  }
}

// --------------------------------------------
// Hilfsfunktion: Row validieren
// --------------------------------------------

function validateRow(
  row: Record<string, unknown>,
  datasetType: string,
  index: number
): string[] {
  const errors: string[] = [];

  // Input ist immer erforderlich
  if (!row.input || typeof row.input !== 'string') {
    errors.push(`Row ${index}: Input ist erforderlich`);
  }

  // Typ-spezifische Validierung
  switch (datasetType) {
    case 'sft':
      if (!row.output || typeof row.output !== 'string') {
        errors.push(`Row ${index}: Output ist für SFT-Datasets erforderlich`);
      }
      break;

    case 'dpo':
      if (!row.chosenOutput || typeof row.chosenOutput !== 'string') {
        errors.push(`Row ${index}: chosenOutput ist für DPO-Datasets erforderlich`);
      }
      if (!row.rejectedOutput || typeof row.rejectedOutput !== 'string') {
        errors.push(`Row ${index}: rejectedOutput ist für DPO-Datasets erforderlich`);
      }
      break;

    case 'classification':
      if (!row.label || typeof row.label !== 'string') {
        errors.push(`Row ${index}: Label ist für Classification-Datasets erforderlich`);
      }
      break;
  }

  return errors;
}








