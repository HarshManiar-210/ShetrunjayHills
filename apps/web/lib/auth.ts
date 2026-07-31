const TOKEN_KEY = "token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export interface AuthUser {
  username: string;
  role: string;
}

export type Role = "anonymous" | "regular_user" | "admin" | "support_team";

// JWT claims are base64url, not encrypted — safe to decode client-side for display only.
export function getUser(): AuthUser | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const claims = JSON.parse(json) as { sub: string; role_name: string };
    return { username: claims.sub, role: claims.role_name };
  } catch {
    return null;
  }
}
