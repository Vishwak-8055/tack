import { Check, Ellipsis, LogOut, Palette, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { BOARD_BACKGROUNDS, type BoardDetail } from '@tack/shared';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/Menu';
import { useSession } from '@/features/auth/session';
import { BOARD_STYLES } from '@/lib/colors';
import { cn } from '@/lib/cn';
import { boardsKey } from '@/features/boards/queries';
import { useRemoveMember } from './members';
import { useDeleteBoard, useUpdateBoard } from './mutations';

type Panel = 'background' | 'delete' | 'leave' | null;

export function BoardMenu({ board }: { board: BoardDetail }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: me } = useSession();
  const update = useUpdateBoard(board.id);
  const deleteBoard = useDeleteBoard(board.id);
  const leave = useRemoveMember(board.id);
  const [panel, setPanel] = useState<Panel>(null);

  const isOwner = board.role === 'owner';
  const canEdit = board.role !== 'viewer';

  return (
    <>
      <Menu>
        <MenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Board menu"
            className="text-white hover:bg-white/20"
          >
            <Ellipsis className="size-5" />
          </Button>
        </MenuTrigger>
        <MenuContent>
          {canEdit && (
            <MenuItem onSelect={() => setPanel('background')}>
              <Palette className="size-4" /> Change background
            </MenuItem>
          )}
          {isOwner ? (
            <MenuItem danger onSelect={() => setPanel('delete')}>
              <Trash2 className="size-4" /> Delete board
            </MenuItem>
          ) : (
            <MenuItem danger onSelect={() => setPanel('leave')}>
              <LogOut className="size-4" /> Leave board
            </MenuItem>
          )}
        </MenuContent>
      </Menu>

      <Dialog open={panel === 'background'} onOpenChange={(open) => !open && setPanel(null)}>
        <DialogContent title="Board background">
          <div role="radiogroup" aria-label="Background" className="mt-4 grid grid-cols-3 gap-3">
            {BOARD_BACKGROUNDS.map((key) => {
              const selected = board.background === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    update.mutate({ background: key });
                    setPanel(null);
                  }}
                  className={cn(
                    'felt flex h-16 items-end justify-between rounded-tray p-2 text-sm font-semibold text-white',
                    selected && 'ring-2 ring-ink ring-offset-2 ring-offset-surface',
                  )}
                  style={{ backgroundColor: BOARD_STYLES[key].color }}
                >
                  {BOARD_STYLES[key].name}
                  {selected && <Check className="size-4" />}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={panel === 'delete'}
        onOpenChange={(open) => !open && setPanel(null)}
        title={`Delete "${board.title}"?`}
        description={`All ${board.lists.length} lists and ${board.cards.length} cards go with it, for everyone. This can't be undone.`}
        confirmLabel="Delete board"
        loading={deleteBoard.isPending}
        onConfirm={() =>
          deleteBoard.mutate(undefined, { onSuccess: () => navigate('/', { replace: true }) })
        }
      />

      <ConfirmDialog
        open={panel === 'leave'}
        onOpenChange={(open) => !open && setPanel(null)}
        title="Leave this board?"
        description="You'll lose access until the owner adds you again."
        confirmLabel="Leave board"
        loading={leave.isPending}
        onConfirm={() =>
          leave.mutate(me!.id, {
            onSuccess: () => {
              void queryClient.invalidateQueries({ queryKey: boardsKey });
              navigate('/', { replace: true });
            },
          })
        }
      />
    </>
  );
}
