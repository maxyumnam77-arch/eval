import { useEffect, useState } from 'react';
import { request } from '../api';
import { downloadCsv, printReport } from '../reports';
import { Account } from './LoginView';

type Summary = {
  gradedAnswers: number; pendingAnswers: number; mcqAttempts: number; completedExams: number; latestAveragePercent: number | null;
  subjects: { subject: string; score: number; maxMarks: number; questions: number; percent: number }[];
  practiceAreas: { title: string; question: string; score: number; maxMarks: number }[];
  recentResults: { id: string; label: string; at: string; score: number; maxMarks: number }[];
};

export function PerformanceView({ theme, account }: { theme: 'light' | 'dark'; account: Account }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const refresh = async () => {
    setLoading(true); setError('');
    try { setSummary(await request<Summary>('/student/performance')); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);
  const card = `alpine-card ${theme === 'light' ? 'light-theme text-slate-900' : 'text-slate-100'} p-5`;
  const columns = ['Subject', 'Latest score', 'Maximum', 'Questions', 'Score percentage'];
  const rows = summary?.subjects.map(s => [s.subject, s.score, s.maxMarks, s.questions, `${s.percent}%`]) || [];
  return <div className="space-y-5">
    <header className={`${card} space-y-3`}>
      <div className="flex justify-between gap-3"><h2 className="font-bold text-lg">My progress</h2>
        <button type="button" disabled={loading} className="text-xs underline" onClick={() => void refresh()}>Refresh</button></div>
      <p className="text-sm opacity-75">Your latest graded answer to each question counts toward the subject summary. These percentages describe your marks.</p>
      <div className="flex flex-wrap gap-2 text-xs">
        <button disabled={!rows.length} className="rounded-lg border px-3 py-2 disabled:opacity-50" onClick={() => downloadCsv('my-progress.csv',
          ['Student', 'ID', ...columns], rows.map(row => [account.displayName, account.username, ...row]))}>Download CSV</button>
        <button disabled={!rows.length} className="rounded-lg border px-3 py-2 disabled:opacity-50" onClick={() => printReport('My progress',
          [`${account.displayName} (${account.username})`, 'Latest graded answers by subject'], columns, rows)}>Print / Save PDF</button>
      </div>
    </header>
    {error && <p role="alert" className={card}>{error}</p>}
    {!summary && !error && <p className={card}>Loading your saved results…</p>}
    {summary && <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[
        ['Graded answers', summary.gradedAnswers], ['Pending answers', summary.pendingAnswers],
        ['MCQ attempts', summary.mcqAttempts], ['Completed exams', summary.completedExams],
      ].map(([label, value]) => <div key={label} className={card}><p className="text-xs opacity-70">{label}</p><p className="text-2xl font-bold mt-2">{value}</p></div>)}</div>
      <section className={`${card} space-y-4`}>
        <h3 className="font-bold">Subject scores {summary.latestAveragePercent != null && <span className="text-sm opacity-75">· Overall {summary.latestAveragePercent}%</span>}</h3>
        {!summary.subjects.length && <p className="text-sm opacity-70">Complete an answer or MCQ attempt to see your progress.</p>}
        {summary.subjects.map(s => <div key={s.subject} className="space-y-2 text-sm">
          <div className="flex justify-between gap-3"><strong>{s.subject}</strong><span>{s.score}/{s.maxMarks} · {s.percent}%</span></div>
          <progress value={s.percent} max={100} aria-label={`${s.subject} score percentage`} className="w-full h-3 accent-blue-600" />
          <p className="text-xs opacity-70">Latest graded results from {s.questions} question(s).</p>
        </div>)}
      </section>
      <div className="grid lg:grid-cols-2 gap-5">
        <section className={`${card} space-y-3`}><h3 className="font-bold">Practice next</h3>
          {!summary.practiceAreas.length && <p className="text-sm opacity-70">No missing descriptive rubric marks in your latest graded answers.</p>}
          {summary.practiceAreas.map((item, i) => <div key={i} className="rounded-lg border border-slate-400/25 p-3 text-sm">
            <strong>{item.title} · {item.score}/{item.maxMarks}</strong><p className="text-xs opacity-70 mt-1">{item.question}</p>
          </div>)}
        </section>
        <section className={`${card} space-y-3`}><h3 className="font-bold">Recent descriptive answers</h3>
          {!summary.recentResults.length && <p className="text-sm opacity-70">No graded answers yet.</p>}
          {summary.recentResults.map(item => <div key={item.id} className="flex justify-between gap-3 border-b border-slate-400/20 pb-2 text-sm">
            <span>{item.label}<span className="block text-xs opacity-70">{new Date(item.at).toLocaleString()}</span></span><strong className="whitespace-nowrap">{item.score}/{item.maxMarks}</strong>
          </div>)}
        </section>
      </div>
    </>}
  </div>;
}
