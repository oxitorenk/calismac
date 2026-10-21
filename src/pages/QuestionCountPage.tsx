import { useEffect, useState } from 'react';
import type { ContentState } from '../app/useContent';
import type { Question } from '../domain/models';

export function QuestionCountPage({ bank, onStart }: { bank: ContentState<Question[]>; onStart: (count: number) => void }) {
  const [showLoading, setShowLoading] = useState(false);
  const [count, setCount] = useState('');
  const ready = bank.status === 'ready';
  const selectedCount = Number(count);
  const valid = ready && /^\d+$/.test(count) && Number.isSafeInteger(selectedCount) && selectedCount >= 1 && selectedCount <= bank.data.length;
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
        <input id="question-count" type="text" inputMode="numeric" pattern="[0-9]*" value={count} placeholder="—" disabled={!ready} aria-invalid={ready && !valid} aria-describedby={ready && !valid ? 'count-error' : undefined} onInput={event => setCount(event.currentTarget.value)} />
        <button disabled={!ready} aria-pressed={ready && selectedCount === bank.data.length} onClick={() => { if (ready) setCount(String(bank.data.length)); }}>Tümü</button>
      </div>
      {bank.status === 'loading' && showLoading && <p role="status">Yükleniyor…</p>}
      {ready && <p>{bank.data.length} soru hazır.</p>}
      {ready && !valid && <p id="count-error">1 ile {bank.data.length} arasında tam sayı gir.</p>}
      <button className="primary" disabled={!valid} onClick={() => { if (valid) onStart(selectedCount); }}>Başla</button>
    </section>
  );
}
