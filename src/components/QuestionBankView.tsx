import React, { useEffect, useState } from 'react';
import { DescriptiveQuestion, RubricCriterion } from '../types';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { RubricEditorModal } from './RubricEditorModal';

interface QuestionBankViewProps {
  questions: DescriptiveQuestion[];
  theme?: 'light' | 'dark';
  onAddQuestion: (newQuestion: DescriptiveQuestion) => Promise<void>;
  onUpdateQuestion: (updated: DescriptiveQuestion) => Promise<void>;
  onDeleteQuestion: (id: string) => Promise<void>;
  onSelectForGrading: (question: DescriptiveQuestion) => void;
}

export const QuestionBankView: React.FC<QuestionBankViewProps> = ({
  questions,
  theme = 'light',
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onSelectForGrading,
}) => {
  const isDark = theme === 'dark';
  const [selectedQuestion, setSelectedQuestion] = useState<DescriptiveQuestion | null>(
    questions[0] || null
  );
  const [isRubricModalOpen, setIsRubricModalOpen] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editDraft, setEditDraft] = useState<DescriptiveQuestion | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const persist = async (action: () => Promise<void>, onSuccess: () => void) => {
    setSaving(true); setSaveError('');
    try { await action(); onSuccess(); }
    catch (e) { setSaveError((e as Error).message); }
    finally { setSaving(false); }
  };

  // New question form state
  const [newTitle, setNewTitle] = useState('');
  const [newCode, setNewCode] = useState('BIO-11-Q05');
  const [newSubject, setNewSubject] = useState('AP Biology');
  const [newPrompt, setNewPrompt] = useState('');
  const [newMaxMarks, setNewMaxMarks] = useState(5.0);
  const [newRefAnswer, setNewRefAnswer] = useState('');
  useEffect(() => {
    setSelectedQuestion(current => questions.find(q => q.id === current?.id) || questions[0] || null);
  }, [questions]);
  useEffect(() => setEditDraft(null), [selectedQuestion?.id]);

  const wholeMarkButtons = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newPrompt.trim() || !newRefAnswer.trim() || newMaxMarks <= 0) return;

    // Default criteria distributed to match newMaxMarks
    const defaultCriteria: RubricCriterion[] = [{
      id: `crit-${Date.now()}`, title: 'Define the expected answer points',
      description: 'Edit this draft into specific assessable criteria before approval.', maxMark: newMaxMarks,
    }];

    const newQ: DescriptiveQuestion = {
      id: `q-custom-${Date.now()}`,
      code: newCode || `BIO-11-Q${questions.length + 1}`,
      title: newTitle,
      subject: newSubject,
      classGrade: 'Grade 11 · Advanced',
      maxMarks: newMaxMarks,
      prompt: newPrompt,
      referenceAnswer: newRefAnswer,
      rubricApproved: false, // New questions require explicit rubric review and approval
      criteria: defaultCriteria,
    };

    void persist(() => onAddQuestion(newQ), () => {
      setIsCreatingNew(false); setNewTitle(''); setNewPrompt(''); setNewRefAnswer('');
    });
  };

  return (
    <div className="space-y-6">
      {saveError && <p role="alert" className="text-sm text-red-600">{saveError}</p>}
      {/* Top Banner */}
      <div
        className={`alpine-card ${
          !isDark ? 'light-theme' : ''
        } flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 transition-colors ${
          isDark ? 'text-white' : 'text-slate-900'
        }`}
      >
        <div>
          <h2
            className={`text-lg font-bold tracking-tight flex items-center gap-2 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            <BookOpen className={`w-5 h-5 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
            Question Bank & Rubric Authoring
          </h2>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            Define descriptive questions, reference answers, maximum marks (1–10 or custom), and authorize rubric criteria before grading.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreatingNew(!isCreatingNew)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 border border-blue-400/40 shadow-md cursor-pointer transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{isCreatingNew ? 'Cancel Creation' : 'New Descriptive Question'}</span>
        </button>
      </div>

      {/* Creation Modal / Form */}
      {isCreatingNew && (
        <form
          onSubmit={handleCreateSubmit}
          className={`alpine-card ${
            !isDark ? 'light-theme' : ''
          } p-6 space-y-4 shadow-xl animate-in fade-in transition-colors ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          <div
            className={`flex items-center justify-between pb-2 border-b ${
              isDark ? 'border-white/10' : 'border-slate-200'
            }`}
          >
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Add New Descriptive Question
            </h3>
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>
              All whole marks 1–10 supported
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className={`block mb-1 font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Question Code
              </label>
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-blue-500 transition-colors ${
                  isDark
                    ? 'bg-black/40 border-white/20 text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'
                }`}
                placeholder="e.g. BIO-11-Q05"
                required
              />
            </div>
            <div>
              <label className={`block mb-1 font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Subject / Topic
              </label>
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-blue-500 transition-colors ${
                  isDark
                    ? 'bg-black/40 border-white/20 text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'
                }`}
                placeholder="e.g. AP Biology · Cell Bioenergetics"
                required
              />
            </div>
            <div>
              <label className={`block mb-1 font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Target Max Marks (1–10 or Custom)
              </label>
              <div className="flex flex-wrap items-center gap-1">
                {wholeMarkButtons.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setNewMaxMarks(m)}
                    className={`w-7 h-7 rounded text-xs font-mono font-semibold cursor-pointer transition-all ${
                      newMaxMarks === m
                        ? 'bg-blue-600 text-white border border-blue-500 font-bold shadow-xs'
                        : isDark
                        ? 'bg-white/10 hover:bg-white/20 text-slate-300 border border-white/15'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={newMaxMarks || ''}
                  onChange={(e) => setNewMaxMarks(parseFloat(e.target.value) || 0)}
                  placeholder="Custom"
                  className={`w-16 px-1.5 py-1 rounded border text-center font-mono text-xs focus:border-blue-500 focus:outline-none transition-colors ${
                    isDark
                      ? 'bg-black/40 border-white/20 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white font-semibold'
                  }`}
                />
              </div>
            </div>
          </div>

          <div className="text-xs space-y-1">
            <label className={`block font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Question Title
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-blue-500 transition-colors ${
                isDark
                  ? 'bg-black/40 border-white/20 text-white placeholder-slate-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'
              }`}
              placeholder="e.g. Chemiosmotic Coupling & Thylakoid Electron Flux"
              required
            />
          </div>

          <div className="text-xs space-y-1">
            <label className={`block font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Detailed Prompt (For Students)
            </label>
            <textarea
              rows={3}
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-blue-500 leading-relaxed transition-colors ${
                isDark
                  ? 'bg-black/40 border-white/20 text-white placeholder-slate-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'
              }`}
              placeholder="Enter the full exam question prompt..."
              required
            />
          </div>

          <div className="text-xs space-y-1">
            <label className={`block font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Reference Benchmark Answer (Instructor Gold Standard)
            </label>
            <textarea
              rows={3}
              required
              value={newRefAnswer}
              onChange={(e) => setNewRefAnswer(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-blue-500 leading-relaxed transition-colors ${
                isDark
                  ? 'bg-black/40 border-white/20 text-white placeholder-slate-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'
              }`}
              placeholder="Enter the complete exemplary reference answer..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsCreatingNew(false)}
              className={`px-4 py-2 text-xs rounded-xl cursor-pointer transition-colors ${
                isDark
                  ? 'text-slate-300 bg-white/10 hover:bg-white/15'
                  : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 font-medium'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md border border-white/20 cursor-pointer"
            >
              {saving ? 'Saving…' : 'Save Question & Initialize Rubric'}
            </button>
          </div>
        </form>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List of Questions */}
        <div className="lg:col-span-4 space-y-3">
          <div
            className={`flex items-center justify-between text-xs px-1 font-semibold ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            <span>Repository Questions ({questions.length})</span>
            <span>Max Marks</span>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {questions.map((q) => {
              const isSelected = selectedQuestion?.id === q.id;
              return (
                <div
                  key={q.id}
                  onClick={() => setSelectedQuestion(q)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? isDark
                        ? 'bg-blue-600/25 border-blue-400 shadow-md ring-1 ring-blue-400/40 text-white'
                        : 'bg-blue-50/80 border-blue-300 shadow-md ring-1 ring-blue-300 text-slate-900 backdrop-blur-md'
                      : isDark
                      ? 'bg-white/[0.04] hover:bg-white/[0.08] border-white/15 text-slate-200'
                      : 'alpine-subcard light-theme hover:bg-white/75 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded border font-semibold ${
                        isDark
                          ? 'bg-black/30 text-blue-200 border-white/10'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}
                    >
                      {q.code}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${
                        isDark
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      {q.maxMarks.toFixed(1)} M
                    </span>
                  </div>

                  <h4
                    className={`text-sm font-bold tracking-tight truncate ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {q.title}
                  </h4>
                  <p
                    className={`text-xs line-clamp-2 mt-1 leading-snug ${
                      isDark ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    {q.prompt}
                  </p>

                  <div
                    className={`flex items-center justify-between pt-2.5 mt-2 border-t text-[11px] ${
                      isDark ? 'border-white/10' : 'border-slate-200'
                    }`}
                  >
                    <span
                      className={`flex items-center gap-1 font-medium ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      <Layers className={`w-3 h-3 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
                      {q.criteria.length} Criteria
                    </span>
                    {/* Strictly mutually exclusive approval status */}
                    <span
                      className={`font-semibold ${
                        q.rubricApproved
                          ? isDark
                            ? 'text-emerald-300'
                            : 'text-emerald-700'
                          : isDark
                          ? 'text-amber-300'
                          : 'text-amber-800'
                      }`}
                    >
                      {q.rubricApproved ? 'Teacher-Approved ✓' : 'Needs Approval'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Detail Pane */}
        {selectedQuestion && (
          <div
            className={`lg:col-span-8 alpine-card ${
              !isDark ? 'light-theme' : ''
            } p-6 space-y-6 transition-colors ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            {/* Header */}
            <div
              className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b ${
                isDark ? 'border-white/10' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs font-mono px-2 py-0.5 rounded border font-bold ${
                      isDark
                        ? 'bg-blue-500/30 text-blue-200 border-blue-400/30'
                        : 'bg-blue-50 text-blue-800 border-blue-200'
                    }`}
                  >
                    {selectedQuestion.code}
                  </span>
                  <span className={isDark ? 'text-white/50' : 'text-slate-400'}>·</span>
                  <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600 font-medium'}`}>
                    {selectedQuestion.subject}
                  </span>
                </div>
                <h3
                  className={`text-lg font-bold tracking-tight ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {selectedQuestion.title}
                </h3>
              </div>

              <div className="flex items-center gap-2.5">
                <button type="button" onClick={() => setEditDraft({ ...selectedQuestion })}
                  className={`px-3 py-2 rounded-xl border text-xs ${isDark ? 'border-white/20' : 'border-slate-300'}`}>
                  Edit question & answer
                </button>
                <button
                  type="button"
                  onClick={() => onSelectForGrading(selectedQuestion)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 border border-blue-400/40 shadow-md cursor-pointer transition-all shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Select for Grade Answer</span>
                </button>

                <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete "${selectedQuestion.title}"?`)) {
                        void persist(() => onDeleteQuestion(selectedQuestion.id), () => {});
                      }
                    }}
                    className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-white/10 hover:bg-red-500/30 text-slate-300 hover:text-red-200 border-white/20'
                        : 'bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 border-slate-300'
                    }`}
                    title="Delete Question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
              </div>
            </div>

            {editDraft && <form onSubmit={e => { e.preventDefault(); void persist(() => onUpdateQuestion({ ...editDraft, rubricApproved: false }), () => setEditDraft(null)); }}
              className="space-y-2 rounded-xl border border-blue-400/40 p-4 text-xs">
              <p className="font-bold">Editing the question or reference answer requires rubric approval again.</p>
              {(['code', 'title', 'subject', 'classGrade'] as const).map(field => <label key={field} className="block">
                <span className="capitalize">{field}</span>
                <input required className={`block w-full rounded-lg border p-2 ${isDark ? 'bg-slate-900 border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                  value={editDraft[field]} onChange={e => setEditDraft({ ...editDraft, [field]: e.target.value })} />
              </label>)}
              <label className="block">Question prompt<textarea required rows={3} className={`block w-full rounded-lg border p-2 ${isDark ? 'bg-slate-900 border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                value={editDraft.prompt} onChange={e => setEditDraft({ ...editDraft, prompt: e.target.value })} /></label>
              <label className="block">Teacher reference answer<textarea required rows={4} className={`block w-full rounded-lg border p-2 ${isDark ? 'bg-slate-900 border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                value={editDraft.referenceAnswer} onChange={e => setEditDraft({ ...editDraft, referenceAnswer: e.target.value })} /></label>
              <div className="flex gap-2"><button disabled={saving} className="rounded-lg bg-blue-600 text-white px-3 py-2">{saving ? 'Saving…' : 'Save changes'}</button>
                <button type="button" onClick={() => setEditDraft(null)} className="rounded-lg border px-3 py-2">Cancel</button></div>
            </form>}

            {/* Prompt */}
            <div className="space-y-1.5">
              <label
                className={`text-xs uppercase font-bold tracking-wider ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                Examination Prompt
              </label>
              <div
                className={`p-3.5 rounded-xl border text-xs leading-relaxed font-sans ${
                  isDark
                    ? 'bg-black/30 border-white/10 text-slate-200'
                    : 'bg-white/80 border-slate-200/90 text-slate-800 shadow-xs'
                }`}
              >
                {selectedQuestion.prompt}
              </div>
            </div>

            {/* Reference Answer */}
            <div className="space-y-1.5">
              <label
                className={`text-xs uppercase font-bold tracking-wider ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                Instructor Reference Model Answer
              </label>
              <div
                className={`p-3.5 rounded-xl border text-xs leading-relaxed font-serif italic ${
                  isDark
                    ? 'bg-black/30 border-white/10 text-slate-200'
                    : 'bg-amber-50/75 border-amber-200/80 text-slate-800 shadow-xs'
                }`}
              >
                {selectedQuestion.referenceAnswer}
              </div>
            </div>

            {/* Rubric Criteria Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4
                    className={`text-sm font-bold flex items-center gap-2 ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    <span>{selectedQuestion.rubricApproved ? 'Teacher-Approved Rubric Criteria' : 'Draft Rubric Criteria'}</span>
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${
                        isDark
                          ? 'text-emerald-300 bg-emerald-500/20 border-emerald-400/30'
                          : 'text-emerald-800 bg-emerald-50 border-emerald-300'
                      }`}
                    >
                      {selectedQuestion.maxMarks.toFixed(1)} Total Marks
                    </span>
                  </h4>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {selectedQuestion.criteria.length} Criteria · Total weight must equal {selectedQuestion.maxMarks.toFixed(1)} Marks
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsRubricModalOpen(true)}
                  className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isDark
                      ? 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                      : 'bg-white/80 hover:bg-white border-slate-300 text-slate-800 shadow-xs font-semibold'
                  }`}
                >
                  <Edit className={`w-3.5 h-3.5 ${isDark ? 'text-blue-200' : 'text-blue-600'}`} />
                  <span>Configure Rubric & Weights</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {selectedQuestion.criteria.map((crit, idx) => (
                  <div
                    key={crit.id}
                    className={`alpine-subcard ${
                      !isDark ? 'light-theme' : ''
                    } p-3.5 flex items-start justify-between gap-4 transition-colors`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`w-6 h-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 border ${
                          isDark
                            ? 'bg-blue-500/20 border-blue-400/30 text-blue-200'
                            : 'bg-blue-50 border-blue-200 text-blue-800'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <h5
                          className={`text-xs font-bold ${
                            isDark ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          {crit.title}
                        </h5>
                        <p
                          className={`text-[11px] mt-0.5 leading-snug ${
                            isDark ? 'text-slate-300' : 'text-slate-600'
                          }`}
                        >
                          {crit.description}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                          isDark
                            ? 'text-emerald-300 bg-emerald-500/20 border-emerald-400/30'
                            : 'text-emerald-800 bg-emerald-50 border-emerald-300'
                        }`}
                      >
                        {crit.maxMark.toFixed(1)} M
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rubric Editor Modal */}
      {selectedQuestion && (
        <RubricEditorModal
          question={selectedQuestion}
          isOpen={isRubricModalOpen}
          theme={theme}
          onClose={() => setIsRubricModalOpen(false)}
          onSaveQuestion={onUpdateQuestion}
        />
      )}
    </div>
  );
};
