import { describe, expect, it } from 'vitest';
import {
  countActive,
  matchesFilters,
  noFilters,
  readFilters,
  writeFilters,
  type Filters,
} from './filters';
import { card } from './fixtures';

const now = new Date(2026, 9, 11, 12, 0);
const hours = (n: number) => new Date(now.getTime() + n * 3_600_000).toISOString();
const only = (patch: Partial<Filters>): Filters => ({ ...noFilters, ...patch });

describe('matchesFilters', () => {
  const base = card('Fix the checkout bug', 'todo', 'a0', {
    labelIds: ['red'],
    assigneeIds: ['maya'],
  });

  it('matches everything when no filters are set', () => {
    expect(matchesFilters(base, noFilters, now)).toBe(true);
  });

  it('searches titles without caring about case or padding', () => {
    expect(matchesFilters(base, only({ query: '  CHECKOUT ' }), now)).toBe(true);
    expect(matchesFilters(base, only({ query: 'invoice' }), now)).toBe(false);
  });

  it('matches a label or member if the card has any of the selected ones', () => {
    expect(matchesFilters(base, only({ labels: ['blue', 'red'] }), now)).toBe(true);
    expect(matchesFilters(base, only({ labels: ['blue'] }), now)).toBe(false);
    expect(matchesFilters(base, only({ members: ['sam', 'maya'] }), now)).toBe(true);
    expect(matchesFilters(base, only({ members: ['sam'] }), now)).toBe(false);
  });

  it('combines different filters with AND', () => {
    expect(matchesFilters(base, only({ labels: ['red'], members: ['sam'] }), now)).toBe(false);
    expect(matchesFilters(base, only({ labels: ['red'], query: 'bug' }), now)).toBe(true);
  });

  it('filters on due state', () => {
    const overdue = card('a', 'l', 'a0', { dueAt: hours(-5) });
    const soon = card('b', 'l', 'a0', { dueAt: hours(5) });
    const done = card('c', 'l', 'a0', { dueAt: hours(-5), completedAt: hours(-6) });
    const undated = card('d', 'l', 'a0');

    expect(matchesFilters(overdue, only({ due: 'overdue' }), now)).toBe(true);
    expect(matchesFilters(soon, only({ due: 'overdue' }), now)).toBe(false);
    expect(matchesFilters(soon, only({ due: 'soon' }), now)).toBe(true);
    expect(matchesFilters(done, only({ due: 'done' }), now)).toBe(true);
    expect(matchesFilters(done, only({ due: 'overdue' }), now)).toBe(false);
    expect(matchesFilters(undated, only({ due: 'none' }), now)).toBe(true);
    expect(matchesFilters(soon, only({ due: 'none' }), now)).toBe(false);
  });
});

describe('countActive', () => {
  it('counts each selection once and ignores blank searches', () => {
    expect(countActive(noFilters)).toBe(0);
    expect(countActive(only({ query: '   ' }))).toBe(0);
    expect(countActive({ query: 'x', labels: ['a', 'b'], members: ['m'], due: 'soon' })).toBe(5);
  });
});

describe('URL round trip', () => {
  it('reads what it writes', () => {
    const filters: Filters = {
      query: 'pricing page',
      labels: ['a', 'b'],
      members: ['m'],
      due: 'overdue',
    };
    expect(readFilters(writeFilters(new URLSearchParams(), filters))).toEqual(filters);
  });

  it('keeps unrelated params and drops cleared filters', () => {
    const params = new URLSearchParams('foo=1&q=old&label=x&due=soon');
    const next = writeFilters(params, noFilters);
    expect(next.toString()).toBe('foo=1');
  });

  it('ignores a due value it does not know', () => {
    expect(readFilters(new URLSearchParams('due=someday')).due).toBeNull();
  });
});
