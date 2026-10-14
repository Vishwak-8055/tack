import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { BOARD_BACKGROUNDS, createBoardSchema, type BoardBackground } from '@tack/shared';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Field, Input } from '@/components/ui/Field';
import { fieldsOf, messageOf } from '@/lib/api';
import { BOARD_STYLES } from '@/lib/colors';
import { cn } from '@/lib/cn';
import { zodFields } from '@/lib/forms';
import { useCreateBoard } from './queries';

export function CreateBoardDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const create = useCreateBoard();

  const [title, setTitle] = useState('');
  const [background, setBackground] = useState<BoardBackground>('moss');
  const [starterLists, setStarterLists] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = createBoardSchema.safeParse({
      title,
      background,
      template: starterLists ? 'kanban' : 'blank',
    });
    if (!parsed.success) return setErrors(zodFields(parsed.error));

    create.mutate(parsed.data, {
      onSuccess: (board) => {
        onOpenChange(false);
        navigate(`/b/${board.id}`);
      },
      onError: (error) => setErrors({ title: fieldsOf(error).title ?? messageOf(error) }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Create a board">
        <form onSubmit={onSubmit} noValidate className="mt-4 space-y-5">
          <div
            className="felt grid h-24 place-items-center rounded-tray px-4 font-display text-xl font-bold text-white"
            style={{ backgroundColor: BOARD_STYLES[background].color }}
          >
            <span className="line-clamp-2 text-center">{title.trim() || 'Untitled board'}</span>
          </div>

          <Field label="Title" error={errors.title}>
            <Input
              autoFocus
              value={title}
              maxLength={100}
              aria-invalid={!!errors.title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Background</legend>
            <div role="radiogroup" className="flex flex-wrap gap-2">
              {BOARD_BACKGROUNDS.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={background === key}
                  aria-label={BOARD_STYLES[key].name}
                  title={BOARD_STYLES[key].name}
                  onClick={() => setBackground(key)}
                  className={cn(
                    'felt grid size-10 place-items-center rounded-lg text-white ring-offset-2 ring-offset-surface',
                    background === key && 'ring-2 ring-ink',
                  )}
                  style={{ backgroundColor: BOARD_STYLES[key].color }}
                >
                  {background === key && <Check className="size-4" />}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={starterLists}
              onChange={(event) => setStarterLists(event.target.checked)}
              className="size-4 accent-[var(--ink)]"
            />
            <span>Start with To do, Doing and Done lists</span>
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={create.isPending}>
              Create board
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
