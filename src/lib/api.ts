// Talks to the existing PHP backend.
// - Reads:  GET  api/mobile.php?action=...           (JSON versions of what the web pages render)
// - Writes: POST api/<endpoint>.php with X-CSRF-Token (the same endpoints the website's jQuery uses)
// The PHP session cookie is kept by the native networking layer, exactly like a browser would.

const RAW_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost/stallion/';
export const BASE_URL = RAW_BASE.endsWith('/') ? RAW_BASE : RAW_BASE + '/';

/** Absolute URL for a path relative to the site root (e.g. "uploads/designs/abc.png"). */
export function siteUrl(path: string): string {
  return BASE_URL + path.replace(/^\/+/, '');
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let csrf = '';

const NETWORK_MSG =
  `Can't reach the ShirtCraft server at ${BASE_URL}. Check that XAMPP (Apache + MySQL) is running and that EXPO_PUBLIC_API_URL points to it.`;

async function request(url: string, init: RequestInit): Promise<any> {
  let res: Response;
  try {
    res = await fetch(url, { credentials: 'include', ...init, headers: { Accept: 'application/json', ...(init.headers ?? {}) } });
  } catch {
    throw new ApiError(NETWORK_MSG, 0);
  }
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    throw new ApiError(res.ok ? 'The server sent an unexpected reply.' : `Server error (${res.status}).`, res.status);
  }
  if (!res.ok || data?.ok === false) throw new ApiError(data?.error || `Server error (${res.status}).`, res.status);
  return data;
}

export type SessionUser = { id: number; fullname: string; email: string; phone: string };
export type SessionAdmin = { id: number; username: string };
export type SessionInfo = { csrf: string; user: SessionUser | null; admin: SessionAdmin | null };

/** Fetches the session (and a fresh CSRF token). Call after sign in / sign out — PHP rotates the token. */
export async function fetchSession(): Promise<SessionInfo> {
  const r = await get<SessionInfo>('session');
  csrf = r.csrf;
  return r;
}

export function get<T = any>(action: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const qs = Object.entries({ action, ...params })
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return request(`${BASE_URL}api/mobile.php?${qs}`, { method: 'GET' });
}

/** POST JSON to api/<endpoint>. Retries once with a fresh token if the session's CSRF token changed (HTTP 419). */
export async function post<T = any>(endpoint: string, body: object, retry = true): Promise<T> {
  if (!csrf) await fetchSession();
  try {
    return await request(`${BASE_URL}api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify(body),
    });
  } catch (e) {
    if (retry && e instanceof ApiError && e.status === 419) {
      await fetchSession();
      return post<T>(endpoint, body, false);
    }
    throw e;
  }
}

export type UploadResult = { src: string; url: string; width: number; height: number };

/** Multipart upload to api/upload.php (field name "design"), like the web designer. */
export async function uploadArtwork(file: { uri: string; name: string; type: string }, retry = true): Promise<UploadResult> {
  if (!csrf) await fetchSession();
  const fd = new FormData();
  fd.append('design', file as any);
  try {
    return await request(`${BASE_URL}api/upload.php`, { method: 'POST', headers: { 'X-CSRF-Token': csrf }, body: fd });
  } catch (e) {
    if (retry && e instanceof ApiError && e.status === 419) {
      await fetchSession();
      return uploadArtwork(file, false);
    }
    throw e;
  }
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.';
}
