import type { TestSession } from './models.ts';

export function answerQuestion(session: TestSession, optionIndex: number): TestSession {
  const index = session.currentQuestionIndex;
  if (session.answers[index] !== null) return session;
  if (!Number.isInteger(optionIndex) || !session.questions[index].options[optionIndex]) throw new Error('Invalid answer option');
  const answers = [...session.answers];
  answers[index] = optionIndex;
  return { ...session, answers };
}
