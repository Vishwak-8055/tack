import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LoginInput, RegisterInput, SessionUser } from '@tack/shared';
import { api, ApiError } from '@/lib/api';

export const meKey = ['me'] as const;

async function fetchMe(): Promise<SessionUser | null> {
  try {
    return await api.get<SessionUser>('/auth/me');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

/** `data` is the signed-in user, or null when nobody is signed in. */
export const useSession = () =>
  useQuery({ queryKey: meKey, queryFn: fetchMe, staleTime: Infinity, retry: false });

export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => api.post<SessionUser>('/auth/login', input),
    onSuccess: (user) => {
      queryClient.clear(); // nothing from a previous account should survive
      queryClient.setQueryData(meKey, user);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) => api.post<SessionUser>('/auth/register', input),
    onSuccess: (user) => {
      queryClient.clear();
      queryClient.setQueryData(meKey, user);
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(meKey, null);
    },
  });
}
