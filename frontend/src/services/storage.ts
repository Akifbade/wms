/**
 * Centralized localStorage service
 * All storage reads/writes go through here — no raw localStorage anywhere else.
 */

const KEYS = {
  AUTH_TOKEN: 'authToken',
  TOKEN: 'token',
  USER: 'user',
} as const;

// ─── Token Management ───────────────────────────────────

export const getAuthToken = (): string | null => {
  // Check both keys for backward compatibility
  return localStorage.getItem(KEYS.AUTH_TOKEN) || localStorage.getItem(KEYS.TOKEN);
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem(KEYS.AUTH_TOKEN, token);
  localStorage.setItem(KEYS.TOKEN, token); // sync both for compat
};

export const clearAuthToken = (): void => {
  localStorage.removeItem(KEYS.AUTH_TOKEN);
  localStorage.removeItem(KEYS.TOKEN);
};

// ─── User Management ────────────────────────────────────

export const getUser = <T = Record<string, unknown>>(): T | null => {
  try {
    const raw = localStorage.getItem(KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setUser = (user: Record<string, unknown>): void => {
  localStorage.setItem(KEYS.USER, JSON.stringify(user));
};

export const clearUser = (): void => {
  localStorage.removeItem(KEYS.USER);
};

// ─── Session — clear all ────────────────────────────────

export const clearSession = (): void => {
  clearAuthToken();
  clearUser();
};

// ─── Auth Headers (for raw fetch calls) ─────────────────

export const getAuthHeaders = (extraHeaders: Record<string, string> = {}): Record<string, string> => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
};

// ─── Convenience exports ────────────────────────────────

export const storage = {
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  getUser,
  setUser,
  clearUser,
  clearSession,
  getAuthHeaders,
  keys: KEYS,
};
