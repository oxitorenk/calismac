import { useEffect, useRef } from 'react';

export function LoadingSkeleton({ label, variant }: { label: string; variant: 'list' | 'line' | 'image' }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let visible = true;
    const update = () => root.current?.style.setProperty('--skeleton-play-state', visible && !document.hidden ? 'running' : 'paused');
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); });
    if (root.current) observer?.observe(root.current);
    update();
    document.addEventListener('visibilitychange', update);
    return () => { observer?.disconnect(); document.removeEventListener('visibilitychange', update); };
  }, []);
  return (
    <div ref={root} className={`loading-skeleton loading-skeleton--${variant}`} role="status">
      <span className="sr-only">{label}</span>
      <div className="skeleton-placeholder" aria-hidden="true">
        {variant === 'list' && <><span /><span /><span /></>}
      </div>
    </div>
  );
}
