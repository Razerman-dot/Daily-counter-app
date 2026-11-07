import { useEffect, useState } from 'react';
import { countersApi } from '../api/endpoints.js';
import { dayjs, DAY_FORMAT } from '../lib/date.js';
import { ChevronLeft, ChevronRight } from './Icons.jsx';
import { ErrorState, Spinner } from './States.jsx';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Shade a cell by how its count compares to the month's best day. */
function intensity(count, max) {
  if (!count) return 'bg-slate-100 text-slate-400 dark:bg-slate-800/60 dark:text-slate-500';
  const r = count / max;
  if (r > 0.75) return 'bg-brand-600 text-white';
  if (r > 0.5) return 'bg-brand-500 text-white';
  if (r > 0.25) return 'bg-brand-400 text-white';
  return 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400';
}

/** Month calendar with each day's total. */
export default function CalendarView({ counterId, today }) {
  const [month, setMonth] = useState(() => today.slice(0, 7)); // "YYYY-MM"
  const [state, setState] = useState({ status: 'loading', days: [], error: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const start = dayjs.utc(`${month}-01`);
    const from = start.format(DAY_FORMAT);
    const to = start.endOf('month').format(DAY_FORMAT);
    setState((s) => ({ ...s, status: 'loading' }));
    countersApi
      .history(counterId, { from, to })
      .then((res) => !cancelled && setState({ status: 'ready', days: res.days, error: null }))
      .catch((error) => !cancelled && setState({ status: 'error', days: [], error }));
    return () => {
      cancelled = true;
    };
  }, [counterId, month, reloadKey]);

  const start = dayjs.utc(`${month}-01`);
  const leadingBlanks = (start.day() + 6) % 7; // Monday-first grid
  const max = Math.max(1, ...state.days.map((d) => d.count));
  const monthTotal = state.days.reduce((s, d) => s + d.count, 0);
  const isCurrentMonth = month === today.slice(0, 7);

  const shift = (n) => setMonth(start.add(n, 'month').format('YYYY-MM'));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" className="btn-ghost h-9 w-9 !p-0" onClick={() => shift(-1)} aria-label="Previous month">
          <ChevronLeft />
        </button>
        <div className="text-center">
          <div className="font-semibold">{start.format('MMMM YYYY')}</div>
          <div className="text-xs text-slate-500">{monthTotal.toLocaleString()} total</div>
        </div>
        <button
          type="button"
          className="btn-ghost h-9 w-9 !p-0"
          onClick={() => shift(1)}
          disabled={isCurrentMonth}
          aria-label="Next month"
        >
          <ChevronRight />
        </button>
      </div>

      {state.status === 'error' ? (
        <ErrorState error={state.error} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : (
        <div className="relative">
          {state.status === 'loading' && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-white/50 dark:bg-slate-900/50">
              <Spinner />
            </div>
          )}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-500">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: leadingBlanks }, (_, i) => (
              <div key={`b${i}`} />
            ))}
            {state.days.map(({ date, count }) => {
              const future = date > today;
              return (
                <div
                  key={date}
                  title={`${date}: ${count}`}
                  className={`flex aspect-square flex-col items-center justify-center rounded-lg text-xs ${
                    future ? 'opacity-30 ' : ''
                  }${intensity(count, max)} ${date === today ? 'ring-2 ring-brand-500 ring-offset-1 dark:ring-offset-slate-900' : ''}`}
                >
                  <span className="text-[10px] opacity-80">{Number(date.slice(8))}</span>
                  <span className="font-semibold leading-none">{future ? '' : count || ''}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
