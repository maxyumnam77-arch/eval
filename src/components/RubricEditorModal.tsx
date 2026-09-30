import React, { useEffect, useState } from 'react';
import { DescriptiveQuestion, RubricCriterion } from '../types';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Scale,
  Sparkles,
} from 'lucide-react';

interface RubricEditorModalProps {
  question: DescriptiveQuestion;
  isOpen: boolean;
  theme?: 'light' | 'dark';
  onClose: () => void;
  onSaveQuestion: (updated: DescriptiveQuestion) => void;
}

export const RubricEditorModal: React.FC<RubricEditorModalProps> = ({
  question,
  isOpen,
  theme = 'light',
  onClose,
  onSaveQuestion,
}) => {
  const isDark = theme === 'dark';
  const [maxMarks, setMaxMarks] = useState<number>(question.maxMarks);
  const [criteria, setCriteria] = useState<RubricCriterion[]>(
    question.criteria.map((c) => ({ ...c }))
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  useEffect(() => {
    if (isOpen) {
      setMaxMarks(question.maxMarks);
      setCriteria(question.criteria.map(c => ({ ...c })));
      setErrorMessage(null);
    }
  }, [isOpen, question.id, question.rubricVersion]);

  // All whole marks from 1 through 10 as explicitly requested
  const wholeMarkButtons = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  // Calculate total criteria weight
  const currentTotalWeight = criteria.reduce((sum, c) => sum + (Number(c.maxMark) || 0), 0);
  const delta = Number((maxMarks - currentTotalWeight).toFixed(2));
  const isBalanced = Math.abs(delta) < 0.001;

  const handleAddCriterion = () => {
    const newId = `crit-${Date.now()}`;
    const defaultWeight = delta > 0 ? delta : 1.0;
    setCriteria([
      ...criteria,
      {
        id: newId,
        title: `Criterion ${criteria.length + 1}`,
        description: 'Detail the specific expectation or key concept required from student.',
        maxMark: defaultWeight,
      },
    ]);
    setErrorMessage(null);
  };

  const handleRemoveCriterion = (id: string) => {
    if (criteria.length <= 1) {
      setErrorMessage('At least one rubric criterion is required.');
      return;
    }
    setCriteria(criteria.filter((c) => c.id !== id));
    setErrorMessage(null);
  };

  const handleUpdateCriterion = (
    id: string,
    field: keyof RubricCriterion,
    value: string | number
  ) => {
    setCriteria(
      criteria.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
    setErrorMessage(null);
  };

  // Synchronized mark selection: button click
  const handleQuickMarkSelect = (marks: number) => {
    setMaxMarks(marks);
    setErrorMessage(null);
  };

  // Synchronized mark selection: custom input change
  const handleCustomMarkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val > 0) {
      setMaxMarks(val);
      setErrorMessage(null);
    } else if (e.target.value === '') {
      setMaxMarks(0);
    }
  };

  const handleAutoDistribute = () => {
    if (criteria.length === 0) return;
    const equalShare = Number((maxMarks / criteria.length).toFixed(2));
    const distributed = criteria.map((c, idx) => {
      if (idx === criteria.length - 1) {
        const previousSum = equalShare * (criteria.length - 1);
        const lastWeight = Number((maxMarks - previousSum).toFixed(2));
        return { ...c, maxMark: Math.max(0.1, lastWeight) };
      }
      return { ...c, maxMark: equalShare };
    });
    setCriteria(distributed);
    setErrorMessage(null);
  };

  const handleApproveAndSave = () => {
    if (maxMarks <= 0) {
      setErrorMessage('Maximum mark must be a positive number greater than 0.');
      return;
    }
    if (!isBalanced) {
      setErrorMessage(
        `Criteria weights (${currentTotalWeight.toFixed(
          1
        )} M) must add exactly to the maximum mark (${maxMarks.toFixed(1)} M) before approval.`
      );
      return;
    }
    if (criteria.some(c => !c.title.trim() || !c.description.trim() || c.description.includes('Edit this draft'))) {
      setErrorMessage('Replace the draft with specific, assessable expectations before approving.');
      return;
    }

    const updated: DescriptiveQuestion = {
      ...question,
      maxMarks,
      criteria,
      rubricApproved: true,
      approvedBy: 'Verified by Instructor (Approved)',
      approvedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    onSaveQuestion(updated);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200 ${
        isDark ? 'bg-slate-950/75' : 'bg-slate-900/40'
      }`}
    >
      <div
        className={`border rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors ${
          isDark
            ? 'bg-[#121927]/95 border-white/20 text-white'
            : 'bg-white/90 backdrop-blur-xl border-white/90 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`p-6 border-b flex items-center justify-between ${
            isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                isDark
                  ? 'bg-blue-500/20 border-blue-400/30 text-blue-200'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              <Scale className={`w-5 h-5 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
            </div>
            <div>
              <h2 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Question Bank · Rubric Authoring & Approval
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Set maximum marks (1–10 or custom), configure criteria weights, and review before locking.
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

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Maximum Marks Setting with 1-10 buttons synchronized with custom input */}
          <div
            className={`border rounded-2xl p-4 space-y-3 ${
              isDark
                ? 'bg-white/[0.04] border-white/15'
                : 'bg-slate-50 border-slate-200 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <label
                className={`text-xs font-semibold uppercase tracking-wider ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                Question Maximum Marks (Whole 1–10 & Custom)
              </label>
              <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>
                Minimum mark is 0 · Positive marks allowed
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {wholeMarkButtons.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleQuickMarkSelect(opt)}
                  className={`w-9 h-8 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer ${
                    maxMarks === opt
                      ? 'bg-blue-600 text-white shadow-xs border border-blue-500 ring-1 ring-blue-400'
                      : isDark
                      ? 'bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15'
                      : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300'
                  }`}
                >
                  {opt}
                </button>
              ))}

              <div
                className={`flex items-center gap-1.5 ml-auto pl-2 border-l ${
                  isDark ? 'border-white/15' : 'border-slate-300'
                }`}
              >
                <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Custom:</span>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={maxMarks || ''}
                  onChange={handleCustomMarkChange}
                  placeholder="e.g. 5"
                  className={`w-20 px-2.5 py-1.5 rounded-lg border font-mono text-xs text-center focus:outline-none focus:border-blue-500 ${
                    isDark
                      ? 'bg-black/40 border-white/25 text-white'
                      : 'bg-white border-slate-300 text-slate-900 font-bold'
                  }`}
                />
                <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Marks</span>
              </div>
            </div>
          </div>

          {/* Criteria List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Rubric Criteria ({criteria.length})
                </h3>
                <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Criteria count does not need to equal marks
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoDistribute}
                  className={`text-xs flex items-center gap-1 cursor-pointer font-medium ${
                    isDark
                      ? 'text-blue-300 hover:text-blue-200 underline decoration-blue-400/40'
                      : 'text-blue-700 hover:text-blue-800 underline'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Auto-distribute {maxMarks}M
                </button>
                <button
                  type="button"
                  onClick={handleAddCriterion}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                    isDark
                      ? 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Criterion
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {criteria.map((crit, idx) => (
                <div
                  key={crit.id}
                  className={`p-3.5 rounded-xl border space-y-2 relative group transition-all ${
                    isDark
                      ? 'bg-white/[0.03] border-white/15 hover:border-white/30 text-white'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <span
                        className={`w-5 h-5 rounded-full font-mono text-[11px] flex items-center justify-center font-bold ${
                          isDark
                            ? 'bg-blue-500/30 text-blue-200'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={crit.title}
                        onChange={(e) =>
                          handleUpdateCriterion(crit.id, 'title', e.target.value)
                        }
                        placeholder="Criterion title..."
                        className={`flex-1 bg-transparent border-b text-xs font-semibold px-1 py-0.5 focus:outline-none ${
                          isDark
                            ? 'border-white/20 focus:border-blue-400 text-white'
                            : 'border-slate-300 focus:border-blue-500 text-slate-900'
                        }`}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Weight:</span>
                      <input
                        type="number"
                        min="0.1"
                        step="0.5"
                        value={crit.maxMark}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val >= 0) {
                            handleUpdateCriterion(crit.id, 'maxMark', val);
                          }
                        }}
                        className={`w-16 px-2 py-1 rounded-md border font-mono text-xs text-center focus:outline-none ${
                          isDark
                            ? 'bg-black/40 border-white/20 text-white focus:border-blue-400'
                            : 'bg-slate-50 border-slate-300 text-slate-900 font-bold focus:border-blue-500'
                        }`}
                      />
                      <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>M</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCriterion(crit.id)}
                        className={`p-1 transition-colors ml-1 cursor-pointer ${
                          isDark ? 'text-white/40 hover:text-red-400' : 'text-slate-400 hover:text-red-600'
                        }`}
                        title="Remove criterion"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    value={crit.description}
                    onChange={(e) =>
                      handleUpdateCriterion(crit.id, 'description', e.target.value)
                    }
                    placeholder="Specific expectation and key terminology required..."
                    className={`w-full text-xs rounded-lg p-2 focus:outline-none resize-none ${
                      isDark
                        ? 'text-slate-200 bg-black/20 border border-white/15 focus:border-blue-400 placeholder-white/30'
                        : 'text-slate-800 bg-slate-50 border border-slate-300 focus:border-blue-500 placeholder-slate-400'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Balance & Validation Banner */}
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between ${
              isBalanced
                ? isDark
                  ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs'
                : isDark
                ? 'bg-amber-500/15 border-amber-400/40 text-amber-200'
                : 'bg-amber-50 border-amber-300 text-amber-900 shadow-xs'
            }`}
          >
            <div className="flex items-center gap-3">
              {isBalanced ? (
                <CheckCircle2
                  className={`w-5 h-5 shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
                />
              ) : (
                <AlertTriangle
                  className={`w-5 h-5 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}
                />
              )}
              <div>
                <p className="text-xs font-bold">
                  {isBalanced
                    ? 'Rubric Weights Balanced & Validated'
                    : 'Rubric Total Must Equal Maximum Marks'}
                </p>
                <p className={`text-[11px] ${isDark ? 'opacity-80' : 'text-slate-700'}`}>
                  {isBalanced
                    ? `Criteria sum exactly matches the maximum of ${maxMarks.toFixed(1)} marks.`
                    : delta > 0
                    ? `Deficit of ${delta.toFixed(1)} mark(s). Increase criteria weights to reach ${maxMarks.toFixed(1)} M.`
                    : `Excess of ${Math.abs(delta).toFixed(1)} mark(s). Adjust weights to total ${maxMarks.toFixed(1)} M.`}
                </p>
              </div>
            </div>

            <div className="text-right font-mono text-xs">
              <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {currentTotalWeight.toFixed(1)}
              </span>
              <span className={isDark ? 'opacity-60' : 'text-slate-600 font-medium'}>
                {' '}
                / {maxMarks.toFixed(1)} M
              </span>
            </div>
          </div>

          {errorMessage && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                isDark
                  ? 'bg-red-500/20 border-red-400/40 text-red-200'
                  : 'bg-red-50 border-red-300 text-red-800'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`p-5 border-t flex items-center justify-between ${
            isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            <Lock className={`w-3.5 h-3.5 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
            <span>Approval locks the rubric for student grading</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                isDark
                  ? 'text-slate-300 hover:text-white bg-white/10 hover:bg-white/15 border-white/20'
                  : 'text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border-slate-300'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApproveAndSave}
              disabled={!isBalanced}
              className={`px-5 py-2.5 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg transition-all ${
                isBalanced
                  ? 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/50 cursor-pointer shadow-blue-900/50'
                  : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve & Lock Rubric</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
