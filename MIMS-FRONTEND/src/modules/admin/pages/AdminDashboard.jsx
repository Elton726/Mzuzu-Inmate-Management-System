import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MdAdminPanelSettings,
  MdAssignmentTurnedIn,
  MdBarChart,
  MdCheckCircle,
  MdError,
  MdExitToApp,
  MdFactCheck,
  MdGavel,
  MdHistory,
  MdHomeWork,
  MdLocalActivity,
  MdPeople,
  MdRefresh,
  MdSchedule,
  MdSecurity,
  MdTrendingUp,
  MdWarning,
} from 'react-icons/md';
import apiService from '../../../services/apiService';
import { useToast } from '../../../contexts/useToast';
import { formatDate } from '../../../utils/helpers';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const numberOrDash = (value) => (value === null || value === undefined ? '--' : value);

const formatLabel = (value) => {
  if (!value) return 'Not recorded';
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

const getInmateName = (inmate) => [inmate?.first_name, inmate?.last_name].filter(Boolean).join(' ') || 'Unnamed inmate';

const severityStyles = {
  critical: {
    badge: 'bg-red-100 text-red-800',
    border: 'border-red-200',
    icon: 'text-red-600',
    Icon: MdError,
  },
  warning: {
    badge: 'bg-amber-100 text-amber-900',
    border: 'border-amber-200',
    icon: 'text-amber-600',
    Icon: MdWarning,
  },
  ok: {
    badge: 'bg-emerald-100 text-emerald-800',
    border: 'border-emerald-200',
    icon: 'text-emerald-600',
    Icon: MdCheckCircle,
  },
};

function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-malawiRed" />
        <p className="font-semibold text-slate-700">Loading command center...</p>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, tone = 'slate', helper }) {
  const tones = {
    red: 'bg-red-50 text-red-700 ring-red-100',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    slate: 'bg-slate-50 text-slate-700 ring-slate-100',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{numberOrDash(value)}</p>
          {helper && <p className="mt-1 text-sm text-slate-500">{helper}</p>}
        </div>
        <div className={`rounded-2xl p-3 ring-1 ${tones[tone] || tones.slate}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function ActionQueue({ items }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-malawiRed">Priority queue</p>
          <h2 className="text-2xl font-black text-slate-950">Administrative actions</h2>
        </div>
        <p className="text-sm text-slate-500">Sorted by operational risk.</p>
      </div>

      <div className="space-y-3">
        {(items || []).map((item) => {
          const styles = severityStyles[item.severity] || severityStyles.ok;
          const Icon = styles.Icon;
          return (
            <div key={item.key} className={`rounded-2xl border ${styles.border} bg-slate-50 p-4`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                  <Icon className={`mt-1 h-6 w-6 ${styles.icon}`} />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-slate-950">{item.title}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-black uppercase ${styles.badge}`}>
                        {item.severity}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-black text-slate-950">{numberOrDash(item.count)}</span>
                  {item.to ? (
                    <Link
                      to={item.to}
                      className="inline-flex h-10 items-center rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-malawiRed"
                    >
                      {item.action}
                    </Link>
                  ) : (
                    <span className="inline-flex h-10 items-center rounded-xl bg-slate-200 px-4 text-sm font-bold text-slate-700">
                      {item.action}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ModuleCard({ icon: Icon, title, subtitle, children, to, action }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-slate-950 p-3 text-malawiGold">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-950">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>
        {to && (
          <Link to={to} className="shrink-0 text-sm font-black text-malawiRed hover:underline">
            {action || 'Open'}
          </Link>
        )}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function StatLine({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2 last:border-b-0">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="font-black text-slate-950">{numberOrDash(value)}</span>
    </div>
  );
}

function MonthlyTrend({ data }) {
  const rows = Array.isArray(data) ? data : [];
  const max = Math.max(1, ...rows.map((item) => Number(item.count || 0)));

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
          <MdTrendingUp className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-950">Admissions trend</h2>
          <p className="text-sm text-slate-500">Current year admissions by month.</p>
        </div>
      </div>

      <div className="flex h-56 items-end gap-2 overflow-x-auto rounded-2xl bg-slate-50 p-4">
        {rows.map((item) => {
          const count = Number(item.count || 0);
          const height = Math.max(8, Math.round((count / max) * 170));
          return (
            <div key={item.month} className="flex min-w-10 flex-1 flex-col items-center justify-end gap-2">
              <span className="text-xs font-black text-slate-700">{count}</span>
              <div
                className="w-full rounded-t-xl bg-gradient-to-t from-malawiGreen to-malawiGold"
                style={{ height: `${height}px` }}
                title={`${MONTH_LABELS[(item.month || 1) - 1]}: ${count}`}
              />
              <span className="text-xs font-semibold text-slate-500">{MONTH_LABELS[(item.month || 1) - 1]}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AuditTimeline({ events }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">Audit activity</h2>
          <p className="text-sm text-slate-500">Recent administrative and system events.</p>
        </div>
        <Link to="/admin/audit-logs" className="text-sm font-black text-malawiRed hover:underline">
          View all
        </Link>
      </div>

      <div className="space-y-3">
        {(events || []).length === 0 ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No recent audit events.</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="flex gap-3 rounded-2xl bg-slate-50 p-4">
              <div className="mt-1 h-2.5 w-2.5 rounded-full bg-malawiRed" />
              <div className="min-w-0">
                <p className="font-bold text-slate-950">
                  {formatLabel(event.action)} <span className="text-slate-500">on</span> {event.table_name || 'system'}
                </p>
                <p className="text-sm text-slate-500">
                  {event.user?.name || 'System'} - {event.created_at ? formatDate(event.created_at) : 'Date not recorded'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function SampleList({ items, emptyText, renderItem }) {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">{emptyText}</p>;
  }

  return <div className="space-y-3">{items.map(renderItem)}</div>;
}

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const toast = useToast();

  const loadOverview = useCallback(async ({ silent = false } = {}) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      const data = await apiService.getAdminDashboardOverview();
      setOverview(data || {});
    } catch (err) {
      toast.fromError(err);
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const metrics = overview?.metrics || {};
  const population = overview?.population || {};
  const cells = overview?.cells || {};
  const release = overview?.release || {};
  const visitation = overview?.visitation || {};
  const rosters = overview?.rosters || {};
  const activities = overview?.activities || {};
  const users = overview?.users || {};
  const audit = overview?.audit || {};
  const quickLinks = Array.isArray(overview?.quick_links) ? overview.quick_links : [];

  const occupancyPercent = useMemo(() => {
    const capacity = Number(cells.capacity || 0);
    if (capacity <= 0) return 0;
    return Math.round((Number(cells.occupancy || 0) / capacity) * 100);
  }, [cells.capacity, cells.occupancy]);

  if (loading) return <LoadingState />;

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute right-0 top-0 h-48 w-48 rounded-bl-full bg-malawiGold/20" />
            <div className="absolute bottom-0 right-24 h-24 w-24 rounded-t-full bg-malawiRed/30" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-malawiGold">Admin command center</p>
                <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Operate by exception.</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  Focus on approvals, capacity pressure, court deadlines, staffing coverage, and security events from one compact dashboard.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => loadOverview({ silent: true })}
                  disabled={refreshing}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-slate-950 transition hover:bg-malawiGold disabled:opacity-60"
                >
                  <MdRefresh className={refreshing ? 'animate-spin' : ''} />
                  {refreshing ? 'Refreshing' : 'Refresh'}
                </button>
                <Link to="/admin/users" className="inline-flex h-11 items-center rounded-xl bg-malawiRed px-4 text-sm font-black text-white transition hover:bg-red-700">
                  Manage users
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={MdPeople} label="Active inmates" value={metrics.active_inmates} tone="green" />
          <MetricCard icon={MdHomeWork} label="Available cells" value={metrics.available_cells} tone="blue" helper={`${occupancyPercent}% occupied`} />
          <MetricCard icon={MdExitToApp} label="Release approvals" value={metrics.pending_release_approvals} tone="amber" />
          <MetricCard icon={MdGavel} label="Court due/overdue" value={metrics.court_due_or_overdue} tone="red" />
          <MetricCard icon={MdWarning} label="Overcrowded cells" value={metrics.overcrowded_cells} tone="red" />
          <MetricCard icon={MdFactCheck} label="Visitation flags" value={metrics.visitation_flags} tone="amber" />
          <MetricCard icon={MdSchedule} label="Roster gaps" value={metrics.duty_roster_gaps} tone="red" />
          <MetricCard icon={MdHistory} label="Audit events today" value={audit.events_today} tone="slate" />
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <ActionQueue items={overview?.action_queue || []} />

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">Quick operations</h2>
                <p className="text-sm text-slate-500">High-frequency admin destinations.</p>
              </div>
              <MdAdminPanelSettings className="h-7 w-7 text-malawiRed" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 font-black text-slate-800 transition hover:border-malawiRed hover:bg-white hover:text-malawiRed"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </section>
        </div>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <ModuleCard icon={MdPeople} title="Users and roles" subtitle="Account distribution and recent registrations." to="/admin/users" action="Manage">
            <StatLine label="Total users" value={users.total_users} />
            {Object.entries(users.by_role || {}).map(([role, total]) => (
              <StatLine key={role} label={formatLabel(role)} value={total} />
            ))}
          </ModuleCard>

          <ModuleCard icon={MdHomeWork} title="Cell capacity" subtitle="Estate pressure by availability and occupancy." to="/admin/cells" action="Open cells">
            <StatLine label="Total cells" value={cells.total_cells} />
            <StatLine label="Capacity" value={cells.capacity} />
            <StatLine label="Occupancy" value={cells.occupancy} />
            <StatLine label="Maintenance" value={cells.maintenance_cells} />
          </ModuleCard>

          <ModuleCard icon={MdLocalActivity} title="Activities" subtitle="Program availability and activity setup health." to="/admin/activities" action="Manage">
            <StatLine label="Active activities" value={activities.active_activities} />
            <StatLine label="Inactive activities" value={activities.inactive_activities} />
            <StatLine label="Internal" value={activities.internal_activities} />
            <StatLine label="External" value={activities.external_activities} />
          </ModuleCard>

          <ModuleCard icon={MdExitToApp} title="Release workflow" subtitle="Approval, confirmation, and clearance workload.">
            <StatLine label="Pending approvals" value={release.pending_approvals} />
            <StatLine label="Pending confirmations" value={release.pending_confirmations} />
            <StatLine label="Open clearance checklists" value={release.open_clearance_checklists} />
            <StatLine label="Confirmed this month" value={release.confirmed_this_month} />
          </ModuleCard>

          <ModuleCard icon={MdSecurity} title="Visitation security" subtitle="Visit sessions, charity bookings, and item flags.">
            <StatLine label="Sessions today" value={visitation.sessions_today} />
            <StatLine label="Active sessions" value={visitation.active_sessions} />
            <StatLine label="Denied today" value={visitation.denied_today} />
            <StatLine label="Pending charity" value={visitation.pending_charity_bookings} />
          </ModuleCard>

          <ModuleCard icon={MdSchedule} title="Duty coverage" subtitle="Current officer coverage for activity operations." to="/admin/duty-rosters" action="Assign">
            <StatLine label="Current officers" value={rosters.current_officer_count} />
            <StatLine label="Coverage gaps" value={rosters.gaps} />
            <div className="mt-3 rounded-2xl bg-slate-50 p-3">
              {(rosters.current_officers || []).length === 0 ? (
                <p className="text-sm text-slate-500">No active officer assigned for the current period.</p>
              ) : (
                rosters.current_officers.map((roster) => (
                  <p key={roster.id} className="text-sm font-bold text-slate-800">
                    {roster.officer?.name || 'Officer'} <span className="font-normal text-slate-500">on duty</span>
                  </p>
                ))
              )}
            </div>
          </ModuleCard>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <MonthlyTrend data={population.monthly_admissions} />

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-red-50 p-3 text-red-700">
                <MdGavel className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-950">Court follow-up samples</h2>
                <p className="text-sm text-slate-500">Due or overdue remand cases.</p>
              </div>
            </div>
            <SampleList
              items={overview?.court?.samples || []}
              emptyText="No due or overdue court samples."
              renderItem={(admission) => (
                <div key={admission.id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-black text-slate-950">{getInmateName(admission.inmate)}</p>
                  <p className="text-sm text-slate-500">
                    {admission.inmate?.prison_number || 'No inmate number'} - {formatLabel(admission.inmate_type)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {admission.court_name || 'Court not recorded'} - {admission.remand_next_court_date ? formatDate(admission.remand_next_court_date) : 'No date'}
                  </p>
                </div>
              )}
            />
          </section>
        </div>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ModuleCard icon={MdAssignmentTurnedIn} title="Release samples" subtitle="Oldest pending workflow samples.">
            <SampleList
              items={release.pending_approval_samples || []}
              emptyText="No pending release approvals."
              renderItem={(workflow) => (
                <div key={workflow.id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-black text-slate-950">{getInmateName(workflow.admission?.inmate)}</p>
                  <p className="text-sm text-slate-500">
                    {workflow.admission?.inmate?.prison_number || 'No inmate number'} - {formatLabel(workflow.status)}
                  </p>
                </div>
              )}
            />
          </ModuleCard>

          <ModuleCard icon={MdWarning} title="Cell pressure samples" subtitle="Cells above recorded capacity.">
            <SampleList
              items={cells.overcrowded_samples || []}
              emptyText="No overcrowded cells."
              renderItem={(cell) => (
                <div key={cell.id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-black text-slate-950">Block {cell.block || '-'} - Cell {cell.cell_number || '-'}</p>
                  <p className="text-sm text-slate-500">
                    {formatLabel(cell.security_classification)} - {cell.current_occupancy}/{cell.capacity} occupied
                  </p>
                </div>
              )}
            />
          </ModuleCard>
        </section>

        <AuditTimeline events={audit.recent_events || []} />
      </div>
    </div>
  );
}
