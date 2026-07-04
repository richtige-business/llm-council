// ============================================
// AgentSettingsBehaviorTab.tsx - Verhalten und Tools
//
// Zweck: Zeigt Visual-Mode und Tool-Konfiguration pro Agent
// Verwendet von: AgentSettingsPage.tsx
// ============================================

'use client';

import { useMemo, useState } from 'react';
import { getToolRisk, getToolSource, type ToolSource } from '@/lib/agent/tools/tool-metadata';
import { getClientToolsForAgent } from '@/lib/agent/tools/client-tool-catalog';

interface AgentSettingsBehaviorTabProps {
  moduleId: string;
  visualMode: boolean;
  onVisualModeChange: (value: boolean) => void;
  visualTools: string[];
  onVisualToolsChange: (toolIds: string[]) => void;
  enabledTools: string[];
  onEnabledToolsChange: (toolIds: string[]) => void;
  humanInTheLoopTools: string[];
  onToggleHumanInLoop: (toolId: string) => void;
}

type ToolThemeId =
  | 'all'
  | 'app'
  | 'memory'
  | 'calendar'
  | 'inbox'
  | 'browser'
  | 'agents-chat'
  | 'agents-folders'
  | 'agents-group'
  | 'agents-agent'
  | 'agents-breakout'
  | 'agents-council'
  | 'agents-orchestration'
  | 'agents-task'
  | 'agents-settings'
  | 'agents-analytics'
  | 'agents-integrations'
  | 'builder-project'
  | 'builder-prompt'
  | 'builder-files'
  | 'builder-validate'
  | 'builder-debug'
  | 'builder-module'
  | 'builder-publish'
  | 'builder-audit'
  | 'settings'
  | 'marketplace';
type ToolRiskFilter = 'all' | 'read' | 'write' | 'destructive';

const SOURCE_ORDER: ToolSource[] = ['internal', 'mcp:gmail', 'mcp:browser'];

// --------------------------------------------
// Themen-Mapping fuer Tool-Filter
// Gruppiert grosse Tool-Mengen fachlich statt nach Status.
// --------------------------------------------

const THEME_LABELS: Record<ToolThemeId, string> = {
  all: 'Alle',
  app: 'App',
  memory: 'Memory',
  calendar: 'Kalender',
  inbox: 'Inbox',
  browser: 'Browser',
  'agents-chat': 'Chats',
  'agents-folders': 'Ordner',
  'agents-group': 'Gruppen',
  'agents-agent': 'Agenten',
  'agents-breakout': 'Breakouts',
  'agents-council': 'Council',
  'agents-orchestration': 'Orchestrierung',
  'agents-task': 'Tasks',
  'agents-settings': 'Settings',
  'agents-analytics': 'Analytics',
  'agents-integrations': 'Integrationen',
  'builder-project': 'Projekt',
  'builder-prompt': 'Prompt & Build',
  'builder-files': 'Dateien',
  'builder-validate': 'Checks',
  'builder-debug': 'Debug',
  'builder-module': 'Modul-API',
  'builder-publish': 'Publishing',
  'builder-audit': 'Audit',
  settings: 'Settings',
  marketplace: 'Marketplace',
};

const THEME_ORDER: ToolThemeId[] = [
  'all',
  'app',
  'memory',
  'calendar',
  'inbox',
  'browser',
  'agents-chat',
  'agents-folders',
  'agents-group',
  'agents-agent',
  'agents-breakout',
  'agents-council',
  'agents-orchestration',
  'agents-task',
  'agents-settings',
  'agents-analytics',
  'agents-integrations',
  'builder-project',
  'builder-prompt',
  'builder-files',
  'builder-validate',
  'builder-debug',
  'builder-module',
  'builder-publish',
  'builder-audit',
  'settings',
  'marketplace',
];

