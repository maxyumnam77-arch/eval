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
  approvedBy?: string;
  approvedAt?: string;
}

export interface StudentSubmission {
  id: string;
  studentName: string;
  studentId: string;
  avatarSeed: string;
  fileName: string;
  submittedAt: string;
  questionId: string;
  handwrittenAnswerLines: string[];
  ocrTranscript: string;
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
}

export type ActiveNavTab = 'grade' | 'bank' | 'mcq' | 'results' | 'model';
