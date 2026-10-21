import { useEffect, useState } from 'react';

export type ContentState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error' };

export function useContent<T>(load: () => Promise<T>) {
  const [state, setState] = useState<ContentState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    load().then(
      data => { if (active) setState({ status: 'ready', data }); },
      () => { if (active) setState({ status: 'error' }); },
    );
    return () => { active = false; };
  }, [load, attempt]);
  return { state, retry: () => setAttempt(value => value + 1) };
}
