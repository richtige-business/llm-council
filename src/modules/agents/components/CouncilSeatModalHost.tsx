// ============================================
// CouncilSeatModalHost.tsx - Modal-Host fuer Council-Sitzbelegung
//
// Zweck: Stellt die Council-Popup-Flows bereit:
//        neuen Member erstellen und bestehende Member bearbeiten.
// Verwendet von: AgentsModuleShell
// ============================================

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Maximize2, MessageSquare, Sparkles, WandSparkles, X } from 'lucide-react';

// ESM-only Paket – muss ohne SSR geladen werden
const CouncilMarkdown = dynamic(
  () => import('./CouncilMarkdown').then((m) => ({ default: m.CouncilMarkdown })),
  { ssr: false },
);
import {
  DEFAULT_AGENT_CONFIG,
} from '@/lib/agent/stores/agent-config-store';
import { useModels } from '@/lib/llm/use-models';
import {
  DEFAULT_OPENROUTER_PROVIDER_FILTER,
  filterModelsByProvider,
  getModelProviderId,
  normalizeOpenRouterModelId,
} from '@/lib/llm/model-catalog';
import { useAgentsStore } from '../store';
import { useAgentsSpatialStore } from '../spatial-store';
import type { CouncilSeatMemberData } from '../types';
import { COUNCIL_SKILL_CATALOG, ALL_COUNCIL_SKILL_IDS } from '../skills-catalog';

interface MemberFormState {
  name: string;
  color: string;
  model: string;
  role: string;
  rolePrompt: string;
  skills: string[];
}

// --------------------------------------------
// SkillsSection - Wiederverwendbarer Block fuer
// Skills-Checkboxen + Context-Platzhalter (Create + Edit)
// --------------------------------------------

