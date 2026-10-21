import type { TestSession } from '../domain/models';

export function TestPage({ session }: { session: TestSession }) {
  const question = session.questions[session.currentQuestionIndex];
  return (
    <section aria-label="Test">
      <p className="progress">{session.currentQuestionIndex + 1} / {session.questions.length}</p>
      <h2 className="question-text">{question.text}</h2>
      <div className="options" role="group" aria-label="Cevap seçenekleri">
        {question.options.map((option, index) => (
          <button className="option" key={index}>
            <span>{'ABCDE'[index]})</span> <span>{option.text}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
