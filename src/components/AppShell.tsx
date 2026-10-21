import { useEffect, useRef, type ReactNode } from 'react';

interface AppShellProps {
  title: string;
  backLabel?: string;
  onBack?: () => void;
  children: ReactNode;
  compact?: boolean;
  contextLabel?: string;
  page: string;
}

export function AppShell({ title, backLabel, onBack, children, compact = false, contextLabel, page }: AppShellProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!compact) heading.current?.focus();
  }, [page, compact]);
  return (
    <main className={compact ? 'study-shell' : 'selection-shell'}>
      <header>
        {onBack && <button className="back" onClick={onBack} aria-label={compact ? `Geri: ${backLabel ?? title}` : undefined}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
          <span className={compact ? 'sr-only' : undefined}>{backLabel ?? 'Geri'}</span>
        </button>}
        <div>
          <h1 ref={heading} tabIndex={-1} aria-describedby={contextLabel ? 'page-context' : undefined}>{title}</h1>
          {contextLabel && <p className="study-context" id="page-context">{contextLabel}</p>}
        </div>
      </header>
      {children}
    </main>
  );
}
