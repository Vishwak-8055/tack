import { Navigate, Outlet, useLocation } from 'react-router';
import { PageSpinner } from '@/components/ui/Spinner';
import { useSession } from './session';

export function RequireAuth() {
  const { data: user, isPending } = useSession();
  const location = useLocation();

  if (isPending) return <PageSpinner label="Checking your session" />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

export function GuestOnly() {
  const { data: user, isPending } = useSession();
  if (isPending) return <PageSpinner label="Checking your session" />;
  return user ? <Navigate to="/" replace /> : <Outlet />;
}
