import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCounters } from '../context/CountersContext.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/States.jsx';
import { EditIcon, ListIcon, PlusIcon, TrashIcon } from '../components/Icons.jsx';

/** Create, rename and delete counters. */
export default function CountersPage() {
  const { counters, status, error, refresh, create, selected, setSelectedId } = useCounters();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      await create(trimmed);
      setName('');
      toast.success(`“${trimmed}” created`);
      navigate('/');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Counters</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Each counter keeps its own daily history.</p>
      </div>

      <form onSubmit={handleCreate} className="card flex gap-2 p-3">
        <label htmlFor="new-counter" className="sr-only">
          New counter label
        </label>
        <input
          id="new-counter"
          className="input"
          placeholder="e.g. Push-ups, Customers served"
          value={name}
          maxLength={50}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="btn-primary shrink-0" disabled={creating || !name.trim()}>
          <PlusIcon className="h-4 w-4" />
          {creating ? 'Adding…' : 'Add'}
        </button>
      </form>

      {status === 'loading' && <LoadingState />}
      {status === 'error' && <ErrorState error={error} onRetry={refresh} />}
      {status === 'ready' && counters.length === 0 && (
        <EmptyState icon={<ListIcon className="h-12 w-12" />} title="No counters" description="Add your first counter above." />
      )}
      {status === 'ready' && counters.length > 0 && (
        <ul className="card divide-y divide-slate-100 dark:divide-slate-800">
          {counters.map((c) => (
            <CounterRow
              key={c.id}
              counter={c}
              active={c.id === selected?.id}
              onOpen={() => {
                setSelectedId(c.id);
                navigate('/');
              }}
              onDelete={() => setToDelete(c)}
            />
          ))}
        </ul>
      )}

      <DeleteDialog counter={toDelete} onClose={() => setToDelete(null)} />
    </div>
  );
}

function CounterRow({ counter, active, onOpen, onDelete }) {
  const { rename } = useCounters();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(counter.name);
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || trimmed === counter.name) {
      setEditing(false);
      setValue(counter.name);
      return;
    }
    setSaving(true);
    try {
      await rename(counter.id, trimmed);
      toast.success('Renamed');
      setEditing(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <li className="p-3">
        <form onSubmit={save} className="flex gap-2">
          <label htmlFor={`rename-${counter.id}`} className="sr-only">
            Counter label
          </label>
          <input
            id={`rename-${counter.id}`}
            className="input"
            value={value}
            maxLength={50}
            autoFocus
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && (setEditing(false), setValue(counter.name))}
          />
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" className="btn-ghost" onClick={() => (setEditing(false), setValue(counter.name))}>
            Cancel
          </button>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2 p-3">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50">
        <span
          className={`grid h-10 min-w-[2.5rem] place-items-center rounded-xl px-2 text-sm font-bold tabular-nums ${
            active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
          }`}
        >
          {counter.today ?? 0}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium">{counter.name}</span>
          <span className="block text-xs text-slate-500">today{active ? ' · selected' : ''}</span>
        </span>
      </button>
      <button type="button" className="btn-ghost h-10 w-10 !p-0" onClick={() => setEditing(true)} aria-label={`Rename ${counter.name}`}>
        <EditIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="btn-ghost h-10 w-10 !p-0 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
        onClick={onDelete}
        aria-label={`Delete ${counter.name}`}
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </li>
  );
}

function DeleteDialog({ counter, onClose }) {
  const { remove } = useCounters();
  return (
    <ConfirmDialog
      open={!!counter}
      title={`Delete “${counter?.name}”?`}
      message="This permanently deletes the counter and its entire daily history. This can’t be undone."
      confirmLabel="Delete forever"
      danger
      onCancel={onClose}
      onConfirm={async () => {
        try {
          await remove(counter.id);
          toast.success('Counter deleted');
          onClose();
        } catch (err) {
          toast.error(err.message);
        }
      }}
    />
  );
}
