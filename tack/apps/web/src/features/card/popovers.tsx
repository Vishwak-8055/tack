import { Check, Clock, Pencil, Plus, Tag, Users } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
  LABEL_COLORS,
  type BoardDetail,
  type CardDetail,
  type Label,
  type LabelColor,
} from '@tack/shared';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { LabelChip } from '@/components/LabelChip';
import { cn } from '@/lib/cn';
import { LABEL_STYLES } from '@/lib/colors';
import { fromInputValue, toInputValue } from '@/lib/dates';
import { useLabelActions } from './labels';
import type { CardActions } from './mutations';

const sideButton = 'w-full justify-start';

// ---- labels ---------------------------------------------------------------------------------

type Mode = { kind: 'pick' } | { kind: 'edit'; label: Label | null };

export function LabelsPopover({
  board,
  card,
  actions,
}: {
  board: BoardDetail;
  card: CardDetail;
  actions: CardActions;
}) {
  const [mode, setMode] = useState<Mode>({ kind: 'pick' });

  return (
    <Popover onOpenChange={(open) => !open && setMode({ kind: 'pick' })}>
      <PopoverTrigger asChild>
        <Button size="sm" className={sideButton}>
          <Tag className="size-4" /> Labels
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        {mode.kind === 'pick' ? (
          <>
            <p className="mb-2 font-semibold">Labels</p>
            <ul className="space-y-1.5">
              {board.labels.map((label) => {
                const on = card.labelIds.includes(label.id);
                return (
                  <li key={label.id} className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => actions.toggleLabel.mutate({ labelId: label.id, on: !on })}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-lg p-0.5 hover:bg-ink/10"
                    >
                      <LabelChip
                        label={label}
                        className="min-h-8 flex-1 justify-start rounded-md"
                      />
                      <Check
                        className={cn('mr-1 size-4 shrink-0', !on && 'invisible')}
                        aria-hidden
                      />
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      aria-label={`Edit label ${label.name || label.color}`}
                      onClick={() => setMode({ kind: 'edit', label })}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
            <Button
              size="sm"
              className="mt-3 w-full"
              onClick={() => setMode({ kind: 'edit', label: null })}
            >
              <Plus className="size-4" /> Create a label
            </Button>
          </>
        ) : (
          <LabelEditor
            boardId={board.id}
            label={mode.label}
            onBack={() => setMode({ kind: 'pick' })}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

function LabelEditor({
  boardId,
  label,
  onBack,
}: {
  boardId: string;
  label: Label | null;
  onBack: () => void;
}) {
  const { create, update, remove } = useLabelActions(boardId);
  const [name, setName] = useState(label?.name ?? '');
  const [color, setColor] = useState<LabelColor>(label?.color ?? 'blue');
  const [confirming, setConfirming] = useState(false);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const input = { name: name.trim(), color };
    if (label) update.mutate({ id: label.id, ...input }, { onSuccess: onBack });
    else create.mutate(input, { onSuccess: onBack });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="font-semibold">{label ? 'Edit label' : 'New label'}</p>
      <LabelChip
        label={{ id: 'preview', name: name.trim(), color }}
        className="min-h-8 w-full justify-start rounded-md"
      />
      <Input
        autoFocus
        aria-label="Label name"
        placeholder="Name (optional)"
        value={name}
        maxLength={40}
        onChange={(event) => setName(event.target.value)}
      />
      <div role="radiogroup" aria-label="Colour" className="grid grid-cols-5 gap-1.5">
        {LABEL_COLORS.map((key) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={color === key}
            aria-label={key}
            title={key}
            onClick={() => setColor(key)}
            className={cn(
              'grid h-8 place-items-center rounded-md',
              color === key && 'ring-2 ring-ink ring-offset-2 ring-offset-surface',
            )}
            style={{ background: LABEL_STYLES[key].bg, color: LABEL_STYLES[key].fg }}
          >
            {color === key && <Check className="size-4" />}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          type="submit"
          variant="primary"
          size="sm"
          loading={create.isPending || update.isPending}
        >
          {label ? 'Save' : 'Create'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onBack}>
          Back
        </Button>
        {label && (
          <Button
            variant="danger-ghost"
            size="sm"
            className="ml-auto"
            loading={remove.isPending}
            onClick={() =>
              confirming ? remove.mutate(label.id, { onSuccess: onBack }) : setConfirming(true)
            }
          >
            {confirming ? 'Really delete?' : 'Delete'}
          </Button>
        )}
      </div>
    </form>
  );
}

// ---- assignees ------------------------------------------------------------------------------

export function AssigneesPopover({
  board,
  card,
  actions,
}: {
  board: BoardDetail;
  card: CardDetail;
  actions: CardActions;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" className={sideButton}>
          <Users className="size-4" /> Members
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <p className="mb-2 font-semibold">Assign people</p>
        <ul className="space-y-0.5">
          {board.members.map((member) => {
            const on = card.assigneeIds.includes(member.id);
            return (
              <li key={member.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => actions.toggleAssignee.mutate({ userId: member.id, on: !on })}
                  className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left hover:bg-ink/10"
                >
                  <Avatar user={member} size={28} />
                  <span className="min-w-0 flex-1 truncate">{member.name}</span>
                  <Check className={cn('size-4 shrink-0', !on && 'invisible')} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

// ---- due date -------------------------------------------------------------------------------

export function DuePopover({ card, actions }: { card: CardDetail; actions: CardActions }) {
  const [value, setValue] = useState('');

  return (
    <Popover onOpenChange={(open) => open && setValue(card.dueAt ? toInputValue(card.dueAt) : '')}>
      <PopoverTrigger asChild>
        <Button size="sm" className={sideButton}>
          <Clock className="size-4" /> Due date
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <label className="block space-y-1.5">
          <span className="font-semibold">Due date</span>
          <Input
            type="datetime-local"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </label>
        <div className="mt-3 flex items-center gap-1.5">
          <PopoverClose asChild>
            <Button
              variant="primary"
              size="sm"
              disabled={!value}
              onClick={() => actions.update.mutate({ dueAt: fromInputValue(value) })}
            >
              Save
            </Button>
          </PopoverClose>
          {card.dueAt && (
            <PopoverClose asChild>
              <Button size="sm" onClick={() => actions.update.mutate({ dueAt: null })}>
                Remove
              </Button>
            </PopoverClose>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
