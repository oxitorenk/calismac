import { useEffect, useState } from 'react';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import type { ContentState } from '../app/useContent';
import type { Question } from '../domain/models';

export interface CountSelection { count: string; custom: boolean; all: boolean }

export function QuestionCountPage({ bank, onStart, onRetry, courses, selection, onSelectionChange }: { bank: ContentState<Question[]>; onStart: (count: number, all: boolean) => void; onRetry: () => void; courses?: { name: string; available: number }[]; selection?: CountSelection | null; onSelectionChange?: (selection: CountSelection) => void }) {
  const [showLoading, setShowLoading] = useState(false);
  const [localSelection, setLocalSelection] = useState<CountSelection>({ count: '', custom: false, all: false });
  const choice = selection ?? localSelection;
  const change = onSelectionChange ?? setLocalSelection;
  const { custom } = choice;
  const count = choice.all && bank.status === 'ready' ? String(bank.data.length) : choice.count;
  const ready = bank.status === 'ready';
  const selectedCount = Number(count);
  const valid = ready && /^\d+$/.test(count) && Number.isSafeInteger(selectedCount) && selectedCount >= 1 && (!!courses || selectedCount <= bank.data.length);
  const all = choice.all;
  const counts = valid && courses ? courses.map(course => ({ ...course, count: all ? course.available : Math.min(selectedCount, course.available) })) : [];
  const total = counts.reduce((sum, course) => sum + course.count, 0);
  useEffect(() => {
    if (selection !== undefined && (selection !== null || bank.status !== 'ready')) return;
    change({ count: bank.status === 'ready' ? String(Math.min(20, bank.data.length)) : '', custom: false, all: bank.status === 'ready' && bank.data.length <= 20 });
  }, [bank, selection, onSelectionChange]);
  useEffect(() => {
    setShowLoading(false);
    if (bank.status !== 'loading') return;
    const timer = setTimeout(() => setShowLoading(true), 400);
    return () => clearTimeout(timer);
  }, [bank]);
  return (
    <section className="test-setup" aria-busy={bank.status === 'loading'}>
      <h2 id="count-title">{courses ? 'Her dersten kaç soru?' : 'Kaç soru çözmek istersin?'}</h2>
      {courses && <p className="count-help">Daha az sorusu olan derslerde mevcut soruların tamamı kullanılır.</p>}
      <div className="count-presets" role="group" aria-labelledby="count-title">
        {[10, 20].map(amount => (
          <button key={amount} disabled={!ready || (!courses && amount > bank.data.length)} aria-pressed={!custom && ready && !all && selectedCount === amount} onClick={() => { change({ count: String(amount), custom: false, all: false }); }}>{amount}</button>
        ))}
        <button disabled={!ready} aria-pressed={custom} aria-expanded={custom} aria-controls="custom-count" onClick={() => change({ count, custom: true, all: false })}>Özel</button>
        <button disabled={!ready} aria-pressed={!custom && ready && all} onClick={() => { if (ready) { change({ count: String(bank.data.length), custom: false, all: true }); } }}>Tümü</button>
      </div>
      <div id="custom-count" className="custom-count" hidden={!custom}>
        <label htmlFor="question-count">Soru Sayısı</label>
        <input id="question-count" type="text" inputMode="numeric" pattern="[0-9]*" value={count} placeholder="—" disabled={!ready} aria-invalid={ready && !valid} aria-describedby={ready && !valid ? 'count-error' : undefined} onInput={event => change({ count: event.currentTarget.value, custom: true, all: false })} />
      </div>
      {bank.status === 'loading' && showLoading && <LoadingSkeleton variant="line" label="Sorular yükleniyor…" />}
      {bank.status === 'error' && <>
        <p role="alert">Sorular yüklenemedi.</p>
        <button className="primary" onClick={onRetry}>Tekrar Dene</button>
      </>}
      {ready && !valid && <p id="count-error" role="alert">{courses ? '1 veya daha büyük bir tam sayı gir.' : `1 ile ${bank.data.length} arasında tam sayı gir.`}</p>}
      {courses && valid && <>
        <dl className="workload-preview" aria-label="Ders başına soru sayısı">{counts.map((course, index) => <div key={index}><dt>{course.name}</dt><dd>{course.count} soru</dd></div>)}</dl>
        <p className="workload-total" role="status">Toplam {total} soru · {courses.length} ders</p>
      </>}
      <button className="primary" disabled={!valid} onClick={() => { if (valid) onStart(selectedCount, all); }}>Başla</button>
    </section>
  );
}
