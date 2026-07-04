// ============================================
// init.ts - Agent System Initialisierung (Client-Side)
// 
// Zweck: Initialisiert Action Registry für Frontend
// Verwendet von: useAgentExecutor
// 
// HINWEIS: Tool Registry wird in init-server.ts initialisiert
//          (nur in der API-Route, da Server-Only-Module)
// ============================================

'use client';

import { actionRegistry } from './registry/action-registry';

// --------------------------------------------
// Action Registry Initialisierung (Client-Side)
// Wird in useAgentExecutor oder App-Komponente aufgerufen
// --------------------------------------------

let actionRegistryInitialized = false;

export function initializeActionRegistry(): void {
  if (actionRegistryInitialized) {
    console.log('Action Registry bereits initialisiert');
    return;
  }
  
  // Dynamischer Import für Client-Side Module
  // Diese haben 'use client' Direktive
  console.log('🎬 Initialisiere Action Registry...');
  
  // Hinweis: Handler werden in useAgentExecutor registriert,
  // da sie Zustand-Store-Zugriff benötigen
  
  actionRegistryInitialized = true;
  
  console.log('✅ Action Registry initialisiert');
}

// --------------------------------------------
// Reset Functions (für Tests)
// --------------------------------------------

export function resetActionRegistry(): void {
  actionRegistry.clear();
  actionRegistryInitialized = false;
}
