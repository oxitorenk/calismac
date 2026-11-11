import { useState } from 'react';
import type { TestSession } from '../domain/models';
import { testResults } from '../domain/testResults';
import { TestPage } from './TestPage';

export function WrongAnswersPage({ session, onResults }: { session: TestSession; onResults: () => void }) {
  const [index, setIndex] = useState(0);
  const { reviewQuestionIndexes } = testResults(session);
  const review = {
    ...session,
    currentQuestionIndex: index,
    questions: reviewQuestionIndexes.map(index => session.questions[index]),
    answers: reviewQuestionIndexes.map(index => session.answers[index]),
  };
  if (!review.questions.length) return null;
  return <TestPage key={index} session={review} review onNext={() => {
    if (index === review.questions.length - 1) onResults();
    else setIndex(index + 1);
  }} />;
}
