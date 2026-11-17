'use client';

export const SESSION_TOKEN_KEY = 'educore_session_token';

export function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(SESSION_TOKEN_KEY);
}

export function setSessionToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) window.sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  else window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
}

export async function apiWrite(path: string, payload: unknown): Promise<{ ok: boolean; status: number; error?: string }> {
  const res = await apiCall(path, payload);
  return { ok: res.ok, status: res.status, error: res.error };
}

export async function apiCall(path: string, payload: unknown): Promise<{ ok: boolean; status: number; data?: Record<string, unknown>; error?: string }> {
  try {
    const token = getSessionToken();
    const res = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });
    const json = await res.json().catch(() => ({} as Record<string, unknown>));
    if (!res.ok || json?.error) {
      const msg = typeof json?.error === 'string' ? json.error : `HTTP ${res.status}`;
      return { ok: false, status: res.status, error: msg };
    }
    return { ok: true, status: res.status, data: json };
  } catch (err) {
    return { ok: false, status: 0, error: err instanceof Error ? err.message : 'Falha de rede' };
  }
}

export function profilePayloadFromUser(user: { id?: string; name?: string; email?: string; role?: string; avatarUrl?: string }) {
  return {
    id: user.id,
    name: user.name || 'Usuário',
    email: user.email,
    role: user.role || 'Administrador',
    avatar_url: user.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
  };
}
