import { describe, it, expect } from 'vitest';
import { parseGoalAndPrompt } from '@/modules/agents/components/CouncilOnboardingModal';

describe('parseGoalAndPrompt', () => {
  it('parses a clean JSON object', () => {
    const raw = '{"goal": "Decide on Q3 roadmap", "finalPrompt": "What should we prioritize in Q3?"}';
    expect(parseGoalAndPrompt(raw)).toEqual({
      goal: 'Decide on Q3 roadmap',
      finalPrompt: 'What should we prioritize in Q3?',
    });
  });

  it('strips markdown code fences', () => {
    const raw = '```json\n{"goal": "Pick a name", "finalPrompt": "What should we name the product?"}\n```';
    expect(parseGoalAndPrompt(raw)).toEqual({
      goal: 'Pick a name',
      finalPrompt: 'What should we name the product?',
    });
  });

  it('throws when goal is missing', () => {
    expect(() => parseGoalAndPrompt('{"finalPrompt": "only a prompt"}')).toThrow();
  });

  it('throws when finalPrompt is missing', () => {
    expect(() => parseGoalAndPrompt('{"goal": "only a goal"}')).toThrow();
  });

  it('throws on invalid JSON', () => {
    expect(() => parseGoalAndPrompt('not json at all')).toThrow();
  });
});
