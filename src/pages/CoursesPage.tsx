import type { CatalogEntry } from '../domain/models';

export function CoursesPage({ catalog, departmentId, onSelect }: { catalog: CatalogEntry[]; departmentId: string; onSelect: (courseId: string) => void }) {
  return (
    <ul className="grouped-list">
      {catalog.filter(entry => entry.departmentId === departmentId).map(entry => (
        <li key={entry.courseId}><button className="list-button" onClick={() => onSelect(entry.courseId)}>
          {entry.course}<span aria-hidden="true">›</span>
        </button></li>
      ))}
    </ul>
  );
}
