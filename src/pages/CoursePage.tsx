import type { ExamType } from '../domain/models';

export function CoursePage({ onSelect }: { onSelect: (examType: ExamType) => void }) {
  return (
    <ul className="grouped-list">
      {(['midterm', 'final'] as const).map(examType => (
        <li key={examType}><button className="list-button" onClick={() => onSelect(examType)}>
          {examType === 'midterm' ? 'Vize' : 'Final'}<span aria-hidden="true">›</span>
        </button></li>
      ))}
    </ul>
  );
}
