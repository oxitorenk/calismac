import type { ReactNode } from 'react';

interface AppShellProps {
  title: string;
  backLabel?: string;
  onBack?: () => void;
  children: ReactNode;
  compact?: boolean;
  contextLabel?: string;
}

export function AppShell({ title, backLabel, onBack, children, compact = false, contextLabel }: AppShellProps) {
  return (
    <main className={compact ? 'study-shell' : undefined}>
      <header>
        {onBack && <button className="back" onClick={onBack} aria-label={compact ? `Geri: ${backLabel ?? title}` : undefined}>
          {compact && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>}
          <span className={compact ? 'sr-only' : undefined}>{compact ? backLabel ?? 'Geri' : `‹ ${backLabel ?? 'Geri'}`}</span>
        </button>}
        <div>
          <h1>{title}</h1>
          {contextLabel && <p className="study-context">{contextLabel}</p>}
        </div>
      </header>
      {children}
    </main>
  );
}
