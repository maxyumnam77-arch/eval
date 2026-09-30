import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { transformWithOxc } from 'vite';

const source = await readFile(new URL('../src/api.ts', import.meta.url), 'utf8');
const { code } = await transformWithOxc(source, 'api.ts');
const { request, requestBlob, setAuthToken, getAuthToken, ApiError } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
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

test('backup downloads use the signed-in account and preserve binary contents', async () => {
  setAuthToken('admin-session');
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/backup');
    assert.equal(options.headers.get('Authorization'), 'Bearer admin-session');
    return new Response(new Uint8Array([80, 75, 0, 255]), { headers: { 'Content-Type': 'application/zip' } });
  };
  const blob = await requestBlob('/backup');
  assert.equal(blob.type, 'application/zip');
  assert.deepEqual([...new Uint8Array(await blob.arrayBuffer())], [80, 75, 0, 255]);
});

test('a download cannot complete into a different signed-in account', async () => {
  setAuthToken('old-admin');
  let finish;
  globalThis.fetch = async () => ({ ok: true, blob: () => new Promise(resolve => { finish = resolve; }) });
  const pending = requestBlob('/backup');
  while (!finish) await new Promise(resolve => setTimeout(resolve, 0));
  setAuthToken('new-student'); finish(new Blob(['private-backup']));
  await assert.rejects(pending, error => error.status === 409);
  assert.equal(getAuthToken(), 'new-student'); assert.equal(expirations, 0);
});

test('binary download errors are shown instead of saving a false ZIP', async () => {
  setAuthToken('student-session');
  globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'Admin access required.' }), { status: 403 });
  await assert.rejects(requestBlob('/backup'), /Admin access required/);
  assert.equal(getAuthToken(), 'student-session');
});
