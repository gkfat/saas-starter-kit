const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export type ApiError = Error & { statusCode: number };

type FetchOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}) as { message?: string });
    const error = new Error(data.message ?? `Request failed: ${res.status}`) as ApiError;
    error.statusCode = res.status;
    throw error;
  }

  return res.json() as Promise<T>;
}
