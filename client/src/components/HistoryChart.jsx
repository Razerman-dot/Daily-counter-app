import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDay } from '../lib/date.js';

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { date, count } = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-800">
      <div className="font-medium">{formatDay(date, 'dddd, D MMM')}</div>
      <div className="text-slate-500 dark:text-slate-400">
        <span className="font-semibold text-slate-900 dark:text-white">{count.toLocaleString()}</span> counted
      </div>
    </div>
  );
}

/** Bar chart of daily totals. `days` is [{ date, count }] oldest → newest. */
export default function HistoryChart({ days, today }) {
  const dense = days.length > 10;
  return (
    <div className="h-56 w-full text-slate-400 dark:text-slate-500 sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={days} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.2} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'currentColor', fontSize: 11 }}
            tickFormatter={(d) => (dense ? formatDay(d, 'D') : formatDay(d, 'ddd'))}
            interval={dense ? 'preserveStartEnd' : 0}
            minTickGap={4}
          />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'currentColor', fontSize: 11 }} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'currentColor', fillOpacity: 0.08 }} />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={36}>
            {days.map((d) => (
              <Cell key={d.date} fill={d.date === today ? '#4f46e5' : '#818cf8'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
