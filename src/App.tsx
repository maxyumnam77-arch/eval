import React, { useState } from 'react';
import {
  ActiveNavTab,
  DescriptiveQuestion,
  StudentSubmission,
  MCQQuestion,
  MCQStudentAttempt,
} from './types';
import {
  INITIAL_QUESTIONS,
  INITIAL_SUBMISSIONS,
  INITIAL_MCQS,
  INITIAL_MCQ_ATTEMPTS,
} from './data/mockData';
import { Navbar } from './components/Navbar';
import { GradeAnswerView } from './components/GradeAnswerView';
import { QuestionBankView } from './components/QuestionBankView';
import { MCQView } from './components/MCQView';
import { ResultsReviewView } from './components/ResultsReviewView';
import { ModelEvaluationView } from './components/ModelEvaluationView';
import { RubricEditorModal } from './components/RubricEditorModal';
import { QuestionSelectModal } from './components/QuestionSelectModal';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('grade');
  const [questions, setQuestions] = useState<DescriptiveQuestion[]>(INITIAL_QUESTIONS);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>(
    INITIAL_QUESTIONS[0].id
  );
  const [submissions, setSubmissions] =
    useState<StudentSubmission[]>(INITIAL_SUBMISSIONS);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string>(
    INITIAL_SUBMISSIONS[0].id
  );
  const [mcqs, setMcqs] = useState<MCQQuestion[]>(INITIAL_MCQS);
  const [mcqAttempts, setMcqAttempts] =
    useState<MCQStudentAttempt[]>(INITIAL_MCQ_ATTEMPTS);

  // Modals
  const [isRubricModalOpen, setIsRubricModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);

  const isDark = theme === 'dark';
  const currentQuestion =
    questions.find((q) => q.id === selectedQuestionId) || questions[0];

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Grade action for a submission
  const handleGradeSubmission = (submissionId: string) => {
    setSubmissions((prev) =>
      prev.map((sub) => {
        if (sub.id !== submissionId) return sub;

        // Realistic criterion scoring calculation based on student candidate
        let criteriaScores: {
          criterionId: string;
          mark: number;
          evidence: string;
          rationale: string;
        }[] = [];

        if (sub.id === 'sub-01') {
          // Elena Rostova (5 criteria x 1.0 M)
          criteriaScores = [
            {
              criterionId: currentQuestion.criteria[0]?.id || 'crit-1',
              mark: 1.0,
              evidence:
                'water molecules undergo photolysis: enzymes split H2O into protons (H+), electrons, and free oxygen gas (O2)',
              rationale:
                'Accurate description of H2O oxidation replenishing PSII and releasing molecular oxygen.',
            },
            {
              criterionId: currentQuestion.criteria[1]?.id || 'crit-2',
              mark: 1.0,
              evidence:
                'energized electrons pass along an electron transport chain containing plastoquinone and the cytochrome b6f complex',
              rationale:
                'Identifies key electron carriers and transfer sequence.',
            },
            {
              criterionId: currentQuestion.criteria[2]?.id || 'crit-3',
              mark: 1.0,
              evidence:
                'pump H+ ions from the stroma across into the thylakoid lumen. This builds up a steep proton electrochemical gradient.',
              rationale:
                'Clear articulation of active proton translocation creating delta pH gradient.',
            },
            {
              criterionId: currentQuestion.criteria[3]?.id || 'crit-4',
              mark: 1.0,
              evidence:
                'protons inside the lumen flow down their gradient back to stroma through ATP synthase... powers phosphorylation of ADP + Pi into ATP',
              rationale:
                'Explains chemiosmotic rotary phosphorylation model.',
            },
            {
              criterionId: currentQuestion.criteria[4]?.id || 'crit-5',
              mark: 0.9,
              evidence:
                'NADP+ reductase reduces NADP+ + H+ into NADPH. Both ATP and NADPH enter the Calvin cycle.',
              rationale:
                'High scientific terminology fluency; minor omission of formal balanced equation.',
            },
          ];
        } else if (sub.id === 'sub-02') {
          // Marcus Vance
          criteriaScores = [
            {
              criterionId: currentQuestion.criteria[0]?.id || 'crit-1',
              mark: 0.8,
              evidence:
                'Water is split to give new electrons, which produces oxygen.',
              rationale:
                'States core idea but omits enzyme mechanism and proton generation.',
            },
            {
              criterionId: currentQuestion.criteria[1]?.id || 'crit-2',
              mark: 0.7,
              evidence:
                'excited electrons down the transport chain. As electrons travel down to PS1',
              rationale:
                'Mentions electron chain but omits specific cytochrome b6f carrier.',
            },
            {
              criterionId: currentQuestion.criteria[2]?.id || 'crit-3',
              mark: 0.8,
              evidence:
                'protons are moved across the membrane to build a gradient.',
              rationale:
                'Identifies membrane gradient with basic clarity.',
            },
            {
              criterionId: currentQuestion.criteria[3]?.id || 'crit-4',
              mark: 0.7,
              evidence:
                'At the end, ATP synthase uses the proton gradient to make ATP molecules.',
              rationale:
                'Mentions ATP synthase correctly.',
            },
            {
              criterionId: currentQuestion.criteria[4]?.id || 'crit-5',
              mark: 0.6,
              evidence:
                'forgot to detail NADPH formation explicitly. Overall the process captures solar radiation',
              rationale:
                'Omitted NADPH synthesis; informal wording.',
            },
          ];
        } else if (sub.id === 'sub-03') {
          // Devon Patel
          criteriaScores = [
            {
              criterionId: currentQuestion.criteria[0]?.id || 'crit-1',
              mark: 1.0,
              evidence:
                'Photolysis: 2H2O -> 4H+ + 4e- + O2 replenishes the P680 reaction center while releasing molecular oxygen.',
              rationale:
                'Flawless stoichiometric equation and explicit connection to P680 electron hole.',
            },
            {
              criterionId: currentQuestion.criteria[1]?.id || 'crit-2',
              mark: 1.0,
              evidence:
                'Plastoquinone, cytochrome b6f, and plastocyanin relay electrons to PSI',
              rationale:
                'Exhaustive carrier list and precise pathway detail.',
            },
            {
              criterionId: currentQuestion.criteria[2]?.id || 'crit-3',
              mark: 1.0,
              evidence:
                'pumping H+ into the lumen to establish a high delta pH / electrochemical gradient.',
              rationale:
                'Accurate thermodynamic delta pH notation.',
            },
            {
              criterionId: currentQuestion.criteria[3]?.id || 'crit-4',
              mark: 1.0,
              evidence:
                'Protons drive ATP synthase rotor, synthesizing ATP from ADP + Pi via Peter Mitchell chemiosmosis model.',
              rationale:
                'Historical model citation and mechanical rotor detail.',
            },
            {
              criterionId: currentQuestion.criteria[4]?.id || 'crit-5',
              mark: 1.0,
              evidence:
                'NADP+ reductase yields NADPH in stroma. Complete terminology and college-level rigor.',
              rationale:
                'Impeccable biochemical clarity and notation.',
            },
          ];
        } else {
          // Chloe or other custom questions
          criteriaScores = currentQuestion.criteria.map((crit, idx) => ({
            criterionId: crit.id,
            mark: Number((crit.maxMark * (idx % 2 === 0 ? 0.9 : 0.8)).toFixed(1)),
            evidence: 'Candidate demonstrated partial alignment with key syllabus criteria.',
            rationale: 'Satisfactory conceptual coverage with moderate terminology depth.',
          }));
        }

        const total = criteriaScores.reduce((sum, item) => sum + item.mark, 0);

        return {
          ...sub,
          status: 'graded' as const,
          criteriaScores,
          evaluatedTotalScore: Number(total.toFixed(1)),
          gradedAt: 'Just now',
        };
      })
    );
  };

  const handleUpdateTranscript = (submissionId: string, transcript: string) => {
    setSubmissions((prev) =>
      prev.map((sub) =>
        sub.id === submissionId ? { ...sub, ocrTranscript: transcript } : sub
      )
    );
  };

  const handleTeacherOverride = (
    submissionId: string,
    criterionId: string,
    overrideMark: number,
    note: string
  ) => {
    setSubmissions((prev) =>
      prev.map((sub) => {
        if (sub.id !== submissionId || !sub.criteriaScores) return sub;

        const updatedCriteriaScores = sub.criteriaScores.map((item) =>
          item.criterionId === criterionId
            ? { ...item, mark: overrideMark, rationale: `${item.rationale} [Teacher Override: ${note}]` }
            : item
        );

        const newTotal = updatedCriteriaScores.reduce(
          (sum, item) => sum + item.mark,
          0
        );

        return {
          ...sub,
          criteriaScores: updatedCriteriaScores,
          evaluatedTotalScore: Number(newTotal.toFixed(1)),
          teacherOverrideTotal: Number(newTotal.toFixed(1)),
        };
      })
    );
  };

  const handleUpdateQuestion = (updated: DescriptiveQuestion) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === updated.id ? updated : q))
    );
  };

  const handleAddQuestion = (newQuestion: DescriptiveQuestion) => {
    setQuestions((prev) => [newQuestion, ...prev]);
    setSelectedQuestionId(newQuestion.id);
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    if (selectedQuestionId === id) {
      setSelectedQuestionId(questions[0]?.id || '');
    }
  };

  const handleSelectQuestionForGrading = (q: DescriptiveQuestion) => {
    setSelectedQuestionId(q.id);
    setActiveTab('grade');
  };

  const handleAddMCQ = (newMCQ: MCQQuestion) => {
    setMcqs((prev) => [...prev, newMCQ]);
  };

  const handleDeleteMCQ = (id: string) => {
    setMcqs((prev) => prev.filter((m) => m.id !== id));
  };

  const handleUpdateMCQ = (updated: MCQQuestion) => {
    setMcqs((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  };

  const gradedCount = submissions.filter((s) => s.status === 'graded').length;

  return (
    <div
      className={`min-h-screen w-full font-sans antialiased selection:bg-blue-500 selection:text-white p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-start relative overflow-x-hidden transition-colors duration-300 ${
        isDark ? 'bg-[#0b101c] text-white' : 'bg-[#C9D2DB] text-slate-800'
      }`}
      style={{
        backgroundColor: isDark ? '#0b101c' : '#C9D2DB',
        backgroundImage: isDark
          ? 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(30, 45, 75, 0.4) 0%, rgba(11, 16, 28, 0.95) 100%)'
          : `
            radial-gradient(ellipse 80% 60% at 12% 18%, rgba(189, 203, 217, 0.9) 0%, rgba(189, 203, 217, 0) 75%),
            radial-gradient(ellipse 75% 65% at 88% 12%, rgba(231, 234, 236, 0.95) 0%, rgba(231, 234, 236, 0) 75%),
            radial-gradient(ellipse 85% 70% at 82% 82%, rgba(221, 213, 207, 0.9) 0%, rgba(221, 213, 207, 0) 75%),
            radial-gradient(ellipse 75% 60% at 18% 85%, rgba(231, 234, 236, 0.85) 0%, rgba(231, 234, 236, 0) 70%),
            radial-gradient(ellipse 100% 80% at 50% 50%, rgba(201, 210, 219, 0.8) 0%, rgba(201, 210, 219, 0) 80%),
            linear-gradient(135deg, #C9D2DB 0%, #C3CDD7 50%, #CAD2DA 100%)
          `,
        backgroundAttachment: 'fixed',
        backgroundSize: 'cover',
      }}
    >
      {/* ---------------- THE LARGE TRANSLUCENT FROSTED GLASS WINDOW ---------------- */}
      <main
        className={`alpine-window ${
          !isDark ? 'light-theme' : ''
        } relative z-10 w-full max-w-[1360px] p-6 sm:p-7 lg:p-8 space-y-6 transition-all`}
      >
        {/* Navigation Bar with Theme Toggle */}
        <Navbar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          gradedCount={gradedCount}
          totalSubmissions={submissions.length}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        {/* Dynamic View Swapping */}
        {activeTab === 'grade' && (
          <GradeAnswerView
            question={currentQuestion}
            submissions={submissions}
            activeSubmissionId={activeSubmissionId}
            theme={theme}
            onSelectSubmission={setActiveSubmissionId}
            onOpenQuestionModal={() => setIsQuestionModalOpen(true)}
            onNavigateToBank={() => setActiveTab('bank')}
            onGradeSubmission={handleGradeSubmission}
            onUpdateSubmissionTranscript={handleUpdateTranscript}
            onTeacherOverrideCriterion={handleTeacherOverride}
          />
        )}

        {activeTab === 'bank' && (
          <QuestionBankView
            questions={questions}
            theme={theme}
            onAddQuestion={handleAddQuestion}
            onUpdateQuestion={handleUpdateQuestion}
            onDeleteQuestion={handleDeleteQuestion}
            onSelectForGrading={handleSelectQuestionForGrading}
          />
        )}

        {activeTab === 'mcq' && (
          <MCQView
            mcqs={mcqs}
            studentAttempts={mcqAttempts}
            theme={theme}
            onAddMCQ={handleAddMCQ}
            onDeleteMCQ={handleDeleteMCQ}
            onUpdateMCQ={handleUpdateMCQ}
          />
        )}

        {activeTab === 'results' && (
          <ResultsReviewView
            questions={questions}
            submissions={submissions}
            theme={theme}
            onTeacherOverrideCriterion={handleTeacherOverride}
            onGradeSingleSubmission={handleGradeSubmission}
          />
        )}

        {activeTab === 'model' && <ModelEvaluationView theme={theme} />}
      </main>

      {/* Rubric Configuration Modal (Accessible in Bank & Admin) */}
      <RubricEditorModal
        question={currentQuestion}
        isOpen={isRubricModalOpen}
        onClose={() => setIsRubricModalOpen(false)}
        onSaveQuestion={handleUpdateQuestion}
        theme={theme}
      />

      {/* Question Selector Modal */}
      <QuestionSelectModal
        questions={questions}
        selectedQuestionId={selectedQuestionId}
        isOpen={isQuestionModalOpen}
        theme={theme}
        onClose={() => setIsQuestionModalOpen(false)}
        onSelectQuestion={(q) => setSelectedQuestionId(q.id)}
        onAddNewQuestion={() => {
          setActiveTab('bank');
        }}
      />
    </div>
  );
}
