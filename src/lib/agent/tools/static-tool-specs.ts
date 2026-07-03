// ============================================
// static-tool-specs.ts - Statische Tool-Spec Typen
//
// Zweck: Teilt wiederverwendbare Tool-Metadaten zwischen
//        Registry-Definitionen und Client-Katalog
// Verwendet von: builder-tool-specs, agents-tool-specs, Tool-Katalog
// ============================================

import type { ToolEffect, ToolParameterSchema } from '@/lib/agent/types';

// --------------------------------------------
// Statische Tool-Spec
// Enthält alle Metadaten außer Execute-Logik.
// --------------------------------------------

export interface StaticToolSpec {
  id: string;
  name: string;
  description: string;
  module: string;
  inputSchema: ToolParameterSchema;
  effects: ToolEffect[];
  requiresConfirmation: boolean;
  isIdempotent: boolean;
}

