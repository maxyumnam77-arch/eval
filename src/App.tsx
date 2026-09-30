import { useEffect, useState } from 'react';
import { request, json, getAuthToken, setAuthToken, ApiError } from './api';
import { ActiveNavTab, DescriptiveQuestion, StudentSubmission, MCQQuestion, MCQStudentAttempt } from './types';
import { Navbar } from './components/Navbar';
import { GradeAnswerView } from './components/GradeAnswerView';
import { QuestionBankView } from './components/QuestionBankView';
import { MCQView } from './components/MCQView';
import { ResultsReviewView } from './components/ResultsReviewView';
import { ModelEvaluationView } from './components/ModelEvaluationView';
import { QuestionSelectModal } from './components/QuestionSelectModal';
import { StudentSubmitView } from './components/StudentSubmitView';
import { Account, LoginView, Session } from './components/LoginView';
import { ExamView } from './components/ExamView';
import { PerformanceView } from './components/PerformanceView';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('submit');
  const [workspace, setWorkspace] = useState<'student' | 'admin'>('student');
  const [account, setAccount] = useState<Account | null>(null);
  const [questions, setQuestions] = useState<DescriptiveQuestion[]>([]);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [mcqs, setMcqs] = useState<MCQQuestion[]>([]);
  const [attempts, setAttempts] = useState<MCQStudentAttempt[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState('');
  const [activeSubmissionId, setActiveSubmissionId] = useState('');
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const run = async <T,>(action: () => Promise<T>): Promise<T> => {
    const token = getAuthToken();
    setError('');
    try { return await action(); } catch (e) { if (token === getAuthToken()) setError((e as Error).message); throw e; }
  };
  const refreshAdmin = async () => {
    const [q, s, m, a] = await Promise.all([
      request<DescriptiveQuestion[]>('/questions'), request<StudentSubmission[]>('/submissions'),
      request<MCQQuestion[]>('/mcqs'), request<MCQStudentAttempt[]>('/mcq-attempts'),
    ]);
    setQuestions(q); setSubmissions(s); setMcqs(m); setAttempts(a);
    setSelectedQuestionId(prev => q.some(item => item.id === prev) ? prev : q[0]?.id || '');
    setActiveSubmissionId(prev => s.some(item => item.id === prev) ? prev : s[0]?.id || '');
  };
  const refreshStudent = async () => {
    const [m, a] = await Promise.all([
      request<MCQQuestion[]>('/student/mcqs'), request<MCQStudentAttempt[]>('/student/mcq-attempts'),
    ]);
    setMcqs(m); setAttempts(a);
  };
  useEffect(() => {
    if (!getAuthToken()) { setLoading(false); return; }
    request<Account>('/auth/me').then(async user => {
      setAccount(user);
      setWorkspace(user.role === 'admin' ? 'admin' : 'student');
      setActiveTab(user.role === 'admin' ? 'bank' : 'submit');
      await (user.role === 'admin' ? refreshAdmin() : refreshStudent());
    }).catch(e => {
      if (e instanceof ApiError && e.status === 401) { setAuthToken(null); setAccount(null); }
      else setError((e as Error).message);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const expired = () => { setAccount(null); setQuestions([]); setSubmissions([]); setMcqs([]); setAttempts([]); setLoading(false); };
    window.addEventListener('smart-exam-session-expired', expired);
    return () => window.removeEventListener('smart-exam-session-expired', expired);
  }, []);

  const signedIn = async (session: Session) => {
    setAuthToken(session.token); setAccount(session.user); setError(''); setLoading(true);
    setWorkspace(session.user.role === 'admin' ? 'admin' : 'student');
    setActiveTab(session.user.role === 'admin' ? 'bank' : 'submit');
    try { await (session.user.role === 'admin' ? refreshAdmin() : refreshStudent()); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };
  const signOut = () => {
    request('/auth/logout', { method: 'POST' }).catch(() => {});
    setAuthToken(null); setAccount(null); setQuestions([]); setSubmissions([]); setMcqs([]); setAttempts([]);
    setIsQuestionModalOpen(false); setActiveSubmissionId(''); setSelectedQuestionId('');
    setWorkspace('student'); setActiveTab('submit');
  };

  const createQuestion = (question: DescriptiveQuestion) => run(async () => {
    const created = await request<DescriptiveQuestion>('/questions', json('POST', question));
    setQuestions(prev => [created, ...prev]); setSelectedQuestionId(created.id);
  });
  const updateQuestion = (question: DescriptiveQuestion) => run(async () => {
    const updated = await request<DescriptiveQuestion>(`/questions/${question.id}`, json('PUT', question));
    setQuestions(prev => prev.map(q => q.id === updated.id ? updated : q));
  });
  const deleteQuestion = (id: string) => run(async () => {
    await request(`/questions/${id}`, { method: 'DELETE' });
    setQuestions(prev => prev.filter(q => q.id !== id));
    if (selectedQuestionId === id) setSelectedQuestionId('');
  });
  const createSubmission = (form: FormData) => run(async () => {
    const created = await request<StudentSubmission>('/submissions', { method: 'POST', body: form });
    setSubmissions(prev => [created, ...prev]); setActiveSubmissionId(created.id);
  });
  const updateTranscript = (id: string, text: string) => run(async () => {
    const updated = await request<StudentSubmission>(`/submissions/${id}/transcript`, json('PUT', { text }));
    setSubmissions(prev => prev.map(s => s.id === id ? updated : s));
  });
  const gradeSubmission = (id: string) => run(async () => {
    const updated = await request<StudentSubmission>(`/submissions/${id}/grade`, { method: 'POST' });
    setSubmissions(prev => prev.map(s => s.id === id ? updated : s));
  });
  const overrideMark = (id: string, criterionId: string, mark: number, note: string) => run(async () => {
    const updated = await request<StudentSubmission>(`/submissions/${id}/override`, json('PUT', { criterionId, mark, note }));
    setSubmissions(prev => prev.map(s => s.id === id ? updated : s));
  });
  const saveFeedback = (id: string, note: string) => run(async () => {
    const updated = await request<StudentSubmission>(`/submissions/${id}/feedback`, json('PUT', { note }));
    setSubmissions(prev => prev.map(s => s.id === id ? updated : s));
  });
  const recordTeacherLabel = (id: string, mark: number) => run(async () => {
    const saved = await request<{ teacherMark: number }>(`/submissions/${id}/teacher-label`, json('PUT', { mark }));
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, teacherLabel: saved.teacherMark } : s));
  });
  const createMCQ = (item: MCQQuestion) => run(async () => {
    const created = await request<MCQQuestion>('/mcqs', json('POST', item));
    setMcqs(prev => [...prev, created]);
  });
  const updateMCQ = (item: MCQQuestion) => run(async () => {
    const updated = await request<MCQQuestion>(`/mcqs/${item.id}`, json('PUT', item));
    setMcqs(prev => prev.map(m => m.id === item.id ? updated : m));
  });
  const deleteMCQ = (id: string) => run(async () => {
    await request(`/mcqs/${id}`, { method: 'DELETE' });
    setMcqs(prev => prev.filter(m => m.id !== id));
  });
  const createAttempt = (studentName: string, studentId: string, answers: Record<string, string>) => run(async () => {
    const created = await request<MCQStudentAttempt>(account?.role === 'student' ? '/student/mcq-attempts' : '/mcq-attempts',
      json('POST', { studentName, studentId, answers }));
    setAttempts(prev => [created, ...prev]);
    return created;
  });

  const question = questions.find(q => q.id === selectedQuestionId) || questions[0];
  const isDark = theme === 'dark';
  if (!account && !loading) return <>
    {error && <p role="alert" className="p-4 bg-red-50 text-red-800">{error}</p>}
    <LoginView onLogin={session => { signedIn(session).catch(() => {}); }} />
  </>;
  return (
    <div className={`min-h-screen w-full font-sans antialiased p-4 sm:p-6 lg:p-8 flex flex-col items-center relative transition-colors ${isDark ? 'bg-[#0b101c] text-white' : 'bg-[#C9D2DB] text-slate-800'}`}
      style={{ backgroundImage: isDark
        ? 'radial-gradient(ellipse at 50% 0%, #1c2a43, #0b101c 75%)'
        : 'radial-gradient(ellipse at 12% 18%, #bdcbd9, transparent 75%), radial-gradient(ellipse at 88% 80%, #ddd5cf, transparent 75%), linear-gradient(135deg,#C9D2DB,#e7eaec)' }}>
      <main className={`alpine-window ${!isDark ? 'light-theme' : ''} relative w-full max-w-[1360px] p-6 sm:p-7 lg:p-8 space-y-6`}>
        {account && <Navbar workspace={workspace} role={account.role} onLogout={signOut}
          onWorkspaceChange={value => { setWorkspace(value); setActiveTab(value === 'admin' ? 'bank' : 'submit'); }}
          activeTab={activeTab} onTabChange={setActiveTab} gradedCount={submissions.filter(s => s.status === 'graded').length}
          totalSubmissions={submissions.length} theme={theme} onToggleTheme={() => setTheme(isDark ? 'light' : 'dark')} />}
        {error && <div role="alert" className={`rounded-xl border px-4 py-3 text-sm flex justify-between gap-3 ${isDark ? 'bg-red-900/40 text-red-100 border-red-400/40' : 'bg-red-50 text-red-900 border-red-300'}`}>
          <span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
        {loading ? <div className={`alpine-card ${!isDark ? 'light-theme' : ''} p-8`}>Loading project data…</div> : <>
          {activeTab === 'submit' && account && <StudentSubmitView theme={theme} account={account}
            onSubmitted={() => { (account.role === 'admin' ? refreshAdmin() : refreshStudent()).catch(e => setError((e as Error).message)); }} />}
          {activeTab === 'bank' && <QuestionBankView questions={questions} theme={theme} onAddQuestion={createQuestion}
            onUpdateQuestion={updateQuestion} onDeleteQuestion={deleteQuestion}
            onSelectForGrading={q => { setSelectedQuestionId(q.id); setWorkspace('admin'); setActiveTab('grade'); }} />}
          {activeTab === 'grade' && (question ? <GradeAnswerView question={question} submissions={submissions.filter(s => s.questionId === question.id)}
            activeSubmissionId={activeSubmissionId} theme={theme} onSelectSubmission={setActiveSubmissionId}
            onOpenQuestionModal={() => setIsQuestionModalOpen(true)} onNavigateToBank={() => { setWorkspace('admin'); setActiveTab('bank'); }}
            onCreateSubmission={createSubmission} onGradeSubmission={gradeSubmission} onUpdateSubmissionTranscript={updateTranscript} />
            : <div className={`alpine-card ${!isDark ? 'light-theme' : ''} p-8`}>Create a question and approve its rubric in Question Bank to begin.</div>)}
          {activeTab === 'mcq' && <MCQView mcqs={mcqs} studentAttempts={attempts} theme={theme} workspace={workspace === 'student' ? 'grading' : 'admin'}
            studentIdentity={workspace === 'student' && account ? { name: account.displayName, id: account.username } : undefined}
            onAddMCQ={createMCQ} onUpdateMCQ={updateMCQ} onDeleteMCQ={deleteMCQ} onCreateAttempt={createAttempt} />}
          {activeTab === 'results' && <ResultsReviewView questions={questions} submissions={submissions} theme={theme}
            onTeacherOverrideCriterion={overrideMark} onGradeSingleSubmission={gradeSubmission} onSaveFeedback={saveFeedback}
            onRecordTeacherLabel={recordTeacherLabel} />}
          {activeTab === 'model' && <ModelEvaluationView theme={theme} />}
          {activeTab === 'exams' && account && <ExamView key={workspace} theme={theme} workspace={workspace} account={account} questions={questions} mcqs={mcqs} />}
          {activeTab === 'progress' && account && <PerformanceView theme={theme} account={account} />}
        </>}
      </main>
      {question && <QuestionSelectModal questions={questions} selectedQuestionId={selectedQuestionId} isOpen={isQuestionModalOpen}
        theme={theme} onClose={() => setIsQuestionModalOpen(false)} onSelectQuestion={q => setSelectedQuestionId(q.id)}
        onAddNewQuestion={() => { setWorkspace('admin'); setActiveTab('bank'); }} />}
    </div>
  );
}
