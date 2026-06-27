import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
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

const labelize = (value) => String(value || '')
  .replaceAll('_', ' ')
  .replace(/\b\w/g, (char) => char.toUpperCase());

const statusTone = {
  completed: { bar: 'bg-green-500', chip: 'bg-green-50 text-green-700 border-green-200', Icon: FiCheckCircle },
  approved: { bar: 'bg-green-500', chip: 'bg-green-50 text-green-700 border-green-200', Icon: FiCheckCircle },
  checked_in: { bar: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 border-amber-200', Icon: FiClock },
  in_progress: { bar: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 border-amber-200', Icon: FiClock },
  pending: { bar: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 border-amber-200', Icon: FiClock },
  denied: { bar: 'bg-red-500', chip: 'bg-red-50 text-red-700 border-red-200', Icon: FiXCircle },
  cancelled: { bar: 'bg-red-500', chip: 'bg-red-50 text-red-700 border-red-200', Icon: FiXCircle },
  rejected: { bar: 'bg-red-500', chip: 'bg-red-50 text-red-700 border-red-200', Icon: FiXCircle },
};

function totalFromMap(map = {}) {
  return Object.values(map).reduce((sum, value) => sum + Number(value || 0), 0);
}

export default function VisitationStatisticsPage() {
  const [stats, setStats] = useState({ total_today: 0, total_week: 0, by_type: {}, by_status: {} });
  const [filters, setFilters] = useState({ from: weekStartIso(), to: todayIso() });
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    try {
      setLoading(true);
      setStats(await getVisitStatistics(filters));
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

  const totals = useMemo(() => {
    const byStatus = stats.by_status || {};
    const byType = stats.by_type || {};
    const completed = Number(byStatus.completed || 0);
    const active = Number(byStatus.in_progress || 0) + Number(byStatus.checked_in || 0);
    const denied = Number(byStatus.denied || 0) + Number(byStatus.cancelled || 0) + Number(byStatus.rejected || 0);
    const periodTotal = totalFromMap(byStatus) || totalFromMap(byType);
    const completionRate = periodTotal > 0 ? Math.round((completed / periodTotal) * 100) : 0;

    return { completed, active, denied, periodTotal, completionRate };
  }, [stats]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold uppercase text-malawiGreen">
                <FiShield className="h-4 w-4" />
                Visitation command view
              </div>
              <h1 className="text-3xl font-bold text-slate-950">Visitation Statistics</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Monitor visit volume, completion rates, and session outcomes across regular and charity workflows.
              </p>
            </div>

            <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-[150px_150px_auto]">
              <DateInput label="From" value={filters.from} onChange={(from) => setFilters((current) => ({ ...current, from }))} />
              <DateInput label="To" value={filters.to} onChange={(to) => setFilters((current) => ({ ...current, to }))} />
              <div className="flex items-end">
                <Button className="w-full" loading={loading} onClick={loadStats}>
                  <FiRefreshCw /> Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Visits Today"
            value={stats.total_today || 0}
            detail="All sessions opened today"
            icon={FiCalendar}
            tone="green"
          />
          <MetricCard
            title="This Week"
            value={stats.total_week || 0}
            detail="Rolling operational week"
            icon={FiActivity}
            tone="blue"
          />
          <MetricCard
            title="Completion Rate"
            value={`${totals.completionRate}%`}
            detail={`${totals.completed} completed of ${totals.periodTotal}`}
            icon={FiTrendingUp}
            tone="slate"
          />
          <MetricCard
            title="Active Now"
            value={totals.active}
            detail="Checked in or in progress"
            icon={FiClock}
            tone="amber"
          />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Panel
            title="Visit Type Mix"
            subtitle="Regular and charity visit volume for the selected period"
            icon={FiBarChart2}
          >
            <BreakdownBars
              data={stats.by_type || {}}
              emptyText="No visit types recorded for this period."
              toneFor={(label) => (label === 'charity' ? 'bg-blue-500' : 'bg-malawiGreen')}
            />
          </Panel>

          <Panel
            title="Outcome Summary"
            subtitle="Current status distribution"
            icon={FiUserCheck}
          >
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <OutcomePill label="Completed" value={totals.completed} className="border-green-200 bg-green-50 text-green-800" />
              <OutcomePill label="Active" value={totals.active} className="border-amber-200 bg-amber-50 text-amber-800" />
              <OutcomePill label="Denied / Cancelled" value={totals.denied} className="border-red-200 bg-red-50 text-red-800" />
            </div>
          </Panel>
        </div>

        <div className="mt-6">
          <Panel
            title="Status Breakdown"
            subtitle="Detailed count by workflow state"
            icon={FiCheckCircle}
          >
            <BreakdownBars
              data={stats.by_status || {}}
              emptyText="No statuses recorded for this period."
              toneFor={(label) => statusTone[label]?.bar || 'bg-slate-400'}
              chipFor={(label) => statusTone[label]?.chip || 'bg-slate-50 text-slate-700 border-slate-200'}
              iconFor={(label) => statusTone[label]?.Icon}
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}

function DateInput({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase text-slate-500">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-malawiGreen focus:ring-2 focus:ring-green-100"
      />
    </label>
  );
}

function MetricCard({ title, value, detail, icon: Icon, tone }) {
  const tones = {
    green: 'border-green-200 bg-white text-malawiGreen',
    blue: 'border-blue-200 bg-white text-blue-600',
    amber: 'border-amber-200 bg-white text-amber-600',
    slate: 'border-slate-200 bg-white text-slate-700',
  };

  return (
    <div className={`rounded-lg border p-5 shadow-sm ${tones[tone] || tones.green}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, icon: Icon, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
        <div className="rounded bg-slate-100 p-2 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-950">{title}</h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function BreakdownBars({ data, emptyText, toneFor, chipFor, iconFor }) {
  const rows = Object.entries(data).map(([label, value]) => [label, Number(value || 0)]);
  const total = rows.reduce((sum, [, value]) => sum + value, 0);

  if (rows.length === 0 || total === 0) {
    return <div className="rounded border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{emptyText}</div>;
  }

  return (
    <div className="space-y-4">
      {rows
        .sort((a, b) => b[1] - a[1])
        .map(([label, value]) => {
          const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
          const Icon = iconFor?.(label);

          return (
            <div key={label} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${chipFor?.(label) || 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {labelize(label)}
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {value}
                  <span className="ml-2 text-xs font-semibold text-slate-400">{percentage}%</span>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${toneFor(label)}`} style={{ width: `${percentage}%` }} />
              </div>
            </div>
          );
        })}
    </div>
  );
}

function OutcomePill({ label, value, className }) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${className}`}>
      <p className="text-xs font-bold uppercase opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
