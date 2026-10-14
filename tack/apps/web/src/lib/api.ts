export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Identifies this tab, so the server can tell it not to react to its own changes. */
export const clientId: string =
  globalThis.crypto?.randomUUID?.() ??
  Math.random().toString(36).slice(2) + Date.now().toString(36);

let unauthorizedHandler: (() => void) | null = null;
/** Called when a request comes back 401 outside the auth endpoints (the session ran out). */
export const onUnauthorized = (handler: () => void) => {
  unauthorizedHandler = handler;
};

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: {
      'X-Client-Id': clientId,
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) return undefined as T;
  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (
      data as { error?: { code?: string; message?: string; fields?: Record<string, string> } }
    )?.error;
    if (response.status === 401 && !path.startsWith('/auth/')) unauthorizedHandler?.();
    throw new ApiError(
      response.status,
      error?.code ?? 'unknown',
      error?.message ?? 'Something went wrong. Try again.',
      error?.fields,
    );
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
};

export const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again.';

export const fieldsOf = (error: unknown): Record<string, string> =>
  error instanceof ApiError ? (error.fields ?? {}) : {};
