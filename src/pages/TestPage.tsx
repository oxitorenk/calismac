import type { TestSession } from '../domain/models';
import { useEffect, useRef, useState } from 'react';

export function TestPage({ session, onAnswer, onNext, review = false }: { session: TestSession; onAnswer?: (optionIndex: number) => void; onNext: () => void; review?: boolean }) {
  const question = session.questions[session.currentQuestionIndex];
  const selected = session.answers[session.currentQuestionIndex];
  const correctLabel = 'ABCDE'[question.options.findIndex(option => option.correct)];
  const [imageStatus, setImageStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [imageAttempt, setImageAttempt] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [question.id]);
  return (
    <section className="study-session" aria-label={review ? 'Yanlışlar' : 'Test'}>
      <div className="question-content" role="region" tabIndex={0} aria-label="Soru ve cevap seçenekleri">
      <p className="progress" id="question-progress"><span className="sr-only">Soru </span>{session.currentQuestionIndex + 1} / {session.questions.length}</p>
      <h2 className="question-text" ref={heading} tabIndex={-1} aria-describedby="question-progress">{question.text}</h2>
      {question.imageUrl && <>
        <img key={imageAttempt} className="question-image" src={question.imageUrl} alt="Soruya ait görsel"
          onLoad={() => setImageStatus('ready')} onError={() => setImageStatus('error')} />
        {imageStatus === 'loading' && <p role="status">Görsel yükleniyor…</p>}
        {imageStatus === 'error' && <>
          <p role="alert">Soru görseli yüklenemedi. Bağlantını kontrol edip tekrar dene.</p>
          <button className="secondary" onClick={() => {
            heading.current?.focus({ preventScroll: true });
            setImageStatus('loading');
            setImageAttempt(imageAttempt + 1);
          }}>Görseli Tekrar Dene</button>
        </>}
      </>}
      <div className="options" role="group" aria-label="Cevap seçenekleri">
        {question.options.map((option, index) => (
          <button className={`option${selected !== null && option.correct ? ' correct' : selected === index ? ' incorrect' : ''}`} key={index} disabled={review || selected !== null || (!!question.imageUrl && imageStatus !== 'ready')} aria-pressed={selected === index} onClick={() => onAnswer?.(index)}>
            <span>{'ABCDE'[index]})</span> <span>{option.text}</span>
            {selected !== null && option.correct && <span className="feedback">✓ Doğru{selected === index ? ' — Cevabın' : ''}</span>}
            {selected === index && !option.correct && <span className="feedback">✕ Yanlış — Cevabın</span>}
          </button>
        ))}
      </div>
      </div>
      {selected !== null && <div className="study-actions">
      <p role="status">{question.options[selected].correct ? 'Doğru cevap!' : `Yanlış cevap. Doğru cevap: ${correctLabel} seçeneği.`}</p>
      <button className="primary" onClick={onNext}>
        {session.currentQuestionIndex === session.questions.length - 1 ? review ? 'Sonuçlara Dön' : 'Sonuçları Gör' : review ? 'Sonraki' : 'Sonraki Soru'}
      </button>
      </div>}
    </section>
  );
}
