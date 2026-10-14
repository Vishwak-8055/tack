import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import type { BoardDetail, CardDetail } from '@tack/shared';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { EditableText } from '@/components/ui/EditableText';
import { PageSpinner } from '@/components/ui/Spinner';
import { DueBadge } from '@/components/DueBadge';
import { LabelChip } from '@/components/LabelChip';
import { useBoard } from '@/features/board/queries';
import { useCardActions } from './mutations';
import { AssigneesPopover, DuePopover, LabelsPopover } from './popovers';
import { useCard } from './queries';
import { ChecklistSection, CommentsSection, DescriptionSection } from './sections';

export default function CardDialog() {
  const { boardId = '', cardId = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: board } = useBoard(boardId);
  const { data: card, isPending, isError } = useCard(cardId);

  // If we got here from the board, go back to it; if someone opened a shared link, replace.
  const close = () => {
    if (location.key !== 'default') navigate(-1);
    else navigate({ pathname: `/b/${boardId}`, search: location.search }, { replace: true });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent title={card?.title ?? 'Card'} hideTitle className="max-w-3xl p-0">
        {isPending || !board ? (
          <div className="p-12">
            <PageSpinner label="Loading card" />
          </div>
        ) : isError || !card ? (
          <div className="p-8 text-center">
            <p className="font-display text-xl font-bold">This card isn't here any more</p>
            <p className="mt-1 text-muted">It was probably deleted.</p>
            <Button className="mt-5" onClick={close}>
              Back to the board
            </Button>
          </div>
        ) : (
          <CardBody board={board} card={card} onClose={close} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CardBody({
  board,
  card,
  onClose,
}: {
  board: BoardDetail;
  card: CardDetail;
  onClose: () => void;
}) {
  const actions = useCardActions(board.id, card.id);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const canEdit = board.role !== 'viewer';
  const list = board.lists.find((candidate) => candidate.id === card.listId);
  const labels = card.labelIds.flatMap((id) => board.labels.find((label) => label.id === id) ?? []);
  const assignees = card.assigneeIds.flatMap((id) => board.members.find((m) => m.id === id) ?? []);

  return (
    <div className="grid gap-x-6 gap-y-5 p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_11.5rem]">
      <div className="min-w-0 space-y-6 md:col-start-1 md:row-start-1">
        <header className="pr-8">
          <h2 className="font-display text-2xl font-bold leading-tight">
            <EditableText
              multiline
              value={card.title}
              label="Card title"
              disabled={!canEdit}
              onSave={(title) => actions.update.mutate({ title })}
            />
          </h2>
          <p className="mt-1 px-1.5 text-sm text-muted">
            in list <span className="font-medium text-ink">{list?.title ?? 'unknown'}</span>
          </p>
        </header>

        {(labels.length > 0 || assignees.length > 0 || card.dueAt) && (
          <dl className="flex flex-wrap gap-x-7 gap-y-3 px-1.5">
            {labels.length > 0 && (
              <Attribute label="Labels">
                <div className="flex flex-wrap gap-1">
                  {labels.map((label) => (
                    <LabelChip key={label.id} label={label} />
                  ))}
                </div>
              </Attribute>
            )}
            {assignees.length > 0 && (
              <Attribute label="Members">
                <div className="flex flex-wrap gap-1.5">
                  {assignees.map((member) => (
                    <Avatar key={member.id} user={member} size={30} />
                  ))}
                </div>
              </Attribute>
            )}
            {card.dueAt && (
              <Attribute label="Due date">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!card.completedAt}
                    disabled={!canEdit}
                    onChange={(event) => actions.update.mutate({ completed: event.target.checked })}
                    className="size-4 accent-[var(--ok)]"
                  />
                  <span className="sr-only">Mark complete</span>
                  <DueBadge card={card} />
                </label>
              </Attribute>
            )}
          </dl>
        )}

        <DescriptionSection card={card} canEdit={canEdit} actions={actions} />
        <ChecklistSection card={card} canEdit={canEdit} actions={actions} />
        <CommentsSection
          card={card}
          canEdit={canEdit}
          isOwner={board.role === 'owner'}
          actions={actions}
        />
      </div>

      {canEdit && (
        <aside
          aria-label="Card actions"
          className="order-first mt-8 grid grid-cols-2 gap-2 self-start sm:grid-cols-4 md:order-none md:col-start-2 md:row-start-1 md:grid-cols-1"
        >
          <LabelsPopover board={board} card={card} actions={actions} />
          <AssigneesPopover board={board} card={card} actions={actions} />
          <DuePopover card={card} actions={actions} />
          <Button
            variant="danger-ghost"
            size="sm"
            className="w-full justify-start md:mt-4"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 className="size-4" /> Delete card
          </Button>
        </aside>
      )}

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title="Delete this card?"
        description="Its checklist and comments go with it. This can't be undone."
        confirmLabel="Delete card"
        loading={actions.remove.isPending}
        onConfirm={() => actions.remove.mutate(undefined, { onSuccess: onClose })}
      />
    </div>
  );
}

function Attribute({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="mb-1 text-sm font-semibold text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
