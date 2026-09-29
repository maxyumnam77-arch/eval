import React, { useState } from 'react';
import {
  DescriptiveQuestion,
  StudentSubmission,
} from '../types';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Edit3,
  RotateCcw,
  Check,
  Award,
  Cpu,
  FileCheck,
  Folder,
  FolderOpen,
  ArrowUpRight,
} from 'lucide-react';

interface GradeAnswerViewProps {
  question: DescriptiveQuestion;
  submissions: StudentSubmission[];
  activeSubmissionId: string;
  theme?: 'light' | 'dark';
  onSelectSubmission: (id: string) => void;
  onOpenQuestionModal: () => void;
  onNavigateToBank: () => void;
  onGradeSubmission: (submissionId: string) => void;
  onUpdateSubmissionTranscript: (submissionId: string, transcript: string) => void;
  onTeacherOverrideCriterion: (
    submissionId: string,
    criterionId: string,
    overrideMark: number,
    note: string
  ) => void;
}

export const GradeAnswerView: React.FC<GradeAnswerViewProps> = ({
  question,
  submissions,
  activeSubmissionId,
  theme = 'dark',
  onSelectSubmission,
  onOpenQuestionModal,
  onNavigateToBank,
  onGradeSubmission,
  onUpdateSubmissionTranscript,
  onTeacherOverrideCriterion,
}) => {
  const isDark = theme === 'dark';

  const currentSubmission =
    submissions.find((s) => s.id === activeSubmissionId) || submissions[0];

  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState(
    currentSubmission?.ocrTranscript || ''
  );
  const [isGrading, setIsGrading] = useState(false);
  const [gradingStepText, setGradingStepText] = useState('');
  const [rubricAlert, setRubricAlert] = useState<string | null>(null);

  // Sync edited transcript when switching submission
  React.useEffect(() => {
    if (currentSubmission) {
      setEditedTranscript(currentSubmission.ocrTranscript);
      setIsEditingTranscript(false);
      setRubricAlert(null);
    }
  }, [currentSubmission?.id]);

  const handleSaveTranscript = () => {
    if (currentSubmission) {
      onUpdateSubmissionTranscript(currentSubmission.id, editedTranscript);
      setIsEditingTranscript(false);
    }
  };

  const handleResetTranscript = () => {
    if (currentSubmission) {
      setEditedTranscript(currentSubmission.ocrTranscript);
      setIsEditingTranscript(false);
    }
  };

  const handleTriggerGrade = () => {
    if (!question.rubricApproved) {
      setRubricAlert(
        'Teacher approval required: This question’s rubric has not been approved in Question Bank.'
      );
      return;
    }

    setRubricAlert(null);
    setIsGrading(true);
    setGradingStepText('Aligning candidate transcript with approved rubric criteria...');

    setTimeout(() => {
      setGradingStepText('Extracting semantic evidence & verifying biochemical terms...');
    }, 450);

    setTimeout(() => {
      setGradingStepText('Computing bounded rubric scores & pedagogical rationale...');
    }, 900);

    setTimeout(() => {
      if (currentSubmission) {
        onGradeSubmission(currentSubmission.id);
      }
      setIsGrading(false);
    }, 1400);
  };

  const awardedTotal = currentSubmission?.criteriaScores
    ? currentSubmission.criteriaScores.reduce((sum, item) => sum + item.mark, 0)
    : currentSubmission?.evaluatedTotalScore || 0;

  const currentIdx = submissions.findIndex((s) => s.id === activeSubmissionId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* ---------------- LEFT COLUMN: THREE STACKED GLASS CARDS ---------------- */}
      <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4">
        {/* CARD 1: Selected Folder -> Selected Question */}
        <div
          className={`alpine-card ${
            !isDark ? 'light-theme' : ''
          } p-5 flex flex-col gap-3 transition-colors ${
            isDark ? 'text-white' : 'text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium">
            <span className={isDark ? 'text-white/90' : 'text-slate-700'}>
              Selected Question
            </span>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-colors ${
                isDark
                  ? 'text-slate-300 bg-white/10 border-white/10'
                  : 'text-slate-700 bg-slate-100 border-slate-300'
              }`}
            >
              {question.code}
            </span>
          </div>

          {/* Subcard matching Folderprint's "Travel Archive" item box */}
          <div
            className={`alpine-subcard ${
              !isDark ? 'light-theme' : ''
            } p-3.5 flex items-center gap-3.5 shadow-inner transition-colors`}
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-colors ${
                isDark
                  ? 'bg-white/15 border border-white/25 text-white'
                  : 'bg-blue-50 border border-blue-200 text-blue-700'
              }`}
            >
              <Folder
                className={`w-5 h-5 ${
                  isDark ? 'fill-white/30 text-white' : 'fill-blue-600/25 text-blue-700'
                }`}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h4
                className={`text-sm font-bold truncate tracking-tight transition-colors ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                {question.title}
              </h4>
              <p
                className={`text-[11px] truncate font-mono transition-colors ${
                  isDark ? 'text-white/60' : 'text-slate-500'
                }`}
              >
                /Biology-11/Descriptive/{question.code}.dsc
              </p>
            </div>
          </div>

          <div
            className={`text-xs flex items-center justify-between pt-0.5 transition-colors ${
              isDark ? 'text-white/80' : 'text-slate-600'
            }`}
          >
            <span>{submissions.length} submissions ready</span>
            <span
              className={`font-semibold ${
                isDark ? 'text-slate-200' : 'text-slate-800'
              }`}
            >
              Max {question.maxMarks.toFixed(1)} Marks
            </span>
          </div>

          <div
            className={`border-t pt-2 transition-colors ${
              isDark ? 'border-white/10' : 'border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={onOpenQuestionModal}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.99] cursor-pointer ${
                isDark
                  ? 'bg-white/10 hover:bg-white/15 border border-white/20 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700'
              }`}
            >
              <FolderOpen className="w-4 h-4 opacity-80" />
              <span>Choose another question</span>
            </button>
          </div>
        </div>

        {/* CARD 2: Selected Photos -> Student Submissions */}
        <div
          className={`alpine-card ${
            !isDark ? 'light-theme' : ''
          } p-5 flex flex-col gap-3 transition-colors ${
            isDark ? 'text-white' : 'text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium">
            <span className={isDark ? 'text-white/90' : 'text-slate-700'}>
              Student Submissions
            </span>
            <span className={isDark ? 'text-white/70 font-mono' : 'text-slate-500 font-mono'}>
              {submissions.length}
            </span>
          </div>

          {/* 3 Thumbnails side-by-side matching Folderprint layout */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {submissions.slice(0, 3).map((sub) => {
              const isSelected = sub.id === activeSubmissionId;
              const isGraded = sub.status === 'graded';
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => onSelectSubmission(sub.id)}
                  className={`group flex flex-col text-left transition-all cursor-pointer ${
                    isSelected ? 'scale-[1.02]' : 'opacity-85 hover:opacity-100'
                  }`}
                >
                  {/* Thumbnail container */}
                  <div
                    className={`relative w-full aspect-[3/4] rounded-xl overflow-hidden border p-2 flex flex-col justify-between shadow-sm transition-all ${
                      isSelected
                        ? isDark
                          ? 'border-white ring-2 ring-blue-400 bg-white text-slate-800'
                          : 'border-blue-600 ring-2 ring-blue-500 bg-white text-slate-800 shadow-md'
                        : isDark
                        ? 'border-white/25 bg-[#faf9f5] text-slate-700 hover:border-white/50'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {/* Miniature paper header */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                        <span className="text-[8px] font-bold font-mono text-slate-500 uppercase truncate">
                          {sub.studentId}
                        </span>
                        {isGraded ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm" />
                        )}
                      </div>
                      {/* Realistic simulated ink lines on paper */}
                      <div className="h-1 bg-slate-300 rounded w-full"></div>
                      <div className="h-1 bg-slate-300 rounded w-5/6"></div>
                      <div className="h-1 bg-slate-300 rounded w-full"></div>
                      <div className="h-1 bg-slate-200 rounded w-4/6"></div>
                      <div className="h-1 bg-slate-300 rounded w-full"></div>
                      <div className="h-1 bg-slate-200 rounded w-3/4"></div>
                    </div>

                    {/* Bottom label */}
                    <div className="pt-1 border-t border-slate-200 flex items-center justify-between text-[8px] font-mono">
                      <span className="font-semibold text-slate-700 truncate">
                        {sub.studentName.split(' ')[0]}
                      </span>
                      {isGraded ? (
                        <span className="text-emerald-700 font-bold">
                          {sub.evaluatedTotalScore?.toFixed(1)}M
                        </span>
                      ) : (
                        <span className="text-amber-600">Pending</span>
                      )}
                    </div>
                  </div>

                  {/* Caption underneath */}
                  <span
                    className={`text-[10px] font-mono truncate mt-1.5 px-0.5 transition-colors ${
                      isSelected
                        ? isDark
                          ? 'text-white font-semibold'
                          : 'text-slate-900 font-bold'
                        : isDark
                        ? 'text-white/60 group-hover:text-white/80'
                        : 'text-slate-500 group-hover:text-slate-700'
                    }`}
                  >
                    {sub.fileName}
                  </span>
                </button>
              );
            })}
          </div>

          {submissions.length > 3 && (
            <div
              className={`flex items-center justify-between text-[11px] pt-1 transition-colors ${
                isDark ? 'text-white/70' : 'text-slate-500'
              }`}
            >
              <span>+ {submissions.length - 3} more candidate in queue</span>
              <button
                type="button"
                onClick={() => onSelectSubmission(submissions[3].id)}
                className={`underline cursor-pointer ${
                  isDark ? 'text-blue-300 hover:text-white' : 'text-blue-600 hover:text-blue-800'
                }`}
              >
                View 4th
              </button>
            </div>
          )}
        </div>

        {/* CARD 3: Evaluation Settings -> READ-ONLY in Grade Answer workflow */}
        <div
          className={`alpine-card ${
            !isDark ? 'light-theme' : ''
          } p-5 flex flex-col gap-3 transition-colors ${
            isDark ? 'text-white' : 'text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium">
            <span className={isDark ? 'text-white/90' : 'text-slate-700'}>
              Evaluation Settings
            </span>
            <span
              className={`text-[11px] font-mono ${
                isDark ? 'text-slate-400' : 'text-slate-400'
              }`}
            >
              Read-Only
            </span>
          </div>

          <div className="space-y-2 pt-1 text-xs">
            {/* Row 1: Max Marks (Read-Only) */}
            <div className="flex items-center justify-between py-1">
              <div
                className={`flex items-center gap-2.5 ${
                  isDark ? 'text-white/90' : 'text-slate-700'
                }`}
              >
                <FileText className={`w-4 h-4 ${isDark ? 'text-white/70' : 'text-slate-500'}`} />
                <span>Max Marks</span>
              </div>
              <div
                className={`alpine-pill-select ${
                  !isDark ? 'light-theme' : ''
                } px-2.5 py-1 text-xs font-mono shadow-xs`}
              >
                <span>{question.maxMarks.toFixed(1)} Marks</span>
              </div>
            </div>

            {/* Row 2: Rubric Approval Status (Read-Only) */}
            <div className="flex items-center justify-between py-1">
              <div
                className={`flex items-center gap-2.5 ${
                  isDark ? 'text-white/90' : 'text-slate-700'
                }`}
              >
                <Award className={`w-4 h-4 ${isDark ? 'text-white/70' : 'text-slate-500'}`} />
                <span>Rubric Status</span>
              </div>
              {question.rubricApproved ? (
                <div
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 shadow-xs ${
                    isDark
                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>Approved ({question.criteria.length} criteria)</span>
                </div>
              ) : (
                <div
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 shadow-xs ${
                    isDark
                      ? 'bg-amber-500/20 text-amber-200 border border-amber-400/30'
                      : 'bg-amber-50 text-amber-800 border border-amber-300'
                  }`}
                >
                  <AlertCircle className="w-3 h-3 text-amber-500" />
                  <span>Needs Approval</span>
                </div>
              )}
            </div>

            {/* Row 3: Evaluation Engine (Read-Only) */}
            <div className="flex items-center justify-between py-1">
              <div
                className={`flex items-center gap-2.5 ${
                  isDark ? 'text-white/90' : 'text-slate-700'
                }`}
              >
                <Cpu className={`w-4 h-4 ${isDark ? 'text-white/70' : 'text-slate-500'}`} />
                <span>Model Engine</span>
              </div>
              <div
                className={`alpine-pill-select ${
                  !isDark ? 'light-theme' : ''
                } px-2.5 py-1 text-[11px] shadow-xs`}
              >
                <span>Qwen Rubric Reasoner (Demo)</span>
              </div>
            </div>

            {/* Row 4: Transcript Mode (Read-Only) */}
            <div className="flex items-center justify-between py-1">
              <div
                className={`flex items-center gap-2.5 ${
                  isDark ? 'text-white/90' : 'text-slate-700'
                }`}
              >
                <FileCheck className={`w-4 h-4 ${isDark ? 'text-white/70' : 'text-slate-500'}`} />
                <span>Transcript Mode</span>
              </div>
              <div
                className={`alpine-pill-select ${
                  !isDark ? 'light-theme' : ''
                } px-2.5 py-1 text-[11px] shadow-xs`}
              >
                <span>Editable OCR (Demo)</span>
              </div>
            </div>
          </div>

          <div
            className={`pt-2 border-t flex items-center justify-between text-[11px] transition-colors ${
              isDark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'
            }`}
          >
            <span>To edit rubric or marks:</span>
            <button
              type="button"
              onClick={onNavigateToBank}
              className={`flex items-center gap-0.5 underline cursor-pointer font-medium ${
                isDark ? 'text-blue-300 hover:text-white' : 'text-blue-600 hover:text-blue-800'
              }`}
            >
              <span>Question Bank</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- RIGHT COLUMN: SEPARATE BORDERED GLASS STAGE ---------------- */}
      <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
        {/* Stage container with ample bottom padding so floating button never covers content */}
        <div
          className={`alpine-stage ${
            !isDark ? 'light-theme' : ''
          } p-4 sm:p-6 lg:p-8 relative flex flex-col items-center justify-start min-h-[680px] max-h-[820px] overflow-y-auto shadow-2xl transition-colors`}
        >
          {/* Upper Right Pill matching reference: Page 1 of 1 */}
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center gap-2">
            <span
              className={`alpine-stage-pill ${
                !isDark ? 'light-theme' : ''
              } px-3.5 py-1 text-xs font-mono shadow-md`}
            >
              Page 1 of 1
            </span>
          </div>

          {/* Rubric Warning Banner if teacher attempts to grade unapproved */}
          {rubricAlert && (
            <div className="w-full max-w-[530px] mb-4 p-3.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-100 text-xs flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-300 shrink-0" />
                <span>{rubricAlert}</span>
              </div>
              <button
                type="button"
                onClick={onNavigateToBank}
                className="px-2.5 py-1 bg-amber-400 text-slate-950 font-bold text-[11px] rounded-lg shrink-0 hover:bg-amber-300 cursor-pointer"
              >
                Go to Question Bank
              </button>
            </div>
          )}

          {/* ---------------- THE LARGE WHITE PORTRAIT EXAM PAGE ---------------- */}
          {/* Added pb-36 to guarantee complete scrolling clearance above the floating button */}
          <div className="w-full max-w-[530px] bg-white rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.18)] p-6 sm:p-8 pb-36 text-slate-800 font-sans border border-slate-200/90 relative my-2">
            {/* Examination Header */}
            <div className="border-b-2 border-slate-900 pb-3 mb-5">
              <div className="flex items-center justify-between text-[11px] text-slate-500 uppercase tracking-widest font-semibold pb-1">
                <span>Central Board Exam Evaluation</span>
                <span className="font-mono text-slate-600">Form: AP-BIO-2026</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Candidate: {currentSubmission.studentName}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Roll No: {currentSubmission.studentId} · Submitted: {currentSubmission.submittedAt}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-mono px-2 py-1 rounded bg-slate-100 border border-slate-300 text-slate-700 font-semibold">
                    Q.Code: {question.code}
                  </span>
                </div>
              </div>
            </div>

            {/* Selected Question Header Box */}
            <div className="mb-5 bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Question 4 (Descriptive)
                </span>
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                  Max Marks: {question.maxMarks.toFixed(1)}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-800 leading-relaxed">
                {question.prompt}
              </p>
            </div>

            {/* TEACHER-APPROVED RUBRIC (Clearly visible near top of white page) */}
            <div
              className={`mb-6 rounded-lg border-2 p-4 space-y-2.5 ${
                question.rubricApproved
                  ? 'border-emerald-500/50 bg-emerald-50/60'
                  : 'border-amber-500/50 bg-amber-50/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shadow-xs ${
                      question.rubricApproved
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    {question.rubricApproved ? (
                      <Check className="w-3 h-3 stroke-[3]" />
                    ) : (
                      <AlertCircle className="w-3 h-3 stroke-[3]" />
                    )}
                  </div>
                  <div>
                    <h4
                      className={`text-xs font-bold tracking-tight ${
                        question.rubricApproved ? 'text-emerald-950' : 'text-amber-950'
                      }`}
                    >
                      {question.rubricApproved
                        ? 'Teacher-Approved Rubric (Verified & Locked)'
                        : 'Rubric Approval Required (Pending in Bank)'}
                    </h4>
                    <span
                      className={`text-[10px] font-mono ${
                        question.rubricApproved ? 'text-emerald-800' : 'text-amber-800'
                      }`}
                    >
                      Weights sum: {question.maxMarks.toFixed(1)} / {question.maxMarks.toFixed(1)} Marks · {question.criteria.length} Criteria (1.0 M each)
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onNavigateToBank}
                  className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 underline flex items-center gap-1 cursor-pointer"
                >
                  Question Bank
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>

              {/* Rubric Criteria Table */}
              <div className="border border-slate-200 rounded-md overflow-hidden bg-white text-xs">
                <div className="grid grid-cols-12 bg-slate-100 p-1.5 font-semibold text-[11px] text-slate-800 border-b border-slate-200">
                  <span className="col-span-1 text-center font-mono">#</span>
                  <span className="col-span-9">Criterion & Expectation</span>
                  <span className="col-span-2 text-right font-mono">Weight</span>
                </div>
                {question.criteria.map((crit, idx) => (
                  <div
                    key={crit.id}
                    className={`grid grid-cols-12 p-2 text-xs items-start ${
                      idx !== question.criteria.length - 1 ? 'border-b border-slate-100' : ''
                    }`}
                  >
                    <span className="col-span-1 text-center font-mono text-slate-500 font-bold text-[11px]">
                      {idx + 1}
                    </span>
                    <div className="col-span-9 pr-2">
                      <p className="font-semibold text-slate-900 text-xs">{crit.title}</p>
                      <p className="text-[11px] text-slate-500 leading-snug">{crit.description}</p>
                    </div>
                    <span className="col-span-2 text-right font-mono font-bold text-slate-800 text-xs">
                      {crit.maxMark.toFixed(1)} M
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Candidate Handwritten Answer (Realistic ruled paper view) */}
            <div className="mb-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Candidate Handwritten Paper Scan
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {currentSubmission.fileName}
                </span>
              </div>

              {/* Ruled Notebook Paper Container */}
              <div className="relative border border-slate-300 rounded-lg p-5 bg-[#faf9f5] shadow-inner overflow-hidden">
                {/* Red Left Margin Line */}
                <div className="absolute top-0 bottom-0 left-9 w-px bg-rose-400/70"></div>

                {/* Subtle horizontal ruling lines */}
                <div className="space-y-2.5 pl-6 font-serif italic text-slate-800 text-xs leading-relaxed select-text">
                  {currentSubmission.handwrittenAnswerLines.map((line, i) => (
                    <div
                      key={i}
                      className="border-b border-blue-200/60 pb-0.5 tracking-wide"
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Editable OCR Transcript Section - Clean Demo Labeling, No Invented Confidence */}
            <div className="mb-6 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Simulated OCR Transcript
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                    Editable Demo Data
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditingTranscript ? (
                    <button
                      type="button"
                      onClick={() => setIsEditingTranscript(true)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      Edit OCR Text
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleResetTranscript}
                        className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveTranscript}
                        className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {isEditingTranscript ? (
                <div className="space-y-1.5">
                  <textarea
                    rows={6}
                    value={editedTranscript}
                    onChange={(e) => setEditedTranscript(e.target.value)}
                    className="w-full text-xs font-mono text-slate-800 bg-slate-50 border-2 border-blue-400 rounded-lg p-3 focus:outline-none leading-relaxed"
                  />
                  <p className="text-[11px] text-slate-500">
                    Teacher verification: Correct any OCR misreadings before triggering grading.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-800 leading-relaxed font-sans">
                  {currentSubmission.ocrTranscript}
                </div>
              )}
            </div>

            {/* If Graded: Show Rubric Criterion Results & Teacher Adjustments */}
            {currentSubmission.status === 'graded' && currentSubmission.criteriaScores && (
              <div className="mt-6 pt-5 border-t-2 border-slate-200 space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between bg-slate-100 border border-slate-200 rounded-xl p-3.5">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider font-bold text-slate-900 block">
                      Evaluation Result · Simulated Demo
                    </span>
                    <span className="text-xs text-slate-600">
                      Evaluated using approved 5-criteria rubric (1.0 M each)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black font-mono text-slate-950">
                      {awardedTotal.toFixed(1)}
                    </span>
                    <span className="text-xs font-bold font-mono text-slate-600">
                      {' '}
                      / {question.maxMarks.toFixed(1)} Marks
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Criterion-Level Marks & Text Evidence
                  </h4>

                  {currentSubmission.criteriaScores.map((scoreItem, idx) => {
                    const criterion = question.criteria.find(
                      (c) => c.id === scoreItem.criterionId
                    );
                    const maxWeight = criterion ? criterion.maxMark : 1.0;
                    return (
                      <div
                        key={scoreItem.criterionId}
                        className="p-3 rounded-lg border border-slate-200 bg-white space-y-2 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 font-mono text-[10px] font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {criterion?.title || `Criterion ${idx + 1}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {scoreItem.mark.toFixed(1)} / {maxWeight.toFixed(1)} M
                            </span>
                          </div>
                        </div>

                        {/* Quoted Evidence */}
                        <div className="text-[11px] bg-slate-50 border-l-2 border-blue-500 pl-2.5 py-1 text-slate-600 italic">
                          "{scoreItem.evidence}"
                        </div>

                        {/* Rationale */}
                        <p className="text-[11px] text-slate-600 leading-snug">
                          <span className="font-semibold text-slate-700">Model Rationale: </span>
                          {scoreItem.rationale}
                        </p>

                        {/* Teacher Override Control */}
                        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Teacher Override Mark:</span>
                          <div className="flex items-center gap-1.5">
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
                                    currentSubmission.id,
                                    scoreItem.criterionId,
                                    val,
                                    'Manual teacher adjustment'
                                  );
                                }
                              }}
                              className="w-14 px-1.5 py-0.5 rounded border border-slate-300 font-mono text-xs text-center focus:border-blue-500 focus:outline-none"
                            />
                            <span className="text-slate-500 font-mono">/ {maxWeight}M</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ---------------- FLOATING LARGE ROUNDED BLUE "GRADE ANSWER" BUTTON ---------------- */}
          {/* Kept pinned to the lower right with generous stage padding so it never obscures text */}
          <div className="sticky bottom-4 right-4 self-end z-30 mt-4">
            <button
              type="button"
              onClick={handleTriggerGrade}
              disabled={isGrading}
              className="alpine-btn-blue px-7 py-3.5 flex items-center gap-3 font-semibold text-base tracking-wide text-white cursor-pointer shadow-xl"
            >
              {isGrading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-sm font-semibold">{gradingStepText || 'Grading Answer...'}</span>
                </>
              ) : (
                <>
                  {/* Icon matching the document badge in the reference button */}
                  <div className="w-7 h-7 rounded-lg bg-white/20 border border-white/40 flex items-center justify-center shadow-inner">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <span>
                    {currentSubmission.status === 'graded' ? 'Regrade Answer' : 'Grade Answer'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
