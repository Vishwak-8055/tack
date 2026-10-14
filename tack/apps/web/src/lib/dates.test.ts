import { describe, expect, it } from 'vitest';
import { dueState, formatDue, fromInputValue, toInputValue } from './dates';

const now = new Date(2026, 9, 11, 12, 0); // 11 Oct 2026, noon, local time
const at = (dayOffset: number, hour = 12) =>
  new Date(2026, 9, 11 + dayOffset, hour, 0).toISOString();

describe('dueState', () => {
  it('is null without a due date', () => {
    expect(dueState({ dueAt: null, completedAt: null }, now)).toBeNull();
  });

  it('is done once completed, even if the date has passed', () => {
    expect(dueState({ dueAt: at(-3), completedAt: at(-2) }, now)).toBe('done');
  });

  it('is overdue after the due time', () => {
    expect(dueState({ dueAt: at(0, 11), completedAt: null }, now)).toBe('overdue');
  });

  it('is soon within the next 24 hours', () => {
    expect(dueState({ dueAt: at(0, 20), completedAt: null }, now)).toBe('soon');
  });

  it('is later beyond that', () => {
    expect(dueState({ dueAt: at(2), completedAt: null }, now)).toBe('later');
  });
});

describe('formatDue', () => {
  it('speaks plainly about nearby days', () => {
    expect(formatDue(at(0, 17), now)).toMatch(/^Today, 5:00 PM$/);
    expect(formatDue(at(1, 9), now)).toMatch(/^Tomorrow, 9:00 AM$/);
    expect(formatDue(at(-1, 9), now)).toMatch(/^Yesterday, 9:00 AM$/);
  });

  it('uses a short date this year and adds the year otherwise', () => {
    expect(formatDue(at(9), now)).toBe('Oct 20');
    expect(formatDue(new Date(2027, 2, 4, 9, 0).toISOString(), now)).toBe('Mar 4, 2027');
  });
});

describe('datetime-local helpers', () => {
  it('round-trips through the input format', () => {
    const iso = new Date(2026, 11, 24, 18, 30).toISOString();
    expect(toInputValue(iso)).toBe('2026-12-24T18:30');
    expect(fromInputValue('2026-12-24T18:30')).toBe(iso);
  });
});
