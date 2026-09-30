const API = '/api';
const TOKEN_KEY = 'smart-exam-session';

export const getAuthToken = () => sessionStorage.getItem(TOKEN_KEY);
export const setAuthToken = (token: string | null) => {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
};

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    const headers = new Headers(options?.headers);
    const token = getAuthToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    response = await fetch(API + path, { ...options, headers });
  } catch {
    throw new Error('Backend unavailable. Start the local FastAPI server.');
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(typeof data.detail === 'string' ? data.detail : `Request failed (${response.status})`);
  }
  return response.json();
}

export function json(method: string, body: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
