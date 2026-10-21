import type { CatalogEntry } from '../domain/models';

export function DepartmentsPage({ catalog, onSelect }: { catalog: CatalogEntry[]; onSelect: (departmentId: string) => void }) {
  const departments = new Map(catalog.map(entry => [entry.departmentId, entry.department]));
  return (
    <ul className="grouped-list">
      {[...departments].map(([id, name]) => (
        <li key={id}><button className="list-button" onClick={() => onSelect(id)}>
          <span>{name}</span><svg className="disclosure" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
        </button></li>
      ))}
    </ul>
  );
}