function getToolTheme(toolId: string): ToolThemeId {
  if (toolId.startsWith('app.')) return 'app';
  if (toolId.startsWith('memory.') || toolId.startsWith('agents.memory.')) return 'memory';
  if (toolId.startsWith('calendar.')) return 'calendar';
  if (toolId.startsWith('inbox.')) return 'inbox';
  if (toolId.startsWith('browser.')) return 'browser';
  if (toolId.startsWith('settings.')) return 'settings';
  if (toolId.startsWith('marketplace.')) return 'marketplace';

  if (toolId.startsWith('agents.conversation.') || toolId.startsWith('agents.message.')) return 'agents-chat';
  if (toolId.startsWith('agents.folder.')) return 'agents-folders';
  if (
    toolId.startsWith('agents.group.')
    || toolId.startsWith('agents.groupFile.')
    || toolId.startsWith('agents.groupMainConversation.')
    || toolId.startsWith('agents.groupParticipantChats.')
    || toolId.startsWith('agents.objective.')
  ) {
    return 'agents-group';
  }
  if (toolId.startsWith('agents.agent.') || /^agents\.(openWorkspace|createAgent|updateAgent|deleteAgent)$/.test(toolId)) {
    return 'agents-agent';
  }
  if (toolId.startsWith('agents.breakout.')) return 'agents-breakout';
  if (toolId.startsWith('agents.council.') || toolId === 'agents.runCouncil') return 'agents-council';
  if (toolId.startsWith('agents.orchestration.')) return 'agents-orchestration';
  if (toolId.startsWith('agents.task.')) return 'agents-task';
  if (toolId.startsWith('agents.settings.')) return 'agents-settings';
  if (toolId.startsWith('agents.analytics.')) return 'agents-analytics';
  if (toolId.startsWith('agents.integration.')) return 'agents-integrations';

  if (toolId.startsWith('builder.project.') || toolId.startsWith('builder.session.')) return 'builder-project';
  if (toolId.startsWith('builder.prompt.') || toolId.startsWith('builder.generate.')) return 'builder-prompt';
  if (toolId.startsWith('builder.files.') || toolId.startsWith('builder.file.')) return 'builder-files';
  if (toolId.startsWith('builder.validate.') || toolId.startsWith('builder.preview.')) return 'builder-validate';
  if (toolId.startsWith('builder.debug.') || toolId === 'lab.runDebugCommand') return 'builder-debug';
  if (toolId.startsWith('builder.module.')) {
    if (
      toolId.includes('.activate')
      || toolId.includes('.publish')
      || toolId.includes('.unpublish')
      || toolId.includes('.deactivate')
      || toolId.includes('.exportZip')
      || toolId.includes('.rollbackToSnapshot')
    ) {
      return 'builder-publish';
    }
    return 'builder-module';
  }
  if (toolId.startsWith('builder.registry.')) return 'builder-publish';
  if (toolId.startsWith('builder.audit.') || toolId.startsWith('builder.backup.')) return 'builder-audit';

  return 'app';
}

