import { useState } from 'react';
import toast from 'react-hot-toast';
import { countersApi } from '../api/endpoints.js';
import { useCounters } from '../context/CountersContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import CounterSwitcher from '../components/CounterSwitcher.jsx';
import HistoryChart from '../components/HistoryChart.jsx';
import CalendarView from '../components/CalendarView.jsx';
import StatCard from '../components/StatCard.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/States.jsx';
import { CalendarIcon, ChartIcon, DownloadIcon, ListIcon } from '../components/Icons.jsx';
import { formatDay } from '../lib/date.js';

export default function HistoryPage() {
  const { counters, status, error, selected, refresh } = useCounters();

  if (status === 'loading') return <LoadingState />;
  if (status === 'error') return <ErrorState error={error} onRetry={refresh} />;
  if (!selected) {
    return <EmptyState icon={<ChartIcon className="h-12 w-12" />} title="Nothing to show yet" description="Create a counter and start counting to see your history." />;
  }

  return (
    <div className="space-y-4">
      {counters.length > 1 && <CounterSwitcher showAdd={false} />}
      <HistoryContent key={selected.id} counter={selected} />
    </div>
  );
}

function HistoryContent({ counter }) {
  const [range, setRange] = useState(7);
  const [view, setView] = useState('list');
  const [exporting, setExporting] = useState(false);

  // Always fetch 30 days; the 7-day view is a slice of it.
  const history = useAsync(() => countersApi.history(counter.id), [counter.id]);
  const stats = useAsync(() => countersApi.stats(counter.id), [counter.id]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await countersApi.exportCsv(counter.id, `${counter.name}.csv`);
      toast.success('CSV downloaded');
    } catch (err) {
      toast.error(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const days = history.data?.days || [];
  const today = history.data?.today;
  const chartDays = days.slice(-range);
  const chartTotal = chartDays.reduce((s, d) => s + d.count, 0);
  const hasAnyData = days.some((d) => d.count > 0) || (stats.data?.allTime ?? 0) > 0;

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">{counter.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">History & stats</p>
        </div>
        <button type="button" className="btn-secondary shrink-0" onClick={handleExport} disabled={exporting}>
          <DownloadIcon className="h-4 w-4" />
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      {/* ---- Stats ---- */}
      {stats.status === 'loading' && <LoadingState label="Crunching numbers…" className="py-8" />}
      {stats.status === 'error' && <ErrorState error={stats.error} onRetry={stats.reload} />}
      {stats.status === 'ready' && <StatsGrid s={stats.data} />}

      {/* ---- Chart ---- */}
      <section className="card p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">Last {range} days</h2>
            <p className="text-xs text-slate-500">{chartTotal.toLocaleString()} total</p>
          </div>
          <div className="segmented" role="group" aria-label="Chart range">
            {[7, 30].map((r) => (
              <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}>
                {r} days
              </button>
            ))}
          </div>
        </div>
        {history.status === 'loading' && <LoadingState className="h-56" label="Loading chart…" />}
        {history.status === 'error' && <ErrorState error={history.error} onRetry={history.reload} />}
        {history.status === 'ready' &&
          (hasAnyData ? (
            <HistoryChart days={chartDays} today={today} />
          ) : (
            <EmptyState title="No counts yet" description="Your daily totals will appear here once you start counting." />
          ))}
      </section>

      {/* ---- List / Calendar ---- */}
      <section className="card p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Past days</h2>
          <div className="segmented" role="group" aria-label="View">
            <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')} aria-label="List view">
              <ListIcon className="h-4 w-4" />
            </button>
            <button type="button" aria-pressed={view === 'calendar'} onClick={() => setView('calendar')} aria-label="Calendar view">
              <CalendarIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {view === 'calendar' && today && <CalendarView counterId={counter.id} today={today} />}
        {view === 'list' && history.status === 'loading' && <LoadingState className="py-8" />}
        {view === 'list' && history.status === 'error' && <ErrorState error={history.error} onRetry={history.reload} />}
        {view === 'list' && history.status === 'ready' && <DayList days={days} today={today} />}
      </section>
    </>
  );
}

function StatsGrid({ s }) {
  const fmt = (n) => Number(n || 0).toLocaleString();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Today" value={fmt(s.today)} accent />
      <StatCard label="This week" value={fmt(s.week)} hint="Since Monday" />
      <StatCard label="This month" value={fmt(s.month)} />
      <StatCard label="All time" value={fmt(s.allTime)} />
      <StatCard label="Daily avg" value={fmt(s.dailyAverage)} hint={s.trackedDays ? `Over ${s.trackedDays} days` : 'No data yet'} />
      <StatCard label="Best day" value={s.bestDay ? fmt(s.bestDay.count) : '—'} hint={s.bestDay ? formatDay(s.bestDay.date, 'D MMM YYYY') : 'No data yet'} />
      <StatCard label="Streak" value={`${s.currentStreak} 🔥`} hint={s.currentStreak === 1 ? '1 day in a row' : `${s.currentStreak} days in a row`} />
      <StatCard label="Longest streak" value={fmt(s.longestStreak)} hint="days" />
    </div>
  );
}

function DayList({ days, today }) {
  const recent = [...days].reverse();
  const max = Math.max(1, ...days.map((d) => d.count));
  if (!days.some((d) => d.count > 0)) {
    return <EmptyState title="No days recorded" description="Nothing counted in the last 30 days." />;
  }
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {recent.map(({ date, count }) => (
        <li key={date} className="flex items-center gap-3 py-2.5">
          <div className="w-28 shrink-0 text-sm">
            <span className={date === today ? 'font-semibold text-brand-600 dark:text-brand-400' : ''}>
              {date === today ? 'Today' : formatDay(date)}
            </span>
          </div>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${(count / max) * 100}%` }} />
          </div>
          <div className="w-12 text-right text-sm font-semibold tabular-nums">{count.toLocaleString()}</div>
        </li>
      ))}
    </ul>
  );
}
