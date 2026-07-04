// ============================================
// agents-tool-specs.ts - Tool-Specs fuer Agents-Modul
//
// Zweck: Definiert die breite Tool-Matrix fuer Conversations,
//        Gruppen, Councils, Tasks und Agent-Settings
// Verwendet von: agents-module-tools, tool-scope, client-tool-catalog
// ============================================

import type { StaticToolSpec } from './static-tool-specs';

// --------------------------------------------
// Schema-Helfer
// Halten die Tool-Specs trotz grosser Matrix lesbar.
// --------------------------------------------

const emptySchema = {
  type: 'object',
  properties: {},
  required: [],
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

const conversationIdProperty = { type: 'string', description: 'Konversations-ID' } as const;
const messageIdProperty = { type: 'string', description: 'Nachrichten-ID' } as const;
const folderIdProperty = { type: 'string', description: 'Ordner-ID' } as const;
const groupIdProperty = { type: 'string', description: 'Gruppen-ID' } as const;
const agentIdProperty = { type: 'string', description: 'Agent-ID' } as const;
const taskIdProperty = { type: 'string', description: 'Task-ID' } as const;
const councilIdProperty = { type: 'string', description: 'Council ID' } as const;
const seatIdProperty = { type: 'string', description: 'Seat-ID' } as const;

// --------------------------------------------
// Agents-Tool-Specs
// Die IDs folgen der detaillierten Liste aus der Planung.
// --------------------------------------------

export const AGENTS_TOOL_SPECS: StaticToolSpec[] = [
  // A) Conversations & Messages
  spec({
    id: 'agents.conversation.create',
    name: 'Konversation erstellen',
    description: 'Erstellt eine neue Konversation für einen Agenten oder eine Gruppe.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      agentId: agentIdProperty,
      title: { type: 'string', description: 'Optionaler Titel' },
    }, ['agentId']),
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
    isIdempotent: false,
  }),
  spec({
    id: 'agents.conversation.delete',
    name: 'Konversation löschen',
    description: 'Löscht eine Konversation nach Bestätigung.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      conversationId: conversationIdProperty,
    }, ['conversationId']),
    effects: ['storage', 'ui'],
    requiresConfirmation: true,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.conversation.setActive',
    name: 'Aktive Konversation setzen',
    description: 'Setzt die aktive Konversation in der UI.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      conversationId: conversationIdProperty,
    }, ['conversationId']),
    effects: ['ui'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.conversation.rename',
    name: 'Konversation umbenennen',
    description: 'Ändert den Titel einer bestehenden Konversation.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      conversationId: conversationIdProperty,
      title: { type: 'string', description: 'Neuer Titel' },
    }, ['conversationId', 'title']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.conversation.pinToggle',
    name: 'Konversation pinnen umschalten',
    description: 'Schaltet den Pin-Status einer Konversation um.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      conversationId: conversationIdProperty,
    }, ['conversationId']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.message.add',
    name: 'Nachricht hinzufügen',
    description: 'Fügt einer Konversation eine Nachricht hinzu.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      conversationId: conversationIdProperty,
      role: { type: 'string', description: 'Rolle der Nachricht', enum: ['user', 'assistant', 'system'] },
      content: { type: 'string', description: 'Nachrichteninhalt' },
    }, ['conversationId', 'role', 'content']),
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
    isIdempotent: false,
  }),
  spec({
    id: 'agents.message.update',
    name: 'Nachricht aktualisieren',
    description: 'Ändert Inhalt oder Metadaten einer Nachricht.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      conversationId: conversationIdProperty,
      messageId: messageIdProperty,
      content: { type: 'string', description: 'Neuer Nachrichteninhalt' },
    }, ['conversationId', 'messageId', 'content']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.message.delete',
    name: 'Nachricht löschen',
    description: 'Löscht eine Nachricht aus der Konversation.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      conversationId: conversationIdProperty,
      messageId: messageIdProperty,
    }, ['conversationId', 'messageId']),
    effects: ['storage'],
    requiresConfirmation: true,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.conversation.updateParticipants',
    name: 'Konversations-Teilnehmer aktualisieren',
    description: 'Aktualisiert die Teilnehmer einer Gruppen-Konversation.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      conversationId: conversationIdProperty,
      participantIds: { type: 'array', description: 'Teilnehmer-IDs', items: { type: 'string' } },
    }, ['conversationId', 'participantIds']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),

  // B) Folder & Group Library
  spec({
    id: 'agents.folder.create',
    name: 'Ordner erstellen',
    description: 'Erstellt einen Chat-Ordner.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      name: { type: 'string', description: 'Ordnername' },
      color: { type: 'string', description: 'Ordnerfarbe' },
    }, ['name']),
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
    isIdempotent: false,
  }),
  spec({
    id: 'agents.folder.update',
    name: 'Ordner aktualisieren',
    description: 'Aktualisiert einen bestehenden Ordner.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      folderId: folderIdProperty,
      name: { type: 'string', description: 'Neuer Name' },
      color: { type: 'string', description: 'Neue Farbe' },
    }, ['folderId']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.folder.delete',
    name: 'Ordner löschen',
    description: 'Löscht einen Chat-Ordner nach Bestätigung.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      folderId: folderIdProperty,
    }, ['folderId']),
    effects: ['storage'],
    requiresConfirmation: true,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.folder.moveConversation',
    name: 'Konversation in Ordner verschieben',
    description: 'Verschiebt eine Konversation in einen Ordner.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      conversationId: conversationIdProperty,
      folderId: folderIdProperty,
    }, ['conversationId', 'folderId']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.groupFileFolder.create',
    name: 'Gruppen-Dateiordner erstellen',
    description: 'Erstellt einen Dateiordner innerhalb einer Gruppe.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      groupId: groupIdProperty,
      name: { type: 'string', description: 'Ordnername' },
    }, ['groupId', 'name']),
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
    isIdempotent: false,
  }),
  spec({
    id: 'agents.groupFile.add',
    name: 'Gruppendatei hinzufügen',
    description: 'Fügt einer Gruppe eine Datei oder ein Artefakt hinzu.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      groupId: groupIdProperty,
      name: { type: 'string', description: 'Dateiname' },
      content: { type: 'string', description: 'Dateiinhalt oder Referenz' },
    }, ['groupId', 'name']),
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
    isIdempotent: false,
  }),
  spec({
    id: 'agents.groupFile.move',
    name: 'Gruppendatei verschieben',
    description: 'Verschiebt eine Gruppendatei in einen anderen Ordner.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      fileId: { type: 'string', description: 'Datei-ID' },
      targetFolderId: { type: 'string', description: 'Zielordner-ID' },
    }, ['fileId', 'targetFolderId']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.groupFile.delete',
    name: 'Gruppendatei löschen',
    description: 'Löscht eine Gruppendatei nach Bestätigung.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      fileId: { type: 'string', description: 'Datei-ID' },
    }, ['fileId']),
    effects: ['storage'],
    requiresConfirmation: true,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.groupMainConversation.ensure',
    name: 'Gruppen-Hauptkonversation sicherstellen',
    description: 'Stellt sicher, dass die Hauptkonversation einer Gruppe existiert.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      groupId: groupIdProperty,
    }, ['groupId']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.groupParticipantChats.ensure',
    name: 'Gruppen-Teilnehmerchats sicherstellen',
    description: 'Stellt individuelle Chats für Gruppenmitglieder sicher.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      groupId: groupIdProperty,
    }, ['groupId']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),

  // C) Agent-Entity-Management
  spec({
    id: 'agents.agent.select',
    name: 'Agent auswählen',
    description: 'Setzt einen Agenten als aktiv im Agents-Modul.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      agentId: agentIdProperty,
    }, ['agentId']),
    effects: ['ui'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.agent.createCustom',
    name: 'Custom-Agent erstellen',
    description: 'Erstellt einen neuen benutzerdefinierten Agenten.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      name: { type: 'string', description: 'Agentenname' },
      description: { type: 'string', description: 'Beschreibung' },
      icon: { type: 'string', description: 'Icon-Key' },
      color: { type: 'string', description: 'Farbe' },
    }, ['name']),
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
    isIdempotent: false,
  }),
  spec({
    id: 'agents.agent.updateCustom',
    name: 'Custom-Agent aktualisieren',
    description: 'Aktualisiert einen benutzerdefinierten Agenten.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      agentId: agentIdProperty,
      updates: { type: 'object', description: 'Zu ändernde Felder' },
    }, ['agentId', 'updates']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.agent.deleteCustom',
    name: 'Custom-Agent löschen',
    description: 'Löscht einen benutzerdefinierten Agenten nach Dependency-Check.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      agentId: agentIdProperty,
      force: { type: 'boolean', description: 'Abhängigkeiten bewusst ignorieren?' },
    }, ['agentId']),
    effects: ['storage', 'ui'],
    requiresConfirmation: true,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.group.create',
    name: 'Agent-Gruppe erstellen',
    description: 'Erstellt eine neue Agent-Gruppe.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      name: { type: 'string', description: 'Gruppenname' },
      description: { type: 'string', description: 'Beschreibung' },
    }, ['name']),
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
    isIdempotent: false,
  }),
  spec({
    id: 'agents.group.update',
    name: 'Agent-Gruppe aktualisieren',
    description: 'Aktualisiert Metadaten und Rollen einer Gruppe.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      groupId: groupIdProperty,
      updates: { type: 'object', description: 'Zu ändernde Felder' },
    }, ['groupId', 'updates']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.breakout.create',
    name: 'Breakout erstellen',
    description: 'Erstellt eine neue Breakout-Session.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      groupId: groupIdProperty,
      name: { type: 'string', description: 'Breakout-Name' },
    }, ['groupId', 'name']),
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
    isIdempotent: false,
  }),
  spec({
    id: 'agents.breakout.upsert',
    name: 'Breakout upserten',
    description: 'Erstellt oder aktualisiert eine Breakout-Session.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      breakoutId: { type: 'string', description: 'Breakout-ID' },
      payload: { type: 'object', description: 'Breakout-Daten' },
    }, ['payload']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.agent.createOrchestrated',
    name: 'Orchestrierten Agenten erstellen',
    description: 'Erstellt einen Agenten mit Orchestrierungs-Setup.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      name: { type: 'string', description: 'Agentenname' },
      settings: { type: 'object', description: 'Initiale Settings' },
    }, ['name']),
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
    isIdempotent: false,
  }),

  // D) Council Runtime
  spec({
    id: 'agents.council.draft.create',
    name: 'Create council draft',
    description: 'Creates a new council draft.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      name: { type: 'string', description: 'Council name' },
    }, ['name']),
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
    isIdempotent: false,
  }),
  spec({
    id: 'agents.council.open',
    name: 'Open council',
    description: 'Opens an existing council draft.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      councilId: councilIdProperty,
    }, ['councilId']),
    effects: ['ui'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.council.sync',
    name: 'Sync council',
    description: 'Syncs council state and seat order.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      councilId: councilIdProperty,
    }, ['councilId']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.council.persist',
    name: 'Persist council',
    description: 'Saves council data permanently.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      councilId: councilIdProperty,
    }, ['councilId']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.council.delete',
    name: 'Delete council',
    description: 'Deletes a council after confirmation.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      councilId: councilIdProperty,
    }, ['councilId']),
    effects: ['storage'],
    requiresConfirmation: true,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.council.seat.upsert',
    name: 'Upsert council seat',
    description: 'Creates or updates a council seat.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      councilId: councilIdProperty,
      seatId: seatIdProperty,
      payload: { type: 'object', description: 'Seat payload' },
    }, ['councilId', 'seatId', 'payload']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.council.seat.remove',
    name: 'Remove council seat',
    description: 'Removes a council seat.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      councilId: councilIdProperty,
      seatId: seatIdProperty,
    }, ['councilId', 'seatId']),
    effects: ['storage'],
    requiresConfirmation: true,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.council.mainMessage.add',
    name: 'Add council main message',
    description: 'Adds a message to the council main thread.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      councilId: councilIdProperty,
      content: { type: 'string', description: 'Message body' },
    }, ['councilId', 'content']),
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
    isIdempotent: false,
  }),
  spec({
    id: 'agents.council.mainMessage.update',
    name: 'Update council main message',
    description: 'Updates a council main-thread message.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      councilId: councilIdProperty,
      messageId: messageIdProperty,
      content: { type: 'string', description: 'New content' },
    }, ['councilId', 'messageId', 'content']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.council.mainMessage.clear',
    name: 'Clear council main messages',
    description: 'Clears the council main chat.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      councilId: councilIdProperty,
    }, ['councilId']),
    effects: ['storage'],
    requiresConfirmation: true,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.council.memberMessage.add',
    name: 'Add council member message',
    description: 'Adds a message to a council member thread.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      councilId: councilIdProperty,
      seatId: seatIdProperty,
      content: { type: 'string', description: 'Message body' },
    }, ['councilId', 'seatId', 'content']),
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
    isIdempotent: false,
  }),
  spec({
    id: 'agents.council.memberMessage.update',
    name: 'Update council member message',
    description: 'Updates a council member-thread message.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      councilId: councilIdProperty,
      seatId: seatIdProperty,
      messageId: messageIdProperty,
      content: { type: 'string', description: 'New content' },
    }, ['councilId', 'seatId', 'messageId', 'content']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.council.memberMessage.clear',
    name: 'Clear council member messages',
    description: 'Clears the message history for a council member seat.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      councilId: councilIdProperty,
      seatId: seatIdProperty,
    }, ['councilId', 'seatId']),
    effects: ['storage'],
    requiresConfirmation: true,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.council.run',
    name: 'Start council run',
    description: 'Runs first opinions, review, and final synthesis.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      councilId: councilIdProperty,
      prompt: { type: 'string', description: 'Council prompt' },
    }, ['councilId', 'prompt']),
    effects: ['ui', 'network'],
    requiresConfirmation: false,
    isIdempotent: false,
  }),
  spec({
    id: 'agents.council.abortAndReset',
    name: 'Abort and reset council',
    description: 'Aborts an active council run and resets UI/state.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      councilId: councilIdProperty,
    }, ['councilId']),
    effects: ['storage', 'ui'],
    requiresConfirmation: true,
    isIdempotent: true,
  }),

  // E) Group Orchestration / Objectives
  spec({
    id: 'agents.objective.add',
    name: 'Gruppenziel hinzufügen',
    description: 'Fügt einer Gruppe ein Ziel hinzu.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      groupId: groupIdProperty,
      title: { type: 'string', description: 'Zieltitel' },
    }, ['groupId', 'title']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: false,
  }),
  spec({
    id: 'agents.objective.update',
    name: 'Gruppenziel aktualisieren',
    description: 'Aktualisiert ein Gruppenziel.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      objectiveId: { type: 'string', description: 'Objective-ID' },
      updates: { type: 'object', description: 'Zu ändernde Felder' },
    }, ['objectiveId', 'updates']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.objective.delete',
    name: 'Gruppenziel löschen',
    description: 'Löscht ein Gruppenziel nach Bestätigung.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      objectiveId: { type: 'string', description: 'Objective-ID' },
    }, ['objectiveId']),
    effects: ['storage'],
    requiresConfirmation: true,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.orchestration.mode.change',
    name: 'Orchestrierungsmodus ändern',
    description: 'Wechselt den strukturierten Gesprächsmodus einer Gruppe.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      groupId: groupIdProperty,
      mode: {
        type: 'string',
        description: 'Neuer Orchestrierungsmodus',
        enum: ['free-discussion', 'brainstorming', 'debate', 'task-delegation', 'review', 'synthesis', 'planning'],
      },
    }, ['groupId', 'mode']),
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.orchestration.task.delegate',
    name: 'Orchestrierungs-Task delegieren',
    description: 'Delegiert eine Aufgabe an einen Agenten oder Breakout.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      groupId: groupIdProperty,
      assigneeId: agentIdProperty,
      task: { type: 'string', description: 'Delegierte Aufgabe' },
    }, ['groupId', 'assigneeId', 'task']),
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
    isIdempotent: false,
  }),
  spec({
    id: 'agents.orchestration.breakout.create',
    name: 'Orchestrierungs-Breakout erstellen',
    description: 'Erstellt aus der Orchestrierung heraus eine Breakout-Session.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      groupId: groupIdProperty,
      name: { type: 'string', description: 'Breakout-Name' },
    }, ['groupId', 'name']),
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
    isIdempotent: false,
  }),
  spec({
    id: 'agents.orchestration.artifact.save',
    name: 'Orchestrierungs-Artefakt speichern',
    description: 'Speichert ein Gruppen-Artefakt oder Dokument.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      groupId: groupIdProperty,
      name: { type: 'string', description: 'Artefaktname' },
      content: { type: 'string', description: 'Inhalt' },
    }, ['groupId', 'name', 'content']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: false,
  }),
  spec({
    id: 'agents.orchestration.artifact.update',
    name: 'Orchestrierungs-Artefakt aktualisieren',
    description: 'Aktualisiert ein bestehendes Gruppen-Artefakt.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      artifactId: { type: 'string', description: 'Artefakt-ID' },
      content: { type: 'string', description: 'Neuer Inhalt' },
    }, ['artifactId', 'content']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.orchestration.folder.create',
    name: 'Orchestrierungs-Ordner erstellen',
    description: 'Erstellt einen Gruppenordner für Artefakte.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      groupId: groupIdProperty,
      name: { type: 'string', description: 'Ordnername' },
    }, ['groupId', 'name']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: false,
  }),

  // F) Scheduled Tasks
  spec({
    id: 'agents.task.create',
    name: 'Scheduled Task erstellen',
    description: 'Erstellt eine neue geplante Agent-Aufgabe.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      targetId: { type: 'string', description: 'Ziel-Agent oder Gruppe' },
    }, ['targetId']),
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
    isIdempotent: false,
  }),
  spec({
    id: 'agents.task.update',
    name: 'Scheduled Task aktualisieren',
    description: 'Aktualisiert eine geplante Aufgabe.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      taskId: taskIdProperty,
      updates: { type: 'object', description: 'Zu ändernde Felder' },
    }, ['taskId', 'updates']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.task.toggleEnabled',
    name: 'Scheduled Task aktivieren/deaktivieren',
    description: 'Schaltet eine Aufgabe an oder aus.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      taskId: taskIdProperty,
    }, ['taskId']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.task.runNow',
    name: 'Scheduled Task sofort ausführen',
    description: 'Startet einen manuellen Probelauf einer geplanten Aufgabe.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      taskId: taskIdProperty,
    }, ['taskId']),
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
    isIdempotent: false,
  }),
  spec({
    id: 'agents.task.duplicate',
    name: 'Scheduled Task duplizieren',
    description: 'Erstellt eine Kopie einer geplanten Aufgabe.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      taskId: taskIdProperty,
    }, ['taskId']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: false,
  }),
  spec({
    id: 'agents.task.delete',
    name: 'Scheduled Task löschen',
    description: 'Löscht eine geplante Aufgabe nach Bestätigung.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      taskId: taskIdProperty,
    }, ['taskId']),
    effects: ['storage'],
    requiresConfirmation: true,
    isIdempotent: true,
  }),

  // G) Behavior / Config / Capabilities
  spec({
    id: 'agents.settings.model.set',
    name: 'Agent-Modell setzen',
    description: 'Setzt Provider und Modell eines Agenten.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      agentId: agentIdProperty,
      provider: { type: 'string', description: 'LLM-Provider' },
      model: { type: 'string', description: 'Modell-ID' },
    }, ['agentId', 'provider', 'model']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.settings.prompt.set',
    name: 'Agent-Prompt setzen',
    description: 'Setzt den System-Prompt eines Agenten.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      agentId: agentIdProperty,
      systemPrompt: { type: 'string', description: 'Neuer System-Prompt' },
    }, ['agentId', 'systemPrompt']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.settings.tools.enableDisable',
    name: 'Agent-Tools aktivieren/deaktivieren',
    description: 'Aktualisiert die Tool-Liste eines Agenten.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      agentId: agentIdProperty,
      enabledToolIds: { type: 'array', description: 'Aktive Tool-IDs', items: { type: 'string' } },
    }, ['agentId', 'enabledToolIds']),
    effects: ['storage'],
    requiresConfirmation: true,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.settings.skills.enableDisable',
    name: 'Agent-Skills aktivieren/deaktivieren',
    description: 'Aktualisiert die Skill-Liste eines Agenten.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      agentId: agentIdProperty,
      enabledSkillIds: { type: 'array', description: 'Aktive Skill-IDs', items: { type: 'string' } },
    }, ['agentId', 'enabledSkillIds']),
    effects: ['storage'],
    requiresConfirmation: true,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.settings.integrations.allowDeny',
    name: 'Agent-Integrationen erlauben/verbieten',
    description: 'Setzt die Integrationsfreigaben eines Agenten.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      agentId: agentIdProperty,
      allowedIntegrations: { type: 'array', description: 'Erlaubte Integrationen', items: { type: 'string' } },
    }, ['agentId', 'allowedIntegrations']),
    effects: ['storage'],
    requiresConfirmation: true,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.settings.humanInLoop.set',
    name: 'Agent-Human-in-the-loop setzen',
    description: 'Setzt Tools, die Bestätigung erfordern.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      agentId: agentIdProperty,
      toolIds: { type: 'array', description: 'Tool-IDs mit Freigabepflicht', items: { type: 'string' } },
    }, ['agentId', 'toolIds']),
    effects: ['storage'],
    requiresConfirmation: true,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.settings.multimodal.set',
    name: 'Agent-Multimodal-Slots setzen',
    description: 'Konfiguriert multimodale Slots für Bild, Video, TTS und STT.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      agentId: agentIdProperty,
      multimodal: { type: 'object', description: 'Multimodal-Konfiguration' },
    }, ['agentId', 'multimodal']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.integration.status.refresh',
    name: 'Integrationsstatus aktualisieren',
    description: 'Aktualisiert den Status verbundener Integrationen.',
    module: 'agents',
    inputSchema: emptySchema,
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),

  // H) Analytics & Memory
  spec({
    id: 'agents.analytics.usage.get',
    name: 'Agents-Nutzung laden',
    description: 'Lädt Usage- und Aktivitätsmetriken.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      agentId: agentIdProperty,
    }, ['agentId']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.analytics.conversationSummary.get',
    name: 'Konversationszusammenfassung laden',
    description: 'Lädt eine Summary für eine Konversation.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      conversationId: conversationIdProperty,
    }, ['conversationId']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.memory.save',
    name: 'Agents-Memory speichern',
    description: 'Speichert agents-spezifisches Wissen oder Präferenzen.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      key: { type: 'string', description: 'Memory-Key' },
      value: { type: 'string', description: 'Memory-Wert' },
      category: { type: 'string', description: 'Kategorie', enum: ['preference', 'fact', 'instruction', 'entity', 'pattern'] },
    }, ['key', 'value', 'category']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.memory.recall',
    name: 'Agents-Memory abrufen',
    description: 'Sucht gespeicherte Agents-Memories.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      query: { type: 'string', description: 'Suchquery' },
    }, ['query']),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
  spec({
    id: 'agents.memory.list',
    name: 'Agents-Memories auflisten',
    description: 'Listet Agents-Memories auf.',
    module: 'agents',
    inputSchema: withRequiredProperties({
      category: { type: 'string', description: 'Optionale Kategorie' },
    }),
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
  }),
];

