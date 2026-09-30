import { useEffect, useRef, useState } from 'react';
import { json, request } from '../api';
import { Account } from './LoginView';
import { AnswerImage } from './AnswerImage';
import { StudentQuestion } from '../types';
import { downloadCsv, printReport } from '../reports';
import { WorkPhase, WorkProgress } from './WorkProgress';

type Question = { id: string; code: string; title: string; prompt: string; subject: string; maxMarks: number };
type Result = {
  id: string; status: 'graded' | 'pending'; studentName: string; questionTitle: string; submittedAt: string;
  maxMarks: number; transcript: string; ocrError: string; message?: string;
  score?: number; feedback?: string; reviewFlags?: string[];
  criteria?: { title: string; maxMark: number; mark: number; evidence: string }[];
  pages: { position: number; fileName: string; url: string }[];
};

export function StudentSubmitView({ theme, account, onSubmitted, examAttemptId, examQuestions }: {
  theme: 'light' | 'dark'; account: Account; onSubmitted: () => void; examAttemptId?: string; examQuestions?: StudentQuestion[];
}) {
  const dark = theme === 'dark';
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [questionId, setQuestionId] = useState('');
  const [answer, setAnswer] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const [ocrMode, setOcrMode] = useState('accurate');
  const [result, setResult] = useState<Result | null>(null);
  const [draft, setDraft] = useState<Result | null>(null);
  const [reviewedText, setReviewedText] = useState('');
  const [history, setHistory] = useState<Result[]>([]);
  const [previewPage, setPreviewPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<WorkPhase>('idle');
  const [scanned, setScanned] = useState(false);
  const historyPath = `/student/answers${examAttemptId ? `?exam_attempt_id=${examAttemptId}` : ''}`;

  useEffect(() => {
    Promise.all([examQuestions ? Promise.resolve(examQuestions) : request<Question[]>('/student/questions'), request<Result[]>(historyPath)])
      .then(([items, saved]) => { setQuestions(items); setQuestionId(items[0]?.id || ''); setHistory(saved); })
      .catch(e => { setQuestions([]); setError((e as Error).message); });
  }, [examAttemptId]);

  const selected = questions?.find(q => q.id === questionId);
  const input = `w-full rounded-xl border p-3 text-sm ${dark ? 'bg-slate-950/50 border-white/20 text-white' : 'bg-white/75 border-slate-300 text-slate-900'}`;
  const panel = `alpine-card ${dark ? 'text-slate-100' : 'light-theme text-slate-900'} p-5 sm:p-7`;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(''); setResult(null); setDraft(null); setBusy(true);
    const form = new FormData();
    form.append('question_id', questionId);
    form.append('answer_text', answer);
    form.append('ocr_mode', ocrMode);
    if (examAttemptId) form.append('exam_attempt_id', examAttemptId);
    files.forEach(file => form.append('files', file));
    try {
      if (files.length && !answer.trim() && ocrMode !== 'manual') {
        setScanned(true); setPhase('reading');
        const pending = await request<Result>('/student/answers/draft', { method: 'POST', body: form });
        setDraft(pending); setReviewedText(pending.transcript); setPreviewPage(0); setPhase('review');
      } else {
        setScanned(false); setPhase('grading');
        const submitted = await request<Result>('/student/answers', { method: 'POST', body: form });
        if (submitted.status === 'pending') {
          setDraft(submitted); setReviewedText(submitted.transcript); setPreviewPage(0); setPhase('review');
        } else { setResult(submitted); setPhase('ready'); }
      }
      setHistory(await request<Result[]>(historyPath));
      onSubmitted();
    } catch (e) { setError((e as Error).message); setPhase(prev => prev === 'reading' || prev === 'grading' ? 'idle' : prev); }
    finally { setBusy(false); }
  };

  const confirmAndGrade = async () => {
    if (!draft) return;
    setBusy(true); setError(''); setPhase('grading');
    try {
      const scored = await request<Result>(`/student/answers/${draft.id}/grade`, json('POST', { text: reviewedText }));
      if (scored.status === 'graded') { setResult(scored); setDraft(null); setPhase('ready'); }
      else { setDraft(scored); setPhase('review'); }
      setHistory(await request<Result[]>(historyPath));
      onSubmitted();
    } catch (e) { setError((e as Error).message); setPhase(prev => prev === 'grading' ? 'review' : prev); }
    finally { setBusy(false); }
  };

  return <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
    <section className={`${panel} lg:col-span-5 space-y-5`}>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-blue-500">Student submission</p>
        <h2 className="text-xl font-bold mt-1">Submit your answer</h2>
        <p className="text-sm opacity-75 mt-1">Signed in as {account.displayName} ({account.username}). Typed answers grade immediately; review scanned text before grading.</p>
      </div>
      {!questions?.length && <p className="text-sm">No approved questions are available yet. An instructor can set one up in Admin.</p>}
      {questions && questions.length > 0 && <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-semibold">Question
          <select disabled={busy} className={`${input} mt-1`} value={questionId} onChange={e => {
            setQuestionId(e.target.value); setResult(null); setDraft(null); setPhase('idle'); setAnswer(''); setFiles([]);
            if (fileInput.current) fileInput.current.value = '';
          }}>
            {questions.map(q => <option key={q.id} value={q.id}>{q.code} · {q.title} ({q.maxMarks} marks)</option>)}
          </select>
        </label>
        {selected && <div className={`rounded-xl border p-4 text-sm ${dark ? 'bg-white/5 border-white/15' : 'bg-white/60 border-white/80'}`}>
          <strong>{selected.subject} · Maximum {selected.maxMarks} marks</strong><p className="mt-2">{selected.prompt}</p>
        </div>}
        <label className="block text-sm font-semibold">Type your answer
          <textarea disabled={busy} className={`${input} mt-1 min-h-36`} value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Type here, or upload answer pages below" />
        </label>
        <label className="block text-sm font-semibold">Answer images (optional, up to 12 pages)
          <input disabled={busy} ref={fileInput} className={`${input} mt-1`} type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={e => setFiles(Array.from(e.target.files || []))} />
        </label>
        {files.length > 0 && <label className="block text-sm font-semibold">Read images with
          <select disabled={busy} className={`${input} mt-1`} value={ocrMode} onChange={e => setOcrMode(e.target.value)}>
            <option value="accurate">Qwen vision OCR</option><option value="fast">Paddle OCR</option><option value="manual">Use my typed answer</option>
          </select>
        </label>}
        <button className="alpine-btn-blue text-white w-full p-3 font-bold disabled:opacity-50" disabled={busy || (!answer.trim() && !files.length) || (ocrMode === 'manual' && !answer.trim())}>
          {busy ? 'Working…' : files.length && !answer.trim() ? 'Read images for review' : 'Submit and get result'}
        </button>
        <p className="text-xs opacity-70">For images, check and correct the extracted words before the model assigns marks.</p>
      </form>}
      <WorkProgress phase={phase} busy={busy} scanned={scanned} />
      {draft && <div className="space-y-3 border-t border-slate-400/30 pt-5">
        <h3 className="font-bold">Review answer and retry grading</h3>
        <p className="text-xs opacity-75">Check your answer text and any uploaded pages. Confirm to grade this saved attempt.</p>
        {draft.pages.length > 0 && <div>
          <div className="flex gap-2 flex-wrap">{draft.pages.map(page => <button key={page.position} type="button"
            onClick={() => setPreviewPage(page.position)} className={`text-xs px-3 py-1.5 rounded-lg border ${previewPage === page.position ? 'bg-blue-600 text-white' : ''}`}>
            Page {page.position + 1}</button>)}</div>
          <AnswerImage src={draft.pages.find(page => page.position === previewPage)?.url}
            alt={`Uploaded answer page ${previewPage + 1}`} className="w-full max-h-72 object-contain mt-2 rounded-lg border" />
        </div>}
        {draft.ocrError && <p className="text-xs text-amber-600">OCR issue: {draft.ocrError}</p>}
        <textarea disabled={busy} className={`${input} min-h-40`} aria-label="Corrected answer text" value={reviewedText}
          onChange={e => setReviewedText(e.target.value)} placeholder="Correct the OCR text here or type the answer if it could not be read" />
        {draft.message && <p className="text-xs text-amber-600">{draft.message}</p>}
        <button type="button" onClick={confirmAndGrade} disabled={busy || !reviewedText.trim()}
          className="alpine-btn-blue text-white w-full p-3 font-bold disabled:opacity-50">
          {busy ? 'Grading…' : 'Confirm text and get grade'}</button>
      </div>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </section>
    <section className={`${panel} lg:col-span-7 min-h-[450px]`} aria-live="polite">
      <h2 className="font-bold text-lg">Your result</h2>
      {!result && <p className="text-sm opacity-70 mt-3">Submit an answer to see your score and criterion feedback here.</p>}
      {result && <div className="space-y-4 mt-4">
        {result.status === 'graded' && <div className="flex flex-wrap gap-2 text-xs">
          <button type="button" className="rounded-lg border px-3 py-2" onClick={() => downloadCsv('answer-result.csv',
            ['Student', 'ID', 'Question', 'Total', 'Overall maximum', 'Feedback', 'Criterion', 'Mark', 'Maximum', 'Evidence'],
            (result.criteria || []).map(c => [account.displayName, account.username, result.questionTitle, result.score, result.maxMarks,
              result.feedback, c.title, c.mark, c.maxMark, c.evidence]))}>Download CSV</button>
          <button type="button" className="rounded-lg border px-3 py-2" onClick={() => printReport(result.questionTitle,
            [`${account.displayName} (${account.username}) · ${result.score}/${result.maxMarks}`, result.feedback || '', `Answer: ${result.transcript}`],
            ['Criterion', 'Mark', 'Maximum', 'Evidence'], (result.criteria || []).map(c => [c.title, c.mark, c.maxMark, c.evidence]))}>Print / Save PDF</button>
        </div>}
        {result.status === 'graded' ? <div className="rounded-xl bg-emerald-600 text-white p-5">
          <p className="text-sm">Automatic grade for {result.studentName}</p>
          <p className="text-3xl font-bold">{result.score} / {result.maxMarks}</p>
        </div> : <p className="rounded-xl bg-amber-100 text-amber-900 p-4 text-sm">{result.message}</p>}
        {result.reviewFlags?.map(flag => <p key={flag} className="text-sm text-amber-600">Needs review: {flag}</p>)}
        {result.criteria?.map((c, i) => <div key={i} className={`rounded-xl border p-4 text-sm ${dark ? 'border-white/20' : 'border-slate-300'}`}>
          <div className="flex justify-between gap-2 font-semibold"><span>{c.title}</span><span>{c.mark} / {c.maxMark}</span></div>
          <p className="text-xs opacity-75 mt-1">Evidence: {c.evidence || 'No verified evidence'}</p>
        </div>)}
        {result.feedback && <p className="text-sm">Feedback: {result.feedback}</p>}
        {result.transcript && <details className="text-sm"><summary className="cursor-pointer font-semibold">Text used for grading</summary>
          <p className="whitespace-pre-wrap mt-2 p-3 rounded-xl border border-slate-400/30">{result.transcript}</p></details>}
        {result.ocrError && <p className="text-xs text-amber-600">OCR: {result.ocrError}</p>}
      </div>}
      <div className="border-t border-slate-400/30 mt-6 pt-5">
        <h3 className="font-bold">Your previous answers ({history.length})</h3>
        {!!history.length && <button type="button" className="text-xs underline mt-2" onClick={() => downloadCsv('my-answer-history.csv',
          ['Question', 'Submitted', 'Status', 'Score', 'Maximum', 'Feedback'], history.map(item => [item.questionTitle, item.submittedAt, item.status, item.score, item.maxMarks, item.feedback]))}>Download history CSV</button>}
        {!history.length && <p className="text-sm opacity-70 mt-2">No attempts yet.</p>}
        <div className="space-y-2 mt-3">{history.map(item => <button key={item.id} type="button" disabled={busy} onClick={() => {
          setPreviewPage(0); setError('');
          setScanned(item.pages.length > 0);
          if (item.status === 'pending') { setResult(null); setDraft(item); setReviewedText(item.transcript); setPhase('review'); }
          else { setResult(item); setDraft(null); setPhase('ready'); }
        }}
          className="w-full text-left rounded-xl border border-slate-400/30 p-3 text-sm flex justify-between gap-3">
          <span><strong>{item.questionTitle}</strong><span className="block text-xs opacity-70">{new Date(item.submittedAt).toLocaleString()}</span></span>
          <span className="font-bold whitespace-nowrap">{item.status === 'graded' ? `${item.score}/${item.maxMarks}` : 'Pending'}</span>
        </button>)}</div>
      </div>
    </section>
  </div>;
}
