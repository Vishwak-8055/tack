import { describe, expect, it } from 'vitest';
import type { CardDetail } from '@tack/shared';
import { card } from '../board/fixtures';
import { applyUpdate } from './apply-update';

const detail: CardDetail = {
  ...card('A', 'todo', 'a0', { title: 'Original' }),
  description: '',
  checklist: [],
  comments: [],
  createdAt: '2026-01-01T00:00:00.000Z',
};
const now = new Date('2026-10-11T12:00:00.000Z');

describe('applyUpdate', () => {
  it('applies only the fields that were sent', () => {
    const next = applyUpdate(detail, { title: 'Renamed' }, now);
    expect(next.title).toBe('Renamed');
    expect(next.description).toBe('');
  });

  it('sets and clears due dates', () => {
    const due = applyUpdate(detail, { dueAt: '2030-01-01T00:00:00.000Z' }, now);
    expect(due.dueAt).toBe('2030-01-01T00:00:00.000Z');
    expect(applyUpdate(due, { dueAt: null }, now).dueAt).toBeNull();
  });

  it('completes with a timestamp, keeps an existing one, and reopens', () => {
    const done = applyUpdate(detail, { completed: true }, now);
    expect(done.completedAt).toBe(now.toISOString());
    expect(applyUpdate(done, { completed: true }, new Date('2030-01-01')).completedAt).toBe(
      now.toISOString(),
    );
    expect(applyUpdate(done, { completed: false }, now).completedAt).toBeNull();
  });

  it('does not change its input', () => {
    applyUpdate(detail, { title: 'x', completed: true }, now);
    expect(detail.title).toBe('Original');
    expect(detail.completedAt).toBeNull();
  });
});
