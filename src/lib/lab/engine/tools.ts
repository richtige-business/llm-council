// ============================================
// LifeOS Module Builder - Tool Definitions
// 
// Zweck: Definiert die Tools die der AI-Agent
//        aufrufen kann (Claude Tool Use)
// Verwendet von: Generate API Route
// ============================================

import type { BuilderTool, ToolResult, ModuleContract, ModuleFile } from './types';
import { 
  generateModuleJson,
  generateTypesFile,
  generateStoreFile,
  generateToolsFile,
  generateIndexFile,
  generateConstantsFile,
  validateModuleContract,
} from './contract';

// --------------------------------------------
// Tool: create_module
// Erstellt ein vollständiges LifeOS Modul
// --------------------------------------------

export const CREATE_MODULE_TOOL: BuilderTool = {
  name: 'create_module',
  description: `Erstellt ein vollständiges LifeOS Modul mit allen benötigten Dateien.
  
WICHTIG: Dieses Tool MUSS aufgerufen werden wenn ein User ein Modul beschreibt!
Generiere ALLE Dateien in einem Aufruf. Keine Platzhalter, nur vollständiger Code.`,
  parameters: {
    moduleInfo: {
      type: 'object',
      description: 'Metadaten des Moduls',
      properties: {
        id: { type: 'string', description: 'Eindeutige ID (kebab-case, z.B. "habit-tracker")' },
        name: { type: 'string', description: 'Anzeigename (z.B. "Habit Tracker")' },
        description: { type: 'string', description: 'Kurzbeschreibung des Moduls' },
        version: { type: 'string', description: 'Semantic Version (z.B. "1.0.0")' },
        category: { 
          type: 'string', 
          description: 'Kategorie',
          enum: ['productivity', 'health', 'finance', 'social', 'education', 'entertainment', 'utility', 'custom'],
        },
        icon: { type: 'string', description: 'Lucide Icon Name (z.B. "CheckSquare")' },
      },
    },
    files: {
      type: 'array',
      description: 'Array aller Modul-Dateien',
      items: {
        type: 'object',
        description: 'Eine Modul-Datei',
        properties: {
          path: { type: 'string', description: 'Relativer Pfad (z.B. "components/TodoPage.tsx")' },
          content: { type: 'string', description: 'Vollständiger Dateiinhalt' },
        },
      },
    },
    tools: {
      type: 'array',
      description: 'Agent-Tools für das Modul',
      items: {
        type: 'object',
        description: 'Ein Agent-Tool',
        properties: {
          id: { type: 'string', description: 'Tool-ID' },
          name: { type: 'string', description: 'Tool-Name (snake_case)' },
          description: { type: 'string', description: 'Was macht das Tool?' },
          category: { type: 'string', description: 'Kategorie (read, write, update, delete)', enum: ['read', 'write', 'update', 'delete'] },
          parameters: { type: 'array', description: 'Parameter-Liste' },
          returns: { type: 'string', description: 'Rückgabewert-Beschreibung' },
          implementation: { type: 'string', description: 'JavaScript-Code' },
          examples: { type: 'array', description: 'Beispiel-Anfragen' },
        },
      },
    },
    systemPrompt: {
      type: 'object',
      description: 'System Prompt für AI-Agents',
      properties: {
        description: { type: 'string', description: 'Modul-Beschreibung für Agents' },
        capabilities: { type: 'array', description: 'Was kann das Modul?' },
        limitations: { type: 'array', description: 'Einschränkungen' },
        useCases: { type: 'array', description: 'Anwendungsfälle' },
        exampleInteractions: { type: 'array', description: 'Beispiel-Dialoge' },
      },
    },
    widgets: {
      type: 'array',
      description: 'Dashboard-Widgets (optional)',
      items: {
        type: 'object',
        description: 'Ein Widget',
        properties: {
          id: { type: 'string', description: 'Widget-ID' },
          name: { type: 'string', description: 'Widget-Name' },
          description: { type: 'string', description: 'Widget-Beschreibung' },
          size: { type: 'string', description: 'Widget-Größe (small, medium, large)', enum: ['small', 'medium', 'large'] },
          defaultEnabled: { type: 'boolean', description: 'Standardmäßig aktiviert?' },
        },
      },
    },
    events: {
      type: 'array',
      description: 'Event-Definitionen (optional)',
      items: {
        type: 'object',
        description: 'Ein Event',
        properties: {
          name: { type: 'string', description: 'Event-Name (format: module.action.status)' },
          description: { type: 'string', description: 'Event-Beschreibung' },
          payload: { type: 'object', description: 'Payload-Schema' },
          direction: { type: 'string', description: 'Event-Richtung (emit, subscribe, both)', enum: ['emit', 'subscribe', 'both'] },
        },
      },
    },
  },
  required: ['moduleInfo', 'files', 'tools', 'systemPrompt'],
};

// --------------------------------------------
// Tool: edit_file
// Bearbeitet eine einzelne Datei
// --------------------------------------------

