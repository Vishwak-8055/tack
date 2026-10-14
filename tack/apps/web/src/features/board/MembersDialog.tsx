import { UserMinus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { addMemberSchema, type BoardDetail } from '@tack/shared';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Field, Input, Select } from '@/components/ui/Field';
import { useSession } from '@/features/auth/session';
import { fieldsOf, messageOf } from '@/lib/api';
import { zodFields } from '@/lib/forms';
import { boardsKey } from '@/features/boards/queries';
import { useAddMember, useRemoveMember, useSetMemberRole } from './members';
import { useQueryClient } from '@tanstack/react-query';

export function MembersDialog({
  board,
  open,
  onOpenChange,
}: {
  board: BoardDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: me } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const add = useAddMember(board.id);
  const setRole = useSetMemberRole(board.id);
  const remove = useRemoveMember(board.id);

  const isOwner = board.role === 'owner';
  const [email, setEmail] = useState('');
  const [role, setNewRole] = useState<'editor' | 'viewer'>('editor');
  const [error, setError] = useState<string | undefined>();
  const [leaving, setLeaving] = useState(false);

  const onAdd = (event: FormEvent) => {
    event.preventDefault();
    const parsed = addMemberSchema.safeParse({ email, role });
    if (!parsed.success) return setError(zodFields(parsed.error).email);
    setError(undefined);

    add.mutate(parsed.data, {
      onSuccess: (member) => {
        toast.success(
          `${member.name} can now ${member.role === 'editor' ? 'edit' : 'view'} this board`,
        );
        setEmail('');
      },
      onError: (err) => setError(fieldsOf(err).email ?? messageOf(err)),
    });
  };

  const leave = () =>
    remove.mutate(me!.id, {
      onSuccess: () => {
        // The board's own query is left to expire: removing it while this page is still mounted
        // would make it refetch a board we no longer have access to.
        void queryClient.invalidateQueries({ queryKey: boardsKey });
        navigate('/', { replace: true });
      },
    });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          title="Board members"
          description={
            isOwner
              ? 'Editors can change cards and lists. Viewers can only look.'
              : `${board.members.length} ${board.members.length === 1 ? 'person' : 'people'} on this board.`
          }
          className="max-w-lg"
        >
          <ul className="mt-4 divide-y divide-line">
            {board.members.map((member) => {
              const isMe = member.id === me?.id;
              return (
                <li key={member.id} className="flex items-center gap-3 py-2.5">
                  <Avatar user={member} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {member.name}
                      {isMe && <span className="font-normal text-muted"> (you)</span>}
                    </p>
                    <p className="truncate text-sm text-muted">{member.email}</p>
                  </div>

                  {isOwner && member.role !== 'owner' ? (
                    <>
                      <Select
                        aria-label={`Role for ${member.name}`}
                        value={member.role}
                        onChange={(event) =>
                          setRole.mutate({
                            userId: member.id,
                            role: event.target.value as 'editor' | 'viewer',
                          })
                        }
                        className="w-28 py-1.5"
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </Select>
                      <Button
                        variant="danger-ghost"
                        size="icon"
                        aria-label={`Remove ${member.name}`}
                        onClick={() => remove.mutate(member.id)}
                      >
                        <UserMinus className="size-4" />
                      </Button>
                    </>
                  ) : (
                    <span className="text-sm capitalize text-muted">{member.role}</span>
                  )}

                  {isMe && !isOwner && (
                    <Button variant="danger-ghost" size="sm" onClick={() => setLeaving(true)}>
                      Leave
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>

          {isOwner && (
            <form onSubmit={onAdd} noValidate className="mt-4 border-t border-line pt-4">
              <p className="mb-2 font-semibold">Add someone</p>
              <div className="flex flex-wrap items-start gap-2">
                <Field
                  label="Email"
                  error={error}
                  className="min-w-52 flex-1 [&>span:first-child]:sr-only"
                >
                  <Input
                    type="email"
                    value={email}
                    placeholder="Their account email"
                    aria-invalid={!!error}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </Field>
                <Select
                  aria-label="Role"
                  value={role}
                  onChange={(event) => setNewRole(event.target.value as 'editor' | 'viewer')}
                  className="w-28"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </Select>
                <Button type="submit" variant="primary" loading={add.isPending}>
                  Add
                </Button>
              </div>
              <p className="mt-2 text-sm text-muted">They need an account first.</p>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={leaving}
        onOpenChange={setLeaving}
        title="Leave this board?"
        description="You'll lose access until the owner adds you again."
        confirmLabel="Leave board"
        loading={remove.isPending}
        onConfirm={leave}
      />
    </>
  );
}
