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
      // ngrok 免費方案對沒有這個 header 的請求會回傳警告攔截頁而非轉發到 server，
      // 該攔截頁不帶我們自己的 CORS header，瀏覽器端會誤判為 CORS 錯誤。
      // 正式環境（非 ngrok domain）多帶這個 header 無害，不需要區分環境。
      'ngrok-skip-browser-warning': 'true',
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