function SkillsSection({
  skills,
  onToggleSkill,
}: {
  skills: string[];
  onToggleSkill: (skillId: string) => void;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div>
        <div className="text-xs font-medium text-white/65">Skills</div>
        <p className="mt-1 text-[11px] leading-relaxed text-white/40">
          Faehigkeiten, die dieses Mitglied bei Bedarf selbst einsetzen kann.
        </p>
        <div className="mt-3 space-y-2">
          {COUNCIL_SKILL_CATALOG.map((skill) => {
            const checked = skills.includes(skill.id);
            return (
              <label
                key={skill.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 transition-colors hover:border-white/20"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleSkill(skill.id)}
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/10 accent-cyan-400"
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white/85">{skill.name}</div>
                  <div className="text-[11px] text-white/45">{skill.description}</div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="border-t border-white/10 pt-3">
        <div className="flex items-center gap-2 text-xs font-medium text-white/40">
          <Sparkles className="h-3.5 w-3.5" />
          Context
        </div>
        <p className="mt-1 text-[11px] text-white/30">Bald verfügbar.</p>
      </div>
    </div>
  );
}

function resolveCouncilSeatLabel(seatId: string): string {
  if (seatId === 'chair-center') return 'Center chair';
  if (seatId === 'arc-left-0') return 'Left inner seat';
  if (seatId === 'arc-right-0') return 'Right inner seat';
  if (seatId === 'arc-left-1') return 'Left outer seat';
  if (seatId === 'arc-right-1') return 'Right outer seat';
  if (seatId.startsWith('arc-left-extra-')) return 'Left extra seat';
  if (seatId.startsWith('arc-right-extra-')) return 'Right extra seat';
  return 'Council seat';
}

function createEmptyMemberForm(): MemberFormState {
  return {
    name: '',
    color: '#8B5CF6',
    model: DEFAULT_AGENT_CONFIG.llmModel,
    role: '',
    rolePrompt: '',
    // Opt-out: neue Mitglieder starten mit allen Skills aktiv.
    skills: [...ALL_COUNCIL_SKILL_IDS],
  };
}

function createFormFromMember(member: CouncilSeatMemberData): MemberFormState {
  return {
    name: member.name,
    color: member.color,
    model: normalizeOpenRouterModelId(member.model),
    role: member.role,
    rolePrompt: member.rolePrompt,
    // `undefined` (nie konfiguriert) = alle Skills an; `[]` = bewusst abgewählt.
    skills: member.skills ?? [...ALL_COUNCIL_SKILL_IDS],
  };
}

export function CouncilSeatModalHost() {
  const selectedSeatId = useAgentsSpatialStore((state) => state.selectedCouncilSeatId);
  const setSelectedCouncilSeat = useAgentsSpatialStore((state) => state.setSelectedCouncilSeat);
  const setOpenCouncilChatMember = useAgentsSpatialStore((state) => state.setOpenCouncilChatMember);
  const requestCouncilSeatRemoval = useAgentsSpatialStore((state) => state.requestCouncilSeatRemoval);
  const activeCouncilDraftSeatMembers = useAgentsStore((state) => state.activeCouncilDraftSeatMembers);
  const councilMemberMessages = useAgentsStore((state) => state.activeCouncilDraftMemberMessages);
  const upsertActiveCouncilSeatMember = useAgentsStore((state) => state.upsertActiveCouncilSeatMember);
  const removeActiveCouncilSeatMember = useAgentsStore((state) => state.removeActiveCouncilSeatMember);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Automatisch ans Ende des Chatverlaufs scrollen
  const currentMessages = selectedSeatId ? (councilMemberMessages[selectedSeatId] || []) : [];
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [currentMessages.length]);

  const selectedSeatMember = useMemo(
    () =>
      selectedSeatId
        ? activeCouncilDraftSeatMembers.find((member) => member.seatId === selectedSeatId) || null
        : null,
    [activeCouncilDraftSeatMembers, selectedSeatId],
  );

  const [view, setView] = useState<'choose' | 'create' | 'edit'>('choose');
  const [createForm, setCreateForm] = useState<MemberFormState>(createEmptyMemberForm);
  const [editForm, setEditForm] = useState<MemberFormState>(createEmptyMemberForm);
  const [createProviderFilter, setCreateProviderFilter] = useState(DEFAULT_OPENROUTER_PROVIDER_FILTER);
  const [editProviderFilter, setEditProviderFilter] = useState(DEFAULT_OPENROUTER_PROVIDER_FILTER);
  const { models: allModels, providers: modelProviders } = useModels();

  // --------------------------------------------
  // Modal-Zustand passend zum aktuellen Sitz setzen.
  // Freier Sitz startet mit einer Modus-Wahl, belegter Sitz
  // geht direkt in den Bearbeiten-Flow.
  // --------------------------------------------
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!selectedSeatId) {
      setView('choose');
      setCreateForm(createEmptyMemberForm());
      setEditForm(createEmptyMemberForm());
      return;
    }

    if (selectedSeatMember) {
      setView('edit');
      setEditForm(createFormFromMember(selectedSeatMember));
      setEditProviderFilter(getModelProviderId(selectedSeatMember.model));
    } else {
      setView('choose');
      setCreateForm(createEmptyMemberForm());
      setCreateProviderFilter(getModelProviderId(DEFAULT_AGENT_CONFIG.llmModel));
    }

  }, [selectedSeatId, selectedSeatMember]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const createModelOptions = useMemo(
    () => filterModelsByProvider(allModels, createProviderFilter),
    [allModels, createProviderFilter]
  );
  const editModelOptions = useMemo(
    () => filterModelsByProvider(allModels, editProviderFilter),
    [allModels, editProviderFilter]
  );

  if (!selectedSeatId) {
    return null;
  }

  const seatLabel = resolveCouncilSeatLabel(selectedSeatId);
  const canRemoveSelectedSeat = selectedSeatId !== 'chair-center';
  const isExtraSeat =
    selectedSeatId.startsWith('arc-left-extra-') || selectedSeatId.startsWith('arc-right-extra-');
  const headerOrbColor =
    view === 'create'
      ? createForm.color
      : view === 'edit'
        ? editForm.color
        : selectedSeatMember?.color || '#8B5CF6';

  const closeModal = () => {
    setSelectedCouncilSeat(null);
  };

  const openSeatChatPanel = () => {
    if (!selectedSeatId) {
      return;
    }

    // Direkter Sprung vom Edit-Popup in das passende
    // Chatbar-Panel dieses Council-Members.
    setOpenCouncilChatMember(selectedSeatId);
    closeModal();
  };

  const handleRemoveExtraSeat = () => {
    if (!isExtraSeat) {
      return;
    }

    removeActiveCouncilSeatMember(selectedSeatId);
    requestCouncilSeatRemoval(selectedSeatId);
    closeModal();
  };

  const submitCreateMember = () => {
    const normalizedName = createForm.name.trim();
    if (!normalizedName) {
      return;
    }

    upsertActiveCouncilSeatMember({
      seatId: selectedSeatId,
      name: normalizedName,
      color: createForm.color,
      model: createForm.model,
      role: createForm.role.trim() || normalizedName,
      rolePrompt: createForm.rolePrompt.trim(),
      sourceAgentId: null,
      skills: createForm.skills,
    });

    closeModal();
  };

  const submitEditMember = () => {
    const normalizedName = editForm.name.trim();
    if (!normalizedName || !selectedSeatMember) {
      return;
    }

    upsertActiveCouncilSeatMember({
      seatId: selectedSeatId,
      name: normalizedName,
      color: editForm.color,
      model: editForm.model,
      role: editForm.role.trim() || normalizedName,
      rolePrompt: editForm.rolePrompt.trim(),
      sourceAgentId: null,
      skills: editForm.skills,
    });

    closeModal();
  };

  const toggleCreateSkill = (skillId: string) => {
    setCreateForm((state) => ({
      ...state,
      skills: state.skills.includes(skillId)
        ? state.skills.filter((id) => id !== skillId)
        : [...state.skills, skillId],
    }));
  };

  const toggleEditSkill = (skillId: string) => {
    setEditForm((state) => ({
      ...state,
      skills: state.skills.includes(skillId)
        ? state.skills.filter((id) => id !== skillId)
        : [...state.skills, skillId],
    }));
  };

  return (
    <div className="absolute inset-0 z-[90] flex items-center justify-center bg-slate-950/72 px-4 py-4 backdrop-blur-md">
      <div
        className="absolute inset-0"
        onClick={closeModal}
        aria-hidden
      />

      {/* Im Edit-Modus: max-w-4xl für zweispaltiges Layout mit Chatverlauf */}
      <div className={`relative z-[1] flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-y-auto rounded-[28px] border border-white/10 bg-[#08101d]/96 p-5 shadow-[0_20px_80px_rgba(2,6,23,0.5)] backdrop-blur-xl ${view === 'edit' ? 'max-w-4xl' : 'max-w-2xl'}`}>
        {/* --------------------------------------------
            Modal-Header
            Sitzkontext + schneller Close-Button
            -------------------------------------------- */}
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {(view === 'create' || view === 'edit') ? (
              <div className="relative flex h-16 w-16 items-center justify-center">
                <div
                  className="h-10 w-10 rounded-full"
                  style={{
                    backgroundColor: headerOrbColor,
                    boxShadow: `0 0 0 1px ${headerOrbColor}55, 0 0 32px ${headerOrbColor}55`,
                  }}
                />
                <div
                  className="absolute h-[60px] w-[60px] rounded-full"
                  style={{ backgroundColor: headerOrbColor, opacity: 0.12 }}
                />
              </div>
            ) : null}

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/45">
                Council Seat
              </div>
              <h3 className="mt-1 text-xl font-semibold text-white">{seatLabel}</h3>
            </div>
          </div>

          <button
            type="button"
            onClick={closeModal}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/55 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* --------------------------------------------
            Freier Sitz: lokales Council-Member anlegen
            -------------------------------------------- */}
        {view === 'choose' ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-1">
              <button
                type="button"
                onClick={() => setView('create')}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition-colors hover:border-white/20 hover:bg-white/[0.08]"
              >
                <div className="mb-3 inline-flex rounded-xl border border-white/10 bg-white/5 p-2 text-white/80">
                  <WandSparkles className="h-5 w-5" />
                </div>
                <div className="text-sm font-semibold text-white">Create new member</div>
                <div className="mt-2 text-sm text-white/55">
                  Create a standalone council member with local name, model, color, and role.
                </div>
              </button>
            </div>

            {isExtraSeat ? (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleRemoveExtraSeat}
                  className="rounded-xl border border-red-400/15 bg-red-500/10 px-4 py-2.5 text-sm text-red-200 transition-colors hover:border-red-300/30 hover:bg-red-500/15"
                >
                  Remove extra seat
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* --------------------------------------------
            Neuer Member
            Council-spezifische Sitzkonfiguration
            -------------------------------------------- */}
        {view === 'create' ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-medium text-white/65">Name</span>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(event) => setCreateForm((state) => ({ ...state, name: event.target.value }))}
                  placeholder="Member Name"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/25"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-medium text-white/65">Color</span>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <input
                    type="color"
                    value={createForm.color}
                    onChange={(event) => setCreateForm((state) => ({ ...state, color: event.target.value }))}
                    className="h-9 w-14 cursor-pointer rounded-xl border border-white/10 p-1"
                    style={{ backgroundColor: createForm.color }}
                  />
                  <div className="text-xs font-medium uppercase tracking-[0.16em] text-white/55">
                    {createForm.color}
                  </div>
                </div>
              </label>
            </div>

            <label className="space-y-2">
              <span className="text-xs font-medium text-white/65">Provider filter</span>
              <select
                value={createProviderFilter}
                onChange={(event) => {
                  const nextProvider = event.target.value;
                  const nextOptions = filterModelsByProvider(allModels, nextProvider);
                  setCreateProviderFilter(nextProvider);
                  if (!nextOptions.some((entry) => entry.id === createForm.model) && nextOptions[0]) {
                    setCreateForm((state) => ({ ...state, model: nextOptions[0].id }));
                  }
                }}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/25"
              >
                <option value={DEFAULT_OPENROUTER_PROVIDER_FILTER}>All providers</option>
                {modelProviders.map((provider) => (
                  <option key={`create-${provider.id}`} value={provider.id}>
                    {provider.label} ({provider.count})
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-medium text-white/65">Model</span>
              <select
                value={createForm.model}
                onChange={(event) => setCreateForm((state) => ({ ...state, model: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/25"
              >
                {createModelOptions.map((model) => (
                  <option key={model.id} value={model.id} className="bg-slate-950 text-white">
                    {model.providerLabel} · {model.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-medium text-white/65">Role</span>
              <input
                type="text"
                value={createForm.role}
                onChange={(event) => setCreateForm((state) => ({ ...state, role: event.target.value }))}
                placeholder="e.g. Skeptical strategist"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/25"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-medium text-white/65">Role description / system prompt</span>
              <textarea
                value={createForm.rolePrompt}
                onChange={(event) => setCreateForm((state) => ({ ...state, rolePrompt: event.target.value }))}
                rows={6}
                placeholder="Describe how this council member thinks, argues, and which perspective they take."
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/25"
              />
            </label>

            <SkillsSection skills={createForm.skills} onToggleSkill={toggleCreateSkill} />

            <div className="flex items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setView('choose')}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
                >
                  Back
                </button>

                {isExtraSeat ? (
                  <button
                    type="button"
                    onClick={handleRemoveExtraSeat}
                    className="rounded-xl border border-red-400/15 bg-red-500/10 px-4 py-2.5 text-sm text-red-200 transition-colors hover:border-red-300/30 hover:bg-red-500/15"
                  >
                    Remove extra seat
                  </button>
                ) : null}
              </div>

              <button
                type="button"
                onClick={submitCreateMember}
                className="rounded-xl border border-cyan-400/20 bg-cyan-400/15 px-4 py-2.5 text-sm font-medium text-cyan-100 transition-colors hover:border-cyan-300/35 hover:bg-cyan-400/20"
              >
                Create member
              </button>
            </div>
          </div>
        ) : null}

        {/* --------------------------------------------
            Member bearbeiten
            Zweispaltiges Layout: links Form, rechts Chatverlauf
            -------------------------------------------- */}
        {view === 'edit' && selectedSeatMember ? (
          <div className="flex gap-5">
            {/* Linke Spalte: Edit-Formular */}
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-medium text-white/65">Name</span>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(event) => setEditForm((state) => ({ ...state, name: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/25"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-medium text-white/65">Color</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <input
                      type="color"
                      value={editForm.color}
                      onChange={(event) => setEditForm((state) => ({ ...state, color: event.target.value }))}
                      className="h-9 w-14 cursor-pointer rounded-xl border border-white/10 p-1"
                      style={{ backgroundColor: editForm.color }}
                    />
                    <div className="text-xs font-medium uppercase tracking-[0.16em] text-white/55">
                      {editForm.color}
                    </div>
                  </div>
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-xs font-medium text-white/65">Provider filter</span>
                <select
                  value={editProviderFilter}
                  onChange={(event) => {
                    const nextProvider = event.target.value;
                    const nextOptions = filterModelsByProvider(allModels, nextProvider);
                    setEditProviderFilter(nextProvider);
                    if (!nextOptions.some((entry) => entry.id === editForm.model) && nextOptions[0]) {
                      setEditForm((state) => ({ ...state, model: nextOptions[0].id }));
                    }
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/25"
                >
                  <option value={DEFAULT_OPENROUTER_PROVIDER_FILTER}>All providers</option>
                  {modelProviders.map((provider) => (
                    <option key={`edit-${provider.id}`} value={provider.id}>
                      {provider.label} ({provider.count})
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-medium text-white/65">Model</span>
                <select
                  value={editForm.model}
                  onChange={(event) => setEditForm((state) => ({ ...state, model: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/25"
                >
                  {editModelOptions.map((model) => (
                    <option key={model.id} value={model.id} className="bg-slate-950 text-white">
                      {model.providerLabel} · {model.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-medium text-white/65">Role</span>
                <input
                  type="text"
                  value={editForm.role}
                  onChange={(event) => setEditForm((state) => ({ ...state, role: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/25"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-medium text-white/65">Role description / system prompt</span>
                <textarea
                  value={editForm.rolePrompt}
                  onChange={(event) => setEditForm((state) => ({ ...state, rolePrompt: event.target.value }))}
                  rows={5}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/25"
                />
              </label>

              <SkillsSection skills={editForm.skills} onToggleSkill={toggleEditSkill} />

              <div className="flex items-center justify-between gap-3 pt-1">
                <div>
                  {canRemoveSelectedSeat ? (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          removeActiveCouncilSeatMember(selectedSeatId);
                          closeModal();
                        }}
                        className="rounded-xl border border-red-400/15 bg-red-500/10 px-4 py-2.5 text-sm text-red-200 transition-colors hover:border-red-300/30 hover:bg-red-500/15"
                      >
                        Remove member
                      </button>

                      {isExtraSeat ? (
                        <button
                          type="button"
                          onClick={handleRemoveExtraSeat}
                          className="rounded-xl border border-red-400/15 bg-red-500/10 px-4 py-2.5 text-sm text-red-200 transition-colors hover:border-red-300/30 hover:bg-red-500/15"
                        >
                          Remove extra seat
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={submitEditMember}
                    className="rounded-xl border border-cyan-400/20 bg-cyan-400/15 px-4 py-2.5 text-sm font-medium text-cyan-100 transition-colors hover:border-cyan-300/35 hover:bg-cyan-400/20"
                  >
                    Save changes
                  </button>
                </div>
              </div>
            </div>

            {/* Rechte Spalte: Chat-Verlauf dieses Members */}
            <div
              className="flex w-72 shrink-0 flex-col rounded-2xl border border-white/10"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              {/* Panel-Header */}
              <div className="flex items-center gap-2.5 border-b border-white/8 px-4 py-3" style={{ borderBottomColor: 'rgba(255,255,255,0.08)' }}>
                <div
                  className="h-5 w-5 rounded-full"
                  style={{
                    backgroundColor: selectedSeatMember.color,
                    boxShadow: `0 0 8px ${selectedSeatMember.color}80`,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-white/80">Chat history</div>
                  <div className="text-[10px] text-white/35">{selectedSeatMember.name}</div>
                </div>
                <div className="text-[10px] text-white/30">
                  {(councilMemberMessages[selectedSeatId] || []).length} messages
                </div>
                <button
                  type="button"
                  onClick={openSeatChatPanel}
                  className="ml-1 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/55 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
                  aria-label="Open in chat bar panel"
                  title="Open in chat bar panel"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Nachrichten */}
              <div
                ref={chatScrollRef}
                className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-3 py-3"
                style={{ maxHeight: '380px' }}
              >
                {(councilMemberMessages[selectedSeatId] || []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div
                      className="mb-3 flex h-9 w-9 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: `${selectedSeatMember.color}18`,
                        border: `1px solid ${selectedSeatMember.color}28`,
                      }}
                    >
                      <MessageSquare className="h-4 w-4" style={{ color: selectedSeatMember.color }} />
                    </div>
                    <div className="text-xs text-white/40">No messages yet</div>
                    <div className="mt-1 text-[10px] text-white/25">
                      {selectedSeatMember.name} is quiet
                    </div>
                  </div>
                ) : (
                  (councilMemberMessages[selectedSeatId] || []).map((msg) => {
                    const isUser = msg.role === 'user';
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        {!isUser && (
                          <div
                            className="mt-0.5 h-5 w-5 shrink-0 rounded-full"
                            style={{
                              backgroundColor: selectedSeatMember.color,
                              boxShadow: `0 0 6px ${selectedSeatMember.color}60`,
                            }}
                          />
                        )}
                        <div className={`max-w-[85%] flex flex-col gap-0.5 ${isUser ? 'items-end' : 'items-start'}`}>
                          <div
                            className={`council-md rounded-xl px-3.5 py-2.5 text-xs leading-relaxed text-white ${
                              isUser ? 'rounded-tr-sm bg-white/10' : 'rounded-tl-sm'
                            }`}
                            style={{
                              ...((!isUser)
                                ? {
                                    backgroundColor: `${selectedSeatMember.color}20`,
                                    border: `1px solid ${selectedSeatMember.color}28`,
                                  }
                                : {}),
                              overflowWrap: 'anywhere',
                              wordBreak: 'break-word',
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {isUser ? msg.content : (
                              <CouncilMarkdown content={msg.content} />
                            )}
                          </div>
                          <div className="text-[9px] text-white/25">
                            {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
