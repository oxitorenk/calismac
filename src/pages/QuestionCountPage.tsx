import { useEffect, useState } from 'react';
import type { ContentState } from '../app/useContent';
import type { Question } from '../domain/models';

export function QuestionCountPage({ bank }: { bank: ContentState<Question[]> }) {
  const [showLoading, setShowLoading] = useState(false);
  const [count, setCount] = useState('');
  const ready = bank.status === 'ready';
  useEffect(() => {
    setCount(bank.status === 'ready' ? String(Math.min(20, bank.data.length)) : '');
  }, [bank]);
  useEffect(() => {
    setShowLoading(false);
    if (bank.status !== 'loading') return;
    const timer = setTimeout(() => setShowLoading(true), 400);
    return () => clearTimeout(timer);
  }, [bank]);
  return (
    <section aria-busy={bank.status === 'loading'}>
      <label htmlFor="question-count">Soru Sayısı</label>
      <div className="count-controls">
        <input id="question-count" type="text" inputMode="numeric" value={count} placeholder="—" disabled={!ready} onInput={event => setCount(event.currentTarget.value)} />
        <button disabled={!ready}>Tümü</button>
      </div>
      {bank.status === 'loading' && showLoading && <p role="status">Yükleniyor…</p>}
      {ready && <p>{bank.data.length} soru hazır.</p>}
      <button className="primary" disabled>Başla</button>
    </section>
  );
}
