import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useCounters } from '../context/CountersContext.jsx';
import { allTimeZones, deviceTimeZone, dayjs } from '../lib/date.js';

/** Profile (name), timezone (defines when your day starts) and theme. */
export default function SettingsPage() {
  const { user, updateProfile, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { refresh } = useCounters();
  const [name, setName] = useState(user.name);
  const [timezone, setTimezone] = useState(user.timezone);
  const [saving, setSaving] = useState(false);

  const zones = useMemo(() => {
    const list = allTimeZones();
    return list.includes(user.timezone) ? list : [user.timezone, ...list];
  }, [user.timezone]);
  const device = deviceTimeZone();
  const dirty = name.trim() !== user.name || timezone !== user.timezone;

  const localTime = (() => {
    try {
      return dayjs().tz(timezone).format('ddd D MMM, HH:mm');
    } catch {
      return '';
    }
  })();

  const save = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      const changes = {};
      if (name.trim() !== user.name) changes.name = name.trim();
      if (timezone !== user.timezone) changes.timezone = timezone;
      await updateProfile(changes);
      if (changes.timezone) await refresh(); // "today" may now be a different day
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Settings</h1>

      <form onSubmit={save} className="card space-y-5 p-5">
        <div>
          <label className="label" htmlFor="name">
            Name
          </label>
          <input id="name" className="input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" className="input opacity-70" value={user.email} disabled />
        </div>

        <div>
          <label className="label" htmlFor="tz">
            Timezone
          </label>
          <select id="tz" className="input" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Your day starts at midnight in this timezone. Local time there: {localTime}.
            {device !== timezone && (
              <>
                {' '}
                <button type="button" className="font-medium text-brand-600 underline dark:text-brand-400" onClick={() => setTimezone(device)}>
                  Use this device’s timezone ({device})
                </button>
              </>
            )}
          </p>
        </div>

        <button type="submit" className="btn-primary w-full sm:w-auto" disabled={!dirty || saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <div className="card flex items-center justify-between p-5">
        <div>
          <div className="font-medium">Dark mode</div>
          <div className="text-sm text-slate-500">Saved on this device</div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={theme === 'dark'}
          onClick={toggle}
          className={`relative h-7 w-12 rounded-full transition ${theme === 'dark' ? 'bg-brand-600' : 'bg-slate-300'}`}
        >
          <span className="sr-only">Toggle dark mode</span>
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${theme === 'dark' ? 'left-6' : 'left-1'}`} />
        </button>
      </div>

      <button type="button" className="btn-secondary w-full" onClick={() => logout().then(() => toast.success('Logged out'))}>
        Log out
      </button>
    </div>
  );
}
