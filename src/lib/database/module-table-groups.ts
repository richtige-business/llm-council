// ============================================
// module-table-groups.ts - Modul -> Tabellen Mapping
//
// Zweck: Single Source of Truth fuer Database Explorer
//        und Builder Base-Kontext
// ============================================

export interface TableDef {
  key: string;
  displayName: string;
}

export interface ModuleGroup {
  moduleId: string;
  label: string;
  icon: string;
  color: string;
  tables: TableDef[];
}

export const MODULE_TABLE_GROUPS: ModuleGroup[] = [
  {
    moduleId: 'intelligence',
    label: 'Intelligence Agent',
    icon: 'Brain',
    color: '#a78bfa',
    tables: [
      { key: 'user', displayName: 'User' },
      { key: 'userPreference', displayName: 'UserPreference' },
      { key: 'userMemory', displayName: 'UserMemory' },
      { key: 'chatMessage', displayName: 'ChatMessage' },
      { key: 'conversationSummary', displayName: 'ConversationSummary' },
    ],
  },
  {
    moduleId: 'inbox',
    label: 'Postfach',
    icon: 'Mail',
    color: '#60a5fa',
    tables: [
      { key: 'emailAccount', displayName: 'EmailAccount' },
      { key: 'accountLabel', displayName: 'AccountLabel' },
      { key: 'message', displayName: 'Message' },
      { key: 'contact', displayName: 'Contact' },
      { key: 'contactEmail', displayName: 'ContactEmail' },
      { key: 'contactAccount', displayName: 'ContactAccount' },
      { key: 'inboxLabel', displayName: 'InboxLabel' },
      { key: 'messageLabel', displayName: 'MessageLabel' },
      { key: 'notificationSubscription', displayName: 'NotificationSubscription' },
    ],
  },
  {
    moduleId: 'calendar',
    label: 'Kalender',
    icon: 'Calendar',
    color: '#34d399',
    tables: [
      { key: 'calendarSuggestion', displayName: 'CalendarSuggestion' },
    ],
  },
  {
    moduleId: 'training',
    label: 'Training Center',
    icon: 'GraduationCap',
    color: '#f59e0b',
    tables: [
      { key: 'trainingModel', displayName: 'TrainingModel' },
      { key: 'dataset', displayName: 'Dataset' },
      { key: 'datasetRow', displayName: 'DatasetRow' },
      { key: 'trainingJob', displayName: 'TrainingJob' },
      { key: 'sandboxSession', displayName: 'SandboxSession' },
      { key: 'sandboxPrompt', displayName: 'SandboxPrompt' },
      { key: 'sandboxFeedback', displayName: 'SandboxFeedback' },
      { key: 'budgetLimit', displayName: 'BudgetLimit' },
    ],
  },
  {
    moduleId: 'bases',
    label: 'Bases',
    icon: 'FolderTree',
    color: '#8b5cf6',
    tables: [
      { key: 'workspaceBase', displayName: 'WorkspaceBase' },
      { key: 'workspaceBaseModule', displayName: 'WorkspaceBaseModule' },
      { key: 'workspaceBaseConnection', displayName: 'WorkspaceBaseConnection' },
    ],
  },
];

export function buildAllTablesLookup() {
  const lookup: Record<string, string> = {};
  for (const group of MODULE_TABLE_GROUPS) {
    for (const table of group.tables) {
      lookup[table.key.toLowerCase()] = table.displayName;
    }
  }
  return lookup;
}
