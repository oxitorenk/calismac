import { useEffect, useState } from 'react';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import type { ContentState } from '../app/useContent';
import type { Question } from '../domain/models';

export function QuestionCountPage({ bank, onStart, onRetry }: { bank: ContentState<Question[]>; onStart: (count: number) => void; onRetry: () => void }) {
  const [showLoading, setShowLoading] = useState(false);
  const [count, setCount] = useState('');
  const [custom, setCustom] = useState(false);
  const ready = bank.status === 'ready';
  const selectedCount = Number(count);
  const valid = ready && /^\d+$/.test(count) && Number.isSafeInteger(selectedCount) && selectedCount >= 1 && selectedCount <= bank.data.length;
  useEffect(() => {
    setCount(bank.status === 'ready' ? String(Math.min(20, bank.data.length)) : '');
    setCustom(false);
  }, [bank]);
  useEffect(() => {
    setShowLoading(false);
    if (bank.status !== 'loading') return;
    const timer = setTimeout(() => setShowLoading(true), 400);
    return () => clearTimeout(timer);
  }, [bank]);
  return (
    <section className="test-setup" aria-busy={bank.status === 'loading'}>
      <h2 id="count-title">Kaç soru çözmek istersin?</h2>
      <div className="count-presets" role="group" aria-labelledby="count-title">
        {[10, 20].map(amount => (
          <button key={amount} disabled={!ready || amount > bank.data.length} aria-pressed={!custom && ready && selectedCount === amount && selectedCount !== bank.data.length} onClick={() => { setCustom(false); setCount(String(amount)); }}>{amount}</button>
        ))}
        <button disabled={!ready} aria-pressed={custom} aria-expanded={custom} aria-controls="custom-count" onClick={() => setCustom(true)}>Özel</button>
        <button disabled={!ready} aria-pressed={!custom && ready && selectedCount === bank.data.length} onClick={() => { if (ready) { setCustom(false); setCount(String(bank.data.length)); } }}>Tümü</button>
      </div>
      <div id="custom-count" className="custom-count" hidden={!custom}>
        <label htmlFor="question-count">Soru Sayısı</label>
        <input id="question-count" type="text" inputMode="numeric" pattern="[0-9]*" value={count} placeholder="—" disabled={!ready} aria-invalid={ready && !valid} aria-describedby={ready && !valid ? 'count-error' : undefined} onInput={event => setCount(event.currentTarget.value)} />
      </div>
      {bank.status === 'loading' && showLoading && <LoadingSkeleton variant="line" label="Sorular yükleniyor…" />}
      {bank.status === 'error' && <>
        <p role="alert">Sorular yüklenemedi.</p>
        <button className="primary" onClick={onRetry}>Tekrar Dene</button>
      </>}
      {ready && !valid && <p id="count-error" role="alert">1 ile {bank.data.length} arasında tam sayı gir.</p>}
      <button className="primary" disabled={!valid} onClick={() => { if (valid) onStart(selectedCount); }}>Başla</button>
    </section>
  );
}
