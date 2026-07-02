import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  FiActivity,
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiRefreshCw,
  FiShield,
  FiTrendingUp,
  FiUserCheck,
  FiXCircle,
} from 'react-icons/fi';
import Button from '../../../components/common/Button';
import { getVisitStatistics } from '../services/visitationService';

const getErrorMessage = (err, fallback) => err?.response?.data?.message || err?.response?.data?.error || err?.message || fallback;

const todayIso = () => new Date().toISOString().slice(0, 10);
const weekStartIso = () => {
  const date = new Date();
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date.toISOString().slice(0, 10);
};
const monthStartIso = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

const labelize = (value) => String(value || '')
  .replaceAll('_', ' ')
  .replace(/\b\w/g, (char) => char.toUpperCase());

const STATUS_COLORS = {
  completed: '#10b981', approved: '#10b981', checked_out: '#10b981',
  checked_in: '#f59e0b', in_progress: '#f59e0b', pending: '#f59e0b',
  denied: '#ef4444', cancelled: '#ef4444', rejected: '#ef4444',
};
const TYPE_COLORS = { regular: '#10b981', charity: '#3b82f6', legal: '#8b5cf6', official: '#f59e0b' };
const CHART_PALETTE = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const statusTone = {
  completed: { chip: 'bg-green-50 text-green-700 border-green-200', Icon: FiCheckCircle },
  approved: { chip: 'bg-green-50 text-green-700 border-green-200', Icon: FiCheckCircle },
  checked_out: { chip: 'bg-green-50 text-green-700 border-green-200', Icon: FiCheckCircle },
  checked_in: { chip: 'bg-amber-50 text-amber-700 border-amber-200', Icon: FiClock },
  in_progress: { chip: 'bg-amber-50 text-amber-700 border-amber-200', Icon: FiClock },
  pending: { chip: 'bg-amber-50 text-amber-700 border-amber-200', Icon: FiClock },
  denied: { chip: 'bg-red-50 text-red-700 border-red-200', Icon: FiXCircle },
  cancelled: { chip: 'bg-red-50 text-red-700 border-red-200', Icon: FiXCircle },
  rejected: { chip: 'bg-red-50 text-red-700 border-red-200', Icon: FiXCircle },
};

function totalFromMap(map = {}) {
  return Object.values(map).reduce((sum, value) => sum + Number(value || 0), 0);
}

/* ── Preset buttons ── */
const PRESETS = [
  { label: 'Today', from: todayIso, to: todayIso },
  { label: 'This Week', from: weekStartIso, to: todayIso },
  { label: 'This Month', from: monthStartIso, to: todayIso },
];

