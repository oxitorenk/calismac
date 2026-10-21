import type { TestSession } from './models.ts';

export function testResults(session: TestSession) {
  if (!session.questions.length || session.answers.length !== session.questions.length || session.answers.some((answer, index) => answer === null || !session.questions[index].options[answer])) {
    throw new Error('Test is incomplete');
  }
  const wrongQuestionIndexes = session.questions.flatMap((question, index) =>
    question.options[session.answers[index]!].correct ? [] : [index],
  );
  const total = session.questions.length;
  const wrong = wrongQuestionIndexes.length;
  const correct = total - wrong;
  return { total, correct, wrong, rate: correct / total, wrongQuestionIndexes };
}
