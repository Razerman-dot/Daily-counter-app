import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { countersApi } from '../api/endpoints.js';
import { todayIn } from '../lib/date.js';

/**
 * Today's count for one counter, with optimistic updates.
 *
 * How fast taps stay correct:
 *  - Every tap changes the on-screen number immediately and fires its own
 *    request. The server applies them atomically, so nothing is lost.
 *  - While requests are in flight we *don't* overwrite the number with server
 *    responses (they can arrive out of order and cause flicker). When the
 *    last one settles we adopt the server's value, which is authoritative.
 *  - A failed request rolls back exactly its own delta and shows a toast.
 *  - Responses that arrive after the user switched counters are ignored.
 *
 * Day rollover: every 30 s, on window focus, and whenever the tab becomes
 * visible again, we compare "today in the user's timezone" with the date on
 * screen and re-fetch when it changed – so the new day starts at 0 while
 * yesterday's total stays saved on the server.
 */
export function useTodayCount(counterId, timezone) {
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);
  const [count, setCountState] = useState(0);
  const [date, setDate] = useState(null);

  const countRef = useRef(0); // always-current count (taps can outpace renders)
  const dateRef = useRef(null);
  const pending = useRef(0); // requests in flight
  const serverCount = useRef(null); // last value the server reported
  const generation = useRef(0); // bumps when the counter changes

  const setCount = useCallback((value) => {
    countRef.current = value;
    setCountState(value);
  }, []);

  const adoptDay = useCallback(
    (res) => {
      dateRef.current = res.date;
      serverCount.current = res.count;
      setDate(res.date);
      setCount(res.count);
    },
    [setCount]
  );

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!counterId) return;
      const gen = generation.current;
      if (!silent) {
        setStatus('loading');
        setError(null);
      }
      try {
        const res = await countersApi.today(counterId);
        if (gen !== generation.current) return; // counter switched meanwhile
        // Same day with taps in flight: keep the optimistic number.
        if (pending.current > 0 && res.date === dateRef.current) return;
        adoptDay(res);
        setStatus('ready');
      } catch (err) {
        if (gen !== generation.current || silent) return;
        setError(err);
        setStatus('error');
      }
    },
    [counterId, adoptDay]
  );

  // Fresh state whenever the selected counter changes.
  useEffect(() => {
    generation.current += 1;
    pending.current = 0;
    serverCount.current = null;
    dateRef.current = null;
    load();
  }, [load]);

  // Detect the start of a new day in the user's timezone.
  useEffect(() => {
    if (!timezone) return undefined;
    const checkRollover = () => {
      if (dateRef.current && todayIn(timezone) !== dateRef.current) load({ silent: true });
    };
    const onVisible = () => {
      // Back on the tab: resync (also picks up taps from another device).
      if (document.visibilityState === 'visible') load({ silent: true });
    };
    const id = setInterval(checkRollover, 30_000);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', checkRollover);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', checkRollover);
    };
  }, [timezone, load]);

  /** Run one optimistic mutation. `optimistic` returns the rollback value. */
  const mutate = useCallback(
    async (request, applyOptimistic, rollback, errorText) => {
      const gen = generation.current;
      applyOptimistic();
      pending.current += 1;
      try {
        const res = await request();
        if (gen !== generation.current) return true;
        pending.current -= 1;
        if (res.date !== dateRef.current) {
          // The day rolled over between taps; the server counted on the new day.
          adoptDay(res);
          toast('A new day has started – counting from today.', { icon: '🌅', id: 'new-day' });
        } else {
          serverCount.current = res.count;
          if (pending.current === 0) setCount(res.count);
        }
        return true;
      } catch (err) {
        if (gen !== generation.current) return false;
        pending.current -= 1;
        rollback();
        if (pending.current === 0 && serverCount.current !== null) setCount(serverCount.current);
        toast.error(err.message || errorText, { id: 'count-error' });
        return false;
      }
    },
    [adoptDay, setCount]
  );

  const change = useCallback(
    (amount) => {
      if (!counterId || status !== 'ready') return;
      if (amount < 0 && countRef.current <= 0) return; // never below 0
      navigator.vibrate?.(8);
      return mutate(
        () => countersApi.increment(counterId, amount),
        () => setCount(countRef.current + amount),
        () => setCount(Math.max(0, countRef.current - amount)),
        'Couldn’t save that tap'
      );
    },
    [counterId, status, mutate, setCount]
  );

  const reset = useCallback(() => {
    if (!counterId || status !== 'ready') return Promise.resolve(false);
    const previous = countRef.current;
    return mutate(
      () => countersApi.resetToday(counterId),
      () => setCount(0),
      () => setCount(previous),
      'Couldn’t reset today'
    );
  }, [counterId, status, mutate, setCount]);

  const increment = useCallback(() => change(1), [change]);
  const decrement = useCallback(() => change(-1), [change]);

  return { status, error, count, date, increment, decrement, reset, reload: load };
}
