// Fetch wrapper for the staff-only Django API mounted at /api/admin/.
// Attaches the admin's DRF token, parses JSON, and throws ApiError with the
// parsed body on non-2xx so forms can show field-level validation errors.

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");
export const STOREFRONT_URL = (process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3000").replace(/\/$/, "");

const TOKEN_KEY = "fexo_admin_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string, remember: boolean) {
  try {
    clearToken();
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
  } catch {
    // Storage blocked — the session simply won't survive a reload.
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(extractMessage(body) ?? `Request failed (${status})`);
    this.status = status;
    this.body = body;
  }

  get fieldErrors(): FieldErrors {
    if (!this.body || typeof this.body !== "object" || Array.isArray(this.body)) return {};
    const out: FieldErrors = {};
    for (const [key, value] of Object.entries(this.body as Record<string, unknown>)) {
      if (key === "detail") continue;
      out[key] = Array.isArray(value) ? value.map(String) : [String(value)];
    }
    return out;
  }
}

function extractMessage(body: unknown): string | null {
  if (!body) return null;
  if (typeof body === "string") return body;
  if (Array.isArray(body)) return body.map(String).join(" ");
  if (typeof body === "object") {
    const record = body as Record<string, unknown>;
    if (record.detail) return Array.isArray(record.detail) ? record.detail.join(" ") : String(record.detail);
    if (record.non_field_errors) return String((record.non_field_errors as unknown[])[0]);
    const first = Object.entries(record)[0];
    if (first) {
      const [key, value] = first;
      const msg = Array.isArray(value) ? value[0] : value;
      return `${key.replace(/_/g, " ")}: ${String(msg)}`;
    }
  }
  return null;
}

// Fired when the API rejects the token so the auth provider can sign out.
export const UNAUTHORIZED_EVENT = "fexo-admin:unauthorized";

type Query = Record<string, string | number | boolean | null | undefined>;

export function buildQuery(query?: Query): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; query?: Query; auth?: boolean } = {},
): Promise<T> {
  const { method = "GET", body, query, auth = true } = options;
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Token ${token}`;

  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${API_URL}/api/admin${path}${buildQuery(query)}`, {
    method,
    headers,
    body: payload,
    cache: "no-store",
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    if ((res.status === 401 || res.status === 403) && auth && typeof window !== "undefined") {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(res.status, data);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>(path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  delete: (path: string) => request<void>(path, { method: "DELETE" }),
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

/** Turn a plain object into FormData, skipping undefined and leaving
 *  File values as uploads. Used whenever a form includes an image. */
export function toFormData(values: Record<string, unknown>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    if (value === null) {
      fd.append(key, "");
    } else if (value instanceof File) {
      fd.append(key, value);
    } else if (Array.isArray(value)) {
      value.forEach((v) => fd.append(key, String(v)));
    } else {
      fd.append(key, String(value));
    }
  }
  return fd;
}

export async function downloadFile(path: string, filename: string) {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/admin${path}`, {
    headers: token ? { Authorization: `Token ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
