const API_BASE = "/api";
const ADMIN_TOKEN_KEY = "si_admin_token";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export function getAdminToken(): string | null {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  } catch {
    // localStorage unavailable (private mode, SSR) - ignore.
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  admin?: boolean;
  signal?: AbortSignal;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, admin = false, signal } = options;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (admin) {
    const token = getAdminToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (admin && response.status === 401) {
    setAdminToken(null);
    if (typeof window !== "undefined") {
      window.location.assign("/admin/login");
    }
    throw new ApiError(401, "Sesión expirada. Inicia sesión de nuevo.");
  }

  const text = await response.text();
  const data = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : null) ?? "Ocurrió un error. Intenta de nuevo.";
    throw new ApiError(response.status, message, data);
  }

  return data as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const api = {
  get: <T>(path: string, admin = false, signal?: AbortSignal) =>
    apiFetch<T>(path, { method: "GET", admin, signal }),
  post: <T>(path: string, body?: unknown, admin = false) =>
    apiFetch<T>(path, { method: "POST", body, admin }),
  put: <T>(path: string, body?: unknown, admin = false) =>
    apiFetch<T>(path, { method: "PUT", body, admin }),
  patch: <T>(path: string, body?: unknown, admin = false) =>
    apiFetch<T>(path, { method: "PATCH", body, admin }),
  delete: <T>(path: string, admin = false) =>
    apiFetch<T>(path, { method: "DELETE", admin }),
};
