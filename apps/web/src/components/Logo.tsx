import { cn } from '@/lib/cn';

export function TackMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 32 32" fill="none" className={className}>
      <rect
        x="9"
        y="3"
        width="14"
        height="4.5"
        rx="2.25"
        fill="var(--accent)"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M11 7.5h10l1.6 9.5H9.4z"
        fill="var(--accent)"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M7.5 17h17" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M16 18.5V29" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 font-display text-xl font-bold', className)}
    >
      <TackMark className="size-6" />
      Tack
    </span>
  );
}