export const EDIT_FILE_TOOL: BuilderTool = {
  name: 'edit_file',
  description: `Bearbeitet eine einzelne Datei im Modul.
Verwende dieses Tool für kleine Änderungen an bestehenden Dateien.
Für neue Module oder große Änderungen verwende create_module.`,
  parameters: {
    path: {
      type: 'string',
      description: 'Pfad zur Datei (relativ zum Modul-Root)',
    },
    oldContent: {
      type: 'string',
      description: 'Der zu ersetzende Text (muss exakt übereinstimmen)',
    },
    newContent: {
      type: 'string',
      description: 'Der neue Text',
    },
  },
  required: ['path', 'oldContent', 'newContent'],
};

// --------------------------------------------
// Tool: view_file
// Zeigt eine Datei an
// --------------------------------------------

export const VIEW_FILE_TOOL: BuilderTool = {
  name: 'view_file',
  description: 'Zeigt den Inhalt einer Datei an. Nützlich um den aktuellen Stand zu sehen bevor Änderungen gemacht werden.',
  parameters: {
    path: {
      type: 'string',
      description: 'Pfad zur Datei (relativ zum Modul-Root)',
    },
  },
  required: ['path'],
};

// --------------------------------------------
// Alle Tools für die API
// --------------------------------------------

export const MODULE_BUILDER_TOOLS = [
  CREATE_MODULE_TOOL,
  EDIT_FILE_TOOL,
  VIEW_FILE_TOOL,
];

// --------------------------------------------
// Tool-Konvertierung für Claude API
// --------------------------------------------

export function convertToClaudeTools(tools: BuilderTool[]): unknown[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: 'object',
      properties: tool.parameters,
      required: tool.required,
    },
  }));
}

// --------------------------------------------
// Tool-Ausführung
// --------------------------------------------

export function executeCreateModuleTool(
  input: {
    moduleInfo: Partial<ModuleContract>;
    files: ModuleFile[];
    tools?: ModuleContract['tools'];
    systemPrompt?: ModuleContract['systemPrompt'];
    widgets?: ModuleContract['widgets'];
    events?: ModuleContract['events'];
  },
  existingModule?: Partial<ModuleContract>
): ToolResult {
  try {
    const moduleInfo = input.moduleInfo;
    
    // Validierung
    const validation = validateModuleContract(moduleInfo);
    if (!validation.valid) {
      return {
        success: false,
        error: `Validierung fehlgeschlagen: ${validation.errors.join(', ')}`,
      };
    }
    
    // Standard-Dateien generieren falls nicht vorhanden
    const files: ModuleFile[] = [...input.files];
    const filePaths = files.map(f => f.path);
    
    // module.json automatisch hinzufügen
    if (!filePaths.includes('module.json')) {
      files.unshift({
        path: 'module.json',
        content: generateModuleJson(moduleInfo),
      });
    }
    
    // index.ts automatisch hinzufügen
    if (!filePaths.includes('index.ts')) {
      files.push({
        path: 'index.ts',
        content: generateIndexFile(moduleInfo),
      });
    }
    
    // constants.ts automatisch hinzufügen
    if (!filePaths.includes('constants.ts')) {
      files.push({
        path: 'constants.ts',
        content: generateConstantsFile(moduleInfo),
      });
    }
    
    // Ergebnis zusammenstellen
    return {
      success: true,
      data: {
        moduleInfo: {
          id: moduleInfo.id,
          name: moduleInfo.name,
          description: moduleInfo.description,
          version: moduleInfo.version || '1.0.0',
          category: moduleInfo.category || 'productivity',
          icon: moduleInfo.icon || 'Box',
        },
        files,
        tools: input.tools || [],
        systemPrompt: input.systemPrompt,
        widgets: input.widgets || [],
        events: input.events || [],
        warnings: validation.warnings,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}

export function executeEditFileTool(
  input: {
    path: string;
    oldContent: string;
    newContent: string;
  },
  existingFiles: ModuleFile[]
): ToolResult {
  const file = existingFiles.find(f => f.path === input.path);
  
  if (!file) {
    return {
      success: false,
      error: `Datei nicht gefunden: ${input.path}`,
    };
  }
  
  if (!file.content.includes(input.oldContent)) {
    return {
      success: false,
      error: `Der zu ersetzende Text wurde nicht gefunden. Verwende view_file um den aktuellen Inhalt zu sehen.`,
    };
  }
  
  const occurrences = file.content.split(input.oldContent).length - 1;
  if (occurrences > 1) {
    return {
      success: false,
      error: `Der Text kommt ${occurrences}x vor. Füge mehr Kontext hinzu um ihn eindeutig zu identifizieren.`,
    };
  }
  
  const newContent = file.content.replace(input.oldContent, input.newContent);
  
  return {
    success: true,
    data: {
      path: input.path,
      content: newContent,
    },
  };
}

export function executeViewFileTool(
  input: { path: string },
  existingFiles: ModuleFile[]
): ToolResult {
  const file = existingFiles.find(f => f.path === input.path);
  
  if (!file) {
    return {
      success: false,
      error: `Datei nicht gefunden: ${input.path}`,
    };
  }
  
  return {
    success: true,
    data: {
      path: file.path,
      content: file.content,
    },
  };
}



