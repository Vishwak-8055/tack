import type { CSSProperties } from 'react';
import type { UserSummary } from '@tack/shared';
import { avatarColor, initials } from '@/lib/colors';
import { cn } from '@/lib/cn';

export function Avatar({
  user,
  size = 28,
  className,
  style,
}: {
  user: UserSummary;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      role="img"
      aria-label={user.name}
      title={user.name}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        background: avatarColor(user.id),
        ...style,
      }}
    >
      {initials(user.name)}
    </span>
  );
}

export function AvatarStack({
  users,
  max = 3,
  size = 24,
  ringClass = 'ring-surface',
}: {
  users: UserSummary[];
  max?: number;
  size?: number;
  ringClass?: string;
}) {
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;
  // Overlap scales with the avatar, so initials never end up under their neighbour.
  const overlap = -Math.round(size / 8);
  return (
    <span className="inline-flex">
      {shown.map((user, index) => (
        <Avatar
          key={user.id}
          user={user}
          size={size}
          className={cn('ring-2', ringClass)}
          style={{ marginLeft: index === 0 ? 0 : overlap }}
        />
      ))}
      {extra > 0 && (
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-full bg-sunken text-xs font-semibold text-muted ring-2',
            ringClass,
          )}
          style={{ width: size, height: size, marginLeft: overlap }}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}
