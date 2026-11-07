import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { useCounters } from '../context/CountersContext.jsx';
import { useTodayCount } from '../hooks/useTodayCount.js';
import CounterSwitcher from '../components/CounterSwitcher.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/States.jsx';
import { CounterIcon, MinusIcon, PlusIcon, ResetIcon } from '../components/Icons.jsx';
import { formatDay } from '../lib/date.js';

/** Main screen: today's count for the selected counter. */
export default function CounterPage() {
  const { user } = useAuth();
  const { counters, status, error, selected, refresh, create } = useCounters();

  if (status === 'loading') return <LoadingState label="Loading your counters…" />;
  if (status === 'error') return <ErrorState error={error} onRetry={refresh} />;
  if (!counters.length || !selected) {
    return (
      <EmptyState
        icon={<CounterIcon className="h-12 w-12" />}
        title="No counters yet"
        description="Create a counter for anything you want to track – push-ups, glasses of water, customers served…"
        action={
          <button
            type="button"
            className="btn-primary"
            onClick={() => create('My counter').catch((e) => toast.error(e.message))}
          >
            <PlusIcon /> Create my first counter
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <CounterSwitcher />
      {/* key resets all per-counter state when switching */}
      <CounterPanel key={selected.id} counter={selected} timezone={user.timezone} />
    </div>
  );
}

function CounterPanel({ counter, timezone }) {
  const { setTodayCount } = useCounters();
  const today = useTodayCount(counter.id, timezone);
  const [confirmReset, setConfirmReset] = useState(false);
  const { status, count, date, increment, decrement, reset } = today;

  // Keep the counters list (and its "today" badges) in sync.
  useEffect(() => {
    if (status === 'ready') setTodayCount(counter.id, count);
  }, [status, count, counter.id, setTodayCount]);

  // Desktop shortcuts: ↑ / + to add, ↓ / − to subtract.
  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target;
      if (el.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      if (document.querySelector('[data-dialog-open]')) return;
      if (e.key === 'ArrowUp' || e.key === '+' || e.key === '=') {
        e.preventDefault();
        increment();
      } else if (e.key === 'ArrowDown' || e.key === '-') {
        e.preventDefault();
        decrement();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [increment, decrement]);

  if (status === 'loading') return <LoadingState label="Loading today’s count…" />;
  if (status === 'error') return <ErrorState error={today.error} onRetry={() => today.reload()} />;

  const handleReset = async () => {
    const ok = await reset();
    setConfirmReset(false);
    if (ok) toast.success('Today’s count was reset');
  };

  return (
    <section className="card flex flex-col items-center px-4 pb-8 pt-6 sm:px-8" aria-labelledby="counter-name">
      <h1 id="counter-name" className="max-w-full truncate text-lg font-semibold text-slate-700 dark:text-slate-200">
        {counter.name}
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">Today · {date ? formatDay(date, 'dddd, D MMMM') : ''}</p>

      {/* The big number. Keyed on count so the pop animation replays per tap. */}
      <output
        key={count}
        aria-live="polite"
        aria-label={`Today's count: ${count}`}
        className="my-6 animate-pop select-none text-8xl font-extrabold tabular-nums tracking-tight sm:my-8 sm:text-9xl"
      >
        {count.toLocaleString()}
      </output>

      <div className="flex w-full max-w-sm items-center justify-center gap-5">
        <button
          type="button"
          onClick={decrement}
          disabled={count <= 0}
          aria-label="Subtract one"
          className="grid h-20 w-20 shrink-0 touch-manipulation place-items-center rounded-full border-2 border-slate-200 bg-white text-slate-700 shadow-sm transition active:scale-95 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <MinusIcon className="h-8 w-8" />
        </button>
        <button
          type="button"
          onClick={increment}
          aria-label="Add one"
          className="grid h-36 w-36 shrink-0 touch-manipulation place-items-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/40"
        >
          <span className="flex items-center text-4xl font-bold">
            <PlusIcon className="h-10 w-10" />1
          </span>
        </button>
      </div>

      <button
        type="button"
        className="btn-ghost mt-8 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
        onClick={() => setConfirmReset(true)}
        disabled={count === 0}
      >
        <ResetIcon className="h-4 w-4" /> Reset today
      </button>

      <p className="mt-4 hidden text-xs text-slate-400 sm:block">
        Tip: press <kbd className="rounded border px-1 dark:border-slate-700">↑</kbd> /{' '}
        <kbd className="rounded border px-1 dark:border-slate-700">↓</kbd> to count from the keyboard
      </p>

      <ConfirmDialog
        open={confirmReset}
        title="Reset today’s count?"
        message={`This sets “${counter.name}” back to 0 for today. Previous days are not affected.`}
        confirmLabel="Reset to 0"
        danger
        onConfirm={handleReset}
        onCancel={() => setConfirmReset(false)}
      />
    </section>
  );
}
