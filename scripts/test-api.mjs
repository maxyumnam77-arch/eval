import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { transformWithOxc } from 'vite';

const source = await readFile(new URL('../src/api.ts', import.meta.url), 'utf8');
const { code } = await transformWithOxc(source, 'api.ts');
const { request, setAuthToken, getAuthToken, ApiError } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const values = new Map();
globalThis.sessionStorage = {
  getItem: key => values.get(key) || null,
  setItem: (key, value) => values.set(key, value),
  removeItem: key => values.delete(key),
};
globalThis.window = new EventTarget();
let expirations = 0;
window.addEventListener('smart-exam-session-expired', () => expirations++);
test.beforeEach(() => { values.clear(); expirations = 0; });

test('an old request cannot revoke a newly signed-in account', async () => {
  let finish;
  globalThis.fetch = (_url, options) => {
    assert.equal(options.headers.get('Authorization'), 'Bearer old-session');
    return new Promise(resolve => { finish = resolve; });
  };
  setAuthToken('old-session');
  const pending = request('/auth/me');
  setAuthToken('new-session');
  finish(new Response(JSON.stringify({ detail: 'Expired' }), { status: 401 }));
  await assert.rejects(pending, error => error instanceof ApiError && error.status === 409);
  assert.equal(getAuthToken(), 'new-session');
  assert.equal(expirations, 0);
});

test('expired sessions return the UI to sign-in', async () => {
  setAuthToken('expired-session');
  globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'Sign in' }), { status: 401 });
  await assert.rejects(request('/student/answers'), error => error.status === 401);
  assert.equal(getAuthToken(), null);
  assert.equal(expirations, 1);
});

test('incorrect login credentials do not expire an existing session', async () => {
  setAuthToken('existing-session');
  globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'Incorrect password' }), { status: 401 });
  await assert.rejects(request('/auth/login'), /Incorrect password/);
  assert.equal(getAuthToken(), 'existing-session');
  assert.equal(expirations, 0);
});

test('network failure keeps the session available for recovery', async () => {
  setAuthToken('existing-session');
  globalThis.fetch = async () => { throw new Error('Network unavailable'); };
  await assert.rejects(request('/auth/me'), /Backend unavailable/);
  assert.equal(getAuthToken(), 'existing-session');
});

test('field validation errors explain which value needs correction', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ detail: [{ loc: ['body', 'maxMarks'], msg: 'Must be positive' }] }), { status: 422 });
  await assert.rejects(request('/questions'), /maxMarks: Must be positive/);
});
