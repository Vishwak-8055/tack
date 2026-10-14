import type { Label } from '@tack/shared';
import { cn } from '@/lib/cn';
import { LABEL_STYLES } from '@/lib/colors';

/** `compact` draws unnamed labels as a thin bar, the way they appear on a card. */
export function LabelChip({
  label,
  compact,
  className,
}: {
  label: Label;
  compact?: boolean;
  className?: string;
}) {
  const style = LABEL_STYLES[label.color];

  if (compact && !label.name) {
    return (
      <span
        role="img"
        aria-label={`${label.color} label`}
        className={cn('h-2 w-10 rounded-full', className)}
        style={{ background: style.bg }}
      />
    );
  }
  return (
    <span
      className={cn(
        'inline-flex min-h-5 min-w-10 max-w-full items-center truncate rounded-full px-2.5 py-0.5 text-xs font-semibold',
        className,
      )}
      style={{ background: style.bg, color: style.fg }}
    >
      {label.name || <span className="sr-only">{label.color} label</span>}
    </span>
  );
}
