import type { CatalogEntry } from '../domain/models';

export function CoursesPage({ catalog, departmentId, onSelect }: { catalog: CatalogEntry[]; departmentId: string; onSelect: (courseId: string) => void }) {
  return (
    <ul className="grouped-list">
      {catalog.filter(entry => entry.departmentId === departmentId).map(entry => (
        <li key={entry.courseId}><button className="list-button" onClick={() => onSelect(entry.courseId)}>
          <span>{entry.course}</span><svg className="disclosure" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
        </button></li>
      ))}
    </ul>
  );
}
