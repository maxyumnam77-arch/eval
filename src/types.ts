export interface RubricCriterion {
  id: string;
  title: string;
  description: string;
  maxMark: number;
  awardedMark?: number;
  evidence?: string;
  teacherOverride?: number;
  teacherNote?: string;
}

export interface DescriptiveQuestion {
  id: string;
  code: string;
  title: string;
  prompt: string;
  maxMarks: number;
  subject: string;
  classGrade: string;
  referenceAnswer: string;
  criteria: RubricCriterion[];
  rubricApproved: boolean;
  rubricVersion?: number;
  approvedBy?: string;
  approvedAt?: string;
}

export interface StudentSubmission {
  id: string;
  studentName: string;
  studentId: string;
  avatarSeed?: string;
  fileName: string;
  submittedAt: string;
  questionId: string;
  examAttemptId?: string | null;
  handwrittenAnswerLines?: string[];
  ocrTranscript: string;
  ocrOriginal?: string;
  ocrEngine?: string;
  ocrError?: string;
  pages?: { position: number; fileName: string; url: string }[];
  modelName?: string;
  modelTotal?: number;
  rubricSnapshot?: DescriptiveQuestion;
  questionVersion?: number;
  reviewFlags?: string[];
  teacherOverrides?: Record<string, { mark: number; note: string; at: string }>;
  demoNote?: string;
  status: 'pending' | 'graded';
  evaluatedTotalScore?: number;
  criteriaScores?: {
    criterionId: string;
    mark: number;
    evidence: string;
    rationale: string;
  }[];
  teacherOverrideTotal?: number;
  teacherFeedback?: string;
  teacherLabel?: number | null;
  gradedAt?: string;
}

export interface MCQOption {
  key: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface MCQQuestion {
  id: string;
  code: string;
  subject: string;
  question: string;
  options: MCQOption[];
  correctKey: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  mark: number; // Always 1.0 for correct, 0 for wrong/blank
}

export interface MCQStudentAttempt {
  id: string;
  studentName: string;
  studentId: string;
  answers: Record<string, 'A' | 'B' | 'C' | 'D' | ''>;
  submittedAt: string;
  score?: number;
  maxMarks?: number;
  results?: { questionId: string; code?: string; subject?: string; question?: string; studentAnswer: string; correctKey: string; awarded: number }[];
}

export type StudentQuestion = Pick<DescriptiveQuestion, 'id' | 'code' | 'title' | 'prompt' | 'subject' | 'maxMarks'>;
export type ExamItem = { kind: 'descriptive'; question: StudentQuestion } | { kind: 'mcq'; question: Omit<MCQQuestion, 'correctKey' | 'explanation'> };
export type ExamDefinition = { id: string; title: string; description: string; published: boolean; version: number; maxMarks: number; items: ExamItem[] };
export type ExamAttempt = {
  id: string; examId: string; title: string; description: string; version: number;
  studentName: string; studentId: string; startedAt: string; status: 'in_progress' | 'completed';
  score: number | null; earnedMarks: number; maxMarks: number; completedQuestions: number; totalQuestions: number;
  items: (ExamItem & { status: 'missing' | 'pending' | 'graded'; score: number | null; maxMarks: number;
    submissionId?: string; studentAnswer?: string; correctKey?: string })[];
};

export type ActiveNavTab = 'submit' | 'grade' | 'bank' | 'mcq' | 'results' | 'model' | 'exams' | 'progress' | 'backup';
