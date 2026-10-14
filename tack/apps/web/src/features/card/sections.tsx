import { AlignLeft, CheckSquare, MessageSquare, Plus, Trash2, type LucideIcon } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import type { CardDetail, CommentDTO } from '@tack/shared';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EditableText } from '@/components/ui/EditableText';
import { Input, Textarea } from '@/components/ui/Field';
import Markdown from '@/components/Markdown';
import { useSession } from '@/features/auth/session';
import { cn } from '@/lib/cn';
import { timeAgo } from '@/lib/dates';
import type { CardActions } from './mutations';

function SectionTitle({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <h3 className="mb-2 flex items-center gap-2 font-sans text-base font-bold tracking-normal">
      <Icon className="size-[18px] text-muted" aria-hidden />
      {children}
    </h3>
  );
}

// ---- description ----------------------------------------------------------------------------

export function DescriptionSection({
  card,
  canEdit,
  actions,
}: {
  card: CardDetail;
  canEdit: boolean;
  actions: CardActions;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const start = () => {
    setDraft(card.description);
    setEditing(true);
  };
  const save = () => {
    if (draft !== card.description) actions.update.mutate({ description: draft });
    setEditing(false);
  };

  return (
    <section>
      <SectionTitle icon={AlignLeft}>Description</SectionTitle>
      {editing ? (
        <div className="space-y-2">
          <Textarea
            autoFocus
            rows={7}
            aria-label="Description"
            value={draft}
            maxLength={20000}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation();
                setEditing(false);
              } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                save();
              }
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" size="sm" onClick={save}>
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <span className="ml-auto text-sm text-muted">Markdown works here</span>
          </div>
        </div>
      ) : card.description ? (
        <div className="space-y-2">
          <Markdown>{card.description}</Markdown>
          {canEdit && (
            <Button size="sm" onClick={start}>
              Edit description
            </Button>
          )}
        </div>
      ) : canEdit ? (
        <button
          type="button"
          onClick={start}
          className="w-full rounded-lg bg-sunken px-3 py-3 text-left text-muted transition-colors hover:bg-ink/10"
        >
          Add notes, links or a checklist of what done looks like
        </button>
      ) : (
        <p className="text-muted">No description.</p>
      )}
    </section>
  );
}

// ---- checklist ------------------------------------------------------------------------------

