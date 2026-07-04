import { beforeEach, describe, expect, it } from 'vitest';
import { useBaseStore } from '@/lib/bases/store';
import { createDefaultWorkflowRule } from '@/lib/automation/types';

describe('Base Store', () => {
  beforeEach(() => {
    useBaseStore.setState({ bases: [] });
  });

  it('erstellt und loescht Bases', () => {
    const { createBase, deleteBase } = useBaseStore.getState();

    const baseId = createBase({ name: 'ERP' });
    expect(useBaseStore.getState().bases).toHaveLength(1);
    expect(useBaseStore.getState().bases[0]?.name).toBe('ERP');

    deleteBase(baseId);
    expect(useBaseStore.getState().bases).toHaveLength(0);
  });

  it('ordnet Module zu und verschiebt bei Reassign', () => {
    const { createBase, assignModuleToBase } = useBaseStore.getState();

    const baseA = createBase({ name: 'ERP' });
    const baseB = createBase({ name: 'Personal' });

    assignModuleToBase('calendar', baseA);
    expect(useBaseStore.getState().bases.find((b) => b.id === baseA)?.moduleIds).toEqual(['calendar']);

    assignModuleToBase('calendar', baseB);
    expect(useBaseStore.getState().bases.find((b) => b.id === baseA)?.moduleIds).toEqual([]);
    expect(useBaseStore.getState().bases.find((b) => b.id === baseB)?.moduleIds).toEqual(['calendar']);
  });

  it('entfernt Module aus Base und liefert unzugeordnete Module', () => {
    const { createBase, assignModuleToBase, removeModuleFromBase, getUnassignedModuleIds } = useBaseStore.getState();

    const baseA = createBase({ name: 'ERP' });
    assignModuleToBase('calendar', baseA);
    assignModuleToBase('inbox', baseA);

    removeModuleFromBase('inbox', baseA);

    const unassigned = getUnassignedModuleIds(['calendar', 'inbox', 'browser']);
    expect(unassigned).toEqual(['inbox', 'browser']);
  });

  it('bereinigt fehlende Modul-IDs', () => {
    const { createBase, assignModuleToBase, cleanupMissingModules } = useBaseStore.getState();

    const baseA = createBase({ name: 'ERP' });
    assignModuleToBase('calendar', baseA);
    assignModuleToBase('inbox', baseA);

    cleanupMissingModules(['calendar']);

    expect(useBaseStore.getState().bases.find((b) => b.id === baseA)?.moduleIds).toEqual(['calendar']);
  });

  it('verwaltet Workflow-Verbindungen inkl. Aktivierung und Run-Status', () => {
    const { createBase, upsertWorkflow, listWorkflows, setWorkflowActive, setWorkflowRunState, deleteWorkflow } =
      useBaseStore.getState();

    const baseId = createBase({ name: 'ERP' });
    const workflow = createDefaultWorkflowRule('wf-1');
    workflow.name = 'Order Flow';

    upsertWorkflow(baseId, workflow);
    let workflows = listWorkflows(baseId);
    expect(workflows).toHaveLength(1);
    expect(workflows[0]?.connectionType).toBe('workflow.v1');
    expect(workflows[0]?.rule.name).toBe('Order Flow');
    expect(workflows[0]?.rule.isActive).toBe(false);

    setWorkflowActive(baseId, 'wf-1', true);
    setWorkflowRunState(baseId, 'wf-1', 'success', '2026-02-15T10:00:00.000Z');

    workflows = listWorkflows(baseId);
    expect(workflows[0]?.rule.isActive).toBe(true);
    expect(workflows[0]?.rule.lastRunStatus).toBe('success');
    expect(workflows[0]?.rule.lastRunAt).toBe('2026-02-15T10:00:00.000Z');

    deleteWorkflow(baseId, 'wf-1');
    workflows = listWorkflows(baseId);
    expect(workflows).toHaveLength(0);
  });
});
