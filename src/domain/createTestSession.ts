import type { ExamType, Question, TestSession } from './models.ts';
import { shuffle } from '../utils/shuffle.ts';

export function createTestSession(bank: Question[], count: number, departmentId: string, courseId: string, examType: ExamType): TestSession {
  if (!Number.isSafeInteger(count) || count < 1 || count > bank.length) throw new Error('Invalid question count');
  const questions = shuffle(bank).slice(0, count).map(question => ({ ...question, options: shuffle(question.options) }));
  return { departmentId, courseId, examType, questions, currentQuestionIndex: 0, answers: questions.map(() => null) };
}
