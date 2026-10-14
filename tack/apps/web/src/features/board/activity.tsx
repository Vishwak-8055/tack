import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { ActivityDTO } from '@tack/shared';

const name = (text: string | null | undefined) => (
  <span className="font-medium">{text || 'something'}</span>
);

/** One sentence per activity type, with the actor's name added by the caller. */
export function describeActivity(activity: ActivityDTO, boardId: string): ReactNode {
  const { data } = activity;
  const card = activity.cardId ? (
    <Link
      to={`/b/${boardId}/c/${activity.cardId}`}
      className="font-medium underline decoration-ink/30 underline-offset-2 hover:decoration-ink"
    >
      {data.title}
    </Link>
  ) : (
    name(data.title) // the card has since been deleted
  );

  switch (activity.type) {
    case 'board.created':
      return <>created this board</>;
    case 'board.updated':
      return (
        <>
          renamed the board from {name(data.from)} to {name(data.to)}
        </>
      );
    case 'list.created':
      return <>added the list {name(data.title)}</>;
    case 'list.renamed':
      return (
        <>
          renamed the list {name(data.from)} to {name(data.to)}
        </>
      );
    case 'list.deleted':
      return <>deleted the list {name(data.title)}</>;
    case 'card.created':
      return (
        <>
          added {card} to {name(data.list)}
        </>
      );
    case 'card.moved':
      return (
        <>
          moved {card} from {name(data.from)} to {name(data.to)}
        </>
      );
    case 'card.completed':
      return <>completed {card}</>;
    case 'card.reopened':
      return <>reopened {card}</>;
    case 'card.deleted':
      return <>deleted {name(data.title)}</>;
    case 'comment.added':
      return <>commented on {card}</>;
    case 'member.added':
      return <>added {name(data.name)} to the board</>;
    case 'member.removed':
      return <>removed {name(data.name)} from the board</>;
  }
}
