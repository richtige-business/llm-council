// ============================================
// ScheduledTaskEditor.tsx - Detail-Editor fuer eine Scheduled Task
//
// Zweck: Bearbeitet Trigger, Prompt, Ziel und Ausgabe
//        einer einzelnen geplanten Agent-Aufgabe
// Verwendet von: ScheduledTasksPage.tsx
// ============================================

'use client';

import { Save, Bot, Repeat, CalendarClock, Settings2 } from 'lucide-react';
import { useState } from 'react';
import type { ScheduledAgentTask, ScheduledTaskOutputMode, ScheduledTaskStatus, ScheduledTaskTargetType } from '../types';

interface TargetOption {
  id: string;
  name: string;
  kind: ScheduledTaskTargetType;
}

interface ConversationOption {
  id: string;
  title: string;
}

interface ScheduledTaskEditorProps {
  task: ScheduledAgentTask | null;
  targetOptions: TargetOption[];
  conversationOptions: ConversationOption[];
  lockTargetSelection?: boolean;
  lockedTargetLabel?: string;
  onSave: (taskId: string, updates: Partial<ScheduledAgentTask>) => void;
}

function toDateTimeLocal(timestampOrIso?: number | string | null): string {
  if (!timestampOrIso) return '';
  const date = typeof timestampOrIso === 'number' ? new Date(timestampOrIso) : new Date(timestampOrIso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
}

export function ScheduledTaskEditor({
  task,
  targetOptions,
  conversationOptions,
  lockTargetSelection = false,
  lockedTargetLabel,
  onSave,
}: ScheduledTaskEditorProps) {
  if (!task) {
    return (
      <div className="flex h-full items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
        <div>
          <h2 className="text-base font-semibold text-white">Keine Task ausgewaehlt</h2>
          <p className="mt-2 text-sm text-white/45">
            Waehle links eine Scheduled Task aus oder lege eine neue Aufgabe an.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScheduledTaskEditorForm
      key={task.id}
      task={task}
      targetOptions={targetOptions}
      conversationOptions={conversationOptions}
      lockTargetSelection={lockTargetSelection}
      lockedTargetLabel={lockedTargetLabel}
      onSave={onSave}
    />
  );
}

function ScheduledTaskEditorForm({
  task,
  targetOptions,
  conversationOptions,
  onSave,
}: {
  task: ScheduledAgentTask;
  targetOptions: TargetOption[];
  conversationOptions: ConversationOption[];
  lockTargetSelection: boolean;
  lockedTargetLabel?: string;
  onSave: (taskId: string, updates: Partial<ScheduledAgentTask>) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [targetType, setTargetType] = useState<ScheduledTaskTargetType>(task.targetType);
  const [targetId, setTargetId] = useState(task.targetId);
  const [type, setType] = useState(task.type);
  const [status, setStatus] = useState<ScheduledTaskStatus>(task.status);
  const [enabled, setEnabled] = useState(task.enabled);
  const [timezone, setTimezone] = useState(task.timezone);
  const [runAt, setRunAt] = useState(toDateTimeLocal(task.runAt));
  const [frequency, setFrequency] = useState(task.recurring?.frequency || 'daily');
  const [interval, setInterval] = useState(task.recurring?.interval || 1);
  const [weekdays, setWeekdays] = useState<number[]>(task.recurring?.weekdays || [1]);
  const [dayOfMonth, setDayOfMonth] = useState(task.recurring?.dayOfMonth || 1);
  const [time, setTime] = useState(task.recurring?.time || '09:00');
  const [startDate, setStartDate] = useState(task.recurring?.startDate || '');
  const [endDate, setEndDate] = useState(task.recurring?.endDate || '');
  const [prompt, setPrompt] = useState(task.prompt);
  const [outputMode, setOutputMode] = useState<ScheduledTaskOutputMode>(task.outputMode);
  const [targetConversationId, setTargetConversationId] = useState(task.targetConversationId || '');
  const [retryCount, setRetryCount] = useState(task.retryCount);
  const [timeoutSeconds, setTimeoutSeconds] = useState(task.timeoutSeconds);

  const filteredTargetOptions = targetOptions.filter((option) => option.kind === targetType);

  const handleToggleWeekday = (weekday: number) => {
    setWeekdays((prev) =>
      prev.includes(weekday) ? prev.filter((entry) => entry !== weekday) : [...prev, weekday].sort((a, b) => a - b)
    );
  };

  const handleSave = () => {
    onSave(task.id, {
      title: title.trim() || 'Neue Scheduled Task',
      description: description.trim(),
      targetType,
      targetId,
      type,
      status,
      enabled,
      timezone: timezone.trim() || 'Europe/Berlin',
      runAt: type === 'one-time' && runAt ? new Date(runAt).toISOString() : undefined,
      recurring:
        type === 'recurring'
          ? {
              frequency,
              interval: Math.max(1, interval),
              weekdays: frequency === 'weekly' ? weekdays : undefined,
              dayOfMonth: frequency === 'monthly' ? dayOfMonth : undefined,
              time,
              startDate: startDate || undefined,
              endDate: endDate || undefined,
            }
          : undefined,
      prompt: prompt.trim(),
      outputMode,
      targetConversationId: outputMode === 'existing-conversation' ? targetConversationId || null : null,
      retryCount: Math.max(0, retryCount),
      timeoutSeconds: Math.max(30, timeoutSeconds),
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">{title || 'Neue Scheduled Task'}</h2>
            <p className="mt-1 text-sm text-white/45">
              Definiert, wann ein Agent oder eine Gruppe automatisch ausgefuehrt werden soll.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-600"
          >
            <Save className="h-4 w-4" />
            Speichern
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-4 flex items-center gap-2">
              <Bot className="h-4 w-4 text-white/60" />
              <h3 className="text-sm font-semibold text-white">Basics</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-white/60">Titel</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/25 focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-white/60">Beschreibung</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/25 focus:outline-none"
                />
              </div>
              {lockTargetSelection ? (
                <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-white/60">Target</p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {lockedTargetLabel || filteredTargetOptions[0]?.name || 'Aktueller Agent'}
                  </p>
                  <p className="mt-1 text-[11px] text-white/40">
                    Diese Task-Seite ist an den aktuell ausgewaehlten Orb gebunden.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="mb-1 block text-xs text-white/60">Target Type</label>
                    <select
                      value={targetType}
                      onChange={(event) => setTargetType(event.target.value as ScheduledTaskTargetType)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/25 focus:outline-none"
                    >
                      <option value="agent">Agent</option>
                      <option value="group">Gruppe</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-white/60">Target</label>
                    <select
                      value={targetId}
                      onChange={(event) => setTargetId(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/25 focus:outline-none"
                    >
                      {filteredTargetOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-4 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-white/60" />
              <h3 className="text-sm font-semibold text-white">Trigger</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-white/60">Typ</label>
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value as ScheduledAgentTask['type'])}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/25 focus:outline-none"
                >
                  <option value="one-time">One-time</option>
                  <option value="recurring">Recurring</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/60">Zeitzone</label>
                <input
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/25 focus:outline-none"
                />
              </div>
              {type === 'one-time' ? (
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs text-white/60">Ausfuehren am</label>
                  <input
                    type="datetime-local"
                    value={runAt}
                    onChange={(event) => setRunAt(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/25 focus:outline-none"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="mb-1 block text-xs text-white/60">Frequenz</label>
                    <select
                      value={frequency}
                      onChange={(event) => setFrequency(event.target.value as NonNullable<ScheduledAgentTask['recurring']>['frequency'])}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/25 focus:outline-none"
                    >
                      <option value="daily">Taeglich</option>
                      <option value="weekly">Woechentlich</option>
                      <option value="monthly">Monatlich</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-white/60">Intervall</label>
                    <input
                      type="number"
                      min="1"
                      value={interval}
                      onChange={(event) => setInterval(Number(event.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/25 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-white/60">Uhrzeit</label>
                    <input
                      type="time"
                      value={time}
                      onChange={(event) => setTime(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/25 focus:outline-none"
                    />
                  </div>
                  {frequency === 'monthly' && (
                    <div>
                      <label className="mb-1 block text-xs text-white/60">Tag des Monats</label>
                      <input
                        type="number"
                        min="1"
                        max="28"
                        value={dayOfMonth}
                        onChange={(event) => setDayOfMonth(Number(event.target.value))}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/25 focus:outline-none"
                      />
                    </div>
                  )}
                  {frequency === 'weekly' && (
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs text-white/60">Wochentage</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 1, label: 'Mo' },
                          { id: 2, label: 'Di' },
                          { id: 3, label: 'Mi' },
                          { id: 4, label: 'Do' },
                          { id: 5, label: 'Fr' },
                          { id: 6, label: 'Sa' },
                          { id: 0, label: 'So' },
                        ].map((weekday) => (
                          <button
                            key={weekday.id}
                            type="button"
                            onClick={() => handleToggleWeekday(weekday.id)}
                            className={`rounded-full px-3 py-1.5 text-xs ${
                              weekdays.includes(weekday.id)
                                ? 'bg-white/15 text-white'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                            }`}
                          >
                            {weekday.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="mb-1 block text-xs text-white/60">Startdatum</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/25 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-white/60">Enddatum</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/25 focus:outline-none"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-4 flex items-center gap-2">
              <Repeat className="h-4 w-4 text-white/60" />
              <h3 className="text-sm font-semibold text-white">Prompt & Output</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-white/60">Task Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  rows={7}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white placeholder:text-white/35 focus:border-white/25 focus:outline-none"
                  placeholder="Was soll der Agent automatisch erledigen?"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-white/60">Output Mode</label>
                  <select
                    value={outputMode}
                    onChange={(event) => setOutputMode(event.target.value as ScheduledTaskOutputMode)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/25 focus:outline-none"
                  >
                    <option value="task-log">Task Log</option>
                    <option value="new-conversation">Neue Konversation</option>
                    <option value="existing-conversation">Bestehende Konversation</option>
                    <option value="notification">Notification</option>
                  </select>
                </div>
                {outputMode === 'existing-conversation' && (
                  <div>
                    <label className="mb-1 block text-xs text-white/60">Ziel-Konversation</label>
                    <select
                      value={targetConversationId}
                      onChange={(event) => setTargetConversationId(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/25 focus:outline-none"
                    >
                      <option value="">Konversation waehlen...</option>
                      {conversationOptions.map((conversation) => (
                        <option key={conversation.id} value={conversation.id}>
                          {conversation.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-4 flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-white/60" />
              <h3 className="text-sm font-semibold text-white">Execution</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-white/60">Status</label>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as ScheduledTaskStatus)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/25 focus:outline-none"
                >
                  <option value="active">Aktiv</option>
                  <option value="paused">Pausiert</option>
                  <option value="completed">Completed</option>
                  <option value="error">Error</option>
                </select>
              </div>
              <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                <span className="text-sm text-white/75">Task aktiviert</span>
                <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
              </label>
              <div>
                <label className="mb-1 block text-xs text-white/60">Retry Count</label>
                <input
                  type="number"
                  min="0"
                  value={retryCount}
                  onChange={(event) => setRetryCount(Number(event.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/25 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/60">Timeout (Sekunden)</label>
                <input
                  type="number"
                  min="30"
                  step="30"
                  value={timeoutSeconds}
                  onChange={(event) => setTimeoutSeconds(Number(event.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/25 focus:outline-none"
                />
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/55">
                <p>Letzter Lauf: {task.lastRunAt ? new Date(task.lastRunAt).toLocaleString('de-DE') : 'Noch nie'}</p>
                <p className="mt-1">
                  Naechster Lauf: {task.nextRunAt ? new Date(task.nextRunAt).toLocaleString('de-DE') : 'Kein Termin'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

