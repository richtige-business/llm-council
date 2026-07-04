import { describe, it, expect, beforeEach } from 'vitest';
import { useAgentsStore } from '@/modules/agents/store';

describe('pendingCouncilPromptDraft', () => {
  beforeEach(() => {
    useAgentsStore.setState({ pendingCouncilPromptDraft: null });
  });

  it('defaults to null', () => {
    expect(useAgentsStore.getState().pendingCouncilPromptDraft).toBeNull();
  });

  it('sets and clears the draft', () => {
    const { setPendingCouncilPromptDraft } = useAgentsStore.getState();

    setPendingCouncilPromptDraft('What should our Q3 roadmap be?');
    expect(useAgentsStore.getState().pendingCouncilPromptDraft).toBe('What should our Q3 roadmap be?');

    setPendingCouncilPromptDraft(null);
    expect(useAgentsStore.getState().pendingCouncilPromptDraft).toBeNull();
  });
});
