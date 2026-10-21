import { AppShell } from './components/AppShell';
import { useCallback, useState } from 'react';
import type { ContentRepository } from './data/ContentRepository';
import { GoogleSheetsContentRepository } from './data/GoogleSheetsContentRepository';
import { useContent } from './app/useContent';
import { parentRoute } from './app/navigation';
import type { Route } from './app/navigation';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { CoursesPage } from './pages/CoursesPage';

const defaultRepository = new GoogleSheetsContentRepository();

export function App({ repository = defaultRepository }: { repository?: ContentRepository }) {
  const loadCatalog = useCallback(() => repository.getCatalog(), [repository]);
  const { state, retry } = useContent(loadCatalog);
  const [route, setRoute] = useState<Route>({ page: 'departments' });
  const department = state.status === 'ready' && 'departmentId' in route
    ? state.data.find(entry => entry.departmentId === route.departmentId)?.department
    : undefined;
  const course = state.status === 'ready' && 'courseId' in route
    ? state.data.find(entry => entry.courseId === route.courseId)?.course
    : undefined;
  return (
    <AppShell title={course ?? department ?? 'Çalışmaç'} backLabel={route.page === 'courses' ? 'Bölümler' : department} onBack={route.page === 'departments' ? undefined : () => setRoute(parentRoute(route))}>
      {route.page === 'departments' && <h2>Bölümler</h2>}
      {state.status === 'loading' && <p role="status">Bölümler yükleniyor…</p>}
      {state.status === 'error' && <>
        <p role="alert">Bölümler yüklenemedi.</p>
        <button className="primary" onClick={retry}>Tekrar Dene</button>
      </>}
      {state.status === 'ready' && route.page === 'departments' && <DepartmentsPage
        catalog={state.data}
        onSelect={departmentId => setRoute({ page: 'courses', departmentId })}
      />}
      {state.status === 'ready' && route.page === 'courses' && <CoursesPage
        catalog={state.data}
        departmentId={route.departmentId}
        onSelect={courseId => setRoute({ page: 'course', departmentId: route.departmentId, courseId })}
      />}
    </AppShell>
  );
}
