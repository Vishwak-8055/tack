import type { CardDetail, UpdateCardInput } from '@tack/shared';

/** What the card will look like once the server accepts an update, so edits feel instant. */
export function applyUpdate(
  card: CardDetail,
  input: UpdateCardInput,
  now = new Date(),
): CardDetail {
  return {
    ...card,
    ...(input.title !== undefined && { title: input.title }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.dueAt !== undefined && { dueAt: input.dueAt }),
    ...(input.completed !== undefined && {
      completedAt: input.completed ? (card.completedAt ?? now.toISOString()) : null,
    }),
  };
}
