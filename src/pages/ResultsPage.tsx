import type { TestSession } from '../domain/models';
import { testResults } from '../domain/testResults';

export function ResultsPage({ session, onReview, onCourses, onContinue, continueLabel }: { session: TestSession; onReview: () => void; onCourses: () => void; onContinue?: () => void; continueLabel?: string }) {
  const { correct, wrong, net, score } = testResults(session);
  const displayedScore = score.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
  return (
    <section className="test-results" aria-label="Test sonucu">
      <h2>Test tamamlandı</h2>
      <p className="result-summary">{session.questions.length} soruda {correct} doğru · {net.toLocaleString('tr-TR')} net.</p>
      <p className="score" aria-label={`100 üzerinden ${displayedScore} puan`}>{displayedScore} puan</p>
      <p>4 yanlış 1 doğruyu götürür.</p>
      <dl className="result-counts">
        <div><dt>Doğru</dt><dd>{correct}</dd></div>
        <div><dt>Yanlış</dt><dd>{wrong}</dd></div>
      </dl>
      <div className="result-actions">
        {onContinue && <button className="primary" onClick={onContinue}>{continueLabel}</button>}
        {wrong > 0 && <button className={onContinue ? 'secondary' : 'primary'} onClick={onReview}>Yanlışları İncele</button>}
        <button className={wrong > 0 || onContinue ? 'secondary' : 'primary'} onClick={onCourses}>Ders Seçimi</button>
      </div>
    </section>
  );
}
