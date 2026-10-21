export type ExamType = 'midterm' | 'final';

export interface CatalogEntry {
  departmentId: string;
  department: string;
  courseId: string;
  course: string;
  midtermGid: string;
  finalGid: string;
}

export interface QuestionOption {
  text: string;
  correct: boolean;
}

export interface Question {
  id: string;
  text: string;
  imageUrl?: string;
  options: QuestionOption[];
}

export interface TestSession {
  departmentId: string;
  courseId: string;
  examType: ExamType;
  questions: Question[];
  currentQuestionIndex: number;
  answers: (number | null)[];
}
