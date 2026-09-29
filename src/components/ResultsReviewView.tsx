import React, { useState } from 'react';
import { DescriptiveQuestion, StudentSubmission } from '../types';
import {
  Award,
  CheckCircle2,
  Clock,
  Search,
  Check,
} from 'lucide-react';

interface ResultsReviewViewProps {
  questions: DescriptiveQuestion[];
  submissions: StudentSubmission[];
  theme?: 'light' | 'dark';
  onTeacherOverrideCriterion: (
    submissionId: string,
    criterionId: string,
    overrideMark: number,
    note: string
  ) => void;
  onGradeSingleSubmission: (submissionId: string) => void;
}

export const ResultsReviewView: React.FC<ResultsReviewViewProps> = ({
  questions,
  submissions,
  theme = 'light',
  onTeacherOverrideCriterion,
  onGradeSingleSubmission,
}) => {
  const isDark = theme === 'dark';
  const [selectedSubId, setSelectedSubId] = useState<string>(
    submissions[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'graded' | 'pending'>('all');
  const [teacherGeneralNote, setTeacherGeneralNote] = useState('');
  const [savedBanner, setSavedBanner] = useState(false);

  const activeSub =
    submissions.find((s) => s.id === selectedSubId) || submissions[0];

  const activeQuestion = questions.find((q) => q.id === activeSub?.questionId) || questions[0];

  const filtered = submissions.filter((s) => {
    const matchText =
      s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentId.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterStatus === 'graded') return matchText && s.status === 'graded';
    if (filterStatus === 'pending') return matchText && s.status !== 'graded';
    return matchText;
  });

  const gradedCount = submissions.filter((s) => s.status === 'graded').length;
  const avgScore =
    gradedCount > 0
      ? submissions
          .filter((s) => s.status === 'graded')
          .reduce((sum, s) => {
            const subScore = s.criteriaScores
              ? s.criteriaScores.reduce((cSum, item) => cSum + item.mark, 0)
              : s.evaluatedTotalScore || 0;
            return sum + subScore;
          }, 0) / gradedCount
      : 0;

  const currentTotal = activeSub?.criteriaScores
    ? activeSub.criteriaScores.reduce((sum, item) => sum + item.mark, 0)
    : activeSub?.evaluatedTotalScore || 0;

  const handleSaveNotes = () => {
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div
        className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl backdrop-blur-md transition-colors ${
          isDark
            ? 'bg-white/10 border border-white/20 text-white'
            : 'bg-white/65 border border-slate-300/80 text-slate-900 shadow-xs'
        }`}
      >
        <div>
          <h2
            className={`text-lg font-bold tracking-tight flex items-center gap-2 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            <Award className={`w-5 h-5 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
            Evaluation Audit, Results & Teacher Corrections
          </h2>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-blue-100/80' : 'text-slate-600'}`}>
            Review detailed criteria scores, inspect textual evidence citations, and record instructor manual grade adjustments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`px-3.5 py-1.5 rounded-xl border text-xs flex items-center gap-2 ${
              isDark ? 'bg-white/10 border-white/20 text-white' : 'alpine-subcard light-theme text-slate-800'
            }`}
          >
            <span className={isDark ? 'text-white/60' : 'text-slate-500 font-medium'}>Graded:</span>
            <span
              className={`font-mono font-bold ${
                isDark ? 'text-emerald-300' : 'text-emerald-700'
              }`}
            >
              {gradedCount} / {submissions.length}
            </span>
          </div>

          <div
            className={`px-3.5 py-1.5 rounded-xl border text-xs flex items-center gap-2 ${
              isDark ? 'bg-white/10 border-white/20 text-white' : 'alpine-subcard light-theme text-slate-800'
            }`}
          >
            <span className={isDark ? 'text-white/60' : 'text-slate-500 font-medium'}>Cohort Mean:</span>
            <span
              className={`font-mono font-bold ${
                isDark ? 'text-blue-200' : 'text-blue-700'
              }`}
            >
              {avgScore.toFixed(2)} / {activeQuestion.maxMarks.toFixed(1)} M
            </span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Submissions Table / Filter List */}
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
              Candidate Submissions
            </span>
            <span className={`text-xs font-mono ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
              {filtered.length} shown
            </span>
          </div>

          {/* Search & Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className={`w-3.5 h-3.5 absolute left-3 top-2.5 ${isDark ? 'text-white/50' : 'text-slate-400'}`} />
              <input
                type="text"
                placeholder="Search candidate name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:border-blue-500 transition-colors ${
                  isDark
                    ? 'bg-black/25 border-white/15 text-white placeholder-white/40'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 shadow-xs'
                }`}
              />
            </div>

            <div className="flex items-center gap-1 text-[11px]">
              {(['all', 'graded', 'pending'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setFilterStatus(filter)}
                  className={`flex-1 py-1 rounded-md capitalize font-medium transition-all cursor-pointer ${
                    filterStatus === filter
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : isDark
                      ? 'bg-white/5 text-white/60 hover:text-white'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {filtered.map((sub) => {
              const isSelected = sub.id === activeSub?.id;
              const isGraded = sub.status === 'graded';
              const score = sub.criteriaScores
                ? sub.criteriaScores.reduce((cSum, item) => cSum + item.mark, 0)
                : sub.evaluatedTotalScore || 0;

              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSelectedSubId(sub.id)}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? isDark
                        ? 'bg-blue-600/35 border-blue-400 shadow-md ring-1 ring-blue-300 text-white'
                        : 'bg-blue-50/90 border-blue-400 shadow-md ring-1 ring-blue-300 text-slate-900'
                      : isDark
                      ? 'bg-white/5 hover:bg-white/10 border-white/15 text-white'
                      : 'alpine-subcard light-theme hover:bg-white/70 text-slate-800'
                  }`}
                >
                  <div>
                    <h4
                      className={`text-xs font-bold ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {sub.studentName}
                    </h4>
                    <p
                      className={`text-[11px] font-mono ${
                        isDark ? 'text-white/60' : 'text-slate-500'
                      }`}
                    >
                      {sub.studentId} · {sub.submittedAt}
                    </p>
                  </div>

                  <div className="text-right">
                    {isGraded ? (
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border ${
                          isDark
                            ? 'text-emerald-300 bg-emerald-500/20 border-emerald-400/30'
                            : 'text-emerald-800 bg-emerald-50 border-emerald-300'
                        }`}
                      >
                        {score.toFixed(1)} / {activeQuestion.maxMarks.toFixed(1)} M
                      </span>
                    ) : (
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                          isDark
                            ? 'text-amber-300 bg-amber-500/20 border-amber-400/30'
                            : 'text-amber-800 bg-amber-50 border-amber-300'
                        }`}
                      >
                        Pending
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed Rubric Audit & Teacher Overrides */}
        {activeSub && (
          <div
            className={`lg:col-span-8 alpine-card ${
              !isDark ? 'light-theme' : ''
            } p-6 space-y-6 transition-colors ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            {/* Header info */}
            <div
              className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b ${
                isDark ? 'border-white/15' : 'border-slate-200'
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
                    {activeSub.studentId}
                  </span>
                  <span className={isDark ? 'text-white/60' : 'text-slate-400'}>·</span>
                  <span className={`text-xs ${isDark ? 'text-white/80' : 'text-slate-600 font-medium'}`}>
                    {activeQuestion.title}
                  </span>
                </div>
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {activeSub.studentName}
                </h3>
              </div>

              <div className="flex items-center gap-3">
                {activeSub.status === 'graded' ? (
                  <div
                    className={`flex items-center gap-2 border rounded-xl px-4 py-2 ${
                      isDark
                        ? 'bg-emerald-500/20 border-emerald-400/40 text-white'
                        : 'bg-emerald-50 border-emerald-300 text-slate-900 shadow-xs'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-5 h-5 ${isDark ? 'text-emerald-300' : 'text-emerald-600'}`}
                    />
                    <div>
                      <span
                        className={`text-[10px] uppercase block font-semibold ${
                          isDark ? 'text-emerald-200' : 'text-emerald-800'
                        }`}
                      >
                        Evaluated Score
                      </span>
                      <span
                        className={`text-lg font-mono font-bold ${
                          isDark ? 'text-emerald-300' : 'text-emerald-700'
                        }`}
                      >
                        {currentTotal.toFixed(1)} / {activeQuestion.maxMarks.toFixed(1)} M
                      </span>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onGradeSingleSubmission(activeSub.id)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold border border-white/30 shadow-md cursor-pointer"
                  >
                    Run Evaluation
                  </button>
                )}
              </div>
            </div>

            {/* Candidate Raw OCR & Answer Text (Gray transcript panel) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs uppercase font-bold tracking-wider ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Candidate OCR Transcript
                </span>
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded border font-medium ${
                    isDark
                      ? 'text-slate-400 bg-white/5 border-white/10'
                      : 'text-slate-600 bg-slate-100 border-slate-300'
                  }`}
                >
                  Simulated OCR (Demo)
                </span>
              </div>
              <div
                className={`p-3.5 rounded-xl border text-xs leading-relaxed font-sans ${
                  isDark
                    ? 'bg-black/30 border-white/10 text-slate-200'
                    : 'bg-slate-50 border-slate-300 text-slate-800 shadow-xs'
                }`}
              >
                {activeSub.ocrTranscript}
              </div>
            </div>

            {/* Criterion Evidence Breakdown */}
            {activeSub.status === 'graded' && activeSub.criteriaScores ? (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4
                    className={`text-sm font-bold flex items-center gap-2 ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    <span>Teacher Rubric Evidence & Overrides</span>
                    <span
                      className={`text-[11px] font-normal ${
                        isDark ? 'text-white/60' : 'text-slate-500'
                      }`}
                    >
                      Adjust scores per criterion if needed
                    </span>
                  </h4>
                </div>

                <div className="space-y-3">
                  {activeSub.criteriaScores.map((scoreItem, idx) => {
                    const crit = activeQuestion.criteria.find(
                      (c) => c.id === scoreItem.criterionId
                    );
                    const maxWeight = crit?.maxMark || 1.0;

                    return (
                      <div
                        key={scoreItem.criterionId}
                        className={`p-4 rounded-xl border space-y-2.5 transition-all ${
                          isDark
                            ? 'bg-white/5 border-white/15 hover:border-white/30 text-white'
                            : 'alpine-subcard light-theme hover:border-slate-300 text-slate-900 shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <span
                              className={`w-5 h-5 rounded-md font-mono text-[11px] font-bold flex items-center justify-center shrink-0 border ${
                                isDark
                                  ? 'bg-blue-500/25 text-blue-200 border-blue-400/30'
                                  : 'bg-blue-50 text-blue-800 border-blue-200'
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
                                {crit?.title || `Criterion ${idx + 1}`}
                              </h5>
                              <p
                                className={`text-[11px] mt-0.5 ${
                                  isDark ? 'text-white/60' : 'text-slate-600'
                                }`}
                              >
                                {crit?.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-xs font-medium ${
                                isDark ? 'text-white/60' : 'text-slate-600'
                              }`}
                            >
                              Teacher Mark:
                            </span>
                            <input
                              type="number"
                              min="0"
                              max={maxWeight}
                              step="0.5"
                              defaultValue={scoreItem.mark}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val >= 0 && val <= maxWeight) {
                                  onTeacherOverrideCriterion(
                                    activeSub.id,
                                    scoreItem.criterionId,
                                    val,
                                    'Instructor override'
                                  );
                                }
                              }}
                              className={`w-16 px-2 py-1 rounded border font-mono text-xs text-center focus:border-blue-500 focus:outline-none transition-colors ${
                                isDark
                                  ? 'bg-black/40 border-white/25 text-white'
                                  : 'bg-white border-slate-300 text-slate-900 font-bold shadow-xs'
                              }`}
                            />
                            <span
                              className={`text-xs font-mono font-semibold ${
                                isDark ? 'text-white/70' : 'text-slate-600'
                              }`}
                            >
                              / {maxWeight.toFixed(1)} M
                            </span>
                          </div>
                        </div>

                        {/* Quoted Evidence */}
                        <div
                          className={`text-xs border-l-2 pl-3 py-1.5 italic rounded-r leading-relaxed ${
                            isDark
                              ? 'bg-black/25 border-emerald-400 text-blue-100/90'
                              : 'bg-emerald-50/70 border-emerald-500 text-slate-800'
                          }`}
                        >
                          "{scoreItem.evidence}"
                        </div>

                        {/* Rationale */}
                        <p
                          className={`text-[11px] leading-relaxed ${
                            isDark ? 'text-white/70' : 'text-slate-600'
                          }`}
                        >
                          <span
                            className={`font-semibold ${
                              isDark ? 'text-white/90' : 'text-slate-900'
                            }`}
                          >
                            Model Rationale:{' '}
                          </span>
                          {scoreItem.rationale}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div
                className={`p-8 rounded-xl border text-center space-y-2 ${
                  isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <Clock className={`w-6 h-6 mx-auto ${isDark ? 'text-white/40' : 'text-slate-400'}`} />
                <p className={`text-xs ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
                  This submission has not been evaluated yet.
                </p>
                <button
                  type="button"
                  onClick={() => onGradeSingleSubmission(activeSub.id)}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Grade Submission Now
                </button>
              </div>
            )}

            {/* General Feedback Box */}
            <div className="space-y-2 pt-2">
              <label
                className={`text-xs font-bold uppercase tracking-wider ${
                  isDark ? 'text-blue-200' : 'text-slate-700'
                }`}
              >
                Instructor Qualitative Feedback for Student
              </label>
              <textarea
                rows={2}
                value={teacherGeneralNote}
                onChange={(e) => setTeacherGeneralNote(e.target.value)}
                placeholder="Add customized commendation, corrections, or study recommendations..."
                className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-blue-500 resize-none leading-relaxed transition-colors ${
                  isDark
                    ? 'bg-black/25 border-white/20 text-white placeholder-white/40'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 shadow-xs'
                }`}
              />
              <div className="flex items-center justify-between">
                {savedBanner ? (
                  <span
                    className={`text-xs flex items-center gap-1 font-semibold ${
                      isDark ? 'text-emerald-300' : 'text-emerald-700'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Teacher review feedback saved successfully
                  </span>
                ) : (
                  <span className={`text-[11px] ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                    Feedback attaches to student grade report
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className={`px-4 py-1.5 border text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
                    isDark
                      ? 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                      : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-xs'
                  }`}
                >
                  Save Feedback
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
