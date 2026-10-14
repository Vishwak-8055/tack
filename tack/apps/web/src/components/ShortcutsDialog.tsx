import { Dialog, DialogContent } from '@/components/ui/Dialog';

const SHORTCUTS: { keys: string[]; action: string; where: string }[] = [
  { keys: ['?'], action: 'Show this list', where: 'Anywhere' },
  { keys: ['/'], action: 'Search cards', where: 'On a board' },
  { keys: ['f'], action: 'Show or hide filters', where: 'On a board' },
  { keys: ['a'], action: 'Show or hide activity', where: 'On a board' },
  { keys: ['Esc'], action: 'Close a dialog or cancel an edit', where: 'Anywhere' },
  {
    keys: ['Space', '←', '→', '↑', '↓'],
    action: 'Pick up a card or list with the keyboard, move it, drop it with Space',
    where: 'On a board',
  },
];

export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Keyboard shortcuts" className="max-w-lg">
        <dl className="mt-4 divide-y divide-line">
          {SHORTCUTS.map((shortcut) => (
            <div key={shortcut.action} className="flex items-start justify-between gap-6 py-3">
              <div>
                <dt className="font-medium">{shortcut.action}</dt>
                <dd className="text-sm text-muted">{shortcut.where}</dd>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-1">
                {shortcut.keys.map((key) => (
                  <kbd
                    key={key}
                    className="min-w-7 rounded-md border border-line border-b-2 bg-sunken px-1.5 py-0.5 text-center text-sm font-medium"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
