// ============================================
// init-server.ts - Agent System Initialisierung (Server-Side Only)
// 
// Zweck: Initialisiert Tool Registry mit Server-Only Modulen
// Verwendet von: API Route (nur Server-Side!)
// 
// WICHTIG: Diese Datei DARF NICHT in Client-Komponenten importiert werden!
// ============================================

import { toolRegistry } from './registry/tool-registry';
import { createLogger } from '@/lib/logger';

// Module Tools (Server-Only wegen Prisma/Nodemailer)
import { appModuleTools } from './tools/app-module-tools';
import { memoryModuleTools } from './tools/memory-tools';
import { labDebugTools } from './tools/lab-debug-tools';
import { labModuleTools } from './tools/lab-module-tools';
import { agentsModuleTools } from './tools/agents-module-tools';
import { settingsModuleTools } from './tools/settings-module-tools';
import { marketplaceModuleTools } from './tools/marketplace-module-tools';

const log = createLogger('ToolRegistry');

// --------------------------------------------
// Tool Registry Initialisierung (Server-Side)
// Wird in der API-Route aufgerufen
// --------------------------------------------

let toolRegistryInitialized = false;

export function initializeToolRegistry(): void {
  if (toolRegistryInitialized) {
    log.debug('Tool Registry bereits initialisiert');
    return;
  }
  
  log.info('Initialisiere Tool Registry (Server)...');
  
  // App Tools registrieren
  toolRegistry.register(appModuleTools);
  
  // Memory Tools registrieren (für Intelligence Agent / Master)
  toolRegistry.register(memoryModuleTools);

  // Lab Tools registrieren (Builder + Debugging)
  toolRegistry.register(labModuleTools);
  toolRegistry.register(labDebugTools);

  // Agents / Settings / Marketplace Tools registrieren
  toolRegistry.register(agentsModuleTools);
  toolRegistry.register(settingsModuleTools);
  toolRegistry.register(marketplaceModuleTools);
  
  toolRegistryInitialized = true;
  toolRegistry.markInitialized();
  
  log.info(`Tool Registry initialisiert mit ${toolRegistry.size} Tools`);
}

// --------------------------------------------
// Reset Functions (für Tests)
// --------------------------------------------

export function resetToolRegistry(): void {
  toolRegistry.clear();
  toolRegistryInitialized = false;
}
