// ============================================
// builder-tool-specs.ts - Tool-Specs fuer Builder/Lab
//
// Zweck: Definiert die vollstaendige Builder-Tool-Matrix
// Verwendet von: lab-module-tools, tool-scope, client-tool-catalog
// ============================================

import type { StaticToolSpec } from './static-tool-specs';

// --------------------------------------------
// Schema-Helfer
// Halten die Spezifikation kompakt und konsistent.
// --------------------------------------------

const emptySchema = {
  type: 'object',
  properties: {},
  required: [],
} as const;

const projectIdProperty = {
  type: 'string',
  description: 'Builder-Projekt-ID',
} as const;

const filePathProperty = {
  type: 'string',
  description: 'Relativer Datei-Pfad im Projekt',
} as const;

function withRequiredProperties(
  properties: Record<string, { type: 'string' | 'number' | 'boolean' | 'array' | 'object'; description: string; enum?: string[]; items?: { type: string } }>,
  required: string[] = []
) {
  return {
    type: 'object' as const,
    properties,
    required,
  };
}

function spec(input: StaticToolSpec): StaticToolSpec {
  return input;
}

// --------------------------------------------
// Builder-Tool-Specs
// Entspricht der besprochenen V1/V2-Tool-Matrix.
// --------------------------------------------

