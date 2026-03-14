const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const API_PREFIX = '/api/v1';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('smebuzz_token');
}

export function getApiUrl(path: string): string {
  const p = path.startsWith('/') ? path.slice(1) : path;
  const base = API_BASE.replace(/\/$/, '');
  return `${base}${API_PREFIX}/${p}`;
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: string; status: number }> {
  const token = getToken();
  const url = getApiUrl(path);
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('smebuzz_token');
      window.localStorage.removeItem('smebuzz_user');
      window.location.replace('/login');
    }
    return { error: 'Invalid or expired token', status: 401 };
  }
  if (!res.ok) {
    return { error: (json as { message?: string }).message || json?.error || `HTTP ${res.status}`, status: res.status };
  }
  return { data: json as T, status: res.status };
}

export async function apiGet<T = unknown>(path: string) {
  return api<T>(path, { method: 'GET' });
}

export async function apiPost<T = unknown>(path: string, body: unknown) {
  return api<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

export async function apiPatch<T = unknown>(path: string, body: unknown) {
  return api<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
}

/** Upload a file (e.g. image) via multipart/form-data. Returns { data?: T; error?: string }. */
export async function apiUploadFile<T = { url: string }>(
  path: string,
  file: File,
  fieldName = 'file'
): Promise<{ data?: T; error?: string }> {
  const token = getToken();
  const url = getApiUrl(path);
  const form = new FormData();
  form.append(fieldName, file);
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method: 'POST', body: form, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { error: (json as { message?: string }).message || (json as { error?: string }).error || `Upload failed (${res.status})` };
  }
  return { data: json as T };
}
