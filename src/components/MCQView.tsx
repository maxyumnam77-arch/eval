import { useEffect, useState } from 'react';
import { MCQQuestion, MCQStudentAttempt } from '../types';
import { request } from '../api';
import { downloadCsv, printReport } from '../reports';
import { WorkPhase, WorkProgress } from './WorkProgress';
import { clearDraft, DraftNotice, DraftScope, emptyDraftNotice, readChoicesDraft, writeChoicesDraft } from '../drafts';
import { DraftStatus } from './DraftStatus';

type Props = {
  mcqs: MCQQuestion[]; studentAttempts: MCQStudentAttempt[]; theme: 'light' | 'dark'; workspace: 'grading' | 'admin';
  onAddMCQ: (item: MCQQuestion) => Promise<void>; onUpdateMCQ: (item: MCQQuestion) => Promise<void>;
  onDeleteMCQ: (id: string) => Promise<void>;
  onCreateAttempt: (name: string, id: string, answers: Record<string, string>) => Promise<MCQStudentAttempt>;
  studentIdentity?: { name: string; id: string };
  draftAccountId?: string;
};
const empty = { code: '', subject: 'General', question: '', options: [
  { key: 'A' as const, text: '' }, { key: 'B' as const, text: '' },
  { key: 'C' as const, text: '' }, { key: 'D' as const, text: '' }], correctKey: 'A' as const, explanation: '' };