export function ChecklistSection({
  card,
  canEdit,
  actions,
}: {
  card: CardDetail;
  canEdit: boolean;
  actions: CardActions;
}) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const total = card.checklist.length;
  const done = card.checklist.filter((item) => item.done).length;

  if (total === 0 && !canEdit) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    actions.addItem.mutate(trimmed);
    setText('');
  };

  return (
    <section>
      <SectionTitle icon={CheckSquare}>
        Checklist
        {total > 0 && (
          <span className="ml-1 text-sm font-medium tabular-nums text-muted">
            {done} of {total}
          </span>
        )}
      </SectionTitle>

      {total > 0 && (
        <div
          role="progressbar"
          aria-label="Checklist progress"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
          className="mb-2 h-2 overflow-hidden rounded-full bg-sunken"
        >
          <div
            className="h-full rounded-full bg-ok transition-[width] duration-300"
            style={{ width: `${(done / total) * 100}%` }}
          />
        </div>
      )}

      <ul>
        {card.checklist.map((item) => (
          <li key={item.id} className="group flex items-start gap-2.5 py-1">
            <input
              type="checkbox"
              checked={item.done}
              disabled={!canEdit}
              aria-label={item.text}
              onChange={(event) =>
                actions.updateItem.mutate({ itemId: item.id, done: event.target.checked })
              }
              className="mt-1.5 size-4 shrink-0 accent-[var(--ok)]"
            />
            <div className={cn('min-w-0 flex-1', item.done && 'text-muted line-through')}>
              <EditableText
                value={item.text}
                label="Checklist item"
                disabled={!canEdit}
                onSave={(next) => actions.updateItem.mutate({ itemId: item.id, text: next })}
              />
            </div>
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete "${item.text}"`}
                onClick={() => actions.removeItem.mutate(item.id)}
                className="size-7 shrink-0 text-muted opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </li>
        ))}
      </ul>

      {canEdit &&
        (adding ? (
          <form onSubmit={submit} className="mt-2 flex items-center gap-2">
            <Input
              autoFocus
              aria-label="New checklist item"
              placeholder="Add an item"
              value={text}
              maxLength={300}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.stopPropagation();
                  setAdding(false);
                  setText('');
                }
              }}
            />
            <Button type="submit" variant="primary" size="sm">
              Add
            </Button>
          </form>
        ) : (
          <Button size="sm" className="mt-2" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Add an item
          </Button>
        ))}
    </section>
  );
}

// ---- comments -------------------------------------------------------------------------------

export function CommentsSection({
  card,
  canEdit,
  isOwner,
  actions,
}: {
  card: CardDetail;
  canEdit: boolean;
  isOwner: boolean;
  actions: CardActions;
}) {
  const { data: me } = useSession();
  const [draft, setDraft] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    actions.addComment.mutate(body, { onSuccess: () => setDraft('') });
  };

  return (
    <section>
      <SectionTitle icon={MessageSquare}>Comments</SectionTitle>

      {canEdit && me && (
        <form onSubmit={submit} className="mb-4 flex gap-3">
          <Avatar user={me} size={32} className="mt-0.5" />
          <div className="min-w-0 flex-1 space-y-2">
            <Textarea
              rows={2}
              aria-label="Write a comment"
              placeholder="Write a comment"
              value={draft}
              maxLength={5000}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) submit(event);
              }}
            />
            {draft.trim() && (
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={actions.addComment.isPending}
              >
                Comment
              </Button>
            )}
          </div>
        </form>
      )}

      {card.comments.length === 0 ? (
        <p className="text-muted">No comments yet.</p>
      ) : (
        <ul className="space-y-4">
          {card.comments.map((comment) => (
            <Comment
              key={comment.id}
              comment={comment}
              mine={comment.author?.id === me?.id}
              canDelete={canEdit && (comment.author?.id === me?.id || isOwner)}
              actions={actions}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function Comment({
  comment,
  mine,
  canDelete,
  actions,
}: {
  comment: CommentDTO;
  mine: boolean;
  canDelete: boolean;
  actions: CardActions;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const author = comment.author ?? { id: 'deleted', name: 'Former member' };

  const save = () => {
    const body = draft.trim();
    if (body && body !== comment.body) {
      actions.editComment.mutate(
        { commentId: comment.id, body },
        { onSuccess: () => setEditing(false) },
      );
    } else {
      setEditing(false);
    }
  };

  return (
    <li className="flex gap-3">
      <Avatar user={author} size={32} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-bold">{author.name}</span>{' '}
          <time dateTime={comment.createdAt} className="text-muted">
            {timeAgo(comment.createdAt)}
          </time>
          {comment.editedAt && <span className="text-muted"> (edited)</span>}
        </p>

        {editing ? (
          <div className="mt-1 space-y-2">
            <Textarea
              autoFocus
              rows={3}
              aria-label="Edit comment"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.stopPropagation();
                  setEditing(false);
                }
              }}
            />
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={save}>
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-1 rounded-lg bg-sunken px-3 py-2">
              <Markdown>{comment.body}</Markdown>
            </div>
            {(mine || canDelete) && (
              <p className="mt-1 flex gap-3 text-sm text-muted">
                {mine && (
                  <button
                    type="button"
                    className="underline underline-offset-2 hover:text-ink"
                    onClick={() => {
                      setDraft(comment.body);
                      setEditing(true);
                    }}
                  >
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    className="underline underline-offset-2 hover:text-danger"
                    onClick={() => actions.removeComment.mutate(comment.id)}
                  >
                    Delete
                  </button>
                )}
              </p>
            )}
          </>
        )}
      </div>
    </li>
  );
}
