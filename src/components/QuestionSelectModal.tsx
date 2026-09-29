import React from 'react';
import { DescriptiveQuestion } from '../types';
import { X, Check, BookOpen, Layers } from 'lucide-react';

interface QuestionSelectModalProps {
  questions: DescriptiveQuestion[];
  selectedQuestionId: string;
  isOpen: boolean;
  theme?: 'light' | 'dark';
  onClose: () => void;
  onSelectQuestion: (question: DescriptiveQuestion) => void;
  onAddNewQuestion: () => void;
}

export const QuestionSelectModal: React.FC<QuestionSelectModalProps> = ({
  questions,
  selectedQuestionId,
  isOpen,
  theme = 'light',
  onClose,
  onSelectQuestion,
  onAddNewQuestion,
}) => {
  if (!isOpen) return null;
  const isDark = theme === 'dark';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200 ${
        isDark ? 'bg-slate-950/75' : 'bg-slate-900/40'
      }`}
    >
      <div
        className={`border rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-colors ${
          isDark
            ? 'bg-[#12284c] border-white/30 text-white'
            : 'bg-white border-slate-300 text-slate-900'
        }`}
      >
        <div
          className={`p-5 border-b flex items-center justify-between ${
            isDark ? 'border-white/15 bg-white/5' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
                isDark
                  ? 'bg-blue-500/20 border-blue-400/40 text-blue-200'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Select Descriptive Question
              </h2>
              <p className={`text-xs ${isDark ? 'text-blue-200/80' : 'text-slate-600'}`}>
                Choose an exam question to evaluate student papers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isDark
                ? 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {questions.map((q) => {
            const isSelected = q.id === selectedQuestionId;
            return (
              <div
                key={q.id}
                onClick={() => {
                  onSelectQuestion(q);
                  onClose();
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                  isSelected
                    ? isDark
                      ? 'bg-blue-600/30 border-blue-400/60 shadow-md ring-1 ring-blue-400/40'
                      : 'bg-blue-50/90 border-blue-400 shadow-md ring-1 ring-blue-300 text-slate-900'
                    : isDark
                    ? 'bg-white/5 hover:bg-white/10 border-white/15'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded-md border font-bold ${
                        isDark
                          ? 'bg-white/10 text-blue-200 border-white/10'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}
                    >
                      {q.code}
                    </span>
                    <span className={isDark ? 'text-white/60' : 'text-slate-400'}>·</span>
                    <span className={`text-xs ${isDark ? 'text-white/70' : 'text-slate-600 font-medium'}`}>
                      {q.subject}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full border ${
                        isDark
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      {q.maxMarks.toFixed(1)} M
                    </span>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                </div>

                <h3 className={`text-sm font-semibold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {q.title}
                </h3>
                <p className={`text-xs line-clamp-2 leading-relaxed ${isDark ? 'text-white/75' : 'text-slate-600'}`}>
                  {q.prompt}
                </p>

                <div
                  className={`flex items-center gap-3 pt-1 text-[11px] ${
                    isDark ? 'text-white/60' : 'text-slate-500 font-medium'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <Layers className={`w-3 h-3 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
                    {q.criteria.length} Rubric Criteria
                  </span>
                  <span>·</span>
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
                    {q.rubricApproved ? 'Approved & Locked' : 'Pending Approval'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div
          className={`p-4 border-t flex items-center justify-between ${
            isDark ? 'border-white/15 bg-white/5' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              onClose();
              onAddNewQuestion();
            }}
            className={`text-xs font-semibold underline cursor-pointer ${
              isDark ? 'text-blue-300 hover:text-blue-200 decoration-blue-400/50' : 'text-blue-600 hover:text-blue-700'
            }`}
          >
            + Create New Question in Bank
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
              isDark
                ? 'text-white/80 hover:text-white bg-white/10 border-white/20'
                : 'text-slate-700 hover:text-slate-900 bg-white border-slate-300'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
