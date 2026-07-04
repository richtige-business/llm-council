// ============================================
// prisma.ts - Prisma Client Singleton
// 
// Zweck: Stellt eine einzige Prisma-Instanz für die gesamte App bereit
//        Verhindert zu viele Datenbankverbindungen in Development
// Verwendet von: Allen API Routes und Server-Komponenten
// ============================================

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// --------------------------------------------
// Globale Variable für Development
// In Development wird der Server oft neugestartet,
// das würde ohne Singleton zu vielen Verbindungen führen
// --------------------------------------------

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// --------------------------------------------
// PostgreSQL Pool erstellen
// --------------------------------------------

const pool = globalForPrisma.pool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
});

// --------------------------------------------
// Prisma Adapter für PostgreSQL
// --------------------------------------------

const adapter = new PrismaPg(pool);

// --------------------------------------------
// Prisma Client erstellen oder wiederverwenden
// In Production: Neue Instanz erstellen
// In Development: Existierende Instanz wiederverwenden
// --------------------------------------------

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    // Logging nur in Development aktivieren
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  });

// In Development die Instanz global speichern
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}

// Default Export für einfacheren Import
export default prisma;




