import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { timeAgo } from '@/lib/dates';
import { describeActivity } from './activity';
import { useActivity } from './queries';

export function ActivityPanel({
  boardId,
  open,
  onOpenChange,
}: {
  boardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const activity = useActivity(boardId, open);
  const items = activity.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-[#08121c]/45" />
        <RadixDialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm animate-drawer-in flex-col bg-surface shadow-sheet outline-none"
        >
          <header className="flex items-center justify-between border-b border-line py-3 pl-5 pr-3">
            <RadixDialog.Title className="font-display text-xl font-bold">
              Activity
            </RadixDialog.Title>
            <RadixDialog.Close
              aria-label="Close activity"
              className="grid size-8 place-items-center rounded-lg text-muted hover:bg-ink/10 hover:text-ink"
            >
              <X className="size-4" />
            </RadixDialog.Close>
          </header>

          <div className="thin-scroll flex-1 overflow-y-auto px-5 py-2">
            {activity.isPending ? (
              <div role="status" className="grid place-items-center py-16 text-muted">
                <Spinner />
                <span className="sr-only">Loading activity</span>
              </div>
            ) : activity.isError ? (
              <p className="py-10 text-center text-muted">Couldn't load the activity.</p>
            ) : items.length === 0 ? (
              <p className="py-10 text-center text-muted">Nothing has happened yet.</p>
            ) : (
              <ol className="divide-y divide-line">
                {items.map((item) => (
                  <li key={item.id} className="flex gap-3 py-3">
                    <Avatar user={item.actor ?? { id: 'unknown', name: 'Someone' }} size={32} />
                    <div className="min-w-0">
                      <p className="break-words leading-snug">
                        <span className="font-bold">{item.actor?.name ?? 'Someone'}</span>{' '}
                        {describeActivity(item, boardId)}
                      </p>
                      <time dateTime={item.createdAt} className="text-sm text-muted">
                        {timeAgo(item.createdAt)}
                      </time>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            {activity.hasNextPage && (
              <div className="py-3 text-center">
                <Button
                  size="sm"
                  loading={activity.isFetchingNextPage}
                  onClick={() => void activity.fetchNextPage()}
                >
                  Show older activity
                </Button>
              </div>
            )}
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
