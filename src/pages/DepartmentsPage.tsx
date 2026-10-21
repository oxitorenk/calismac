import type { CatalogEntry } from '../domain/models';

export function DepartmentsPage({ catalog, onSelect }: { catalog: CatalogEntry[]; onSelect: (departmentId: string) => void }) {
  const departments = new Map(catalog.map(entry => [entry.departmentId, entry.department]));
  return (
    <ul className="grouped-list">
      {[...departments].map(([id, name]) => (
        <li key={id}><button className="list-button" onClick={() => onSelect(id)}>
          {name}<span aria-hidden="true">›</span>
        </button></li>
      ))}
    </ul>
  );
}
