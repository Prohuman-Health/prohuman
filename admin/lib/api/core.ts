/**
 * lib/api/core.ts
 * Base fetch wrapper, token management, and error class.
 * All domain modules import from here.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

// ── Token helpers (browser-only) ─────────────────────────────────────────────
export const getToken = (): string | null =>
    typeof window !== "undefined" ? localStorage.getItem("ph_token") : null;

export const setToken = (token: string): void =>
    localStorage.setItem("ph_token", token);

export const clearToken = (): void =>
    localStorage.removeItem("ph_token");

// ── Error class ───────────────────────────────────────────────────────────────
export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = "ApiError";
    }
}

// ── Core request ──────────────────────────────────────────────────────────────
export async function request<T = unknown>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getToken();
    const res = await fetch(`${BASE}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    if (res.status === 401) {
        clearToken();
        throw new ApiError(401, "Unauthorized");
    }

    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, body?.message ?? "Request failed");
    return body?.data ?? body;
}
