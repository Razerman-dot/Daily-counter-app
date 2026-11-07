import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Run an async function when `deps` change and expose
 * { status: 'loading' | 'ready' | 'error', data, error, reload }.
 * Results from stale runs (deps changed mid-flight) are discarded.
 */
export function useAsync(fn, deps) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const runId = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);

  const reload = useCallback(async () => {
    const id = ++runId.current;
    setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const data = await run();
      if (id === runId.current) setState({ status: 'ready', data, error: null });
    } catch (error) {
      if (id === runId.current) setState({ status: 'error', data: null, error });
    }
  }, [run]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...state, reload };
}
