import type { CSSProperties, ReactNode } from 'react';
import { Check, Clock, MessageSquare } from 'lucide-react';
import { Wordmark } from '@/components/Logo';
import { cn } from '@/lib/cn';

export function AuthLayout({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="felt relative hidden flex-col justify-between overflow-hidden bg-[#2c5b4e] p-12 text-white lg:flex">
        <Wordmark />
        <Pinboard />
        <div className="max-w-md">
          <p className="font-display text-4xl font-bold leading-[1.1]">
            Work in progress, in plain sight.
          </p>
          <p className="mt-4 text-lg text-white/80">
            Boards, lists and cards that update for everyone the moment something moves. Host it
            yourself, keep your data.
          </p>
        </div>
      </aside>

      <main className="grid place-items-center px-6 py-10">
        <div className="w-full max-w-sm">
          <Wordmark className="mb-10 lg:hidden" />
          <h1 className="font-display text-3xl font-bold">{title}</h1>
          <p className="mt-1.5 text-muted">{subtitle}</p>
          <div className="mt-7">{children}</div>
          <p className="mt-7 text-sm text-muted">{footer}</p>
        </div>
      </main>
    </div>
  );
}

/** Three index cards pinned to the felt. Decoration only. */
function Pinboard() {
  return (
    <div aria-hidden className="relative mx-auto h-[23rem] w-full max-w-lg">
      <Slip className="left-0 top-8 w-56 -rotate-3" pin="#ffd23f">
        <Pill color="#c8362d">Bug</Pill>
        <p className="mt-2 font-medium leading-snug">Fix flaky checkout test</p>
        <Badge tone="late">
          <Clock className="size-3.5" /> Yesterday
        </Badge>
      </Slip>

      <Slip className="right-0 top-0 w-60 rotate-2" pin="#e2559a">
        <div className="flex gap-1.5">
          <Pill color="#6b4fc4">Design</Pill>
          <Pill color="#2563c9">Engineering</Pill>
        </div>
        <p className="mt-2 font-medium leading-snug">Rebuild the pricing page</p>
        <div className="mt-2 flex items-center gap-3 text-[13px] text-[#566677]">
          <span className="inline-flex items-center gap-1">
            <Check className="size-3.5" /> 2/4
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="size-3.5" /> 3
          </span>
        </div>
      </Slip>

      <Slip className="left-20 top-44 w-64 rotate-1" pin="#4a90e2">
        <Pill color="#1f7a4a">Content</Pill>
        <p className="mt-2 font-medium leading-snug">Write the launch announcement</p>
        <Badge tone="soon">
          <Clock className="size-3.5" /> Tomorrow, 9:00 AM
        </Badge>
      </Slip>
    </div>
  );
}

function Slip({
  className,
  pin,
  children,
}: {
  className?: string;
  pin: string;
  children: ReactNode;
}) {
  const pinStyle: CSSProperties = {
    background: `radial-gradient(circle at 35% 30%, rgb(255 255 255 / 0.8), transparent 46%), ${pin}`,
  };
  return (
    <div
      className={cn(
        'absolute rounded-slip bg-white p-3.5 pt-4 text-[#14202b] shadow-[0_8px_16px_rgb(0_0_0/0.3)]',
        className,
      )}
    >
      <span
        className="absolute -top-2 left-1/2 size-[18px] -translate-x-1/2 rounded-full shadow-[0_3px_3px_rgb(0_0_0/0.35)]"
        style={pinStyle}
      />
      {children}
    </div>
  );
}

function Pill({ color, children }: { color: string; children: ReactNode }) {
  const light = color === '#ffd23f';
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: color, color: light ? '#14202b' : '#fff' }}
    >
      {children}
    </span>
  );
}

function Badge({ tone, children }: { tone: 'late' | 'soon'; children: ReactNode }) {
  return (
    <span
      className={cn(
        'mt-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[13px] font-medium',
        tone === 'late' ? 'bg-[#c0332b] text-white' : 'bg-[#ffd23f] text-[#14202b]',
      )}
    >
      {children}
    </span>
  );
}
