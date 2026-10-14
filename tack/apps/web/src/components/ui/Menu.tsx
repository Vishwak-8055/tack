import * as RadixMenu from '@radix-ui/react-dropdown-menu';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

export const Menu = RadixMenu.Root;
export const MenuTrigger = RadixMenu.Trigger;

export function MenuContent({
  className,
  align = 'end',
  sideOffset = 6,
  ...props
}: ComponentProps<typeof RadixMenu.Content>) {
  return (
    <RadixMenu.Portal>
      <RadixMenu.Content
        align={align}
        sideOffset={sideOffset}
        collisionPadding={12}
        className={cn(
          'z-[60] min-w-48 animate-fade-in rounded-tray border border-line bg-surface p-1.5 shadow-sheet',
          className,
        )}
        {...props}
      />
    </RadixMenu.Portal>
  );
}

export function MenuItem({
  className,
  danger,
  ...props
}: ComponentProps<typeof RadixMenu.Item> & { danger?: boolean }) {
  return (
    <RadixMenu.Item
      className={cn(
        'flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none',
        danger ? 'text-danger data-[highlighted]:bg-danger-soft' : 'data-[highlighted]:bg-ink/10',
        className,
      )}
      {...props}
    />
  );
}

export function MenuSeparator() {
  return <RadixMenu.Separator className="my-1.5 h-px bg-line" />;
}
