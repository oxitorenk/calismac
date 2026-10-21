import type { ExamType } from '../domain/models';

export function CoursePage({ onSelect }: { onSelect: (examType: ExamType) => void }) {
  return (
    <ul className="grouped-list">
      {(['midterm', 'final'] as const).map(examType => (
        <li key={examType}><button className="list-button" onClick={() => onSelect(examType)}>
          <span>{examType === 'midterm' ? 'Vize' : 'Final'}</span><svg className="disclosure" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
        </button></li>
      ))}
    </ul>
  );
}
