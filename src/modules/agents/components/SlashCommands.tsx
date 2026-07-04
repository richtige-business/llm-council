'use client';

import type { ComponentType } from 'react';
import * as LucideIcons from 'lucide-react';
import type { ModelInfo } from '@/lib/llm/model-catalog';
import type { OrchestrationMode } from '../types';

export type SlashPickerMode = 'agent' | 'model';

interface SlashCommandBaseItem {
  command?: string;
  aliases?: string[];
  label: string;
  description: string;
  icon?: string;
}

export interface SlashActionCommandItem extends SlashCommandBaseItem {
  type: 'action';
  id: 'new-conversation' | 'clear-conversation' | 'toggle-web-research' | 'toggle-deep-research';
  command: string;
}

export interface SlashModeCommandItem extends SlashCommandBaseItem {
  type: 'mode';
  command: string;
  mode: OrchestrationMode;
}

export interface SlashPickerCommandItem extends SlashCommandBaseItem {
  type: 'picker';
  id: 'pick-agent' | 'pick-model';
  command: string;
  pickerMode: SlashPickerMode;
}

export interface SlashAgentPickerItem extends SlashCommandBaseItem {
  type: 'agent';
  id: string;
  agentId: string;
  color?: string;
}

export interface SlashModelPickerItem extends SlashCommandBaseItem {
  type: 'model';
  id: string;
  modelId: string;
  providerLabel: string;
}

export type SlashCommandItem =
  | SlashActionCommandItem
  | SlashModeCommandItem
  | SlashPickerCommandItem
  | SlashAgentPickerItem
  | SlashModelPickerItem;

interface SlashCommandsProps {
  mode: 'commands' | SlashPickerMode;
  items: SlashCommandItem[];
  selectedIndex: number;
  onSelect: (item: SlashCommandItem) => void;
  onHover: (index: number) => void;
}

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (LucideIcons as unknown as Record<string, ComponentType<{ className?: string }>>)[name];
  return Icon ? <Icon className={className} /> : null;
}

function renderBadge(item: SlashCommandItem) {
  if (item.type === 'action' || item.type === 'mode' || item.type === 'picker') {
    return (
      <span className="mt-0.5 shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
        {item.command}
      </span>
    );
  }

  if (item.type === 'agent') {
    return (
      <span
        className="mt-1 h-3 w-3 shrink-0 rounded-full"
        style={{ background: item.color || '#8B5CF6' }}
      />
    );
  }

  return (
    <span className="mt-0.5 shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300">
      {item.providerLabel}
    </span>
  );
}

function renderMeta(item: SlashCommandItem) {
  if (item.type === 'mode') {
    return item.mode;
  }

  if (item.type === 'model') {
    return item.modelId;
  }

  return null;
}

export function createSlashModelItems(models: ModelInfo[]): SlashModelPickerItem[] {
  return models.map((model) => ({
    type: 'model',
    id: model.id,
    modelId: model.id,
    providerLabel: model.providerLabel,
    label: model.name,
    description: model.description || `${model.providerLabel} · ${model.id}`,
    icon: 'Sparkles',
  }));
}

export function SlashCommands({
  mode,
  items,
  selectedIndex,
  onSelect,
  onHover,
}: SlashCommandsProps) {
  const title = mode === 'commands'
    ? 'Slash Commands'
    : mode === 'agent'
      ? 'Agent wählen'
      : 'Modell wählen';
  const emptyLabel = mode === 'commands'
    ? 'Keine passenden Commands'
    : mode === 'agent'
      ? 'Kein passender Agent'
      : 'Kein passendes Modell';

  return (
    <div
      className="absolute bottom-full left-0 mb-2 w-80 max-h-64 overflow-y-auto rounded-xl border shadow-lg"
      style={{
        background: 'rgba(30, 30, 50, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.15)',
        zIndex: 110,
      }}
    >
      <div className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-white/40">
        {title}
      </div>
      {items.length === 0 ? (
        <div className="px-3 py-2 text-xs text-white/45">
          {emptyLabel}
        </div>
      ) : (
        items.map((item, idx) => {
          const meta = renderMeta(item);
          const itemKey = 'id' in item ? item.id : `${item.type}-${item.command}`;

          return (
            <button
              key={itemKey}
              type="button"
              onClick={() => onSelect(item)}
              onMouseEnter={() => onHover(idx)}
              className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors"
              style={{
                background: idx === selectedIndex ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: 'rgba(255,255,255,0.9)',
              }}
            >
              {item.icon ? (
                <div className="mt-0.5 shrink-0 text-white/55">
                  <DynamicIcon name={item.icon} className="h-3.5 w-3.5" />
                </div>
              ) : (
                renderBadge(item)
              )}
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="block truncate text-sm">{item.label}</span>
                  {item.icon ? renderBadge(item) : null}
                </span>
                <span className="block text-[11px] text-white/45">{item.description}</span>
                {meta ? (
                  <span className="mt-0.5 block text-[10px] uppercase tracking-[0.16em] text-white/25">
                    {meta}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })
      )}
    </div>
  );
}
