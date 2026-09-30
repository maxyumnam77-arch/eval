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
  results?: { questionId: string; studentAnswer: string; correctKey: string; awarded: number }[];
}

export type ActiveNavTab = 'submit' | 'grade' | 'bank' | 'mcq' | 'results' | 'model';
