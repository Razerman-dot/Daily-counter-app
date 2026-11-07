/** Shared loading / empty / error states so every screen handles all three. */
import { AlertIcon } from './Icons.jsx';

export function Spinner({ className = 'h-6 w-6' }) {
  return (
    <svg className={`animate-spin text-brand-600 dark:text-brand-400 ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function LoadingState({ label = 'Loading…', className = 'py-16' }) {
  return (
    <div role="status" className={`flex flex-col items-center justify-center gap-3 text-slate-500 ${className}`}>
      <Spinner className="h-8 w-8" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ title, description, action, icon }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {icon && <div className="text-slate-300 dark:text-slate-600">{icon}</div>}
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'Something went wrong' }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <AlertIcon className="h-10 w-10 text-rose-500" />
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">{error?.message || 'Please try again.'}</p>
      {onRetry && (
        <button type="button" className="btn-secondary" onClick={() => onRetry()}>
          Try again
        </button>
      )}
    </div>
  );
}
