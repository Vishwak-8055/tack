import { useRef, useState } from 'react';
import { Link, Outlet, useParams } from 'react-router';
import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/api';
import { BOARD_STYLES } from '@/lib/colors';
import { useHotkeys } from '@/lib/hotkeys';
import { useDocumentTitle } from '@/lib/title';
import { ActivityPanel } from './ActivityPanel';
import { BoardCanvas } from './BoardCanvas';
import { BoardHeader } from './BoardHeader';
import { FilterBar } from './FilterBar';
import { useBoardFilters } from './filters';
import { useBoardEvents } from './realtime';
import { useBoard } from './queries';

export function BoardPage() {
  const { boardId = '' } = useParams();
  const { data: board, error, isPending, refetch } = useBoard(boardId);
  useBoardEvents(boardId);
  useDocumentTitle(board?.title);

  const { filters, update, clear, activeCount } = useBoardFilters();
  // A shared link with filters in it should open with them visible.
  const [filtersOpen, setFiltersOpen] = useState(activeCount > 0);
  const [activityOpen, setActivityOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useHotkeys({
    '/': () => {
      setFiltersOpen(true);
      requestAnimationFrame(() => searchRef.current?.focus());
    },
    f: () => setFiltersOpen((open) => !open),
    a: () => setActivityOpen((open) => !open),
  });

  if (isPending) return <BoardSkeleton />;

  if (error || !board) {
    const missing = error instanceof ApiError && error.status === 404;
    return (
      <main className="mx-auto mt-24 max-w-sm px-4 text-center">
        <p className="font-display text-2xl font-bold">
          {missing ? "We can't find that board" : "Couldn't load this board"}
        </p>
        <p className="mt-2 text-muted">
          {missing
            ? "It may have been deleted, or you don't have access to it."
            : 'Check your connection and try again.'}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          {!missing && <Button onClick={() => void refetch()}>Try again</Button>}
          <Link
            to="/"
            className="inline-flex h-10 items-center rounded-lg border border-line bg-surface px-4 font-medium hover:bg-sunken"
          >
            All boards
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div
      className="felt flex h-[calc(100dvh-3.25rem)] flex-col overflow-hidden"
      style={{ backgroundColor: BOARD_STYLES[board.background].color }}
    >
      <BoardHeader
        board={board}
        activeFilters={activeCount}
        filtersOpen={filtersOpen}
        onToggleFilters={() => setFiltersOpen((open) => !open)}
        onToggleActivity={() => setActivityOpen((open) => !open)}
      />
      {filtersOpen && (
        <FilterBar
          board={board}
          filters={filters}
          activeCount={activeCount}
          onChange={update}
          onClear={clear}
          searchRef={searchRef}
        />
      )}
      <BoardCanvas board={board} filters={filters} />

      <ActivityPanel boardId={board.id} open={activityOpen} onOpenChange={setActivityOpen} />
      <Outlet />
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading board"
      className="h-[calc(100dvh-3.25rem)] animate-pulse bg-sunken p-4"
    >
      <div className="mb-4 h-8 w-64 rounded-lg bg-line" />
      <div className="flex gap-3">
        {[5, 3, 4].map((cards, column) => (
          <div key={column} className="w-72 shrink-0 space-y-2 rounded-tray bg-tray p-2.5">
            <div className="h-5 w-28 rounded bg-line" />
            {Array.from({ length: cards }, (_, i) => (
              <div key={i} className="h-14 rounded-slip bg-surface" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