export const MCQView = ({ mcqs, studentAttempts, theme, workspace, onAddMCQ, onUpdateMCQ, onDeleteMCQ, onCreateAttempt, studentIdentity, draftAccountId }: Props) => {
  const dark = theme === 'dark';
  const card = `alpine-card ${dark ? 'text-slate-100' : 'light-theme text-slate-900'}`;
  const input = `w-full rounded-lg p-2 border text-sm ${dark ? 'bg-slate-950/50 text-white border-white/20' : 'bg-white/75 text-slate-900 border-slate-300'}`;
  const [tab, setTab] = useState<'grade' | 'manage'>('grade');
  useEffect(() => setTab(workspace === 'admin' ? 'manage' : 'grade'), [workspace]);
  const [draft, setDraft] = useState<MCQQuestion>({ id: '', mark: 1, ...empty });
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [draftNotice, setDraftNotice] = useState<DraftNotice>(emptyDraftNotice);
  const choiceScope: DraftScope | null = draftAccountId && workspace !== 'admin'
    ? { accountId: draftAccountId, kind: 'mcq', id: 'practice' } : null;
  const questionSignature = JSON.stringify(mcqs.map(q => [q.id, q.options.map(option => option.key)]));
  useEffect(() => {
    const saved = choiceScope ? readChoicesDraft(choiceScope, mcqs) : { value: null, notice: emptyDraftNotice };
    setAnswers(saved.value || {}); setDraftNotice(saved.notice);
  }, [draftAccountId, workspace, questionSignature]);
  const saveAnswers = (next: Record<string, string>) => {
    setAnswers(next); if (choiceScope) setDraftNotice(writeChoicesDraft(choiceScope, next));
  };
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<WorkPhase>('idle');
  const [scanned, setScanned] = useState(false);
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [scanError, setScanError] = useState('');
  const [uncertainCodes, setUncertainCodes] = useState<string[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState('');
  const [latestAttempt, setLatestAttempt] = useState<MCQStudentAttempt | null>(null);
  const active = latestAttempt || studentAttempts.find(a => a.id === selectedAttempt) || studentAttempts[0];
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      if (draft.id) await onUpdateMCQ(draft); else await onAddMCQ(draft);
      setDraft({ id: '', mark: 1, ...empty });
    } catch { /* App displays the error. */ } finally { setBusy(false); }
  };
  const submitAttempt = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setPhase('grading');
    try {
      setLatestAttempt(await onCreateAttempt(studentIdentity?.name || name, studentIdentity?.id || studentId, answers));
      if (choiceScope) setDraftNotice(clearDraft(choiceScope));
      setName(''); setStudentId(''); setAnswers({});
      setPhase('ready');
    } catch { setPhase(scanned ? 'review' : 'idle'); /* App displays the error. */ } finally { setBusy(false); }
  };
  const readSheet = async () => {
    if (!scanFile) return;
    setBusy(true); setScanError(''); setScanned(true); setPhase('reading');
    const form = new FormData(); form.append('file', scanFile);
    try {
      const detected = await request<{ answers: Record<string, string>; uncertainCodes: string[] }>('/student/mcqs/scan',
        { method: 'POST', body: form });
      saveAnswers(detected.answers); setUncertainCodes(detected.uncertainCodes);
      setPhase('review');
    } catch (e) { setScanError((e as Error).message); setPhase('idle'); }
    finally { setBusy(false); }
  };
  return <div className="space-y-5">
    <div className={`${card} p-5 flex flex-wrap items-center justify-between gap-3`}>
      <div><h2 className="font-bold text-lg">MCQ evaluation</h2><p className="text-xs opacity-70">Exact answer-key comparison: correct 1, wrong or blank 0.</p></div>
      <div className="flex gap-2 text-xs font-bold">
        <button className={`px-3 py-2 rounded-lg ${tab === 'grade' ? 'bg-blue-600 text-white' : 'border border-slate-400/40'}`} onClick={() => setTab('grade')}>Grade MCQs</button>
        {workspace === 'admin' && <button className={`px-3 py-2 rounded-lg ${tab === 'manage' ? 'bg-blue-600 text-white' : 'border border-slate-400/40'}`} onClick={() => setTab('manage')}>Manage answer keys</button>}
      </div>
    </div>
    {tab === 'grade' ? <div className="grid lg:grid-cols-3 gap-5">
      <form onSubmit={submitAttempt} className={`${card} p-5 space-y-3 lg:col-span-2`}>
        <h3 className="font-bold">New MCQ attempt</h3>
        {mcqs.length === 0 && <p className="text-sm">Add MCQs in Manage answer keys first.</p>}
        {studentIdentity ? <p className="text-sm opacity-75">Submitting as {studentIdentity.name} ({studentIdentity.id})</p> : <div className="grid sm:grid-cols-2 gap-2">
          <input required className={input} placeholder="Student name" value={name} onChange={e => setName(e.target.value)} />
          <input required className={input} placeholder="Student ID" value={studentId} onChange={e => setStudentId(e.target.value)} />
        </div>}
        {workspace !== 'admin' && <div className="rounded-xl border border-slate-400/30 p-3 space-y-2">
          <label className="block text-sm font-semibold">Optional scanned MCQ sheet
            <input disabled={busy} className={`${input} mt-1`} type="file" accept="image/png,image/jpeg,image/webp"
              onChange={e => { setScanFile(e.target.files?.[0] || null); setPhase('idle'); setUncertainCodes([]); setScanError(''); }} /></label>
          <p className="text-xs opacity-70">Write each question code beside A/B/C/D choices and mark one option. Qwen reads visible marks; check every detected choice below before scoring.</p>
          <button type="button" disabled={busy || !scanFile} onClick={readSheet}
            className="px-3 py-2 text-xs rounded-lg bg-blue-600 text-white disabled:opacity-50">{busy && phase === 'reading' ? 'Reading marks…' : 'Detect marked choices'}</button>
          {scanError && <p role="alert" className="text-xs text-red-600">{scanError}</p>}
          {!!uncertainCodes.length && <p className="text-xs text-amber-600">Unclear or blank: {uncertainCodes.join(', ')}. Select the correct marked choice yourself before scoring.</p>}
        </div>}
        {mcqs.map((q, i) => <fieldset disabled={busy} className={`alpine-subcard ${dark ? '' : 'light-theme'} p-4 rounded-xl`} key={q.id}>
          <legend className="font-semibold text-sm">{q.code} · Question {i + 1} · 1 mark</legend><p className="text-sm mb-2">{q.question}</p>
          {q.options.map(option => <label key={option.key} className="flex items-center gap-2 py-1 text-sm">
            <input type="radio" name={q.id} checked={answers[q.id] === option.key}
              onChange={() => saveAnswers({ ...answers, [q.id]: option.key })} />
            {option.key}. {option.text}
          </label>)}
          <button type="button" className="text-xs underline mt-1" onClick={() => saveAnswers({ ...answers, [q.id]: '' })}>Clear answer</button>
        </fieldset>)}
        {choiceScope && <><DraftStatus notice={draftNotice} /><p className="text-xs opacity-70">Unsubmitted choices are saved in this browser.</p>
          {Object.values(answers).some(Boolean) && <button type="button" disabled={busy} className="text-xs underline" onClick={() => saveAnswers({})}>Discard saved choices</button>}</>}
        <button disabled={busy || !mcqs.length} className="alpine-btn-blue px-5 py-2.5 text-sm text-white font-bold disabled:opacity-50">
          {busy && phase === 'grading' ? 'Scoring…' : 'Score attempt'}</button>
        <WorkProgress phase={phase} busy={busy} scanned={scanned} mode="mcq" />
      </form>
      <div className={`${card} p-5 space-y-3`}>
        <h3 className="font-bold">{workspace === 'admin' ? `Saved attempts (${studentAttempts.length})` : `Your attempts (${studentAttempts.length})`}</h3>
        {studentAttempts.map(a => <button key={a.id} onClick={() => { setSelectedAttempt(a.id); setLatestAttempt(null); }}
          className={`block w-full text-left p-3 rounded-xl border text-sm ${active?.id === a.id ? 'border-blue-500 bg-blue-500/10' : 'border-slate-400/20'}`}>
          <strong>{a.studentName}</strong><span className="block opacity-70">{a.studentId} · {a.score}/{a.maxMarks}</span>
        </button>)}
        {active && <div className="border-t border-slate-400/30 pt-3">
          <h4 className="font-bold">Result: {active.score}/{active.maxMarks}</h4>
          <div className="flex flex-wrap gap-2 my-2 text-xs">
            <button type="button" className="rounded-lg border px-2 py-1" onClick={() => downloadCsv('mcq-result.csv',
              ['Student', 'ID', 'Submitted', 'Total', 'Maximum', 'Question', 'Answer', 'Key', 'Mark'],
              (active.results || []).map(r => [active.studentName, active.studentId, active.submittedAt, active.score, active.maxMarks,
                r.code || r.questionId, r.studentAnswer || 'Blank', r.correctKey, r.awarded]))}>Download CSV</button>
            <button type="button" className="rounded-lg border px-2 py-1" onClick={() => printReport('MCQ result',
              [`${active.studentName} (${active.studentId}) · ${active.score}/${active.maxMarks}`], ['Question', 'Answer', 'Key', 'Mark'],
              (active.results || []).map(r => [r.code || r.questionId, r.studentAnswer || 'Blank', r.correctKey, r.awarded]))}>Print / Save PDF</button>
          </div>
          {active.results?.map((r, i) => <p key={r.questionId} className="text-xs py-1">
            Q{i + 1}: {r.studentAnswer || 'Blank'} · key {r.correctKey} · {r.awarded}/1</p>)}
        </div>}
      </div>
    </div> : <div className="grid lg:grid-cols-2 gap-5">
      <form onSubmit={save} className={`${card} p-5 space-y-3`}>
        <h3 className="font-bold">{draft.id ? 'Edit MCQ' : 'Add MCQ'}</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          <input required className={input} placeholder="Code" value={draft.code} onChange={e => setDraft({ ...draft, code: e.target.value })} />
          <input className={input} placeholder="Subject" value={draft.subject} onChange={e => setDraft({ ...draft, subject: e.target.value })} />
        </div>
        <textarea required className={input} placeholder="Question" value={draft.question} onChange={e => setDraft({ ...draft, question: e.target.value })} />
        {draft.options.map((option, i) => <label className="flex items-center gap-2 text-xs" key={option.key}>
          <span className="font-bold">{option.key}</span><input required className={input} placeholder={`Option ${option.key}`}
            value={option.text} onChange={e => setDraft({ ...draft, options: draft.options.map((v, j) => j === i ? { ...v, text: e.target.value } : v) })} />
          <input type="radio" name="correct-key" checked={draft.correctKey === option.key} onChange={() => setDraft({ ...draft, correctKey: option.key })} aria-label={`Option ${option.key} is correct`} />
        </label>)}
        <p className="text-xs opacity-70">Choose the correct option using the circle on the right.</p>
        <input className={input} placeholder="Explanation (optional)" value={draft.explanation} onChange={e => setDraft({ ...draft, explanation: e.target.value })} />
        <button disabled={busy} className="alpine-btn-blue px-5 py-2.5 text-sm text-white font-bold">{draft.id ? 'Save changes' : 'Add MCQ'}</button>
      </form>
      <div className={`${card} p-5 space-y-2`}>
        <h3 className="font-bold">Question keys ({mcqs.length})</h3>
        {mcqs.map(q => <div key={q.id} className={`alpine-subcard ${dark ? '' : 'light-theme'} p-3 flex items-start justify-between gap-2`}>
          <div><strong className="text-sm">{q.code}: {q.question}</strong><p className="text-xs opacity-70">Key: {q.correctKey} · 1 mark</p></div>
          <div className="flex gap-2 text-xs"><button className="underline" onClick={() => setDraft(q)}>Edit</button>
            <button className="text-red-500 underline" onClick={() => { if (confirm(`Delete ${q.code}?`)) onDeleteMCQ(q.id).catch(() => {}); }}>Delete</button></div>
        </div>)}
      </div>
    </div>}
  </div>;
};
