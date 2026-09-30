import { useEffect, useState } from 'react';
import { DescriptiveQuestion, StudentSubmission } from '../types';

type Props = {
  questions: DescriptiveQuestion[]; submissions: StudentSubmission[]; theme: 'light' | 'dark';
  onTeacherOverrideCriterion: (id: string, criterionId: string, mark: number, note: string) => Promise<void>;
  onGradeSingleSubmission: (id: string) => Promise<void>;
  onSaveFeedback: (id: string, note: string) => Promise<void>;
  onRecordTeacherLabel: (id: string, mark: number) => Promise<void>;
};
export const ResultsReviewView = ({ questions, submissions, theme, onTeacherOverrideCriterion,
  onGradeSingleSubmission, onSaveFeedback, onRecordTeacherLabel }: Props) => {
  const dark = theme === 'dark';
  const card = `alpine-card ${dark ? 'text-slate-100' : 'light-theme text-slate-900'}`;
  const input = `rounded-lg border px-2 py-1 text-sm ${dark ? 'bg-slate-950/50 border-white/20 text-white' : 'bg-white/75 border-slate-300 text-slate-900'}`;
  const [selected, setSelected] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'graded' | 'pending'>('all');
  const [note, setNote] = useState('');
  const [overrideNote, setOverrideNote] = useState('');
  const [marks, setMarks] = useState<Record<string, number>>({});
  const [teacherMark, setTeacherMark] = useState('');
  const [busy, setBusy] = useState(false);
  const active = submissions.find(s => s.id === selected) || submissions[0];
  const question = active?.rubricSnapshot || questions.find(q => q.id === active?.questionId);
  useEffect(() => { setNote(active?.teacherFeedback || ''); setMarks({}); setOverrideNote(''); }, [active?.id]);
  useEffect(() => setTeacherMark(active?.teacherLabel == null ? '' : String(active.teacherLabel)), [active?.id, active?.teacherLabel]);
  const invoke = async (task: () => Promise<void>) => {
    setBusy(true); try { await task(); } catch { /* App displays the error. */ } finally { setBusy(false); }
  };
  const shown = submissions.filter(s =>
    (status === 'all' || s.status === status) &&
    (s.studentName.toLowerCase().includes(search.toLowerCase()) || s.studentId.toLowerCase().includes(search.toLowerCase())));
  return <div className="space-y-5">
    <header className={`${card} p-5`}>
      <h2 className="font-bold text-lg">Results & Review</h2>
      <p className="text-xs opacity-70">{submissions.filter(s => s.status === 'graded').length} graded / {submissions.length} submitted · Teacher corrections are saved.</p>
    </header>
    <div className="grid lg:grid-cols-3 gap-5">
      <aside className={`${card} p-5 space-y-3`}>
        <h3 className="font-bold text-sm">Student submissions</h3>
        <input className={`${input} w-full`} placeholder="Search student name or ID" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex gap-2 text-xs">{(['all', 'graded', 'pending'] as const).map(v =>
          <button key={v} onClick={() => setStatus(v)} className={`px-2 py-1 rounded ${status === v ? 'bg-blue-600 text-white' : 'border border-slate-400/30'}`}>{v}</button>)}</div>
        {shown.map(s => <button key={s.id} onClick={() => setSelected(s.id)}
          className={`block w-full text-left rounded-xl border p-3 text-sm ${active?.id === s.id ? 'border-blue-500 bg-blue-500/10' : 'border-slate-400/20'}`}>
          <strong>{s.studentName}</strong><span className="block text-xs opacity-70">{s.studentId} · {s.status} {s.status === 'graded' ? `· ${s.evaluatedTotalScore} marks` : ''}</span>
        </button>)}
        {!shown.length && <p className="text-xs opacity-70">No submissions found.</p>}
      </aside>
      <section className={`${card} p-5 lg:col-span-2 space-y-4`}>
        {!active ? <p>No answers submitted yet.</p> : <>
          <div className="flex justify-between gap-3 border-b border-slate-400/20 pb-3">
            <div><h3 className="font-bold">{active.studentName}</h3><p className="text-xs opacity-70">{active.studentId} · {question?.code}</p></div>
            <div className="text-right"><strong className="text-lg">{active.status === 'graded' ? `${active.evaluatedTotalScore} / ${question?.maxMarks}` : 'Pending'}</strong>
              <p className="text-xs opacity-70">{active.modelName || ''}</p></div>
          </div>
          <div className={`p-3 rounded-xl text-sm whitespace-pre-wrap ${dark ? 'bg-black/25' : 'bg-white/60'}`}>
            <h4 className="font-bold text-xs mb-2">Reviewed answer transcript</h4>{active.ocrTranscript || 'No text reviewed yet.'}
          </div>
          {active.teacherLabel != null && <p className="text-xs text-emerald-600">Saved independent teacher mark: {active.teacherLabel} / {question?.maxMarks}</p>}
          {active.status === 'pending' && <div className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center text-xs">
              <label className="font-bold">Independent teacher mark (record before model grading)</label>
              <input type="number" min="0" max={question?.maxMarks} step="0.1" className={`${input} w-24`} value={teacherMark} onChange={e => setTeacherMark(e.target.value)} />
              <button disabled={busy || teacherMark === ''} onClick={() => invoke(() => onRecordTeacherLabel(active.id, Number(teacherMark)))}
                className="px-3 py-2 rounded-lg border border-blue-500 text-blue-600">Record label</button>
            </div>
            <button disabled={busy || !active.ocrTranscript || !question?.rubricApproved}
              onClick={() => invoke(() => onGradeSingleSubmission(active.id))}
              className="alpine-btn-blue px-4 py-2 text-white text-sm disabled:opacity-50">Grade this answer</button>
          </div>}
          {active.status === 'graded' && <>
            {(active.reviewFlags || []).map(flag => <p className="rounded-lg bg-amber-500/15 border border-amber-500/30 p-2 text-xs" key={flag}>Review: {flag}</p>)}
            <p className="text-xs opacity-70">Model total: {active.modelTotal} · Rubric version: {active.questionVersion}. Teacher corrections change the final total but preserve the model's original marks.</p>
            <h4 className="font-bold">Rubric evidence & teacher corrections</h4>
            {active.criteriaScores?.map(score => {
              const criterion = question?.criteria.find(c => c.id === score.criterionId);
              return <div key={score.criterionId} className={`rounded-xl border p-3 space-y-2 ${dark ? 'border-white/20' : 'border-slate-300/80 bg-white/40'}`}>
                <div className="flex justify-between text-sm font-bold"><span>{criterion?.title || score.criterionId}</span><span>{score.mark} / {criterion?.maxMark}</span></div>
                <p className="text-xs opacity-80">Evidence: {score.evidence || 'None verified'}</p>
                <p className="text-xs opacity-70">{score.rationale}</p>
                {active.teacherOverrides?.[score.criterionId] && <p className="text-xs text-blue-500">Teacher note: {active.teacherOverrides[score.criterionId].note}</p>}
                <div className="flex flex-wrap gap-2 items-center">
                  <input type="number" min="0" max={criterion?.maxMark} step="0.1" className={`${input} w-24`}
                    value={marks[score.criterionId] ?? score.mark} onChange={e => setMarks({ ...marks, [score.criterionId]: Number(e.target.value) })} />
                  <input className={`${input} flex-1 min-w-32`} placeholder="Reason for correction" value={overrideNote} onChange={e => setOverrideNote(e.target.value)} />
                  <button disabled={busy || !overrideNote.trim()} className="text-xs px-3 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                    onClick={() => invoke(async () => { await onTeacherOverrideCriterion(active.id, score.criterionId, marks[score.criterionId] ?? score.mark, overrideNote); setOverrideNote(''); })}>Save mark</button>
                </div>
              </div>;
            })}
            <div className="space-y-2 border-t border-slate-400/20 pt-3">
              <label className="text-sm font-bold block">Teacher feedback</label>
              <textarea className={`${input} w-full`} rows={2} value={note} onChange={e => setNote(e.target.value)} />
              <button disabled={busy} onClick={() => invoke(() => onSaveFeedback(active.id, note))} className="text-xs px-3 py-2 bg-blue-600 text-white rounded-lg">Save feedback</button>
            </div>
            <div className="border-t border-slate-400/20 pt-3 flex flex-wrap gap-2 items-center text-xs">
              <label className="font-bold">Independent teacher mark (for evaluation)</label>
              <input type="number" min="0" max={question?.maxMarks} step="0.1" className={`${input} w-24`} value={teacherMark} onChange={e => setTeacherMark(e.target.value)} />
              <button disabled={busy || teacherMark === ''} onClick={() => invoke(() => onRecordTeacherLabel(active.id, Number(teacherMark)))}
                className="px-3 py-2 rounded-lg border border-blue-500 text-blue-600">Record label</button>
            </div>
          </>}
        </>}
      </section>
    </div>
  </div>;
};
