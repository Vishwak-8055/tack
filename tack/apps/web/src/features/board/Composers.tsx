import { Plus, X } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Field';
import { useCreateCard, useCreateList } from './mutations';

/** Add cards one after another: Enter adds the card and keeps the box open for the next. */
export function AddCard({ boardId, listId }: { boardId: string; listId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const create = useCreateCard(boardId);

  const close = () => {
    setOpen(false);
    setTitle('');
  };
  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    create.mutate({ listId, title: trimmed });
    setTitle('');
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    } else if (event.key === 'Escape') {
      close();
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm font-medium text-muted transition-colors hover:bg-ink/10 hover:text-ink"
      >
        <Plus className="size-4" /> Add a card
      </button>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="space-y-2"
    >
      <Textarea
        autoFocus
        rows={2}
        aria-label="Card title"
        placeholder="What needs doing?"
        value={title}
        maxLength={300}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={onKeyDown}
        className="resize-none"
      />
      <div className="flex items-center gap-1.5">
        <Button type="submit" variant="primary" size="sm">
          Add card
        </Button>
        <Button variant="ghost" size="icon" aria-label="Cancel" onClick={close} className="size-8">
          <X className="size-4" />
        </Button>
      </div>
    </form>
  );
}

export function AddList({ boardId }: { boardId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const create = useCreateList(boardId);

  const close = () => {
    setOpen(false);
    setTitle('');
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-72 shrink-0 items-center gap-2 rounded-tray bg-white/20 px-3.5 py-3 font-medium text-white transition-colors hover:bg-white/30"
      >
        <Plus className="size-[18px]" /> Add another list
      </button>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = title.trim();
        if (!trimmed) return;
        create.mutate(trimmed, { onSuccess: close });
      }}
      className="w-72 shrink-0 space-y-2 rounded-tray bg-tray p-2.5 shadow-slip"
    >
      <Input
        autoFocus
        aria-label="List title"
        placeholder="List title"
        value={title}
        maxLength={100}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => event.key === 'Escape' && close()}
      />
      <div className="flex items-center gap-1.5">
        <Button type="submit" variant="primary" size="sm" loading={create.isPending}>
          Add list
        </Button>
        <Button variant="ghost" size="icon" aria-label="Cancel" onClick={close} className="size-8">
          <X className="size-4" />
        </Button>
      </div>
    </form>
  );
}
