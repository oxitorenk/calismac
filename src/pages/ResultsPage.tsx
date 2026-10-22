import type { TestSession } from '../domain/models';
import { testResults } from '../domain/testResults';

export function ResultsPage({ session, onReview, onCourses }: { session: TestSession; onReview: () => void; onCourses: () => void }) {
  const { correct, wrong, rate } = testResults(session);
  return (
    <section className="test-results" aria-label="Test sonucu">
      <h2>Test tamamlandı</h2>
      <p className="result-summary">{session.questions.length} soruda {correct} doğru.</p>
      <p className="score" aria-label={`Başarı oranı yüzde ${Math.round(rate * 100)}`}>%{Math.round(rate * 100)}</p>
      <dl className="result-counts">
        <div><dt>Doğru</dt><dd>{correct}</dd></div>
        <div><dt>Yanlış</dt><dd>{wrong}</dd></div>
      </dl>
      <div className="result-actions">
        {wrong > 0 && <button className="primary" onClick={onReview}>Yanlışları İncele</button>}
        <button className={wrong > 0 ? 'secondary' : 'primary'} onClick={onCourses}>Ders Seçimi</button>
      </div>
    </section>
  );
}
