import type { TestSession } from './models.ts';

export function testResults(session: TestSession) {
  if (!session.questions.length || session.answers.length !== session.questions.length || session.answers.some((answer, index) => answer === null || (answer !== 'blank' && !session.questions[index].options[answer]))) {
    throw new Error('Test is incomplete');
  }
  const wrongQuestionIndexes = session.questions.flatMap((question, index) =>
    typeof session.answers[index] === 'number' && !question.options[session.answers[index]].correct ? [index] : [],
  );
  const reviewQuestionIndexes = session.answers.flatMap((answer, index) =>
    answer === 'blank' || (typeof answer === 'number' && !session.questions[index].options[answer].correct) ? [index] : [],
  );
  const total = session.questions.length;
  const wrong = wrongQuestionIndexes.length;
  const blank = session.answers.filter(answer => answer === 'blank').length;
  const correct = total - wrong - blank;
  const net = correct - wrong / 4;
  const score = Math.max(0, net * 100 / total);
  return { total, correct, wrong, blank, net, score, wrongQuestionIndexes, reviewQuestionIndexes };
}
