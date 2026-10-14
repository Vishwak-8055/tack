import { lazy, Suspense } from 'react';
import { Link, Route, Routes } from 'react-router';
import { AppShell } from '@/components/AppShell';
import { GuestOnly, RequireAuth } from '@/features/auth/guards';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { BoardPage } from '@/features/board/BoardPage';
import { BoardsPage } from '@/features/boards/BoardsPage';
import { SettingsPage } from '@/features/settings/SettingsPage';

// The card dialog (and with it the markdown renderer) only loads once someone opens a card.
const CardDialog = lazy(() => import('@/features/card/CardDialog'));

export function App() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<BoardsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="b/:boardId" element={<BoardPage />}>
            <Route
              path="c/:cardId"
              element={
                <Suspense fallback={null}>
                  <CardDialog />
                </Suspense>
              }
            />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}

function NotFound() {
  return (
    <main className="mx-auto mt-24 max-w-sm px-4 text-center">
      <p className="font-display text-3xl font-bold">Nothing here</p>
      <p className="mt-2 text-muted">That page doesn't exist, or it moved.</p>
      <Link to="/" className="mt-5 inline-block font-semibold underline underline-offset-2">
        Back to your boards
      </Link>
    </main>
  );
}
