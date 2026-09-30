import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { transformWithOxc } from 'vite';

const source = await readFile(new URL('../src/drafts.ts', import.meta.url), 'utf8');
const { code } = await transformWithOxc(source, 'drafts.ts');
const { draftKey, readTextDraft, writeDraft, clearDraft, readChoicesDraft, writeChoicesDraft } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const values = new Map();
const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
const scope = { accountId: 'student-a', kind: 'answer', id: 'q1' };
test.beforeEach(() => { values.clear(); globalThis.localStorage = storage; });

test('typed text survives reload and remains separate by account, question, and exam attempt', () => {
  writeDraft(scope, 'Framing.\n学生 answer.');
  assert.equal(readTextDraft({ ...scope }).value, 'Framing.\n学生 answer.');
  assert.equal(readTextDraft(scope).notice.restored, true);
  for (const other of [{ ...scope, accountId: 'student-b' }, { ...scope, id: 'q2' }, { ...scope, examAttemptId: 'exam-1' }, { ...scope, kind: 'review' }]) {
    assert.equal(readTextDraft(other).value, null);
  }
  writeDraft({ ...scope, examAttemptId: 'exam-1' }, 'Exam answer');
  assert.equal(readTextDraft({ ...scope, examAttemptId: 'exam-1' }).value, 'Exam answer');
  assert.equal(readTextDraft({ ...scope, examAttemptId: 'exam-2' }).value, null);
});

test('deliberately empty OCR corrections restore as empty text', () => {
  const review = { ...scope, kind: 'review', id: 'submission-1' };
  writeDraft(review, '');
  assert.equal(readTextDraft(review).value, '');
  assert.ok(readTextDraft(review).notice.savedAt);
});

test('corrupt, unknown, and wrongly typed drafts are ignored with an explanation', () => {
  for (const data of ['{broken', JSON.stringify({ version: 2, savedAt: new Date().toISOString(), value: 'old' }),
    JSON.stringify({ version: 1, savedAt: 'invalid-date', value: 'text' }),
    JSON.stringify({ version: 1, savedAt: new Date().toISOString(), value: {} })]) {
    values.set(draftKey(scope), data);
    const restored = readTextDraft(scope);
    assert.equal(restored.value, null); assert.ok(restored.notice.error);
  }
});

test('storage failure is reported and does not replace the previously saved text', () => {
  writeDraft(scope, 'Previous text');
  globalThis.localStorage = { ...storage, setItem: () => { throw new Error('Quota exceeded'); } };
  assert.ok(writeDraft(scope, 'Unsaved replacement').error);
  assert.equal(readTextDraft(scope).value, 'Previous text');
  globalThis.localStorage = { getItem: () => { throw new Error('Storage disabled'); }, removeItem: () => { throw new Error('Storage disabled'); } };
  assert.ok(readTextDraft(scope).notice.error && clearDraft(scope).error);
});

test('recovered MCQs retain only available questions and options', () => {
  const choices = { ...scope, kind: 'mcq', id: 'practice' };
  writeChoicesDraft(choices, { q1: 'B', q2: 'C', removed: 'A' });
  assert.deepEqual(readChoicesDraft(choices, [{ id: 'q1', options: [{ key: 'A' }, { key: 'B' }] },
    { id: 'q2', options: [{ key: 'A' }, { key: 'B' }] }]).value, { q1: 'B' });
  assert.equal(readChoicesDraft(choices, []).value, null);
});

test('discarding or finishing one draft keeps every other answer intact', () => {
  const other = { ...scope, id: 'q2' };
  const choices = { ...scope, kind: 'exam-mcq', id: 'attempt-1' };
  writeDraft(scope, 'First'); writeDraft(other, 'Second'); writeChoicesDraft(choices, { q1: 'B' });
  clearDraft(scope); writeChoicesDraft(choices, { q1: '' });
  assert.equal(readTextDraft(scope).value, null);
  assert.equal(readTextDraft(other).value, 'Second');
  assert.equal(readChoicesDraft(choices, [{ id: 'q1', options: [{ key: 'B' }] }]).value, null);
});
