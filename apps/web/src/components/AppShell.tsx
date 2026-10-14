import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { Keyboard, LogOut, Monitor, Moon, Settings, Sun } from 'lucide-react';
import { Wordmark } from '@/components/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/Menu';
import { useSession, useSignOut } from '@/features/auth/session';
import { useHotkeys } from '@/lib/hotkeys';
import { useTheme, type ThemePreference } from '@/lib/theme';
import { ShortcutsDialog } from './ShortcutsDialog';

const NEXT_THEME: Record<ThemePreference, ThemePreference> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};
const THEME_ICON = { system: Monitor, light: Sun, dark: Moon } as const;

export function AppShell() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  useHotkeys({ '?': () => setShortcutsOpen(true) });

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 flex h-13 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 sm:px-4">
        <Link to="/" aria-label="Tack, all boards" className="rounded-md px-1">
          <Wordmark />
        </Link>
        <nav className="ml-3 hidden sm:block">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-ink/10 ${isActive ? 'bg-ink/10' : ''}`
            }
          >
            Boards
          </NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Keyboard shortcuts"
            onClick={() => setShortcutsOpen(true)}
            className="hidden sm:inline-flex"
          >
            <Keyboard className="size-[18px]" />
          </Button>
          <ThemeButton />
          <UserMenu />
        </div>
      </header>

      <Outlet />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}

function ThemeButton() {
  const { preference, setPreference } = useTheme();
  const Icon = THEME_ICON[preference];
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Theme: ${preference}. Switch to ${NEXT_THEME[preference]}`}
      title={`Theme: ${preference}`}
      onClick={() => setPreference(NEXT_THEME[preference])}
    >
      <Icon className="size-[18px]" />
    </Button>
  );
}

function UserMenu() {
  const { data: user } = useSession();
  const signOut = useSignOut();
  const navigate = useNavigate();
  if (!user) return null;

  return (
    <Menu>
      <MenuTrigger asChild>
        <button aria-label="Account menu" className="ml-1 rounded-full">
          <Avatar user={user} size={32} />
        </button>
      </MenuTrigger>
      <MenuContent>
        <div className="px-2.5 py-2">
          <p className="font-semibold">{user.name}</p>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
        <MenuSeparator />
        <MenuItem asChild>
          <Link to="/settings">
            <Settings className="size-4" /> Settings
          </Link>
        </MenuItem>
        <MenuItem
          onSelect={() => signOut.mutate(undefined, { onSettled: () => navigate('/login') })}
        >
          <LogOut className="size-4" /> Sign out
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
