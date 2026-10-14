import { useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';

interface EditableTextProps {
  value: string;
  onSave: (value: string) => void;
  /** Read aloud for the edit button and the field, e.g. "Board title". */
  label: string;
  disabled?: boolean;
  multiline?: boolean;
  maxLength?: number;
  className?: string;
}

/**
 * Text that turns into a field when you click it. Enter saves, Escape cancels, and leaving the
 * field saves too (an empty value is ignored rather than saved).
 */
export function EditableText({
  value,
  onSave,
  label,
  disabled,
  multiline,
  maxLength = 300,
  className,
}: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (disabled) return <span className={cn('px-1.5', className)}>{value}</span>;

  if (!editing) {
    return (
      <button
        type="button"
        aria-label={`${label}: ${value}. Click to edit`}
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        className={cn(
          'w-full cursor-text rounded-md px-1.5 py-0.5 text-left transition-colors hover:bg-ink/10',
          className,
        )}
      >
        {value}
      </button>
    );
  }

  const commit = () => {
    const next = draft.trim();
    setEditing(false);
    if (next && next !== value) onSave(next);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation(); // don't also close the dialog this field might sit in
      setEditing(false);
    } else if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      commit();
    }
  };

  const shared = {
    autoFocus: true,
    'aria-label': label,
    value: draft,
    maxLength,
    onBlur: commit,
    onKeyDown,
    className: cn(
      'w-full rounded-md border border-focus bg-surface px-1.5 py-0.5 text-ink outline-none',
      className,
    ),
  };

  return multiline ? (
    <textarea
      {...shared}
      rows={1}
      onChange={(event) => setDraft(event.target.value)}
      onFocus={(event) => event.target.select()}
      className={cn(shared.className, 'field-sizing-content resize-none')}
    />
  ) : (
    <input
      {...shared}
      onChange={(event) => setDraft(event.target.value)}
      onFocus={(event) => event.target.select()}
    />
  );
}