export const BUILDER_TOOL_SPECS: StaticToolSpec[] = [
  // A) Projekt- und Session-Tools
  spec({
    id: 'builder.project.create',
    name: 'Builder-Projekt erstellen',
    description: 'Erstellt ein neues Builder-Projekt.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      name: { type: 'string', description: 'Projektname' },
      description: { type: 'string', description: 'Projektbeschreibung' },
    }, ['name']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: false,
  }),
  spec({
    id: 'builder.project.list',
    name: 'Builder-Projekte auflisten',
    description: 'Listet vorhandene Builder-Projekte auf.',
    module: 'lab',
    inputSchema: emptySchema,
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.project.get',
    name: 'Builder-Projekt laden',
    description: 'Lädt Details eines Builder-Projekts.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
    }, ['projectId']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.project.updateMeta',
    name: 'Builder-Projekt-Metadaten aktualisieren',
    description: 'Aktualisiert Name, Beschreibung oder Modul-Metadaten.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      name: { type: 'string', description: 'Optional neuer Projektname' },
      description: { type: 'string', description: 'Optional neue Beschreibung' },
      icon: { type: 'string', description: 'Optional neues Icon' },
      category: { type: 'string', description: 'Optionale Modul-Kategorie' },
    }, ['projectId']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.project.duplicate',
    name: 'Builder-Projekt duplizieren',
    description: 'Erstellt eine Kopie eines Builder-Projekts.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
    }, ['projectId']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: false,
  }),
  spec({
    id: 'builder.project.archive',
    name: 'Builder-Projekt archivieren',
    description: 'Archiviert ein Projekt, ohne es hart zu löschen.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
    }, ['projectId']),
    effects: ['storage'],
    requiresConfirmation: true,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.project.delete',
    name: 'Builder-Projekt löschen',
    description: 'Löscht ein Projekt nach Bestätigung und optionalem Backup.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      createBackup: { type: 'boolean', description: 'Vor dem Löschen Snapshot erstellen?' },
    }, ['projectId']),
    effects: ['storage'],
    requiresConfirmation: true,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.session.setMode',
    name: 'Builder-Session-Modus setzen',
    description: 'Setzt den Builder-Modus auf build, discuss oder pro.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      mode: { type: 'string', description: 'Zielmodus', enum: ['build', 'discuss', 'pro'] },
    }, ['projectId', 'mode']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),

  // B) Prompt / Ideation
  spec({
    id: 'builder.prompt.suggest',
    name: 'Builder-Prompt vorschlagen',
    description: 'Erstellt einen verbesserten oder strukturierten Builder-Prompt.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      goal: { type: 'string', description: 'Ziel oder Idee' },
    }, ['projectId', 'goal']),
    effects: ['network'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.prompt.submit',
    name: 'Builder-Prompt einreichen',
    description: 'Reicht einen Prompt in der aktuellen Session ein.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      prompt: { type: 'string', description: 'Prompt-Inhalt' },
    }, ['projectId', 'prompt']),
    effects: ['storage', 'network'],
    requiresConfirmation: false,
    isIdempotent: false,
  }),
  spec({
    id: 'builder.prompt.refine',
    name: 'Builder-Prompt verfeinern',
    description: 'Verfeinert einen bestehenden Prompt mit Zusatzhinweisen.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      prompt: { type: 'string', description: 'Ausgangs-Prompt' },
      instruction: { type: 'string', description: 'Zusätzliche Verfeinerung' },
    }, ['projectId', 'prompt', 'instruction']),
    effects: ['network'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.prompt.attachBaseContext',
    name: 'Base-Kontext anhängen',
    description: 'Bindet bestehenden oder neuen Base-Kontext an die Session.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      baseId: { type: 'string', description: 'Base-ID oder neue Base-Kennung' },
      source: { type: 'string', description: 'Quelle der Base', enum: ['existing', 'new'] },
    }, ['projectId', 'baseId', 'source']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),

  // C) Codegen / Patch
  spec({
    id: 'builder.generate.run',
    name: 'Builder-Generierung starten',
    description: 'Startet Code-Generierung im Build- oder Discuss-Modus.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      prompt: { type: 'string', description: 'Build- oder Discuss-Prompt' },
      mode: { type: 'string', description: 'Generierungsmodus', enum: ['build', 'discuss'] },
    }, ['projectId', 'prompt', 'mode']),
    effects: ['storage', 'network'],
    requiresConfirmation: false,
    isIdempotent: false,
  }),
  spec({
    id: 'builder.generate.retryWithRepair',
    name: 'Builder-Generierung reparierend wiederholen',
    description: 'Wiederholt einen Build unter Berücksichtigung der letzten Fehler.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      repairInstruction: { type: 'string', description: 'Zusätzlicher Reparaturhinweis' },
    }, ['projectId']),
    effects: ['storage', 'network'],
    requiresConfirmation: false,
    isIdempotent: false,
  }),
  spec({
    id: 'builder.files.list',
    name: 'Builder-Dateien auflisten',
    description: 'Listet alle Dateien im Builder-Projekt auf.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
    }, ['projectId']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.file.get',
    name: 'Builder-Datei lesen',
    description: 'Liest den Inhalt einer Projektdatei.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      path: filePathProperty,
    }, ['projectId', 'path']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.file.set',
    name: 'Builder-Datei setzen',
    description: 'Ersetzt den vollständigen Inhalt einer Datei.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      path: filePathProperty,
      content: { type: 'string', description: 'Neuer vollständiger Dateiinhalt' },
    }, ['projectId', 'path', 'content']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.file.patch',
    name: 'Builder-Datei patchen',
    description: 'Patcht eine Datei via Search/Replace-Operation.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      path: filePathProperty,
      search: { type: 'string', description: 'Suchstring' },
      replace: { type: 'string', description: 'Ersetzung' },
    }, ['projectId', 'path', 'search', 'replace']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: false,
  }),
  spec({
    id: 'builder.file.rename',
    name: 'Builder-Datei umbenennen',
    description: 'Benennt eine Datei um.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      fromPath: { type: 'string', description: 'Alter Pfad' },
      toPath: { type: 'string', description: 'Neuer Pfad' },
    }, ['projectId', 'fromPath', 'toPath']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.file.move',
    name: 'Builder-Datei verschieben',
    description: 'Verschiebt eine Datei in einen anderen Ordner.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      fromPath: { type: 'string', description: 'Quellpfad' },
      toPath: { type: 'string', description: 'Zielpfad' },
    }, ['projectId', 'fromPath', 'toPath']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.file.create',
    name: 'Builder-Datei erstellen',
    description: 'Erstellt eine neue Datei im Projekt.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      path: filePathProperty,
      content: { type: 'string', description: 'Initialer Inhalt' },
    }, ['projectId', 'path']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: false,
  }),
  spec({
    id: 'builder.file.delete',
    name: 'Builder-Datei löschen',
    description: 'Löscht eine Datei aus dem Projekt.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      path: filePathProperty,
    }, ['projectId', 'path']),
    effects: ['storage'],
    requiresConfirmation: true,
    isIdempotent: true,
  }),

  // D) Qualität / Validation / Debug
  spec({
    id: 'builder.validate.contract',
    name: 'Builder-Contract validieren',
    description: 'Prüft App.tsx, module.json und Grundstruktur.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
    }, ['projectId']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.validate.compile',
    name: 'Builder-Compile validieren',
    description: 'Führt einen Compile-/Type-Check für das Projekt aus.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
    }, ['projectId']),
    effects: ['storage', 'network'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.validate.uiQuality',
    name: 'Builder-UI-Qualität validieren',
    description: 'Prüft Layout, Klarheit und UI-Grundqualität.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
    }, ['projectId']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.validate.lucideImports',
    name: 'Builder-Lucide-Imports validieren',
    description: 'Prüft, ob nur gültige Lucide-Icons verwendet werden.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
    }, ['projectId']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.preview.render',
    name: 'Builder-Preview rendern',
    description: 'Rendert eine Vorschau für das aktuelle Modul.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
    }, ['projectId']),
    effects: ['ui'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.debug.runCommand',
    name: 'Builder-Debug-Command ausführen',
    description: 'Führt erlaubte Debug-Befehle im Builder-Kontext aus.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      command: { type: 'string', description: 'Befehl (z. B. rg, ls, npm)' },
      args: { type: 'array', description: 'Argumente', items: { type: 'string' } },
      cwd: { type: 'string', description: 'Optionales Arbeitsverzeichnis' },
      confirmMutating: { type: 'boolean', description: 'Bestätigung für mutierende Befehle' },
    }, ['command']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: false,
  }),
  spec({
    id: 'builder.debug.captureErrors',
    name: 'Builder-Fehler erfassen',
    description: 'Sammelt strukturierte Preview-/Build-Fehler.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
    }, ['projectId']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),

  // E) Modul-API / Orchestrierungsdefinition
  spec({
    id: 'builder.module.setManifest',
    name: 'Builder-Manifest setzen',
    description: 'Setzt zentrale Manifest-Felder des Moduls.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      manifest: { type: 'object', description: 'Manifest-Felder als Objekt' },
    }, ['projectId', 'manifest']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.module.setEntry',
    name: 'Builder-Entry setzen',
    description: 'Setzt den Entry-Point des Moduls.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      entryPath: { type: 'string', description: 'Entry-Datei' },
    }, ['projectId', 'entryPath']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.module.setPermissions',
    name: 'Builder-Permissions setzen',
    description: 'Setzt Berechtigungen des Moduls.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      permissions: { type: 'array', description: 'Liste von Permissions', items: { type: 'string' } },
    }, ['projectId', 'permissions']),
    effects: ['storage'],
    requiresConfirmation: true,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.module.tool.add',
    name: 'Builder-Modul-Tool hinzufügen',
    description: 'Fügt der Modul-API ein neues Tool hinzu.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      tool: { type: 'object', description: 'Tool-Definition' },
    }, ['projectId', 'tool']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: false,
  }),
  spec({
    id: 'builder.module.tool.update',
    name: 'Builder-Modul-Tool aktualisieren',
    description: 'Aktualisiert eine bestehende Tool-Definition.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      toolId: { type: 'string', description: 'Tool-ID' },
      updates: { type: 'object', description: 'Zu ändernde Felder' },
    }, ['projectId', 'toolId', 'updates']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.module.tool.remove',
    name: 'Builder-Modul-Tool entfernen',
    description: 'Entfernt eine Tool-Definition aus dem Modul.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      toolId: { type: 'string', description: 'Tool-ID' },
    }, ['projectId', 'toolId']),
    effects: ['storage'],
    requiresConfirmation: true,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.module.event.add',
    name: 'Builder-Event hinzufügen',
    description: 'Fügt ein Modul-Event hinzu.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      event: { type: 'object', description: 'Event-Definition' },
    }, ['projectId', 'event']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: false,
  }),
  spec({
    id: 'builder.module.event.update',
    name: 'Builder-Event aktualisieren',
    description: 'Aktualisiert ein bestehendes Modul-Event.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      eventId: { type: 'string', description: 'Event-ID' },
      updates: { type: 'object', description: 'Zu ändernde Felder' },
    }, ['projectId', 'eventId', 'updates']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.module.event.remove',
    name: 'Builder-Event entfernen',
    description: 'Entfernt ein Modul-Event.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      eventId: { type: 'string', description: 'Event-ID' },
    }, ['projectId', 'eventId']),
    effects: ['storage'],
    requiresConfirmation: true,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.module.customPrompt.set',
    name: 'Builder-Custom-Prompt setzen',
    description: 'Setzt den projektspezifischen Custom-Prompt.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      systemPrompt: { type: 'string', description: 'Custom System Prompt' },
      constraints: { type: 'array', description: 'Constraints', items: { type: 'string' } },
      examples: { type: 'array', description: 'Beispiele', items: { type: 'string' } },
    }, ['projectId']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.module.apiKey.add',
    name: 'Builder-API-Key hinzufügen',
    description: 'Fügt eine API-Key-Konfiguration hinzu.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      service: { type: 'string', description: 'Service-ID' },
      name: { type: 'string', description: 'Anzeigename' },
    }, ['projectId', 'service', 'name']),
    effects: ['storage'],
    requiresConfirmation: true,
    isIdempotent: false,
  }),
  spec({
    id: 'builder.module.apiKey.update',
    name: 'Builder-API-Key aktualisieren',
    description: 'Aktualisiert eine API-Key-Konfiguration.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      keyId: { type: 'string', description: 'API-Key-ID' },
      updates: { type: 'object', description: 'Zu ändernde Felder' },
    }, ['projectId', 'keyId', 'updates']),
    effects: ['storage'],
    requiresConfirmation: true,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.module.apiKey.remove',
    name: 'Builder-API-Key entfernen',
    description: 'Entfernt eine API-Key-Konfiguration.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      keyId: { type: 'string', description: 'API-Key-ID' },
    }, ['projectId', 'keyId']),
    effects: ['storage'],
    requiresConfirmation: true,
    isIdempotent: true,
  }),

  // F) Aktivierung / Publishing / Distribution
  spec({
    id: 'builder.module.activate',
    name: 'Builder-Modul aktivieren',
    description: 'Schreibt das Modul in src/modules und aktiviert es lokal.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
    }, ['projectId']),
    effects: ['storage', 'ui', 'network'],
    requiresConfirmation: true,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.module.publish',
    name: 'Builder-Modul publizieren',
    description: 'Publiziert das Modul mit Sichtbarkeit private oder public.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      visibility: { type: 'string', description: 'Sichtbarkeit', enum: ['private', 'public'] },
    }, ['projectId', 'visibility']),
    effects: ['storage', 'network', 'ui'],
    requiresConfirmation: true,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.module.unpublish',
    name: 'Builder-Modul entpublizieren',
    description: 'Nimmt ein Modul aus dem Publishing-Zustand heraus.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
    }, ['projectId']),
    effects: ['storage', 'network'],
    requiresConfirmation: true,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.module.deactivate',
    name: 'Builder-Modul deaktivieren',
    description: 'Deaktiviert ein Modul bevorzugt als Soft-Deactivation.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
    }, ['projectId']),
    effects: ['storage', 'ui'],
    requiresConfirmation: true,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.module.rollbackToSnapshot',
    name: 'Builder-Rollback auf Snapshot',
    description: 'Setzt das Projekt auf einen früheren Snapshot zurück.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      snapshotId: { type: 'string', description: 'Snapshot-ID' },
    }, ['projectId', 'snapshotId']),
    effects: ['storage'],
    requiresConfirmation: true,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.registry.refresh',
    name: 'Builder-Registry aktualisieren',
    description: 'Aktualisiert die Modul-Registry nach Aktivierung oder Publish.',
    module: 'lab',
    inputSchema: emptySchema,
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.module.exportZip',
    name: 'Builder-Modul als ZIP exportieren',
    description: 'Exportiert das Projekt als ZIP-Datei.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
    }, ['projectId']),
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),

  // G) Governance / Audit
  spec({
    id: 'builder.audit.list',
    name: 'Builder-Audit-Liste',
    description: 'Listet Audit-Einträge und letzte kritische Aktionen auf.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
    }, ['projectId']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.audit.getActionDiff',
    name: 'Builder-Audit-Diff laden',
    description: 'Lädt den Diff eines Audit-Eintrags oder Snapshots.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      auditId: { type: 'string', description: 'Audit-ID' },
    }, ['projectId', 'auditId']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'builder.backup.createSnapshot',
    name: 'Builder-Snapshot erstellen',
    description: 'Erstellt einen Backup-Snapshot des Projekts.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      label: { type: 'string', description: 'Optionaler Snapshot-Name' },
    }, ['projectId']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: false,
  }),
  spec({
    id: 'builder.backup.restoreSnapshot',
    name: 'Builder-Snapshot wiederherstellen',
    description: 'Stellt einen gespeicherten Snapshot wieder her.',
    module: 'lab',
    inputSchema: withRequiredProperties({
      projectId: projectIdProperty,
      snapshotId: { type: 'string', description: 'Snapshot-ID' },
    }, ['projectId', 'snapshotId']),
    effects: ['storage'],
    requiresConfirmation: true,
    isIdempotent: true,
  }),
];

