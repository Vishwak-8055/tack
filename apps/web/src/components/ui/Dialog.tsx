import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

export const Dialog = RadixDialog.Root;
export const DialogClose = RadixDialog.Close;

interface DialogContentProps extends Omit<ComponentProps<typeof RadixDialog.Content>, 'title'> {
  title: string;
  description?: string;
  /** Keep the title for screen readers but don't draw it. */
  hideTitle?: boolean;
  /** Where to put the title: the content decides its own layout when this is false. */
  closeButton?: boolean;
}

/**
 * The overlay is also the scroll container, so tall dialogs scroll as a whole on small screens
 * instead of trapping the close button off-screen.
 */
export function DialogContent({
  title,
  description,
  hideTitle,
  closeButton = true,
  className,
  children,
  ...props
}: DialogContentProps) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-40 grid animate-fade-in place-items-start justify-items-center overflow-y-auto bg-[#08121c]/60 p-3 pt-[6vh] sm:p-6 sm:pt-[8vh]">
        <RadixDialog.Content
          {...(description ? {} : { 'aria-describedby': undefined })}
          className={cn(
            'relative w-full max-w-md animate-sheet-in rounded-sheet bg-surface p-5 shadow-sheet outline-none',
            className,
          )}
          {...props}
        >
          <RadixDialog.Title
            className={cn('pr-8 font-display text-xl font-bold', hideTitle && 'sr-only')}
          >
            {title}
          </RadixDialog.Title>
          {description && (
            <RadixDialog.Description className="mt-1 text-muted">
              {description}
            </RadixDialog.Description>
          )}
          {children}
          {closeButton && (
            <RadixDialog.Close
              aria-label="Close"
              className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-ink/10 hover:text-ink"
            >
              <X className="size-4" />
            </RadixDialog.Close>
          )}
        </RadixDialog.Content>
      </RadixDialog.Overlay>
    </RadixDialog.Portal>
  );
}
