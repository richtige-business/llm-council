import { describe, it, expect } from 'vitest';
import { getNextAvailableCouncilSeatId } from '@/modules/agents/lib/council-seats';
import type { CouncilSeatMemberData } from '@/modules/agents/types';

function makeMember(seatId: string): CouncilSeatMemberData {
  return {
    seatId,
    name: 'Test',
    color: '#000000',
    model: 'openai/gpt-4o',
    role: 'Test',
    rolePrompt: '',
    sourceAgentId: null,
    skills: [],
    createdAt: 0,
    updatedAt: 0,
  };
}

describe('getNextAvailableCouncilSeatId', () => {
  it('returns the first base seat when nothing is occupied', () => {
    expect(getNextAvailableCouncilSeatId([])).toBe('arc-left-0');
  });

  it('fills base seats in order before touching extra seats', () => {
    const occupied = [makeMember('arc-left-0'), makeMember('arc-right-0')];
    expect(getNextAvailableCouncilSeatId(occupied)).toBe('arc-left-1');
  });

  it('falls back to alternating extra seats once base seats are full', () => {
    const occupied = [
      makeMember('arc-left-0'),
      makeMember('arc-right-0'),
      makeMember('arc-left-1'),
      makeMember('arc-right-1'),
    ];
    expect(getNextAvailableCouncilSeatId(occupied)).toBe('arc-left-extra-0');
  });

  it('skips extra seat indices that are already occupied', () => {
    const occupied = [
      makeMember('arc-left-0'),
      makeMember('arc-right-0'),
      makeMember('arc-left-1'),
      makeMember('arc-right-1'),
      makeMember('arc-left-extra-0'),
    ];
    expect(getNextAvailableCouncilSeatId(occupied)).toBe('arc-right-extra-0');
  });
});
