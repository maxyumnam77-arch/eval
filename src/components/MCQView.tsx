import React, { useState } from 'react';
import { MCQQuestion, MCQStudentAttempt } from '../types';
import {
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Award,
  HelpCircle,
} from 'lucide-react';

interface MCQViewProps {
  mcqs: MCQQuestion[];
  studentAttempts: MCQStudentAttempt[];
  theme?: 'light' | 'dark';
  onAddMCQ: (newMCQ: MCQQuestion) => void;
  onDeleteMCQ: (id: string) => void;
  onUpdateMCQ: (updated: MCQQuestion) => void;
}

export const MCQView: React.FC<MCQViewProps> = ({
  mcqs,
  studentAttempts,
  theme = 'light',
  onAddMCQ,
  onDeleteMCQ,
}) => {
  const isDark = theme === 'dark';
  const [activeSubTab, setActiveSubTab] = useState<'grader' | 'manager'>('grader');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    studentAttempts[0]?.id || ''
  );

  // New MCQ state
  const [isAdding, setIsAdding] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctKey, setCorrectKey] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [explanation, setExplanation] = useState('');

  const handleCreateMCQ = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim() || !optionA.trim() || !optionB.trim()) return;

    const newMCQ: MCQQuestion = {
      id: `mcq-${Date.now()}`,
      code: `MCQ-${mcqs.length + 1}`,
      subject: 'AP Biology & Genetics',
      question: questionText,
      options: [
        { key: 'A', text: optionA },
        { key: 'B', text: optionB },
        { key: 'C', text: optionC || 'Option C' },
        { key: 'D', text: optionD || 'Option D' },
      ],
      correctKey,
      explanation: explanation || 'Standard syllabus definition.',
      mark: 1.0, // Fixed rule: 1 mark for correct, 0 for wrong/blank
    };

    onAddMCQ(newMCQ);
    setIsAdding(false);
    setQuestionText('');
    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');
    setExplanation('');
  };

  const selectedAttempt =
    studentAttempts.find((a) => a.id === selectedStudentId) || studentAttempts[0];

  // Grade calculation for selected attempt:
  // Correct = 1.0 Mark, Wrong or Blank = 0.0 Marks
  const gradeResults = mcqs.map((q) => {
    const studentAns = selectedAttempt?.answers[q.id] || '';
    const isCorrect = studentAns === q.correctKey;
    const isBlank = !studentAns;
    const awarded = isCorrect ? 1.0 : 0.0;
    return {
      question: q,
      studentAns,
      isCorrect,
      isBlank,
      awarded,
    };
  });

  const totalScore = gradeResults.reduce((acc, curr) => acc + curr.awarded, 0);
  const maxPossible = mcqs.length * 1.0;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div
        className={`alpine-card ${
          !isDark ? 'light-theme' : ''
        } flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 transition-colors ${
          isDark ? 'text-white' : 'text-slate-900'
        }`}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2
              className={`text-lg font-bold tracking-tight flex items-center gap-2 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              <Award className={`w-5 h-5 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
              Multiple Choice Evaluation Suite
            </h2>
            <span
              className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                isDark
                  ? 'bg-blue-500/30 text-blue-200 border-blue-400/30'
                  : 'bg-blue-50 text-blue-800 border-blue-200'
              }`}
            >
              Strict Rule: 1M Correct / 0M Wrong or Blank
            </span>
          </div>
          <p className={`text-xs ${isDark ? 'text-blue-100/80' : 'text-slate-600'}`}>
            Automated bubble evaluation engine enforcing binary mark weighting (1.0 for correct, 0.0 for wrong or omitted).
          </p>
        </div>

        {/* Sub-tab toggle */}
        <div
          className={`flex items-center gap-1.5 p-1 rounded-xl border ${
            isDark ? 'bg-white/10 border-white/20' : 'bg-white/60 border-white/80 backdrop-blur-md shadow-xs'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveSubTab('grader')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'grader'
                ? 'bg-blue-600 text-white shadow-xs'
                : isDark
                ? 'text-white/70 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Candidate Grader Simulator
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('manager')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'manager'
                ? 'bg-blue-600 text-white shadow-xs'
                : isDark
                ? 'text-white/70 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Manage Question Keys ({mcqs.length})
          </button>
        </div>
      </div>

      {activeSubTab === 'grader' ? (
        /* GRADER SIMULATOR */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Student Attempts Selector */}
          <div
            className={`lg:col-span-4 alpine-card ${
              !isDark ? 'light-theme' : ''
            } p-5 space-y-4 transition-colors ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  isDark ? 'text-blue-200' : 'text-slate-700'
                }`}
              >
                Candidate Bubble Submissions
              </span>
              <span className={`text-[11px] font-mono ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
                {studentAttempts.length} Candidates
              </span>
            </div>

            <div className="space-y-2">
              {studentAttempts.map((att) => {
                const isSelected = att.id === selectedStudentId;
                const score = mcqs.reduce((sum, q) => {
                  return att.answers[q.id] === q.correctKey ? sum + 1 : sum;
                }, 0);

                return (
                  <button
                    key={att.id}
                    type="button"
                    onClick={() => setSelectedStudentId(att.id)}
                    className={`w-full p-3.5 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? isDark
                          ? 'bg-blue-600/35 border-blue-400 shadow-md ring-1 ring-blue-300 text-white'
                          : 'bg-blue-50/90 border-blue-400 shadow-md ring-1 ring-blue-300 text-slate-900 backdrop-blur-md'
                        : isDark
                        ? 'bg-white/5 hover:bg-white/10 border-white/15 text-white'
                        : 'alpine-subcard light-theme hover:bg-white/75 text-slate-800'
                    }`}
                  >
                    <div>
                      <h4
                        className={`text-xs font-bold ${
                          isDark ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {att.studentName}
                      </h4>
                      <p
                        className={`text-[11px] font-mono ${
                          isDark ? 'text-white/60' : 'text-slate-500'
                        }`}
                      >
                        {att.studentId} · {att.submittedAt}
                      </p>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border ${
                          isDark
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        {score} / {mcqs.length} M
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div
              className={`alpine-subcard ${
                !isDark ? 'light-theme' : ''
              } p-3.5 space-y-1 text-xs`}
            >
              <span className={`font-semibold block ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Scoring Invariant:
              </span>
              <p className="text-[11px] leading-relaxed">
                • Correct key match ={' '}
                <strong className={isDark ? 'text-emerald-300' : 'text-emerald-700 font-bold'}>
                  1.0 Mark
                </strong>
                <br />
                • Incorrect choice ={' '}
                <strong className={isDark ? 'text-rose-300' : 'text-rose-700 font-bold'}>
                  0.0 Marks
                </strong>
                <br />
                • Blank / unattempted ={' '}
                <strong className={isDark ? 'text-slate-300' : 'text-slate-600 font-bold'}>
                  0.0 Marks
                </strong>
              </p>
            </div>
          </div>

          {/* Right Column: Detailed Bubble Sheet & Mark Breakdown */}
          <div
            className={`lg:col-span-8 alpine-card ${
              !isDark ? 'light-theme' : ''
            } p-6 space-y-6 transition-colors ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            {/* Header with Candidate Score */}
            <div
              className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b ${
                isDark ? 'border-white/15' : 'border-slate-200'
              }`}
            >
              <div>
                <span
                  className={`text-[11px] uppercase tracking-wider font-bold block ${
                    isDark ? 'text-blue-200' : 'text-blue-700'
                  }`}
                >
                  Evaluation Audit Sheet
                </span>
                <h3
                  className={`text-lg font-bold ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {selectedAttempt.studentName}{' '}
                  <span
                    className={`text-xs font-normal font-mono ${
                      isDark ? 'text-white/60' : 'text-slate-500'
                    }`}
                  >
                    ({selectedAttempt.studentId})
                  </span>
                </h3>
              </div>

              <div
                className={`flex items-center gap-3 border rounded-xl px-4 py-2 ${
                  isDark
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'bg-emerald-50/80 border-emerald-200 text-slate-900 shadow-xs'
                }`}
              >
                <span className={`text-xs font-medium ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
                  Total Score:
                </span>
                <span
                  className={`text-xl font-black font-mono ${
                    isDark ? 'text-emerald-300' : 'text-emerald-700'
                  }`}
                >
                  {totalScore.toFixed(1)}
                </span>
                <span className={`text-xs font-mono ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                  / {maxPossible.toFixed(1)} Marks ({((totalScore / maxPossible) * 100).toFixed(0)}%)
                </span>
              </div>
            </div>

            {/* Questions Graded List */}
            <div className="space-y-3.5 max-h-[550px] overflow-y-auto pr-1">
              {gradeResults.map((item, idx) => (
                <div
                  key={item.question.id}
                  className={`p-4 rounded-xl border transition-all ${
                    item.isCorrect
                      ? isDark
                        ? 'bg-emerald-500/10 border-emerald-400/30'
                        : 'bg-emerald-50/50 border-emerald-200 shadow-xs'
                      : isDark
                      ? 'bg-rose-500/10 border-rose-400/30'
                      : 'bg-rose-50/50 border-rose-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`w-5 h-5 rounded-md font-mono text-[11px] flex items-center justify-center font-bold shrink-0 mt-0.5 border ${
                          isDark
                            ? 'bg-black/30 border-white/20 text-white'
                            : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <p
                        className={`text-xs font-semibold leading-relaxed ${
                          isDark ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {item.question.question}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {item.isCorrect ? (
                        <span
                          className={`flex items-center gap-1 text-xs font-bold font-mono px-2 py-0.5 rounded border ${
                            isDark
                              ? 'text-emerald-300 bg-emerald-500/20 border-emerald-400/40'
                              : 'text-emerald-800 bg-emerald-100 border-emerald-300'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          +1.0 M
                        </span>
                      ) : (
                        <span
                          className={`flex items-center gap-1 text-xs font-bold font-mono px-2 py-0.5 rounded border ${
                            isDark
                              ? 'text-rose-300 bg-rose-500/20 border-rose-400/40'
                              : 'text-rose-800 bg-rose-100 border-rose-300'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          +0.0 M
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Options List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    {item.question.options.map((opt) => {
                      const isCandidateChoice = item.studentAns === opt.key;
                      const isCorrectKey = item.question.correctKey === opt.key;

                      let badgeStyle = isDark
                        ? 'bg-white/5 border-white/10 text-white/70'
                        : 'bg-white/70 border-slate-200 text-slate-700';

                      if (isCandidateChoice && isCorrectKey) {
                        badgeStyle = isDark
                          ? 'bg-emerald-500/30 border-emerald-400 text-white font-semibold ring-1 ring-emerald-400'
                          : 'bg-emerald-100/90 border-emerald-400 text-emerald-900 font-bold ring-1 ring-emerald-400';
                      } else if (isCandidateChoice && !isCorrectKey) {
                        badgeStyle = isDark
                          ? 'bg-rose-500/30 border-rose-400 text-rose-100 font-semibold ring-1 ring-rose-400'
                          : 'bg-rose-100/90 border-rose-400 text-rose-900 font-bold ring-1 ring-rose-400';
                      } else if (isCorrectKey) {
                        badgeStyle = isDark
                          ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
                          : 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold';
                      }

                      return (
                        <div
                          key={opt.key}
                          className={`p-2 rounded-lg border text-xs flex items-center justify-between ${badgeStyle}`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-mono font-bold text-[11px] px-1.5 py-0.5 rounded border ${
                                isDark
                                  ? 'bg-black/20 text-white border-white/10'
                                  : 'bg-white text-slate-800 border-slate-300'
                              }`}
                            >
                              {opt.key}
                            </span>
                            <span className="truncate">{opt.text}</span>
                          </div>

                          <div className="flex items-center gap-1 text-[10px]">
                            {isCandidateChoice && (
                              <span
                                className={`px-1.5 py-0.5 rounded font-mono font-semibold ${
                                  isDark ? 'bg-black/30 text-white' : 'bg-slate-200 text-slate-800'
                                }`}
                              >
                                Marked
                              </span>
                            )}
                            {isCorrectKey && (
                              <span
                                className={`font-bold ${
                                  isDark ? 'text-emerald-300' : 'text-emerald-700'
                                }`}
                              >
                                Key ✓
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  <div
                    className={`mt-2.5 pt-2 border-t text-[11px] flex items-center gap-1.5 ${
                      isDark ? 'border-white/10 text-white/60' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <HelpCircle className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
                    <span>{item.question.explanation}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* MCQ QUESTION MANAGER */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              MCQ Master Key Management
            </h3>
            <button
              type="button"
              onClick={() => setIsAdding(!isAdding)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 border border-white/20 shadow-md cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAdding ? 'Cancel' : 'Add MCQ Question'}</span>
            </button>
          </div>

          {isAdding && (
            <form
              onSubmit={handleCreateMCQ}
              className={`p-5 rounded-2xl border backdrop-blur-xl space-y-4 shadow-xl ${
                isDark
                  ? 'bg-[#142c54]/80 border-white/25 text-white'
                  : 'bg-white/75 border-white/90 text-slate-900'
              }`}
            >
              <h4
                className={`text-xs font-bold uppercase tracking-wider ${
                  isDark ? 'text-blue-200' : 'text-blue-700'
                }`}
              >
                Create Multiple Choice Item
              </h4>

              <div className="text-xs space-y-1">
                <label className={`block font-semibold ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
                  Question Prompt
                </label>
                <input
                  type="text"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="e.g. Which pigment absorbs primarily at 680nm in Photosystem II?"
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:border-blue-500 ${
                    isDark
                      ? 'bg-black/30 border-white/20 text-white placeholder-slate-400'
                      : 'bg-white/80 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white'
                  }`}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {(['A', 'B', 'C', 'D'] as const).map((key) => {
                  const stateVal =
                    key === 'A'
                      ? optionA
                      : key === 'B'
                      ? optionB
                      : key === 'C'
                      ? optionC
                      : optionD;
                  const setVal =
                    key === 'A'
                      ? setOptionA
                      : key === 'B'
                      ? setOptionB
                      : key === 'C'
                      ? setOptionC
                      : setOptionD;

                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label
                          className={`font-semibold font-mono ${
                            isDark ? 'text-white/70' : 'text-slate-700'
                          }`}
                        >
                          Option {key}
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name="correctKey"
                            checked={correctKey === key}
                            onChange={() => setCorrectKey(key)}
                            className="text-blue-600"
                          />
                          <span
                            className={`text-[11px] font-bold ${
                              correctKey === key
                                ? isDark
                                  ? 'text-emerald-300'
                                  : 'text-emerald-700'
                                : isDark
                                ? 'text-white/60'
                                : 'text-slate-500'
                            }`}
                          >
                            Correct Key
                          </span>
                        </label>
                      </div>
                      <input
                        type="text"
                        value={stateVal}
                        onChange={(e) => setVal(e.target.value)}
                        placeholder={`Option ${key} text...`}
                        className={`w-full px-3 py-1.5 rounded-lg border focus:outline-none focus:border-blue-500 ${
                          isDark
                            ? 'bg-black/30 border-white/20 text-white'
                            : 'bg-white/80 border-slate-300 text-slate-900 focus:bg-white'
                        }`}
                        required={key === 'A' || key === 'B'}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="text-xs space-y-1">
                <label className={`block font-semibold ${isDark ? 'text-white/70' : 'text-slate-700'}`}>
                  Answer Explanation
                </label>
                <input
                  type="text"
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Rationale why the selected option is correct..."
                  className={`w-full px-3 py-1.5 rounded-lg border focus:outline-none focus:border-blue-500 ${
                    isDark
                      ? 'bg-black/30 border-white/20 text-white'
                      : 'bg-white/80 border-slate-300 text-slate-900 focus:bg-white'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className={`px-3 py-1.5 text-xs rounded-lg cursor-pointer ${
                    isDark
                      ? 'text-white/70 bg-white/10'
                      : 'text-slate-700 bg-white/80 hover:bg-white border border-slate-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-md cursor-pointer"
                >
                  Save MCQ Key
                </button>
              </div>
            </form>
          )}

          {/* List of current MCQs */}
          <div className="space-y-3">
            {mcqs.map((q, idx) => (
              <div
                key={q.id}
                className={`alpine-card ${
                  !isDark ? 'light-theme' : ''
                } p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded border font-bold ${
                        isDark
                          ? 'bg-blue-500/25 text-blue-200 border-blue-400/30'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}
                    >
                      {q.code || `MCQ-${idx + 1}`}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${
                        isDark
                          ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400/30'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      Key: Option {q.correctKey} (1.0 M)
                    </span>
                  </div>

                  <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {q.question}
                  </h4>

                  <div className={`grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] pt-1 ${isDark ? 'text-white/80' : 'text-slate-700'}`}>
                    {q.options.map((opt) => (
                      <span
                        key={opt.key}
                        className={
                          opt.key === q.correctKey
                            ? isDark
                              ? 'text-emerald-300 font-semibold'
                              : 'text-emerald-800 font-bold'
                            : ''
                        }
                      >
                        <strong>{opt.key}.</strong> {opt.text}
                      </span>
                    ))}
                  </div>

                  <p className={`text-[11px] italic pt-0.5 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                    {q.explanation}
                  </p>
                </div>

                {mcqs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onDeleteMCQ(q.id)}
                    className={`p-2 rounded-xl border transition-colors self-end md:self-center cursor-pointer ${
                      isDark
                        ? 'bg-white/10 hover:bg-red-500/30 text-white/70 hover:text-red-200 border-white/20'
                        : 'bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 border-slate-300'
                    }`}
                    title="Delete Question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