/* ── Custom Tooltip ── */
function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg ring-1 ring-black/5">
      <p className="mb-1 text-xs font-bold text-gray-500">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {formatter ? formatter(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
}

export default function VisitationStatisticsPage() {
  const [stats, setStats] = useState({ total_today: 0, total_week: 0, by_type: {}, by_status: {}, by_day: [], by_hour: [], avg_duration_minutes: null });
  const [filters, setFilters] = useState({ from: weekStartIso(), to: todayIso() });
  const [loading, setLoading] = useState(false);
  const [activePreset, setActivePreset] = useState('This Week');

  const loadStats = async (overrideFilters) => {
    const f = overrideFilters || filters;
    try {
      setLoading(true);
      setStats(await getVisitStatistics(f));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load visitation statistics'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyPreset = (preset) => {
    const newFilters = { from: preset.from(), to: preset.to() };
    setFilters(newFilters);
    setActivePreset(preset.label);
    loadStats(newFilters);
  };

  const totals = useMemo(() => {
    const byStatus = stats.by_status || {};
    const byType = stats.by_type || {};
    const completed = Number(byStatus.completed || 0) + Number(byStatus.checked_out || 0);
    const active = Number(byStatus.in_progress || 0) + Number(byStatus.checked_in || 0);
    const denied = Number(byStatus.denied || 0) + Number(byStatus.cancelled || 0) + Number(byStatus.rejected || 0);
    const periodTotal = totalFromMap(byStatus) || totalFromMap(byType);
    const completionRate = periodTotal > 0 ? Math.round((completed / periodTotal) * 100) : 0;

    return { completed, active, denied, periodTotal, completionRate };
  }, [stats]);

  /* ── Chart data transforms ── */
  const trendData = useMemo(() => {
    const raw = Array.isArray(stats.by_day) ? stats.by_day : [];
    return raw.map((d) => ({
      ...d,
      label: new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));
  }, [stats.by_day]);

  const typeData = useMemo(() => {
    return Object.entries(stats.by_type || {}).map(([name, value]) => ({
      name: labelize(name),
      value: Number(value),
      fill: TYPE_COLORS[name] || CHART_PALETTE[Object.keys(stats.by_type || {}).indexOf(name) % CHART_PALETTE.length],
    }));
  }, [stats.by_type]);

  const statusData = useMemo(() => {
    return Object.entries(stats.by_status || {})
      .map(([name, value]) => ({ name: labelize(name), value: Number(value), fill: STATUS_COLORS[name] || '#94a3b8' }))
      .sort((a, b) => b.value - a.value);
  }, [stats.by_status]);

  const hourData = useMemo(() => Array.isArray(stats.by_hour) ? stats.by_hour : [], [stats.by_hour]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-transparent p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-emerald-700">
                <FiShield className="h-4 w-4" />
                Visitation command view
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Visitation Statistics</h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-600">
                Monitor visit volume, completion rates, and session outcomes across regular and charity workflows.
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full sm:w-auto">
              {/* Preset buttons */}
              <div className="flex gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      activePreset === p.label
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                        : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Date range inputs */}
              <div className="grid gap-2 sm:grid-cols-[140px_140px_auto]">
                <DateInput label="From" value={filters.from} onChange={(from) => { setFilters((c) => ({ ...c, from })); setActivePreset(null); }} />
                <DateInput label="To" value={filters.to} onChange={(to) => { setFilters((c) => ({ ...c, to })); setActivePreset(null); }} />
                <div className="flex items-end">
                  <Button className="w-full" loading={loading} onClick={() => loadStats()}>
                    <FiRefreshCw /> Refresh
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard title="Visits Today" value={stats.total_today || 0} detail="All sessions opened today" icon={FiCalendar} tone="green" />
          <MetricCard title="Period Total" value={stats.total_week || 0} detail="Selected date range" icon={FiActivity} tone="blue" />
          <MetricCard title="Completion Rate" value={`${totals.completionRate}%`} detail={`${totals.completed} of ${totals.periodTotal}`} icon={FiTrendingUp} tone="slate" />
          <MetricCard title="Active Now" value={totals.active} detail="Checked in / in progress" icon={FiClock} tone="amber" />
          <MetricCard
            title="Avg. Duration"
            value={stats.avg_duration_minutes != null ? `${stats.avg_duration_minutes} min` : '—'}
            detail="Average completed visit"
            icon={FiUserCheck}
            tone="violet"
          />
        </div>

        {/* ── Charts Row 1: Daily Trend + Visit Type Mix ── */}
        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          {/* Area Chart: Daily Trend */}
          <Panel title="Daily Visit Trend" subtitle="Number of visits per day in the selected period" icon={FiTrendingUp}>
            {trendData.length === 0 ? (
              <EmptyChart message="No daily data available for this period." />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="total" name="Visits" stroke="#10b981" strokeWidth={2.5} fill="url(#trendGradient)" dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Panel>

          {/* Donut Chart: Visit Type */}
          <Panel title="Visit Type Mix" subtitle="Regular vs charity distribution" icon={FiBarChart2}>
            {typeData.length === 0 ? (
              <EmptyChart message="No visit types recorded." />
            ) : (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`type-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      formatter={(value) => <span className="text-xs font-semibold text-gray-700">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="-mt-[152px] mb-[80px] text-center pointer-events-none">
                  <p className="text-3xl font-extrabold text-gray-900">{totals.periodTotal}</p>
                  <p className="text-xs font-medium text-gray-400">Total</p>
                </div>
              </div>
            )}
          </Panel>
        </div>

        {/* ── Charts Row 2: Status Breakdown + Peak Hours ── */}
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Bar Chart: Status Breakdown */}
          <Panel title="Status Breakdown" subtitle="Session outcome distribution" icon={FiCheckCircle}>
            {statusData.length === 0 ? (
              <EmptyChart message="No statuses recorded for this period." />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={statusData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="value" name="Sessions" radius={[6, 6, 0, 0]}>
                    {statusData.map((entry, index) => (
                      <Cell key={`status-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>

          {/* Bar Chart: Peak Hours */}
          <Panel title="Peak Visitation Hours" subtitle="Check-in distribution by hour of day" icon={FiClock}>
            {hourData.length === 0 ? (
              <EmptyChart message="No hourly data available for this period." />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={hourData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="total" name="Check-ins" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>
        </div>

        {/* ── Outcome Summary Pills ── */}
        <div className="grid gap-4 sm:grid-cols-3">
          <OutcomePill label="Completed" value={totals.completed} className="border-green-200 bg-green-50 text-green-800" icon={FiCheckCircle} />
          <OutcomePill label="Active" value={totals.active} className="border-amber-200 bg-amber-50 text-amber-800" icon={FiClock} />
          <OutcomePill label="Denied / Cancelled" value={totals.denied} className="border-red-200 bg-red-50 text-red-800" icon={FiXCircle} />
        </div>

      </div>
    </div>
  );
}

/* ── Sub-components ── */

function DateInput({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase text-gray-500">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />
    </label>
  );
}

function MetricCard({ title, value, detail, icon: Icon, tone }) {
  const tones = {
    green: 'border-emerald-200 bg-white text-emerald-600',
    blue: 'border-blue-200 bg-white text-blue-600',
    amber: 'border-amber-200 bg-white text-amber-600',
    slate: 'border-gray-200 bg-white text-gray-700',
    violet: 'border-violet-200 bg-white text-violet-600',
  };
  const iconBg = {
    green: 'bg-emerald-50 text-emerald-500 ring-emerald-100',
    blue: 'bg-blue-50 text-blue-500 ring-blue-100',
    amber: 'bg-amber-50 text-amber-500 ring-amber-100',
    slate: 'bg-gray-50 text-gray-500 ring-gray-100',
    violet: 'bg-violet-50 text-violet-500 ring-violet-100',
  };

  return (
    <div className={`rounded-2xl border p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${tones[tone] || tones.green}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-wide uppercase opacity-70">{title}</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900">{value}</p>
          <p className="mt-1.5 text-xs font-medium text-gray-500">{detail}</p>
        </div>
        <div className={`rounded-xl p-2.5 ring-1 ${iconBg[tone] || iconBg.green}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, icon: Icon, children }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-start gap-4 border-b border-gray-100 bg-gray-50/50 px-6 py-5">
        <div className="rounded-xl bg-white p-2.5 text-emerald-600 shadow-sm ring-1 ring-gray-100">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">{title}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function EmptyChart({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 ring-1 ring-gray-100">
        <FiBarChart2 className="h-6 w-6 text-gray-400" />
      </div>
      <p className="text-sm font-semibold text-gray-500">{message}</p>
    </div>
  );
}

function OutcomePill({ label, value, className, icon: Icon }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold tracking-wide uppercase opacity-80">{label}</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight">{value}</p>
        </div>
        {Icon && <Icon className="h-8 w-8 opacity-30" />}
      </div>
    </div>
  );
}
