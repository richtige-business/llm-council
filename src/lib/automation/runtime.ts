import { useEventBus } from '@/lib/events/event-bus';
import { useBaseStore } from '@/lib/bases/store';
import { normalizeWorkflowRule } from '@/lib/automation/types';
import { runWorkflow, workflowHasEventTrigger } from '@/lib/automation/engine';

type RuntimeUnsubscribe = () => void;

const workflowSubscriptions = new Map<string, RuntimeUnsubscribe>();
let storeUnsubscribe: RuntimeUnsubscribe | null = null;

async function executeAndTrack(baseId: string, workflowId: string, payload: Record<string, unknown>) {
  const baseStore = useBaseStore.getState();
  const workflows = baseStore.listWorkflows(baseId);
  const workflowEntry = workflows.find((workflow) => workflow.rule.workflowId === workflowId);
  if (!workflowEntry) return;

  baseStore.setWorkflowRunState(baseId, workflowId, 'running');
  const result = await runWorkflow({
    baseId,
    workflow: workflowEntry.rule,
    initialPayload: payload,
  });
  baseStore.setWorkflowRunState(
    baseId,
    workflowId,
    result.success ? 'success' : 'failed'
  );
}

function rebuildWorkflowSubscriptions() {
  workflowSubscriptions.forEach((unsubscribe) => unsubscribe());
  workflowSubscriptions.clear();

  const baseState = useBaseStore.getState();
  for (const base of baseState.bases) {
    for (const connection of base.connections) {
      if (connection.connectionType !== 'workflow.v1' || !connection.isActive) continue;
      const workflowRule = normalizeWorkflowRule(connection.rule);
      if (!workflowRule || !workflowRule.isActive) continue;
      if (!workflowHasEventTrigger(workflowRule)) continue;

      const sourceModuleId = workflowRule.triggerConfig.sourceModuleId!;
      const eventName = workflowRule.triggerConfig.eventName!;
      const key = `${base.id}:${workflowRule.workflowId}`;
      const unsubscribe = useEventBus.getState().subscribe(eventName, (event) => {
        const eventSource = event?.source?.moduleId;
        if (eventSource !== sourceModuleId) return;
        void executeAndTrack(base.id, workflowRule.workflowId, {
          eventType: event.type,
          payload: (event.payload || {}) as Record<string, unknown>,
          source: event.source as unknown as Record<string, unknown>,
          timestamp: event.timestamp,
        });
      });
      workflowSubscriptions.set(key, unsubscribe);
    }
  }
}

export function initializeAutomationRuntime() {
  if (typeof window === 'undefined') return () => undefined;
  if (storeUnsubscribe) return shutdownAutomationRuntime;

  rebuildWorkflowSubscriptions();
  storeUnsubscribe = useBaseStore.subscribe(() => {
    rebuildWorkflowSubscriptions();
  });

  return shutdownAutomationRuntime;
}

export function shutdownAutomationRuntime() {
  workflowSubscriptions.forEach((unsubscribe) => unsubscribe());
  workflowSubscriptions.clear();

  if (storeUnsubscribe) {
    storeUnsubscribe();
    storeUnsubscribe = null;
  }
}

export async function runWorkflowManually(
  baseId: string,
  workflowId: string,
  payload: Record<string, unknown> = {}
): Promise<{ success: boolean; error?: string }> {
  const workflows = useBaseStore.getState().listWorkflows(baseId);
  const workflow = workflows.find((entry) => entry.rule.workflowId === workflowId);
  if (!workflow) {
    return { success: false, error: 'Workflow nicht gefunden.' };
  }

  await executeAndTrack(baseId, workflowId, payload);
  const latest = useBaseStore
    .getState()
    .listWorkflows(baseId)
    .find((entry) => entry.rule.workflowId === workflowId);
  if (!latest) return { success: false, error: 'Workflow nicht gefunden.' };

  if (latest.rule.lastRunStatus === 'failed') {
    return { success: false, error: 'Workflow-Ausführung fehlgeschlagen.' };
  }

  return { success: true };
}
