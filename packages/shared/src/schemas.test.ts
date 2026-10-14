import { describe, expect, it } from 'vitest';
import {
  createBoardSchema,
  moveCardSchema,
  registerSchema,
  updateBoardSchema,
  updateCardSchema,
} from './schemas';

describe('schemas', () => {
  it('trims names and lowercases emails', () => {
    expect(
      registerSchema.parse({ name: ' Ada ', email: ' ADA@Example.COM ', password: 'long enough' }),
    ).toEqual({ name: 'Ada', email: 'ada@example.com', password: 'long enough' });
  });

  it('asks for a sensible password', () => {
    const result = registerSchema.safeParse({ name: 'Ada', email: 'a@b.co', password: 'short' });
    expect(result.success).toBe(false);
  });

  it('fills in board defaults', () => {
    expect(createBoardSchema.parse({ title: 'Roadmap' })).toEqual({
      title: 'Roadmap',
      background: 'moss',
      template: 'kanban',
    });
  });

  it('refuses unknown backgrounds', () => {
    expect(createBoardSchema.safeParse({ title: 'x', background: 'neon' }).success).toBe(false);
  });

  it('refuses updates that change nothing', () => {
    expect(updateBoardSchema.safeParse({}).success).toBe(false);
    expect(updateCardSchema.safeParse({}).success).toBe(false);
  });

  it('accepts ISO due dates and null, but not loose text', () => {
    expect(updateCardSchema.parse({ dueAt: '2030-05-01T09:00:00.000Z' })).toEqual({
      dueAt: '2030-05-01T09:00:00.000Z',
    });
    expect(updateCardSchema.parse({ dueAt: null })).toEqual({ dueAt: null });
    expect(updateCardSchema.safeParse({ dueAt: 'tomorrow' }).success).toBe(false);
  });

  it('needs real ids to move a card', () => {
    expect(moveCardSchema.safeParse({ listId: 'nope', afterId: null }).success).toBe(false);
    expect(
      moveCardSchema.safeParse({
        listId: '6f1d6a4e-3c58-4d6f-9d2b-0d3a8a0f7b11',
        afterId: null,
      }).success,
    ).toBe(true);
  });
});
