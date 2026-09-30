const API = '/api';
const TOKEN_KEY = 'smart-exam-session';

export const getAuthToken = () => sessionStorage.getItem(TOKEN_KEY);
export const setAuthToken = (token: string | null) => {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
};

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

function assertAccount(token: string | null, accountRequest: boolean) {
  if (accountRequest && token !== getAuthToken()) throw new ApiError('The signed-in account changed. Please try again.', 409);
}

async function responseFor(path: string, options?: RequestInit) {
  let response: Response;
  const token = getAuthToken();
  const accountRequest = !['/auth/login', '/auth/register'].includes(path);
  try {
    const headers = new Headers(options?.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    response = await fetch(API + path, { ...options, headers });
  } catch {
    throw new Error('Backend unavailable. Start the local FastAPI server.');
  }
  assertAccount(token, accountRequest);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    assertAccount(token, accountRequest);
    if (response.status === 401 && accountRequest && token === getAuthToken()) {
      setAuthToken(null);
      window.dispatchEvent(new Event('smart-exam-session-expired'));
    }
    const detail = typeof data.detail === 'string' ? data.detail : Array.isArray(data.detail)
      ? data.detail.map((item: { loc?: (string | number)[]; msg?: string }) => `${item.loc?.slice(1).join('.') || 'Input'}: ${item.msg || 'Invalid value'}`).join('; ')
      : `Request failed (${response.status})`;
    throw new ApiError(detail, response.status);
  }
  return { response, token, accountRequest };
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const { response, token, accountRequest } = await responseFor(path, options);
  const data = await response.json();
  assertAccount(token, accountRequest);
  return data as T;
}

export async function requestBlob(path: string): Promise<Blob> {
  const { response, token, accountRequest } = await responseFor(path);
  const blob = await response.blob();
  assertAccount(token, accountRequest);
  return blob;
}

export function json(method: string, body: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
