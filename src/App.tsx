import { AppShell } from './components/AppShell';
import { useCallback } from 'react';
import type { ContentRepository } from './data/ContentRepository';
import { GoogleSheetsContentRepository } from './data/GoogleSheetsContentRepository';
import { useContent } from './app/useContent';

const defaultRepository = new GoogleSheetsContentRepository();

export function App({ repository = defaultRepository }: { repository?: ContentRepository }) {
  const loadCatalog = useCallback(() => repository.getCatalog(), [repository]);
  const { state, retry } = useContent(loadCatalog);
  return (
    <AppShell title="Çalışmaç">
      <h2>Bölümler</h2>
      {state.status === 'loading' && <p role="status">Bölümler yükleniyor…</p>}
      {state.status === 'error' && <>
        <p role="alert">Bölümler yüklenemedi.</p>
        <button className="primary" onClick={retry}>Tekrar Dene</button>
      </>}
      {state.status === 'ready' && <p>Bölümler hazır.</p>}
    </AppShell>
  );
}
