// ============================================
// CouncilOnboardingModal.tsx - Eldest-Onboarding fuer neue Councils
//
// Zweck: Lässt den User kurz beschreiben, was für einen Rat er
//        braucht und welche Frage(n) er stellen will. Der Eldest
//        schlägt daraufhin fertig konfigurierte Mitglieder vor
//        (Name, Rolle, Systemprompt, Modell), die der User per
//        Checkbox annehmen kann. Zusätzlich stehen 15 kuratierte
//        Standard-Presets zur Auswahl.
// Verwendet von: AgentsModuleShell.tsx
// ============================================

'use client';

import { useMemo, useState } from 'react';
import { Loader2, Sparkles, WandSparkles, X } from 'lucide-react';
import { useAgentsStore } from '../store';
import { executeCouncilCompletion } from '../council-runtime';
import { DEFAULT_OPENROUTER_MODEL_ID, normalizeOpenRouterModelId } from '@/lib/llm/model-catalog';
import { COUNCIL_MEMBER_PRESETS, type CouncilMemberPreset } from '../council-member-presets';
import { getNextAvailableCouncilSeatId } from '../lib/council-seats';
import type { CouncilSeatMemberData } from '../types';

interface ProposedMember {
  name: string;
  role: string;
  rolePrompt: string;
  suggestedModel: string;
  reason?: string;
}

interface CouncilOnboardingModalProps {
  onClose: () => void;
}

function parseProposedMembers(raw: string): ProposedMember[] {
  const withoutFences = raw
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();

  const parsed = JSON.parse(withoutFences);
  const members = parsed?.members;

  if (!Array.isArray(members)) {
    throw new Error('Antwort enthält kein "members"-Array.');
  }

  return members
    .filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null)
    .map((entry) => ({
      name: String(entry.name || '').trim(),
      role: String(entry.role || '').trim(),
      rolePrompt: String(entry.rolePrompt || '').trim(),
      suggestedModel: String(entry.suggestedModel || DEFAULT_OPENROUTER_MODEL_ID).trim(),
      reason: entry.reason ? String(entry.reason).trim() : undefined,
    }))
    .filter((member) => member.name.length > 0);
}

export interface GoalAndPrompt {
  goal: string;
  finalPrompt: string;
}

export function parseGoalAndPrompt(raw: string): GoalAndPrompt {
  const withoutFences = raw
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();

  const parsed = JSON.parse(withoutFences);
  const goal = typeof parsed?.goal === 'string' ? parsed.goal.trim() : '';
  const finalPrompt = typeof parsed?.finalPrompt === 'string' ? parsed.finalPrompt.trim() : '';

  if (!goal) {
    throw new Error('Antwort enthält kein "goal".');
  }
  if (!finalPrompt) {
    throw new Error('Antwort enthält keinen "finalPrompt".');
  }

  return { goal, finalPrompt };
}

const PROPOSAL_COLORS = ['#F97316', '#0EA5E9', '#22C55E', '#EC4899', '#A855F7', '#F59E0B', '#14B8A6', '#EF4444'];

function colorForIndex(index: number): string {
  return PROPOSAL_COLORS[index % PROPOSAL_COLORS.length];
}

