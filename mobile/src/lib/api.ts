import { API_URL } from "./config";

export type ApiError = { status: number; message: string };

export async function apiFetch<T>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string | null } = {}
): Promise<T> {
  const { method = "GET", body, token } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message: string =
      (data && (data.error || data.message)) || "Bir hata oluştu. Lütfen tekrar deneyin.";
    throw { status: res.status, message } as ApiError;
  }
  return data as T;
}