export function AgentSettingsBehaviorTab({
  moduleId,
  visualMode,
  onVisualModeChange,
  visualTools,
  onVisualToolsChange,
  enabledTools,
  onEnabledToolsChange,
  humanInTheLoopTools,
  onToggleHumanInLoop,
}: AgentSettingsBehaviorTabProps) {
  const moduleTools = useMemo(() => getClientToolsForAgent(moduleId), [moduleId]);
  const allToolIds = useMemo(() => moduleTools.map((tool) => tool.id), [moduleTools]);
  const effectiveVisualTools = visualTools.length > 0 ? visualTools : allToolIds;
  const effectiveEnabledTools = enabledTools.length > 0 ? enabledTools : allToolIds;
  const [themeFilter, setThemeFilter] = useState<ToolThemeId>('all');
  const [riskFilter, setRiskFilter] = useState<ToolRiskFilter>('all');

  const toolsBySource = useMemo(() => {
    const grouped: Record<ToolSource, typeof moduleTools> = {
      internal: [],
      'mcp:gmail': [],
      'mcp:browser': [],
    };

    for (const tool of moduleTools) {
      grouped[getToolSource(tool.id)].push(tool);
    }

    return grouped;
  }, [moduleTools]);

  const filteredToolsBySource = useMemo(() => {
    const grouped: Record<ToolSource, typeof moduleTools> = {
      internal: [],
      'mcp:gmail': [],
      'mcp:browser': [],
    };

    for (const source of SOURCE_ORDER) {
      grouped[source] = toolsBySource[source].filter((tool) => {
        const theme = getToolTheme(tool.id);
        const risk = getToolRisk(tool);
        const matchesTheme = themeFilter === 'all' || theme === themeFilter;
        const matchesRisk = riskFilter === 'all' || risk === riskFilter;
        return matchesTheme && matchesRisk;
      });
    }

    return grouped;
  }, [riskFilter, themeFilter, toolsBySource]);

  const visibleToolCount = useMemo(
    () => SOURCE_ORDER.reduce((count, source) => count + filteredToolsBySource[source].length, 0),
    [filteredToolsBySource]
  );

  const availableThemeButtons = useMemo(() => {
    const themes = new Set<ToolThemeId>(['all']);
    for (const tool of moduleTools) {
      themes.add(getToolTheme(tool.id));
    }

    return THEME_ORDER
      .filter((themeId) => themes.has(themeId))
      .map((themeId) => ({
        id: themeId,
        label: THEME_LABELS[themeId],
      }));
  }, [moduleTools]);

  const handleToggleEffectiveTool = (toolId: string) => {
    const nextEnabledTools = effectiveEnabledTools.includes(toolId)
      ? effectiveEnabledTools.filter((entry) => entry !== toolId)
      : [...effectiveEnabledTools, toolId];

    if (nextEnabledTools.length === allToolIds.length) {
      onEnabledToolsChange([]);
      return;
    }

    onEnabledToolsChange(nextEnabledTools);
  };

  const handleToggleEffectiveVisualTool = (toolId: string) => {
    const nextVisualTools = effectiveVisualTools.includes(toolId)
      ? effectiveVisualTools.filter((entry) => entry !== toolId)
      : [...effectiveVisualTools, toolId];

    if (nextVisualTools.length === allToolIds.length) {
      onVisualToolsChange([]);
      return;
    }

    onVisualToolsChange(nextVisualTools);
  };

  const sourceLabel: Record<ToolSource, string> = {
    internal: 'internal',
    'mcp:gmail': 'mcp:gmail',
    'mcp:browser': 'mcp:browser',
  };

  const riskLabel: Record<'read' | 'write' | 'destructive', string> = {
    read: 'read',
    write: 'write',
    destructive: 'destructive',
  };

  const riskFilterButtons: Array<{ id: ToolRiskFilter; label: string }> = [
    { id: 'all', label: 'Alle Risiken' },
    { id: 'read', label: 'Read' },
    { id: 'write', label: 'Write' },
    { id: 'destructive', label: 'Destructive' },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="mb-4 text-sm font-semibold text-white">Behavior & Tools</h3>
        <div className="space-y-4">
          <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <span>
              <span className="block text-sm font-medium text-white">Visual Mode</span>
              <span className="block text-xs text-white/45">Agent arbeitet sichtbar mit UI-Kontext.</span>
            </span>
            <input
              type="checkbox"
              checked={visualMode}
              onChange={(event) => onVisualModeChange(event.target.checked)}
              className="h-4 w-4"
            />
          </label>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <label className="block text-xs text-white/60">Tools</label>
              <span className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-white/45">
                {visibleToolCount} / {moduleTools.length} sichtbar
              </span>
            </div>
            {moduleTools.length > 0 ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <p className="mb-2 text-[11px] uppercase tracking-[0.22em] text-white/40">Thema</p>
                    <div className="flex flex-wrap gap-2">
                      {availableThemeButtons.map((filter) => {
                        const isActive = themeFilter === filter.id;
                        return (
                          <button
                            key={filter.id}
                            type="button"
                            onClick={() => setThemeFilter(filter.id)}
                            className="rounded-lg px-2.5 py-1.5 text-[11px] transition-colors"
                            style={{
                              background: isActive ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)',
                              border: isActive ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(255,255,255,0.08)',
                              color: isActive ? '#ffffff' : 'rgba(255,255,255,0.65)',
                            }}
                          >
                            {filter.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-[11px] uppercase tracking-[0.22em] text-white/40">Risiko</p>
                    <div className="flex flex-wrap gap-2">
                      {riskFilterButtons.map((filter) => {
                        const isActive = riskFilter === filter.id;
                        return (
                          <button
                            key={filter.id}
                            type="button"
                            onClick={() => setRiskFilter(filter.id)}
                            className="rounded-lg px-2.5 py-1.5 text-[11px] transition-colors"
                            style={{
                              background: isActive ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)',
                              border: isActive ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(255,255,255,0.08)',
                              color: isActive ? '#ffffff' : 'rgba(255,255,255,0.65)',
                            }}
                          >
                            {filter.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {SOURCE_ORDER.map((source) => {
                  const sourceTools = filteredToolsBySource[source];
                  if (!sourceTools || sourceTools.length === 0) return null;

                  return (
                    <div key={source} className="rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">{sourceLabel[source]}</p>
                        <span className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-white/45">
                          {sourceTools.length} Tools
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {[...sourceTools].sort((a, b) => a.name.localeCompare(b.name)).map((tool) => {
                          const isEnabled = effectiveEnabledTools.includes(tool.id);
                          const risk = getToolRisk(tool);

                          return (
                            <div key={tool.id} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
                              <div className="mb-1 flex items-start justify-between gap-1">
                                <label className="flex min-w-0 items-start gap-1.5 text-[11px] text-white/85">
                                  <input
                                    type="checkbox"
                                    checked={isEnabled}
                                    onChange={() => handleToggleEffectiveTool(tool.id)}
                                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                                  />
                                  <span className="block min-w-0 truncate leading-4">{tool.name}</span>
                                </label>
                                <div className="flex shrink-0 items-center gap-1">
                                  <span className="rounded-md border border-white/15 px-1.5 py-0.5 text-[8px] uppercase tracking-wide text-white/60">
                                    {riskLabel[risk]}
                                  </span>
                                </div>
                              </div>
                              <p className="truncate text-[9px] text-white/38">{tool.id}</p>
                              <p className="mt-1 line-clamp-1 text-[9px] leading-4 text-white/48">{tool.description}</p>
                              <div className="mt-1.5 flex items-center justify-between gap-1.5">
                                <span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[8px] uppercase tracking-wide text-white/48">
                                  {sourceLabel[source]}
                                </span>
                                <div className="flex items-center gap-2">
                                  <label className="inline-flex items-center gap-1 text-[9px] text-white/70">
                                    <input
                                      type="checkbox"
                                      checked={effectiveVisualTools.includes(tool.id)}
                                      onChange={() => handleToggleEffectiveVisualTool(tool.id)}
                                      className="h-3.5 w-3.5"
                                    />
                                    Visuell
                                  </label>
                                  <label className="inline-flex items-center gap-1 text-[9px] text-white/70">
                                    <input
                                      type="checkbox"
                                      checked={humanInTheLoopTools.includes(tool.id)}
                                      onChange={() => onToggleHumanInLoop(tool.id)}
                                      className="h-3.5 w-3.5"
                                    />
                                    Freigabe
                                  </label>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {visibleToolCount === 0 && (
                  <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm text-white/45">
                    Keine Tools passen zu den aktiven Filtern.
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-white/45">Für diesen Agent sind keine Tools im Scope definiert.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="mb-3 text-sm font-semibold text-white">Aktueller Modus</h3>
        <div className="grid gap-2 text-sm text-white/65 md:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Visual Mode</p>
            <p className="mt-1 text-sm text-white">{visualMode ? 'Aktiv' : 'Aus'}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Tools aktiv</p>
            <p className="mt-1 text-sm text-white">{effectiveEnabledTools.length}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Tools visuell</p>
            <p className="mt-1 text-sm text-white">{effectiveVisualTools.length}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Mit Freigabe</p>
            <p className="mt-1 text-sm text-white">{humanInTheLoopTools.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

