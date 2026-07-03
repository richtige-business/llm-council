// ============================================
// seed.ts - Datenbank-Seed für LifeOS
// 
// Zweck: Erstellt einen Default-User (Single-User Setup)
// Ausführung: npx prisma db seed
// ============================================

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';
import { DEFAULT_BUILDER_PROMPT_SUGGESTIONS } from '../src/lib/lab/prompt-suggestions';

// --------------------------------------------
// Prisma Client mit pg-Adapter erstellen
// (gleiche Konfiguration wie in src/lib/db/prisma.ts)
// --------------------------------------------

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// --------------------------------------------
// Default-User erstellen
// LifeOS ist aktuell ein Single-User System
// --------------------------------------------

async function main() {
  console.log('🌱 Seeding Datenbank...');
  
  // Default-User anlegen (oder vorhandenen finden)
  const user = await prisma.user.upsert({
    where: { id: 'default-user' },
    update: {},
    create: {
      id: 'default-user',
      name: 'User',
      status: 'online',
      timezone: 'Europe/Berlin',
      language: 'de',
    },
  });
  
  console.log(`✅ Default-User erstellt: ${user.id} (${user.name})`);
  
  // Default-Präferenzen setzen
  const defaultPreferences = [
    { domain: 'communication', key: 'language', value: 'de' },
    { domain: 'scheduling', key: 'default_meeting_duration', value: 30 },
    { domain: 'agent', key: 'proactive_mode', value: false },
  ];
  
  for (const pref of defaultPreferences) {
    await prisma.userPreference.upsert({
      where: {
        userId_domain_key: {
          userId: user.id,
          domain: pref.domain,
          key: pref.key,
        },
      },
      update: {},
      create: {
        userId: user.id,
        domain: pref.domain,
        key: pref.key,
        value: pref.value,
      },
    });
  }
  
  console.log(`✅ ${defaultPreferences.length} Default-Präferenzen gesetzt`);

  // Builder-Prompt-Vorschlaege (20-30 Eintraege)
  await prisma.builderPromptSuggestion.createMany({
    data: DEFAULT_BUILDER_PROMPT_SUGGESTIONS.map((item) => ({
      text: item.text,
      category: item.category,
      isActive: true,
    })),
    skipDuplicates: true,
  });

  const suggestionsCount = await prisma.builderPromptSuggestion.count({
    where: { isActive: true },
  });
  console.log(`✅ Builder Prompt-Vorschläge verfügbar: ${suggestionsCount}`);

  console.log('🌱 Seeding abgeschlossen!');
}

main()
  .catch((e) => {
    console.error('❌ Seed-Fehler:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
