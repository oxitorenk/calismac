import type { TestSession } from '../domain/models';

export function TestPage({ session, onAnswer }: { session: TestSession; onAnswer: (optionIndex: number) => void }) {
  const question = session.questions[session.currentQuestionIndex];
  const selected = session.answers[session.currentQuestionIndex];
  return (
    <section aria-label="Test">
      <p className="progress">{session.currentQuestionIndex + 1} / {session.questions.length}</p>
      <h2 className="question-text">{question.text}</h2>
      {question.imageUrl && <img className="question-image" src={question.imageUrl} alt="Soruya ait görsel" />}
      <div className="options" role="group" aria-label="Cevap seçenekleri">
        {question.options.map((option, index) => (
          <button className="option" key={index} disabled={selected !== null} aria-pressed={selected === index} onClick={() => onAnswer(index)}>
            <span>{'ABCDE'[index]})</span> <span>{option.text}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
