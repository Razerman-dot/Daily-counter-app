import { Link } from 'react-router-dom';
import { useCounters } from '../context/CountersContext.jsx';
import { PlusIcon } from './Icons.jsx';

/** Horizontally scrollable chips to pick the active counter. */
export default function CounterSwitcher({ showAdd = true }) {
  const { counters, selected, setSelectedId } = useCounters();
  if (counters.length <= 1 && !showAdd) return null;

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="tablist" aria-label="Counters">
      <div className="flex w-max gap-2">
        {counters.map((c) => {
          const active = c.id === selected?.id;
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelectedId(c.id)}
              className={`max-w-[12rem] truncate rounded-full border px-4 py-2 text-sm font-medium transition ${
                active
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              {c.name}
            </button>
          );
        })}
        {showAdd && (
          <Link
            to="/counters"
            className="flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 hover:border-brand-500 hover:text-brand-600 dark:border-slate-700"
            aria-label="Manage counters"
          >
            <PlusIcon className="h-4 w-4" /> New
          </Link>
        )}
      </div>
    </div>
  );
}