function MemberCandidateCard({
  name,
  role,
  model,
  reason,
  color,
  checked,
  onToggle,
}: {
  name: string;
  role: string;
  model: string;
  reason?: string;
  color: string;
  checked: boolean;
  onToggle: () => void;
}) {
  const initial = (name.trim().charAt(0) || '?').toUpperCase();

  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5 transition-colors hover:border-white/20">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-1 h-4 w-4 rounded border-white/20 bg-white/10 accent-cyan-400"
      />
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
        style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}60` }}
      >
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white">{name}</div>
        <div className="text-[11px] text-white/45">
          {role}
          {model ? ` · ${model}` : ''}
        </div>
        {reason ? <p className="mt-1 text-[11px] leading-relaxed text-white/40">{reason}</p> : null}
      </div>
    </label>
  );
}

export function CouncilOnboardingModal({ onClose }: CouncilOnboardingModalProps) {
  const activeCouncilDraftSeatMembers = useAgentsStore((state) => state.activeCouncilDraftSeatMembers);
  const upsertActiveCouncilSeatMember = useAgentsStore((state) => state.upsertActiveCouncilSeatMember);

  const [step, setStep] = useState<'describe' | 'refine' | 'propose'>('describe');
  const [goal, setGoal] = useState('');
  const [finalPrompt, setFinalPrompt] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [proposedMembers, setProposedMembers] = useState<ProposedMember[]>([]);
  const [selectedProposedNames, setSelectedProposedNames] = useState<Set<string>>(new Set());
  const [selectedPresetNames, setSelectedPresetNames] = useState<Set<string>>(new Set());
  const [showPresets, setShowPresets] = useState(false);

  const selectedCount = selectedProposedNames.size + selectedPresetNames.size;

  const requestGoalAndPrompt = async () => {
    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const systemPrompt = `You are the "Eldest" / chair of a new LLM council. The user will roughly describe what kind of council they want and what question(s) they plan to ask.

Turn this into a sharp, well-scoped council goal and a single well-crafted opening question to pose to the council.

Respond with STRICT JSON only, no markdown fences, no commentary, in exactly this shape:
{"goal": "a short, clear council goal/title, max ~8 words", "finalPrompt": "the actual opening question to send to the council, written clearly and completely"}`;

      const raw = await executeCouncilCompletion({
        messages: [{ role: 'user', content: trimmedDescription }],
        moduleId: 'master',
        model: DEFAULT_OPENROUTER_MODEL_ID,
        systemPrompt,
      });

      const parsed = parseGoalAndPrompt(raw);
      setGoal(parsed.goal);
      setFinalPrompt(parsed.finalPrompt);
      setStep('refine');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verfeinerung ist fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  const requestProposals = async () => {
    const trimmedGoal = goal.trim();
    const trimmedFinalPrompt = finalPrompt.trim();
    if (!trimmedGoal || !trimmedFinalPrompt) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const systemPrompt = `You are the "Eldest" / chair of a new LLM council. The council's goal is: "${trimmedGoal}". The opening question will be: "${trimmedFinalPrompt}".

Propose 4 to 8 well-suited council members. Each member needs a distinct perspective relevant to this goal and question.

Respond with STRICT JSON only, no markdown fences, no commentary, in exactly this shape:
{"members": [{"name": "...", "role": "...", "rolePrompt": "2-3 sentences describing how this member thinks and argues", "suggestedModel": "provider/model-id", "reason": "1 short sentence why this member is useful here"}]}

