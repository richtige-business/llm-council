// ============================================
// AddParticipantModal.tsx - Teilnehmer zu Gruppe hinzufügen
//
// Zweck: Kompaktes Fenster nur zum Hinzufügen von Teilnehmern
//        (keine Gruppeneinstellungen)
// Verwendet von: AgentHierarchySidebar.tsx (Plus-Button neben Gruppe)
// ============================================

'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2 } from 'lucide-react';
import { useAgentsStore } from '../store';
import type { GroupChatParticipantRole } from '../types';

// --------------------------------------------
// Eingebaute Agenten als Teilnehmer-Optionen
// --------------------------------------------
const BUILT_IN_AGENT_OPTIONS = [
  { id: 'master', name: 'Intelligence' },
  { id: 'calendar', name: 'Kalender' },
  { id: 'inbox', name: 'Inbox' },
  { id: 'lab', name: 'Lab' },
];

interface AddParticipantModalProps {
  groupId: string;
  groupName: string;
  onClose: () => void;
}

function buildInitialParticipants(
  participantRoles?: GroupChatParticipantRole[]
): GroupChatParticipantRole[] {
  return participantRoles?.length
    ? [...participantRoles, { agentId: '', role: '' }]
    : [{ agentId: '', role: '' }];
}

export function AddParticipantModal({
  groupId,
  groupName,
  onClose,
}: AddParticipantModalProps) {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
  const customAgents = useAgentsStore((state) => state.customAgents);
  const updateGroupAgent = useAgentsStore((state) => state.updateGroupAgent);

  const group = useMemo(
    () => customAgents.find((agent) => agent.id === groupId && agent.type === 'group'),
    [customAgents, groupId]
  );

  const participantOptions = useMemo(() => {
    const customAgentOptions = customAgents
      .filter((agent) => agent.type !== 'group' && agent.id !== groupId)
      .map((agent) => ({ id: agent.id, name: agent.name }));
    return [...BUILT_IN_AGENT_OPTIONS, ...customAgentOptions];
  }, [customAgents, groupId]);

  const [participants, setParticipants] = useState<GroupChatParticipantRole[]>(
    buildInitialParticipants(group?.participantRoles)
  );
  const [formError, setFormError] = useState('');

  const addParticipantRow = () => {
    setParticipants((prev) => [...prev, { agentId: '', role: '' }]);
  };

  const updateParticipantRow = (index: number, updates: Partial<GroupChatParticipantRole>) => {
    setParticipants((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...updates } : p))
    );
  };

  const removeParticipantRow = (index: number) => {
    setParticipants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    setFormError('');
    const normalizedParticipants = participants
      .filter((p) => p.agentId?.trim())
      .map((p) => ({
        agentId: p.agentId!.trim(),
        role: p.role?.trim() || '',
      }));

    if (normalizedParticipants.length === 0) {
      setFormError('Bitte mindestens einen Teilnehmer hinzufügen.');
      return;
    }

    if (
      group?.adminAgentId
      && !normalizedParticipants.some((participant) => participant.agentId === group.adminAgentId)
    ) {
      setFormError('Der aktuelle Admin muss Gruppenmitglied bleiben oder in den Gruppeneinstellungen neu gesetzt werden.');
      return;
    }

    updateGroupAgent(groupId, {
      ...group!,
      participantRoles: normalizedParticipants,
      adminAgentId: group?.adminAgentId,
    });
    onClose();
  };

  if (!mounted || !group) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 mx-4 w-full max-w-md overflow-hidden rounded-xl border border-white/10 bg-[#111827]/95 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Teilnehmer hinzufügen</h3>
            <p className="text-[11px] text-white/45">Zu &quot;{groupName}&quot;</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white/80"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs text-white/70">Agent und Rolle</label>
              <button
                onClick={addParticipantRow}
                className="flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[11px] text-white/80 hover:bg-white/20"
              >
                <Plus className="h-3 w-3" />
                Zeile
              </button>
            </div>
            <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
              {participants.map((participant, index) => (
                <div key={`add-participant-${index}`} className="flex items-center gap-1.5">
                  <select
                    value={participant.agentId}
                    onChange={(e) => updateParticipantRow(index, { agentId: e.target.value })}
                    className="flex-1 rounded-lg border border-white/10 bg-white/10 px-2 py-1.5 text-[11px] text-white focus:outline-none"
                  >
                    <option value="">Agent wählen...</option>
                    {participantOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={participant.role}
                    onChange={(e) => updateParticipantRow(index, { role: e.target.value })}
                    placeholder="Rolle"
                    className="w-28 rounded-lg border border-white/10 bg-white/10 px-2 py-1.5 text-[11px] text-white placeholder:text-white/40 focus:outline-none"
                  />
                  <button
                    onClick={() => removeParticipantRow(index)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          {formError && <p className="text-[11px] text-rose-300">{formError}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 hover:text-white"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-600"
          >
            Hinzufügen
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
