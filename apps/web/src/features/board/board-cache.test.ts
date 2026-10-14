import { describe, expect, it } from 'vitest';
import {
  cardsByList,
  moveCardInBoard,
  moveListInBoard,
  removeList,
  summaryOf,
  upsertCard,
  upsertList,
} from './board-cache';
import { board, card, list } from './fixtures';

const titles = (cards: { title: string }[] | undefined) => cards?.map((c) => c.title);

const sample = () =>
  board(
    [list('todo', 'a0'), list('doing', 'a1'), list('done', 'a2')],
    [
      card('A', 'todo', 'a0'),
      card('B', 'todo', 'a1'),
      card('C', 'todo', 'a2'),
      card('D', 'doing', 'a0'),
    ],
  );

describe('cardsByList', () => {
  it('groups by list in display order, including empty lists', () => {
    const groups = cardsByList({
      lists: sample().lists,
      cards: [card('B', 'todo', 'a1'), card('A', 'todo', 'a0'), card('D', 'doing', 'a0')],
    });
    expect(titles(groups.get('todo'))).toEqual(['A', 'B']);
    expect(titles(groups.get('doing'))).toEqual(['D']);
    expect(groups.get('done')).toEqual([]);
  });
});

describe('moveCardInBoard', () => {
  it('moves a card to the top of its own list', () => {
    const next = moveCardInBoard(sample(), 'C', 'todo', null);
    expect(titles(cardsByList(next).get('todo'))).toEqual(['C', 'A', 'B']);
  });

  it('moves a card into another list, after a given card', () => {
    const next = moveCardInBoard(sample(), 'A', 'doing', 'D');
    expect(titles(cardsByList(next).get('todo'))).toEqual(['B', 'C']);
    expect(titles(cardsByList(next).get('doing'))).toEqual(['D', 'A']);
    expect(next.cards.find((c) => c.id === 'A')?.listId).toBe('doing');
  });

  it('moves into an empty list', () => {
    const next = moveCardInBoard(sample(), 'B', 'done', null);
    expect(titles(cardsByList(next).get('done'))).toEqual(['B']);
  });

  it('leaves the board alone for an unknown card, and never mutates its input', () => {
    const original = sample();
    expect(moveCardInBoard(original, 'nope', 'todo', null)).toBe(original);
    const snapshot = JSON.stringify(original);
    moveCardInBoard(original, 'A', 'done', null);
    expect(JSON.stringify(original)).toBe(snapshot);
  });
});

describe('moveListInBoard', () => {
  it('reorders lists and keeps them sorted', () => {
    const next = moveListInBoard(sample(), 'done', null);
    expect(next.lists.map((l) => l.id)).toEqual(['done', 'todo', 'doing']);
    expect(moveListInBoard(next, 'done', 'todo').lists.map((l) => l.id)).toEqual([
      'todo',
      'done',
      'doing',
    ]);
  });
});

describe('upsert and remove', () => {
  it('adds a card that is new and replaces one that exists', () => {
    const added = upsertCard(sample(), card('E', 'done', 'a0'));
    expect(added.cards).toHaveLength(5);
    const replaced = upsertCard(added, card('E', 'done', 'a0', { title: 'Renamed' }));
    expect(replaced.cards).toHaveLength(5);
    expect(replaced.cards.find((c) => c.id === 'E')?.title).toBe('Renamed');
  });

  it('inserts lists in position order', () => {
    const next = upsertList(sample(), list('middle', 'a05'));
    expect(next.lists.map((l) => l.id)).toEqual(['todo', 'middle', 'doing', 'done']);
  });

  it('removes a list together with its cards', () => {
    const next = removeList(sample(), 'todo');
    expect(next.lists.map((l) => l.id)).toEqual(['doing', 'done']);
    expect(next.cards.map((c) => c.id)).toEqual(['D']);
  });
});

describe('summaryOf', () => {
  it('derives the tile counts from a full card', () => {
    const summary = summaryOf({
      ...card('A', 'todo', 'a0'),
      description: 'notes',
      createdAt: '2026-01-01T00:00:00.000Z',
      checklist: [
        { id: '1', text: 'x', done: true, position: 'a0' },
        { id: '2', text: 'y', done: false, position: 'a1' },
      ],
      comments: [
        {
          id: 'c',
          author: null,
          body: 'hi',
          createdAt: '2026-01-01T00:00:00.000Z',
          editedAt: null,
        },
      ],
    });
    expect(summary).toMatchObject({
      hasDescription: true,
      checklistTotal: 2,
      checklistDone: 1,
      commentCount: 1,
    });
    expect(summary).not.toHaveProperty('description');
  });
});
