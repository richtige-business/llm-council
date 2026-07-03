// ============================================
// route.ts - Database Explorer API
// 
// Zweck: Liest Tabellen, Spalten und Daten aus der DB
//        Tabellen sind nach Modulen gruppiert, damit jeder
//        Modul-Agent weiß wo seine Daten liegen
// Verwendet von: /profile/database Seite, Modul-Agents
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { MODULE_TABLE_GROUPS, buildAllTablesLookup } from '@/lib/database/module-table-groups';

// Flaches Lookup: key → displayName (für Rows-Endpoint)
const ALL_TABLES = buildAllTablesLookup();

// --------------------------------------------
// GET /api/database
// ?action=tables → Module-gruppierte Tabellen mit Zeilenanzahl
// ?action=rows&table=user&page=1&limit=50 → Zeilen einer Tabelle
// --------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'tables';
    
    // ========================================
    // Tabellen-Übersicht gruppiert nach Modul
    // ========================================
    if (action === 'tables') {
      const result = [];
      
      for (const group of MODULE_TABLE_GROUPS) {
        const tablesWithCounts = [];
        let groupTotal = 0;
        
        for (const table of group.tables) {
          try {
            // Prisma dynamischer Zugriff: prisma[modelName].count()
            const modelName = table.key as keyof typeof prisma;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const count = await (prisma[modelName] as any)?.count?.() ?? 0;
            tablesWithCounts.push({
              name: table.key.toLowerCase(),
              displayName: table.displayName,
              rowCount: count,
            });
            groupTotal += count;
          } catch {
            tablesWithCounts.push({
              name: table.key.toLowerCase(),
              displayName: table.displayName,
              rowCount: 0,
            });
          }
        }
        
        result.push({
          moduleId: group.moduleId,
          label: group.label,
          icon: group.icon,
          color: group.color,
          tables: tablesWithCounts,
          totalRows: groupTotal,
        });
      }
      
      return NextResponse.json({ success: true, data: result });
    }
    
    // ========================================
    // Zeilen einer Tabelle laden
    // ========================================
    if (action === 'rows') {
      const tableName = searchParams.get('table')?.toLowerCase();
      const page = parseInt(searchParams.get('page') || '1');
      const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
      const skip = (page - 1) * limit;
      
      if (!tableName || !ALL_TABLES[tableName]) {
        return NextResponse.json(
          { success: false, error: `Tabelle "${tableName}" nicht gefunden` },
          { status: 400 }
        );
      }
      
      // Finde den originalen camelCase-Key für Prisma
      let prismaKey = tableName;
      for (const group of MODULE_TABLE_GROUPS) {
        for (const table of group.tables) {
          if (table.key.toLowerCase() === tableName) {
            prismaKey = table.key;
            break;
          }
        }
      }
      
      const modelName = prismaKey as keyof typeof prisma;
      
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const model = prisma[modelName] as any;
        
        const [rows, totalCount] = await Promise.all([
          model.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }).catch(() =>
            // Falls kein createdAt-Feld existiert, ohne Sortierung laden
            model.findMany({ skip, take: limit })
          ),
          model.count(),
        ]);
        
        // Spalten-Namen aus dem ersten Eintrag extrahieren
        const columns = rows.length > 0 
          ? Object.keys(rows[0]) 
          : [];
        
        return NextResponse.json({
          success: true,
          data: {
            table: ALL_TABLES[tableName],
            columns,
            rows,
            pagination: {
              page,
              limit,
              totalCount,
              totalPages: Math.ceil(totalCount / limit),
            },
          },
        });
      } catch (error) {
        console.error(`Fehler beim Laden von ${tableName}:`, error);
        return NextResponse.json(
          { success: false, error: `Tabelle konnte nicht geladen werden` },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Ungültige action. Verwende "tables" oder "rows".' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Database Explorer Fehler:', error);
    return NextResponse.json(
      { success: false, error: 'Datenbankfehler' },
      { status: 500 }
    );
  }
}
