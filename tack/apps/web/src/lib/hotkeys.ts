import { useEffect, useRef } from 'react';

type Handlers = Record<string, () => void>;

/**
 * Single-key shortcuts. They stay out of the way while you're typing, while a modifier is held,
 * and while a dialog is open.
 */
export function useHotkeys(handlers: Handlers, enabled = true) {
  const latest = useRef(handlers);
  latest.current = handlers;

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? ''))
        return;
      if (document.querySelector('[role="dialog"]')) return;

      const handler = latest.current[event.key];
      if (!handler) return;
      event.preventDefault();
      handler();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
