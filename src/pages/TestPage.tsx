import type { TestSession } from '../domain/models';

export function TestPage({ session, onAnswer, onNext }: { session: TestSession; onAnswer: (optionIndex: number) => void; onNext: () => void }) {
  const question = session.questions[session.currentQuestionIndex];
  const selected = session.answers[session.currentQuestionIndex];
  return (
    <section aria-label="Test">
      <p className="progress">{session.currentQuestionIndex + 1} / {session.questions.length}</p>
      <h2 className="question-text">{question.text}</h2>
      {question.imageUrl && <img className="question-image" src={question.imageUrl} alt="Soruya ait görsel" />}
      <div className="options" role="group" aria-label="Cevap seçenekleri">
        {question.options.map((option, index) => (
          <button className={`option${selected !== null && option.correct ? ' correct' : selected === index ? ' incorrect' : ''}`} key={index} disabled={selected !== null} aria-pressed={selected === index} onClick={() => onAnswer(index)}>
            <span>{'ABCDE'[index]})</span> <span>{option.text}</span>
            {selected !== null && option.correct && <span className="feedback">✓ Doğru{selected === index ? ' — Cevabın' : ''}</span>}
            {selected === index && !option.correct && <span className="feedback">✕ Yanlış — Cevabın</span>}
          </button>
        ))}
      </div>
      {selected !== null && <p role="status">{question.options[selected].correct ? 'Doğru cevap!' : 'Yanlış cevap. Doğru cevap işaretlendi.'}</p>}
      {selected !== null && <button className="primary" onClick={onNext}>
        {session.currentQuestionIndex === session.questions.length - 1 ? 'Sonuçları Gör' : 'Sonraki Soru'}
      </button>}
    </section>
  );
}
