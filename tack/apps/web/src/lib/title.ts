import { useEffect } from 'react';

/** Sets the tab title while a page is mounted, and puts the default back afterwards. */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    if (!title) return;
    document.title = `${title} | Tack`;
    return () => {
      document.title = 'Tack';
    };
  }, [title]);
}
