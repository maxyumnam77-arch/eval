import { useEffect, useState } from 'react';
import { DescriptiveQuestion, StudentSubmission } from '../types';
import { AnswerImage } from './AnswerImage';

type Props = {
  question: DescriptiveQuestion; submissions: StudentSubmission[]; activeSubmissionId: string;
  theme: 'light' | 'dark'; onSelectSubmission: (id: string) => void;
  onOpenQuestionModal: () => void; onNavigateToBank: () => void;
  onCreateSubmission: (form: FormData) => Promise<void>;
  onGradeSubmission: (id: string) => Promise<void>;
  onUpdateSubmissionTranscript: (id: string, text: string) => Promise<void>;
};

export const GradeAnswerView = ({ question, submissions, activeSubmissionId, theme,
  onSelectSubmission, onOpenQuestionModal, onNavigateToBank, onCreateSubmission,
  onGradeSubmission, onUpdateSubmissionTranscript }: Props) => {
  const dark = theme === 'dark';
  const card = `alpine-card ${dark ? 'text-slate-100' : 'light-theme text-slate-900'}`;
  const muted = dark ? 'text-slate-300' : 'text-slate-600';
  const input = `w-full rounded-xl border p-2.5 text-sm outline-none focus:border-blue-500 ${dark ? 'bg-slate-950/50 border-white/20 text-white' : 'bg-white/75 border-slate-300 text-slate-900'}`;
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [ocrMode, setOcrMode] = useState('accurate');
  const [busy, setBusy] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [selectedPage, setSelectedPage] = useState(0);
  const current = submissions.find(s => s.id === activeSubmissionId) || submissions[0];
  const displayedQuestion = current?.rubricSnapshot || question;
  useEffect(() => { setEditedText(current?.ocrTranscript || ''); setSelectedPage(0); }, [current?.id, current?.ocrTranscript]);

  const upload = async (event: React.FormEvent) => {
    event.preventDefault();
    const form = new FormData();
    form.append('question_id', question.id); form.append('student_name', studentName);
    form.append('student_id', studentId); form.append('answer_text', answerText);
    form.append('ocr_mode', ocrMode);
    files.forEach(file => form.append('files', file));
    setBusy(true);
    try {
      await onCreateSubmission(form);
      setStudentName(''); setStudentId(''); setAnswerText(''); setFiles([]);
    } catch { /* App displays the server error. */ } finally { setBusy(false); }
  };
  const grade = async () => {
    if (!current) return;
    setBusy(true);
    try { await onGradeSubmission(current.id); } catch { /* App displays the server error. */ }
    finally { setBusy(false); }
  };
  const saveText = async () => {
    if (!current) return;
    setBusy(true);
    try { await onUpdateSubmissionTranscript(current.id, editedText); }
    catch { /* App displays the server error. */ } finally { setBusy(false); }
  };

  return <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
    <aside className="lg:col-span-4 space-y-4">
      <section className={`${card} p-5 space-y-3`}>
        <div className="text-xs font-semibold uppercase tracking-widest text-blue-500">Selected question</div>
        <h2 className="font-bold">{question.title}</h2>
        <p className={`text-xs ${muted}`}>{question.code} · Max {question.maxMarks} marks · Rubric v{question.rubricVersion || 1}</p>
        <div className={`text-xs font-semibold ${question.rubricApproved ? 'text-emerald-600' : 'text-amber-600'}`}>
          {question.rubricApproved ? 'Teacher-approved rubric' : 'Rubric needs teacher approval'}
        </div>
        <button onClick={onOpenQuestionModal} className={`alpine-pill-select ${dark ? '' : 'light-theme'} px-3 py-2 text-xs w-full`}>Choose another question</button>
        <button onClick={onNavigateToBank} className={`text-xs underline ${muted}`}>View rubric in Question Bank</button>
      </section>
      <section className={`${card} p-5 space-y-3`}>
        <h3 className="font-bold text-sm">Add student answer</h3>
        <form onSubmit={upload} className="space-y-2.5">
          <input className={input} required placeholder="Student name" value={studentName} onChange={e => setStudentName(e.target.value)} />
          <input className={input} required placeholder="Student ID" value={studentId} onChange={e => setStudentId(e.target.value)} />
          <textarea className={input} rows={3} placeholder="Type an answer, or upload images below" value={answerText} onChange={e => setAnswerText(e.target.value)} />
          <label className={`block text-xs font-semibold ${muted}`}>Answer images (multiple pages)</label>
          <input className={input} type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={e => setFiles(Array.from(e.target.files || []))} />
          <label className={`block text-xs font-semibold ${muted}`}>Or select a folder of one student's pages</label>
          <input className={input} type="file" multiple accept="image/png,image/jpeg,image/webp"
            {...({ webkitdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
            onChange={e => setFiles(Array.from(e.target.files || []))} />
          <p className={`text-[11px] ${muted}`}>{files.length ? `${files.length} page(s) selected` : 'One submission can contain up to 12 pages.'}</p>
          <select className={input} value={ocrMode} onChange={e => setOcrMode(e.target.value)}>
            <option value="fast">Fast OCR (Paddle service)</option>
            <option value="accurate">Accurate OCR (local Qwen vision)</option>
            <option value="manual">Manual transcript (no OCR)</option>
          </select>
          <button disabled={busy || (!answerText.trim() && !files.length)} className="alpine-btn-blue w-full p-3 text-white text-sm font-bold disabled:opacity-50">
            {busy ? 'Working…' : 'Add answer'}
          </button>
        </form>
      </section>
      <section className={`${card} p-5 space-y-2`}>
        <h3 className="font-bold text-sm">Student submissions ({submissions.length})</h3>
        {submissions.length === 0 && <p className={`text-xs ${muted}`}>No submissions yet.</p>}
        {submissions.map(sub => <button key={sub.id} onClick={() => onSelectSubmission(sub.id)}
          className={`w-full text-left rounded-xl border p-3 text-xs ${current?.id === sub.id
            ? dark ? 'bg-blue-500/20 border-blue-400' : 'bg-blue-50/80 border-blue-400'
            : dark ? 'bg-white/5 border-white/15' : 'bg-white/45 border-white/70'}`}>
          <strong>{sub.studentName}</strong><span className={`block ${muted}`}>{sub.studentId} · {sub.status}</span>
        </button>)}
      </section>
    </aside>
    <section className={`lg:col-span-8 alpine-stage ${dark ? '' : 'light-theme'} p-5 sm:p-8 min-h-[600px]`}>
      <div className="max-w-[650px] mx-auto bg-white text-slate-900 border border-slate-200 shadow-xl rounded-lg p-5 sm:p-8 space-y-5">
        <div className="border-b-2 border-slate-900 pb-3">
          <p className="text-[11px] uppercase tracking-widest text-slate-500">Smart Exam Evaluation</p>
          <h2 className="font-bold text-lg">{current ? current.studentName : 'No student selected'}</h2>
          <p className="text-xs text-slate-500">{current?.studentId || 'Add an answer on the left'} · {displayedQuestion.code}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
          <div className="flex justify-between gap-3 text-xs font-bold"><span>Question</span><span>Max {displayedQuestion.maxMarks} marks</span></div>
          <p className="text-sm mt-2">{displayedQuestion.prompt}</p>
        </div>
        <div className="border border-emerald-300 bg-emerald-50/50 p-4 rounded-lg">
          <h3 className="text-sm font-bold mb-2">Teacher rubric · {displayedQuestion.maxMarks} marks</h3>
          {displayedQuestion.criteria.map(c => <div className="flex justify-between text-xs py-1 border-t border-emerald-100" key={c.id}>
            <span>{c.title}: {c.description}</span><strong className="whitespace-nowrap pl-2">{c.maxMark} M</strong>
          </div>)}
        </div>
        {current && <>
          {current.pages && current.pages.length > 0 && <div>
            <h3 className="text-sm font-bold mb-2">Original answer pages</h3>
            <div className="flex gap-2 mb-2">{current.pages.map(page => <button key={page.position} onClick={() => setSelectedPage(page.position)}
              className={`px-3 py-1 rounded-lg text-xs border ${selectedPage === page.position ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>Page {page.position + 1}</button>)}</div>
            <AnswerImage className="w-full max-h-[480px] object-contain border rounded-lg" alt={`Student answer page ${selectedPage + 1}`}
              src={current.pages.find(p => p.position === selectedPage)?.url} />
          </div>}
          <div>
            <h3 className="text-sm font-bold mb-1">Review answer text before grading</h3>
            <p className="text-xs text-slate-500 mb-2">OCR mode: {current.ocrEngine || 'typed'}. Correct mistakes here; the saved text is what Qwen grades.</p>
            {current.ocrError && <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded mb-2">OCR needs review: {current.ocrError}</p>}
            <textarea className="w-full min-h-32 border border-slate-300 p-3 rounded-lg text-sm" value={editedText} onChange={e => setEditedText(e.target.value)} />
            <button onClick={saveText} disabled={busy || editedText === current.ocrTranscript} className="text-xs rounded-lg border border-slate-300 px-3 py-2 mt-2 disabled:opacity-50">Save corrected text</button>
          </div>
          {current.status === 'graded' && <div className="border-t pt-4">
            <h3 className="font-bold text-lg">Score: {current.evaluatedTotalScore} / {displayedQuestion.maxMarks}</h3>
            <p className="text-xs text-slate-500">Model: {current.modelName} · Rubric version {current.questionVersion}</p>
            {(current.reviewFlags || []).map(flag => <p className="text-xs text-amber-800" key={flag}>Review: {flag}</p>)}
            {current.criteriaScores?.map(score => <div key={score.criterionId} className="py-2 border-b text-sm">
              <div className="flex justify-between font-semibold"><span>{displayedQuestion.criteria.find(c => c.id === score.criterionId)?.title || score.criterionId}</span>
                <span>{score.mark} / {displayedQuestion.criteria.find(c => c.id === score.criterionId)?.maxMark}</span></div>
              <p className="text-xs text-slate-600">Evidence: {score.evidence || 'None verified'}</p>
              <p className="text-xs text-slate-600">{score.rationale}</p>
            </div>)}
          </div>}
          <button onClick={grade} disabled={busy || !question.rubricApproved || !current.ocrTranscript.trim() || editedText !== current.ocrTranscript}
            className="alpine-btn-blue w-full py-3 text-white font-bold disabled:opacity-40">
            {busy ? 'Grading with local Qwen…' : current.status === 'graded' ? 'Regrade answer' : 'Grade answer'}
          </button>
          {!question.rubricApproved && <p className="text-xs text-amber-800">Approve the rubric in Question Bank first.</p>}
          {editedText !== current.ocrTranscript && <p className="text-xs text-amber-800">Save the corrected text before grading.</p>}
        </>}
      </div>
    </section>
  </div>;
};
