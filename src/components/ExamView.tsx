import { useEffect, useMemo, useState } from 'react';
import { json, request } from '../api';
import { DescriptiveQuestion, ExamAttempt, ExamDefinition, MCQQuestion, StudentQuestion } from '../types';
import { Account } from './LoginView';
import { StudentSubmitView } from './StudentSubmitView';
import { downloadCsv, printReport } from '../reports';

type Draft = { id: string; title: string; description: string; published: boolean; items: { kind: 'descriptive' | 'mcq'; questionId: string }[] };
const empty: Draft = { id: '', title: '', description: '', published: false, items: [] };

export function ExamView({ theme, workspace, account, questions, mcqs }: {
  theme: 'light' | 'dark'; workspace: 'student' | 'admin'; account: Account;
  questions: DescriptiveQuestion[]; mcqs: MCQQuestion[];
}) {
  const admin = workspace === 'admin';
  const [exams, setExams] = useState<ExamDefinition[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [activeId, setActiveId] = useState('');
  const [draft, setDraft] = useState<Draft>(empty);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const active = attempts.find(a => a.id === activeId);
  const dark = theme === 'dark';
  const card = `alpine-card ${dark ? 'text-slate-100' : 'light-theme text-slate-900'} p-5`;
  const input = `w-full rounded-lg border p-2 text-sm ${dark ? 'bg-slate-950/50 border-white/20 text-white' : 'bg-white/75 border-slate-300 text-slate-900'}`;
  const refresh = async () => {
    const [sets, saved] = await Promise.all([
      request<ExamDefinition[]>(admin ? '/exams' : '/student/exams'),
      request<ExamAttempt[]>(admin ? '/exam-attempts' : '/student/exam-attempts'),
    ]);
    setExams(sets); setAttempts(saved);
  };
  useEffect(() => { refresh().catch(e => setError((e as Error).message)).finally(() => setLoading(false)); }, [workspace]);
  useEffect(() => setAnswers({}), [activeId]);
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await action(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const selectQuestion = (kind: 'descriptive' | 'mcq', id: string) => setDraft(prev => ({ ...prev,
    items: prev.items.some(item => item.kind === kind && item.questionId === id)
      ? prev.items.filter(item => item.kind !== kind || item.questionId !== id) : [...prev.items, { kind, questionId: id }],
  }));
  const isSelected = (kind: string, id: string) => draft.items.some(item => item.kind === kind && item.questionId === id);
  const start = (id: string) => run(async () => {
    const started = await request<ExamAttempt>(`/student/exams/${id}/attempts`, { method: 'POST' });
    await refresh(); setActiveId(started.id);
  });
  const columns = ['Code', 'Question', 'Type', 'Status', 'Score', 'Maximum'];
  const resultRows = active?.items.map(item => [item.question.code, item.kind === 'descriptive' ? item.question.title : item.question.question,
    item.kind, item.status, item.score, item.maxMarks]) || [];
  // An attempt's question snapshot is immutable even when result statuses refresh.
  const descriptive = useMemo(() => active?.items.filter(item => item.kind === 'descriptive').map(item => item.question as StudentQuestion) || [], [active?.id]);
  return <div className="space-y-5">
    <header className={card}><h2 className="font-bold text-lg">{admin ? 'Exam sets & combined results' : 'My exams'}</h2>
      <p className="text-sm opacity-75 mt-1">{admin ? 'Group approved descriptive questions and MCQs into an exam, then publish it for students.' : 'Complete every question to receive your combined exam score. The latest answer to each descriptive question counts.'}</p></header>
    {error && <p role="alert" className={`${card} text-red-600`}>{error}</p>}
    {admin && <form className={`${card} space-y-4`} onSubmit={event => {
      event.preventDefault(); void run(async () => {
        await request(draft.id ? `/exams/${draft.id}` : '/exams', json(draft.id ? 'PUT' : 'POST', draft));
        setDraft(empty); await refresh();
      });
    }}>
      <h3 className="font-bold">{draft.id ? 'Edit exam set' : 'Create exam set'}</h3>
      <label className="block text-sm">Exam title<input required className={`${input} mt-1`} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
      <label className="block text-sm">Instructions<textarea className={`${input} mt-1`} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></label>
      <div className="grid md:grid-cols-2 gap-4 text-sm">
        <fieldset className="space-y-2"><legend className="font-semibold mb-2">Descriptive questions</legend>
          {!questions.length && <p className="text-xs opacity-70">Add a question and approve its rubric in Question Bank.</p>}
          {questions.map(q => <label key={q.id} className="flex gap-2 items-start"><input type="checkbox" checked={isSelected('descriptive', q.id)}
            onChange={() => selectQuestion('descriptive', q.id)} /><span>{q.code} · {q.title} · {q.maxMarks} marks {!q.rubricApproved && '(needs approval)'}</span></label>)}
        </fieldset>
        <fieldset className="space-y-2"><legend className="font-semibold mb-2">MCQs</legend>
          {!mcqs.length && <p className="text-xs opacity-70">Add MCQs in MCQ Answer Keys.</p>}
          {mcqs.map(q => <label key={q.id} className="flex gap-2 items-start"><input type="checkbox" checked={isSelected('mcq', q.id)}
            onChange={() => selectQuestion('mcq', q.id)} /><span>{q.code} · {q.question} · 1 mark</span></label>)}
        </fieldset>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.published} onChange={e => setDraft({ ...draft, published: e.target.checked })} />Publish for students</label>
      <div className="flex gap-2"><button disabled={busy || !draft.items.length} className="alpine-btn-blue text-white px-4 py-2 text-sm disabled:opacity-50">{busy ? 'Saving…' : 'Save exam set'}</button>
        {draft.id && <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={() => setDraft(empty)}>Cancel edit</button>}</div>
      <p className="text-xs opacity-70">Existing attempts keep their original questions, answer keys, and rubric versions.</p>
    </form>}
    <div className="grid lg:grid-cols-2 gap-5">
      <section className={`${card} space-y-3`}><h3 className="font-bold">{admin ? 'Saved exam sets' : 'Available exams'}</h3>
        {!exams.length && !loading && <p className="text-sm opacity-70">No {admin ? 'saved' : 'published'} exams yet.</p>}
        {exams.map(exam => <div key={exam.id} className="rounded-xl border border-slate-400/30 p-3 space-y-2 text-sm">
          <strong>{exam.title} · {exam.maxMarks} marks</strong><p className="text-xs opacity-70">{exam.items.length} questions · Version {exam.version}{admin ? ` · ${exam.published ? 'Published' : 'Draft'}` : ''}</p>
          {exam.description && <p className="text-xs">{exam.description}</p>}
          {admin ? <div className="flex gap-3 text-xs"><button type="button" className="underline" onClick={() => setDraft({ id: exam.id, title: exam.title, description: exam.description, published: exam.published,
            items: exam.items.map(item => ({ kind: item.kind, questionId: item.question.id })) })}>Edit</button>
            <button type="button" disabled={busy} className="underline text-red-600" onClick={() => { if (confirm(`Delete ${exam.title}?`)) void run(async () => { await request(`/exams/${exam.id}`, { method: 'DELETE' }); await refresh(); }); }}>Delete</button></div>
            : <button type="button" disabled={busy} onClick={() => void start(exam.id)} className="rounded-lg bg-blue-600 text-white px-3 py-2 text-xs">Start new attempt</button>}
        </div>)}
      </section>
      <section className={`${card} space-y-3`}><h3 className="font-bold">{admin ? 'Student exam attempts' : 'My saved attempts'}</h3>
        {!!attempts.length && <button type="button" className="text-xs underline" onClick={() => downloadCsv('exam-attempts.csv',
          ['Student', 'ID', 'Exam', 'Version', 'Started', 'Status', 'Graded questions', 'Total questions', 'Score', 'Maximum'],
          attempts.map(a => [a.studentName, a.studentId, a.title, a.version, a.startedAt, a.status, a.completedQuestions, a.totalQuestions, a.score, a.maxMarks]))}>Download attempts CSV</button>}
        {loading && <p className="text-sm opacity-70">Loading exams and saved attempts…</p>}
        {!attempts.length && !loading && <p className="text-sm opacity-70">No exam attempts yet.</p>}
        {attempts.map(attempt => <button key={attempt.id} type="button" className={`w-full text-left rounded-xl border p-3 text-sm ${activeId === attempt.id ? 'border-blue-500 bg-blue-500/10' : 'border-slate-400/30'}`}
          onClick={() => setActiveId(attempt.id)}><strong>{attempt.title} {admin && `· ${attempt.studentName}`}</strong>
          <span className="block text-xs opacity-70">{attempt.status === 'completed' ? `${attempt.score}/${attempt.maxMarks}` : `${attempt.completedQuestions}/${attempt.totalQuestions} questions graded`} · {new Date(attempt.startedAt).toLocaleString()}</span></button>)}
      </section>
    </div>
    {active && <>
      <section className={`${card} space-y-3`}>
        <h3 className="font-bold text-lg">{active.title} · {active.status === 'completed' ? `${active.score}/${active.maxMarks}` : 'In progress'}</h3>
        <p className="text-sm opacity-75">{active.completedQuestions}/{active.totalQuestions} questions graded · {active.earnedMarks} marks earned so far out of {active.maxMarks}.</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <button type="button" className="rounded-lg border px-3 py-2" onClick={() => downloadCsv('exam-result.csv',
            ['Student', 'ID', 'Exam', 'Exam version', 'Exam status', 'Exam total', 'Exam maximum', ...columns],
            resultRows.map(row => [active.studentName, active.studentId, active.title, active.version, active.status, active.score, active.maxMarks, ...row]))}>Download exam CSV</button>
          <button type="button" className="rounded-lg border px-3 py-2" onClick={() => printReport(active.title,
            [`${active.studentName} (${active.studentId}) · ${active.status === 'completed' ? `${active.score}/${active.maxMarks}` : 'Incomplete: final score pending'}`,
              `Exam version ${active.version} · Started ${new Date(active.startedAt).toLocaleString()}`, active.description], columns, resultRows)}>Print / Save PDF</button>
        </div>
        <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr><th className="p-2">Question</th><th className="p-2">Status</th><th className="p-2">Marks</th></tr></thead>
          <tbody>{active.items.map(item => <tr key={item.question.id} className="border-t border-slate-400/20"><td className="p-2">{item.question.code}</td><td className="p-2">{item.status}</td><td className="p-2">{item.score ?? '—'}/{item.maxMarks}</td></tr>)}</tbody></table></div>
      </section>
      {!admin && !!descriptive.length && <StudentSubmitView key={active.id} theme={theme} account={account} examAttemptId={active.id}
        examQuestions={descriptive} onSubmitted={() => { refresh().catch(e => setError((e as Error).message)); }} />}
      {!admin && active.items.some(item => item.kind === 'mcq') && <section className={`${card} space-y-3`}>
        <h3 className="font-bold">Exam MCQs</h3>
        {active.items.filter(item => item.kind === 'mcq').every(item => item.status === 'graded') ? <div className="space-y-2 text-sm"><p>MCQs graded. Start a new exam attempt to try again.</p>
          {active.items.map(item => item.kind === 'mcq' && <p key={item.question.id}>{item.question.code}: {item.studentAnswer || 'Blank'} · key {item.correctKey} · {item.score}/{item.maxMarks}</p>)}
        </div> : <form className="space-y-3" onSubmit={event => {
          event.preventDefault(); void run(async () => {
            await request(`/student/exam-attempts/${active.id}/mcqs`, json('POST', { answers })); await refresh();
          });
        }}>{active.items.map(item => item.kind === 'mcq' && <fieldset disabled={busy} key={item.question.id} className="rounded-lg border border-slate-400/30 p-3 text-sm">
          <legend className="font-bold">{item.question.code} · 1 mark</legend><p className="mb-2">{item.question.question}</p>
          {item.question.options.map(option => <label key={option.key} className="flex items-center gap-2 py-1"><input type="radio" name={`exam-${item.question.id}`}
            checked={answers[item.question.id] === option.key} onChange={() => setAnswers({ ...answers, [item.question.id]: option.key })} />{option.key}. {option.text}</label>)}
          <button type="button" className="text-xs underline mt-1" onClick={() => setAnswers({ ...answers, [item.question.id]: '' })}>Clear answer</button>
        </fieldset>)}<p className="text-xs opacity-70">Blank and wrong answers earn 0. All MCQs are scored together.</p>
          <button disabled={busy} className="alpine-btn-blue text-white px-4 py-2 text-sm">{busy ? 'Scoring…' : 'Score exam MCQs'}</button>
        </form>}
      </section>}
    </>}
  </div>;
}
