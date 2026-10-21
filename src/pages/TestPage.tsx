import type { TestSession } from '../domain/models';
import { useState } from 'react';

export function TestPage({ session, onAnswer, onNext, review = false }: { session: TestSession; onAnswer?: (optionIndex: number) => void; onNext: () => void; review?: boolean }) {
  const question = session.questions[session.currentQuestionIndex];
  const selected = session.answers[session.currentQuestionIndex];
  const [imageStatus, setImageStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [imageAttempt, setImageAttempt] = useState(0);
  return (
    <section aria-label={review ? 'Yanlışlar' : 'Test'}>
      <p className="progress">{session.currentQuestionIndex + 1} / {session.questions.length}</p>
      <h2 className="question-text">{question.text}</h2>
      {question.imageUrl && <>
        <img key={imageAttempt} className="question-image" src={question.imageUrl} alt="Soruya ait görsel"
          onLoad={() => setImageStatus('ready')} onError={() => setImageStatus('error')} />
        {imageStatus === 'loading' && <p role="status">Görsel yükleniyor…</p>}
        {imageStatus === 'error' && <>
          <p role="alert">Soru görseli yüklenemedi. Bağlantını kontrol edip tekrar dene.</p>
          <button onClick={() => { setImageStatus('loading'); setImageAttempt(imageAttempt + 1); }}>Görseli Tekrar Dene</button>
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
      {selected !== null && <p role="status">{question.options[selected].correct ? 'Doğru cevap!' : 'Yanlış cevap. Doğru cevap işaretlendi.'}</p>}
      {selected !== null && <button className="primary" onClick={onNext}>
        {session.currentQuestionIndex === session.questions.length - 1 ? review ? 'Sonuçlara Dön' : 'Sonuçları Gör' : review ? 'Sonraki' : 'Sonraki Soru'}
      </button>}
    </section>
  );
}
