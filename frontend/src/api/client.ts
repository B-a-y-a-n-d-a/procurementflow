import type { ApiError } from './types';

/** Base URL: same-origin /api (nginx in Docker, Vite proxy in dev). Override with VITE_API_URL. */
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';
const TOKEN_KEY = 'civicflow.token';

export class ApiRequestError extends Error implements ApiError {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(err: ApiError) {
    super(err.message);
    this.status = err.status;
    this.code = err.code;
    this.details = err.details;
  }
}

/** Signed session token from POST /auth/login, sent as `Authorization: Bearer`. */
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return memoryToken;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable - the session lasts for this tab only */
  }
  memoryToken = token;
}

let memoryToken: string | null = null;
memoryToken = getToken();

/** Called when a signed-in request comes back 401 (expired or revoked session). */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = memoryToken ?? getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiRequestError({ status: 0, code: 'NETWORK', message: 'Cannot reach the CIVICFLOW API. Is the backend running?' });
  }
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.();
    const err = (data ?? {}) as Partial<ApiError>;
    throw new ApiRequestError({
      status: res.status,
      code: err.code ?? 'HTTP_' + res.status,
      message: err.message ?? res.statusText,
      details: err.details,
    });
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
};

/** Build a query string, skipping empty values. */
export function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
}
