import { describe, it, expect } from 'vitest';
import { COUNCIL_MEMBER_PRESETS, COUNCIL_PRESET_CATEGORIES } from '@/modules/agents/council-member-presets';

describe('COUNCIL_MEMBER_PRESETS', () => {
  it('has at least 25 presets across all categories', () => {
    expect(COUNCIL_MEMBER_PRESETS.length).toBeGreaterThanOrEqual(25);
  });

  it('has unique preset names', () => {
    const names = COUNCIL_MEMBER_PRESETS.map((preset) => preset.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('renamed the devil\'s-advocate preset away from "The Skeptic"', () => {
    expect(COUNCIL_MEMBER_PRESETS.some((preset) => preset.name === 'The Skeptic')).toBe(false);
    expect(COUNCIL_MEMBER_PRESETS.some((preset) => preset.name === "Devil's Advocate")).toBe(true);
  });

  it('every preset belongs to a known category', () => {
    for (const preset of COUNCIL_MEMBER_PRESETS) {
      expect(COUNCIL_PRESET_CATEGORIES).toContain(preset.category);
    }
  });

  it('has exactly 10 categories', () => {
    expect(COUNCIL_PRESET_CATEGORIES).toHaveLength(10);
  });

  it('every category has at least 2 presets', () => {
    for (const category of COUNCIL_PRESET_CATEGORIES) {
      const count = COUNCIL_MEMBER_PRESETS.filter((preset) => preset.category === category).length;
      expect(count).toBeGreaterThanOrEqual(2);
    }
  });

  it('every preset has a non-empty rolePrompt and a valid-looking suggestedModel', () => {
    for (const preset of COUNCIL_MEMBER_PRESETS) {
      expect(preset.rolePrompt.length).toBeGreaterThan(20);
      expect(preset.suggestedModel).toMatch(/\//);
      expect(preset.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
