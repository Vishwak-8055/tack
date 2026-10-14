import { useState } from 'react';
import { Link } from 'react-router';
import type { BoardSummary } from '@tack/shared';
import { Plus, Star } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { BOARD_STYLES } from '@/lib/colors';
import { cn } from '@/lib/cn';
import { useSession } from '@/features/auth/session';
import { CreateBoardDialog } from './CreateBoardDialog';
import { useBoards, useStarBoard } from './queries';

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

export function BoardsPage() {
  const { data: user } = useSession();
  const { data: boards, isPending, error, refetch } = useBoards();
  const [creating, setCreating] = useState(false);

  if (isPending) return <PageSpinner label="Loading boards" />;
  if (error) {
    return (
      <div className="mx-auto mt-24 max-w-sm text-center">
        <p className="font-display text-xl font-bold">Couldn't load your boards</p>
        <p className="mt-1 text-muted">Check your connection and try again.</p>
        <Button className="mt-4" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const starred = boards.filter((board) => board.starred);
  const rest = boards.filter((board) => !board.starred);
  const owned = rest.filter((board) => board.role === 'owner');
  const shared = rest.filter((board) => board.role !== 'owner');

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">
          {user ? `Hi ${user.name.split(' ')[0]}` : 'Your boards'}
        </h1>
        <Button variant="primary" onClick={() => setCreating(true)}>
          <Plus className="size-[18px]" /> New board
        </Button>
      </div>

      {boards.length === 0 ? (
        <section className="mt-10 rounded-sheet border border-dashed border-muted/50 px-6 py-14 text-center">
          <p className="font-display text-2xl font-bold">No boards yet</p>
          <p className="mx-auto mt-2 max-w-sm text-muted">
            A board holds the lists and cards for one piece of work. Start with the project you're
            on right now.
          </p>
          <Button variant="primary" className="mt-6" onClick={() => setCreating(true)}>
            Create a board
          </Button>
        </section>
      ) : (
        <div className="mt-8 space-y-10">
          {starred.length > 0 && <Group title="Starred" boards={starred} />}
          {owned.length > 0 && <Group title="Your boards" boards={owned} />}
          {shared.length > 0 && <Group title="Shared with you" boards={shared} />}
        </div>
      )}

      <CreateBoardDialog open={creating} onOpenChange={setCreating} />
    </main>
  );
}

function Group({ title, boards }: { title: string; boards: BoardSummary[] }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-3 font-display text-xl font-bold">{title}</h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {boards.map((board) => (
          <li key={board.id}>
            <BoardTile board={board} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function BoardTile({ board }: { board: BoardSummary }) {
  const star = useStarBoard();

  return (
    <div className="group relative">
      <Link
        to={`/b/${board.id}`}
        className="felt flex h-28 flex-col justify-between rounded-tray p-3.5 text-white shadow-slip transition-[filter] hover:brightness-110"
        style={{ backgroundColor: BOARD_STYLES[board.background].color }}
      >
        <span className="line-clamp-2 pr-8 font-display text-lg font-bold leading-tight">
          {board.title}
        </span>
        <span className="flex items-end justify-between text-sm text-white/85">
          <span>
            {plural(board.listCount, 'list')}, {plural(board.cardCount, 'card')}
          </span>
          {board.role !== 'owner' && (
            <span className="rounded-full bg-black/30 px-2 py-0.5 text-xs font-medium capitalize">
              {board.role}
            </span>
          )}
        </span>
      </Link>
      <button
        type="button"
        aria-label={board.starred ? `Unstar ${board.title}` : `Star ${board.title}`}
        aria-pressed={board.starred}
        onClick={() => star.mutate({ boardId: board.id, starred: !board.starred })}
        className={cn(
          'absolute right-2 top-2 grid size-8 place-items-center rounded-lg text-white transition-opacity hover:bg-black/25',
          board.starred
            ? 'opacity-100'
            : 'opacity-0 focus-visible:opacity-100 group-hover:opacity-100',
        )}
      >
        <Star className={cn('size-[18px]', board.starred && 'fill-accent text-accent')} />
      </button>
    </div>
  );
}
