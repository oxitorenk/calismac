import type { ReactNode } from 'react';

interface AppShellProps {
  title: string;
  backLabel?: string;
  onBack?: () => void;
  children: ReactNode;
}

export function AppShell({ title, backLabel, onBack, children }: AppShellProps) {
  return (
    <main>
      <header>
        {onBack && <button className="back" onClick={onBack}>‹ {backLabel ?? 'Geri'}</button>}
        <h1>{title}</h1>
      </header>
      {children}
    </main>
  );
}