Use OpenRouter-style model ids for suggestedModel, e.g. "openai/gpt-4o", "anthropic/claude-sonnet-4", "google/gemini-2.5-pro".`;

      const raw = await executeCouncilCompletion({
        messages: [{ role: 'user', content: `${trimmedGoal}\n\n${trimmedFinalPrompt}` }],
        moduleId: 'master',
        model: DEFAULT_OPENROUTER_MODEL_ID,
        systemPrompt,
      });

      const members = parseProposedMembers(raw);
      if (members.length === 0) {
        throw new Error('Es wurden keine Mitglieder vorgeschlagen.');
      }

      setProposedMembers(members);
      setSelectedProposedNames(new Set(members.map((member) => member.name)));
      setStep('propose');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vorschlag ist fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  const toggleProposed = (name: string) => {
    setSelectedProposedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const togglePreset = (name: string) => {
    setSelectedPresetNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const confirmSelection = () => {
    const seatMembersSoFar = [...activeCouncilDraftSeatMembers];

    const selectedProposed = proposedMembers.filter((member) => selectedProposedNames.has(member.name));
    const selectedPresets: CouncilMemberPreset[] = COUNCIL_MEMBER_PRESETS.filter((preset) =>
      selectedPresetNames.has(preset.name)
    );

    for (let i = 0; i < selectedProposed.length; i += 1) {
      const member = selectedProposed[i];
      const seatId = getNextAvailableCouncilSeatId(seatMembersSoFar);
      const newMember: CouncilSeatMemberData = {
        seatId,
        name: member.name,
        color: colorForIndex(i),
        model: normalizeOpenRouterModelId(member.suggestedModel),
        role: member.role || member.name,
        rolePrompt: member.rolePrompt,
        sourceAgentId: null,
        skills: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      upsertActiveCouncilSeatMember(newMember);
      seatMembersSoFar.push(newMember);
    }

    for (const preset of selectedPresets) {
      const seatId = getNextAvailableCouncilSeatId(seatMembersSoFar);
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
      seatMembersSoFar.push(newMember);
    }

    onClose();
  };

  const proposedCards = useMemo(
    () =>
      proposedMembers.map((member, index) => (
        <MemberCandidateCard
          key={member.name}
          name={member.name}
          role={member.role}
          model={member.suggestedModel}
          reason={member.reason}
          color={colorForIndex(index)}
          checked={selectedProposedNames.has(member.name)}
          onToggle={() => toggleProposed(member.name)}
        />
      )),
    [proposedMembers, selectedProposedNames]
  );

  return (
    <div className="absolute inset-0 z-[95] flex items-center justify-center bg-slate-950/72 px-4 py-10 backdrop-blur-md">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />

      <div className="relative z-[1] flex max-h-[85vh] w-full max-w-2xl flex-col rounded-[28px] border border-white/10 bg-[#08101d]/96 p-5 shadow-[0_20px_80px_rgba(2,6,23,0.5)] backdrop-blur-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/80">
              <WandSparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/45">
                Mit Eldest planen
              </div>
              <h3 className="mt-1 text-xl font-semibold text-white">
                {step === 'describe' ? 'Was für einen Rat brauchst du?' : 'Vorgeschlagene Mitglieder'}
              </h3>
            </div>
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

        <div className="min-h-0 flex-1 overflow-y-auto">
          {step === 'describe' ? (
            <div className="space-y-4">
              <label className="space-y-2">
                <span className="text-xs font-medium text-white/65">
                  Erzähl mir, was für einen Rat du brauchst und welche Frage(n) du stellen willst.
                </span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={8}
                  placeholder="z.B. Ich will einen Rat, der mir hilft zu entscheiden, ob ich mein Startup weiterführen oder einen Job annehmen soll. Ich werde Fragen zu Risiko, Finanzen und langfristiger Zufriedenheit stellen."
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/25"
                />
              </label>

              {error ? <p className="text-sm text-red-300">{error}</p> : null}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-white/40">
                  Vorschläge vom Eldest
                </div>
                <div className="space-y-2">{proposedCards}</div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowPresets((prev) => !prev)}
                  className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs font-medium text-white/70 transition-colors hover:border-white/20 hover:bg-white/10"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Standard-Presets {showPresets ? 'ausblenden' : `anzeigen (${COUNCIL_MEMBER_PRESETS.length})`}
                </button>

                {showPresets ? (
                  <div className="space-y-2">
                    {COUNCIL_MEMBER_PRESETS.map((preset) => (
                      <MemberCandidateCard
                        key={preset.name}
                        name={preset.name}
                        role={preset.role}
                        model={preset.suggestedModel}
                        color={preset.color}
                        checked={selectedPresetNames.has(preset.name)}
                        onToggle={() => togglePreset(preset.name)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
          {step === 'describe' ? (
            <button
              type="button"
              onClick={requestProposals}
              disabled={loading || !description.trim()}
              className="flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/15 px-4 py-2.5 text-sm font-medium text-cyan-100 transition-colors hover:border-cyan-300/35 hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? 'Eldest überlegt…' : 'Vorschläge holen'}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep('describe')}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                Zurück
              </button>
              <button
                type="button"
                onClick={confirmSelection}
                disabled={selectedCount === 0}
                className="rounded-xl border border-cyan-400/20 bg-cyan-400/15 px-4 py-2.5 text-sm font-medium text-cyan-100 transition-colors hover:border-cyan-300/35 hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {selectedCount} Mitglied{selectedCount === 1 ? '' : 'er'} übernehmen
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
