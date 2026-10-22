import type { TestSession } from '../domain/models';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

export function TestPage({ session, onAnswer, onNext, review = false }: { session: TestSession; onAnswer?: (optionIndex: number) => void; onNext: () => void; review?: boolean }) {
  const question = session.questions[session.currentQuestionIndex];
  const selected = session.answers[session.currentQuestionIndex];
  const correctLabel = 'ABCDE'[question.options.findIndex(option => option.correct)];
  const [imageStatus, setImageStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [imageAttempt, setImageAttempt] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const correctOption = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    if (selected === null || review || !content.current || !correctOption.current) return;
    const viewport = content.current.getBoundingClientRect();
    if (!viewport.height) return;
    const option = correctOption.current.getBoundingClientRect();
    const top = viewport.top + 8;
    const bottom = viewport.bottom - 8;
    const offset = option.height > bottom - top || option.top < top ? option.top - top : Math.max(0, option.bottom - bottom);
    if (offset) content.current.scrollBy({ top: offset, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, [selected, review, question.id, imageStatus]);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [question.id]);
  return (
    <section className="study-session" aria-label={review ? 'Yanlışlar' : 'Test'}>
      <progress className="session-progress" value={session.currentQuestionIndex + 1} max={session.questions.length} aria-label="Test ilerlemesi" />
      <div ref={content} className="question-content" role="region" tabIndex={0} aria-label="Soru ve cevap seçenekleri">
      <p className="progress" id="question-progress"><span className="sr-only">Soru </span>{session.currentQuestionIndex + 1} / {session.questions.length}</p>
      <h2 className="question-text" ref={heading} tabIndex={-1} aria-describedby="question-progress">{question.text}</h2>
      {question.imageUrl && <>
        <img key={imageAttempt} className="question-image" hidden={imageStatus !== 'ready'} src={question.imageUrl} alt="Soruya ait görsel"
          onLoad={() => setImageStatus('ready')} onError={() => setImageStatus('error')} />
        {imageStatus === 'loading' && <LoadingSkeleton variant="image" label="Görsel yükleniyor…" />}
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
          <button ref={option.correct ? correctOption : undefined} className={`option${selected !== null && option.correct ? ' correct' : selected === index ? ' incorrect' : ''}`} key={index} disabled={review || selected !== null || (!!question.imageUrl && imageStatus !== 'ready')} aria-pressed={selected === index} onClick={() => onAnswer?.(index)}>
            <span className="option-letter">{'ABCDE'[index]}</span> <span>{option.text}</span>
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
