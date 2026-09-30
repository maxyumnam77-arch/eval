export type DraftScope = { accountId: string; kind: string; id: string; examAttemptId?: string };
export type DraftNotice = { savedAt: string | null; error: string | null; restored?: boolean };
export const emptyDraftNotice: DraftNotice = { savedAt: null, error: null };

export function draftKey(scope: DraftScope) {
  return 'smart-exam-draft:v1:' + JSON.stringify([scope.accountId, scope.kind, scope.id, scope.examAttemptId || '']);
}

export function readDraft<T>(scope: DraftScope, valid: (value: unknown) => value is T): { value: T | null; notice: DraftNotice } {
  let stored: string | null;
  try { stored = localStorage.getItem(draftKey(scope)); }
  catch { return { value: null, notice: { savedAt: null, error: 'Draft storage is unavailable in this browser.' } }; }
  if (!stored) return { value: null, notice: emptyDraftNotice };
  try {
    const data = JSON.parse(stored);
    if (!data || data.version !== 1 || typeof data.savedAt !== 'string' || !Number.isFinite(Date.parse(data.savedAt)) || !valid(data.value)) throw new Error('Invalid draft');
    return { value: data.value, notice: { savedAt: data.savedAt, error: null, restored: true } };
  } catch { return { value: null, notice: { savedAt: null, error: 'A saved draft could not be restored. You can enter your answer again.' } }; }
}

export const readTextDraft = (scope: DraftScope) => readDraft(scope, (value): value is string => typeof value === 'string');

export function writeDraft(scope: DraftScope, value: unknown): DraftNotice {
  const savedAt = new Date().toISOString();
  try {
    localStorage.setItem(draftKey(scope), JSON.stringify({ version: 1, savedAt, value }));
    return { savedAt, error: null };
  } catch { return { savedAt: null, error: 'Draft could not be saved in this browser. Copy your text before leaving.' }; }
}

export function clearDraft(scope: DraftScope): DraftNotice {
  try { localStorage.removeItem(draftKey(scope)); return emptyDraftNotice; }
  catch { return { savedAt: null, error: 'The saved draft could not be cleared in this browser.' }; }
}

type ChoiceQuestion = { id: string; options: { key: string }[] };
export function readChoicesDraft(scope: DraftScope, questions: ChoiceQuestion[]) {
  const saved = readDraft(scope, (value): value is Record<string, string> => !!value && typeof value === 'object' && !Array.isArray(value)
    && Object.values(value).every(choice => typeof choice === 'string'));
  if (!saved.value) return saved;
  const choices = Object.fromEntries(questions.flatMap(q => {
    const value = saved.value![q.id];
    return value && q.options.some(option => option.key === value) ? [[q.id, value]] : [];
  }));
  return Object.keys(choices).length ? { ...saved, value: choices } : { value: null, notice: { ...saved.notice, savedAt: null, restored: false } };
}

export function writeChoicesDraft(scope: DraftScope, choices: Record<string, string>) {
  return Object.values(choices).some(Boolean) ? writeDraft(scope, choices) : clearDraft(scope);
}
