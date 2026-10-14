import { describe, expect, it } from 'vitest';
import {
  byPosition,
  computeMovePosition,
  initialPositions,
  positionAtEnd,
  type Positioned,
} from './ordering';

const make = (n: number): Positioned[] =>
  initialPositions(n).map((position, i) => ({ id: `item-${i}`, position }));
const order = (items: Positioned[]) => [...items].sort(byPosition).map((item) => item.id);

describe('computeMovePosition', () => {
  it('goes first when there is no anchor', () => {
    const items = make(3);
    const moved = { id: 'new', position: computeMovePosition(items, null) };
    expect(order([...items, moved])).toEqual(['new', 'item-0', 'item-1', 'item-2']);
  });

  it('goes between two neighbours', () => {
    const items = make(3);
    const moved = { id: 'new', position: computeMovePosition(items, 'item-0') };
    expect(order([...items, moved])).toEqual(['item-0', 'new', 'item-1', 'item-2']);
  });

  it('goes last when the anchor is the last item', () => {
    const items = make(3);
    const moved = { id: 'new', position: computeMovePosition(items, 'item-2') };
    expect(order([...items, moved])).toEqual(['item-0', 'item-1', 'item-2', 'new']);
  });

  it('works on an empty list', () => {
    expect(computeMovePosition([], null)).toBeTypeOf('string');
    expect(positionAtEnd([])).toBeTypeOf('string');
  });

  it('falls back to the end when the anchor has disappeared', () => {
    const items = make(2);
    const moved = { id: 'new', position: computeMovePosition(items, 'deleted-item') };
    expect(order([...items, moved])).toEqual(['item-0', 'item-1', 'new']);
  });

  it('does not throw when two siblings share a key', () => {
    const items: Positioned[] = [
      { id: 'a', position: 'a0' },
      { id: 'b', position: 'a0' },
    ];
    expect(() => computeMovePosition(items, 'a')).not.toThrow();
  });

  it('matches a plain array after hundreds of random moves', () => {
    // Small deterministic generator so a failure is reproducible.
    let state = 42;
    const random = () => (state = (state * 1_664_525 + 1_013_904_223) % 2 ** 32) / 2 ** 32;

    const items = make(8);
    let model = items.map((item) => item.id);

    for (let step = 0; step < 500; step++) {
      const id = model[Math.floor(random() * model.length)]!;
      const rest = model.filter((other) => other !== id);
      const anchor = Math.floor(random() * (rest.length + 1)) - 1; // -1 means "first"

      const siblings = items.filter((item) => item.id !== id).sort(byPosition);
      items.find((item) => item.id === id)!.position = computeMovePosition(
        siblings,
        anchor < 0 ? null : rest[anchor]!,
      );
      model = [...rest.slice(0, anchor + 1), id, ...rest.slice(anchor + 1)];

      expect(order(items)).toEqual(model);
    }
    expect(new Set(items.map((item) => item.position)).size).toBe(items.length);
  });
});
