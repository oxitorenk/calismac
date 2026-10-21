import type { TestSession } from '../domain/models';
import { testResults } from '../domain/testResults';

export function ResultsPage({ session, onReview, onHome }: { session: TestSession; onReview: () => void; onHome: () => void }) {
  const { correct, wrong, rate } = testResults(session);
  return (
    <section aria-label="Test sonucu">
      <p className="score">%{Math.round(rate * 100)}</p>
      <p>{correct} Doğru</p>
      <p>{wrong} Yanlış</p>
      {wrong > 0 && <button className="primary" onClick={onReview}>Yanlışları İncele</button>}
      <button className="back" onClick={onHome}>Ana Sayfa</button>
    </section>
  );
}
