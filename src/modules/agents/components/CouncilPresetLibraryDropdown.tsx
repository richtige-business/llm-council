// ============================================
// CouncilPresetLibraryDropdown.tsx - Kategorisierte Preset-Bibliothek
//
// Zweck: Zeigt alle kuratierten Standard-Ratsmitglieder gruppiert
//        nach Kategorie. Klick auf ein Preset setzt es sofort auf
//        den naechsten freien Sitzplatz. Bleibt danach offen, damit
//        mehrere Presets nacheinander hinzugefuegt werden koennen.
// Verwendet von: AgentsModuleShell.tsx
// ============================================

'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { useAgentsStore } from '../store';
import { getNextAvailableCouncilSeatId } from '../lib/council-seats';
import { COUNCIL_MEMBER_PRESETS, COUNCIL_PRESET_CATEGORIES } from '../council-member-presets';
import { normalizeOpenRouterModelId } from '@/lib/llm/model-catalog';
import type { CouncilSeatMemberData } from '../types';

interface CouncilPresetLibraryDropdownProps {
  onClose: () => void;
}

export function CouncilPresetLibraryDropdown({ onClose }: CouncilPresetLibraryDropdownProps) {
  const activeCouncilDraftSeatMembers = useAgentsStore((state) => state.activeCouncilDraftSeatMembers);
  const upsertActiveCouncilSeatMember = useAgentsStore((state) => state.upsertActiveCouncilSeatMember);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [addedNames, setAddedNames] = useState<Set<string>>(new Set());

  const presetsByCategory = useMemo(() => {
    const grouped = new Map<string, typeof COUNCIL_MEMBER_PRESETS>();
    for (const category of COUNCIL_PRESET_CATEGORIES) {
      grouped.set(
        category,
        COUNCIL_MEMBER_PRESETS.filter((preset) => preset.category === category)
      );
    }
    return grouped;
  }, []);

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const addPreset = (preset: (typeof COUNCIL_MEMBER_PRESETS)[number]) => {
    const seatId = getNextAvailableCouncilSeatId(activeCouncilDraftSeatMembers);
    const newMember: CouncilSeatMemberData = {
      seatId,
      name: preset.name,
      color: preset.color,
      model: normalizeOpenRouterModelId(preset.suggestedModel),
      role: preset.role,
      rolePrompt: preset.rolePrompt,
      sourceAgentId: null,
      skills: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    upsertActiveCouncilSeatMember(newMember);
    setAddedNames((prev) => new Set(prev).add(preset.name));
  };

  return (
    <div className="absolute inset-0 z-[95] flex items-center justify-center bg-slate-950/72 px-4 py-10 backdrop-blur-md">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />

      <div className="relative z-[1] flex max-h-[85vh] w-full max-w-xl flex-col rounded-[28px] border border-white/10 bg-[#08101d]/96 p-5 shadow-[0_20px_80px_rgba(2,6,23,0.5)] backdrop-blur-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/45">
              Preset-Bibliothek
            </div>
            <h3 className="mt-1 text-xl font-semibold text-white">Standard-Mitglied hinzufügen</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/55 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          {COUNCIL_PRESET_CATEGORIES.map((category) => {
            const presets = presetsByCategory.get(category) || [];
            const isCollapsed = collapsedCategories[category] ?? false;

            return (
              <div key={category} className="rounded-2xl border border-white/10 bg-white/[0.03]">
                <button
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
                    {category}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-white/40 transition-transform ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}
                  />
                </button>

                {!isCollapsed ? (
                  <div className="space-y-2 px-3 pb-3">
                    {presets.map((preset) => {
                      const alreadyAdded = addedNames.has(preset.name);
                      const initial = (preset.name.trim().charAt(0) || '?').toUpperCase();

                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => addPreset(preset)}
                          className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                        >
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                            style={{ backgroundColor: preset.color, boxShadow: `0 0 10px ${preset.color}60` }}
                          >
                            {initial}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-white">{preset.name}</div>
                            <div className="text-[11px] text-white/45">{preset.role}</div>
                          </div>
                          {alreadyAdded ? (
                            <span className="shrink-0 rounded-full bg-cyan-400/15 px-2 py-1 text-[10px] font-medium text-cyan-200">
                              Hinzugefügt
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
