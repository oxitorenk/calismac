import { useState } from 'react';
import type { CatalogEntry } from '../domain/models';

export function CoursesPage({ catalog, departmentId, onSelect, onStudy }: { catalog: CatalogEntry[]; departmentId: string; onSelect: (courseId: string) => void; onStudy: (courseIds: string[]) => void }) {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <>
    <ul className="grouped-list">
      {catalog.filter(entry => entry.departmentId === departmentId).map(entry => (
        <li key={entry.courseId}><button className="list-button" aria-pressed={selecting ? selected.includes(entry.courseId) : undefined} onClick={() => selecting ? setSelected(current => current.includes(entry.courseId) ? current.filter(id => id !== entry.courseId) : [...current, entry.courseId]) : onSelect(entry.courseId)}>
          <span>{entry.course}</span>{selecting ? <span className="selection-order">{selected.includes(entry.courseId) ? selected.indexOf(entry.courseId) + 1 : ''}</span> : <svg className="disclosure" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>}
        </button></li>
      ))}
    </ul>
    <div className="result-actions">
      {selecting ? <>
        <p>Dersleri çözmek istediğin sırayla seç.</p>
        <button className="primary" disabled={!selected.length} onClick={() => onStudy(selected)}>{selected.length} dersle devam et →</button>
        <button className="secondary" onClick={() => { setSelecting(false); setSelected([]); }}>Vazgeç</button>
      </> : <button className="secondary" onClick={() => setSelecting(true)}>Çalışma oluştur</button>}
    </div>
    </>
  );
}
