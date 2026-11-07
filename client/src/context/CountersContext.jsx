import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { countersApi } from '../api/endpoints.js';

const CountersContext = createContext(null);
const SELECTED_KEY = 'dc-selected-counter';

const readSelected = () => {
  try {
    return localStorage.getItem(SELECTED_KEY);
  } catch {
    return null;
  }
};

/**
 * The user's list of counters + which one is currently selected.
 * Mounted only inside the authenticated layout.
 */
export function CountersProvider({ children }) {
  const [counters, setCounters] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);
  const [selectedId, setSelectedIdState] = useState(readSelected);

  const refresh = useCallback(async () => {
    try {
      const { counters: list } = await countersApi.list();
      setCounters(list);
      setStatus('ready');
      setError(null);
    } catch (err) {
      setError(err);
      setStatus((s) => (s === 'ready' ? 'ready' : 'error'));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setSelectedId = useCallback((id) => {
    setSelectedIdState(id);
    try {
      localStorage.setItem(SELECTED_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  // Fall back to the first counter when the saved one no longer exists.
  const selected = counters.find((c) => c.id === selectedId) || counters[0] || null;

  const create = useCallback(
    async (name) => {
      const counter = await countersApi.create(name);
      setCounters((list) => [...list, counter]);
      setSelectedId(counter.id);
      return counter;
    },
    [setSelectedId]
  );

  const rename = useCallback(async (id, name) => {
    const updated = await countersApi.rename(id, name);
    setCounters((list) => list.map((c) => (c.id === id ? { ...c, name: updated.name } : c)));
  }, []);

  const remove = useCallback(async (id) => {
    await countersApi.remove(id);
    setCounters((list) => list.filter((c) => c.id !== id));
  }, []);

  /** Keep the cached "today" number in the list in sync with the counter screen. */
  const setTodayCount = useCallback((id, today) => {
    setCounters((list) => list.map((c) => (c.id === id && c.today !== today ? { ...c, today } : c)));
  }, []);

  const value = useMemo(
    () => ({ counters, status, error, selected, setSelectedId, refresh, create, rename, remove, setTodayCount }),
    [counters, status, error, selected, setSelectedId, refresh, create, rename, remove, setTodayCount]
  );
  return <CountersContext.Provider value={value}>{children}</CountersContext.Provider>;
}

export function useCounters() {
  const ctx = useContext(CountersContext);
  if (!ctx) throw new Error('useCounters must be used inside <CountersProvider>');
  return ctx;
}
