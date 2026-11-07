import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { CountersProvider } from '../context/CountersContext.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { ChartIcon, CounterIcon, ListIcon, LogoutIcon, SettingsIcon } from './Icons.jsx';

const NAV = [
  { to: '/', label: 'Count', icon: CounterIcon, end: true },
  { to: '/history', label: 'History', icon: ChartIcon },
  { to: '/counters', label: 'Counters', icon: ListIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

/**
 * App shell for authenticated pages: top bar (all sizes) + bottom tab bar
 * on phones, inline nav on larger screens.
 */
export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out');
      navigate('/login', { replace: true });
    } catch {
      toast.error('Couldn’t log out, please try again');
    }
  };

  return (
    <CountersProvider>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-slate-50/80 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/80">
          <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
            <NavLink to="/" className="flex items-center gap-2 font-bold tracking-tight">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
                <CounterIcon className="h-5 w-5" />
              </span>
              <span>Daily Counter</span>
            </NavLink>

            <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
              {NAV.map(({ to, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-1">
              <span className="mr-1 hidden max-w-[10rem] truncate text-sm text-slate-500 md:inline">{user?.name}</span>
              <ThemeToggle />
              <button type="button" onClick={handleLogout} className="btn-ghost h-10 w-10 !p-0" aria-label="Log out" title="Log out">
                <LogoutIcon />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-28 pt-4 sm:pb-10">
          <Outlet />
        </main>

        {/* Bottom tab bar – phones only */}
        <nav
          aria-label="Main"
          className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:hidden"
        >
          <ul className="grid grid-cols-4">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-0.5 pt-2 text-[11px] font-medium ${
                      isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400'
                    }`
                  }
                >
                  <Icon className="h-6 w-6" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </CountersProvider>
  );
}
