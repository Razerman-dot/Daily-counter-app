export default function StatCard({ label, value, hint, accent = false }) {
  return (
    <div className={`card p-4 ${accent ? 'border-brand-200 bg-brand-50 dark:border-brand-500/30 dark:bg-brand-500/10' : ''}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{hint}</div>}
    </div>
  );
}
