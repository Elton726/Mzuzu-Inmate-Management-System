import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../../contexts/useAuth';
import { formatDate, getRoleDisplayName, ROLES } from '../../../utils/helpers';
import OfficerAvailableActivitiesPage from '../../activityAllocation/officer/pages/OfficerAvailableActivitiesPage';
import AdmissionsDashboardPage from '../../admissions/pages/AdmissionsDashboardPage';
import { listPendingConfirmations, listReleaseHistory } from '../../releases/services/releaseService';
import { getTodaySchedule, getPendingCharity } from '../../visitation/services/visitationService';
import DateBadge from '../../releases/components/DateBadge';
import { FiRefreshCw } from 'react-icons/fi';
import {
  FaBell,
  FaCalendarCheck,
  FaChartBar,
  FaClipboardList,
  FaExclamationTriangle,
  FaHeart,
  FaHistory,
  FaShieldAlt,
  FaUsers,
} from 'react-icons/fa';

const getErrorMessage = (err, fallback) => (
  err?.response?.data?.message ||
  err?.response?.data?.error ||
  err?.message ||
  fallback
);

const toDateOnly = (date) => {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

const normalizeConfirmation = (release) => {
  const admission = release?.admission || {};
  const inmate = release?.inmate || admission?.inmate || {};
  const firstName = inmate.first_name || release?.first_name || '';
  const lastName = inmate.last_name || release?.last_name || '';

  return {
    key: release?.workflow_id || release?.id || release?.admission_id,
    inmateName: [firstName, lastName].filter(Boolean).join(' '),
    prisonNumber: inmate.prison_number || release?.prison_number || '',
    approvedBy: release?.approved_by_name || release?.approver?.name || release?.approved_by || 'N/A',
    approvedAt: release?.approved_at,
    releaseDate: release?.projected_release_date || admission?.projected_release_date,
  };
};

const normalizeHistory = (record) => ({
  key: record?.workflow_id || record?.id || record?.admission_id,
  inmateName: record?.inmate_name || [record?.first_name, record?.last_name].filter(Boolean).join(' '),
  prisonNumber: record?.prison_number || '',
  status: record?.status || 'approved',
  approvedAt: record?.approved_at,
  confirmedAt: record?.confirmed_at,
});

const GatekeeperDashboard = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [visitSchedule, setVisitSchedule] = useState([]);
  const [charityPending, setCharityPending] = useState([]);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [pendingData, historyData, scheduleData, charityData] = await Promise.allSettled([
        listPendingConfirmations({ per_page: 100, page: 1 }),
        listReleaseHistory({ per_page: 5, page: 1 }),
        getTodaySchedule(),
        getPendingCharity(),
      ]);

      setPending(pendingData.status === 'fulfilled' && Array.isArray(pendingData.value?.data) ? pendingData.value.data : []);
      setHistory(historyData.status === 'fulfilled' && Array.isArray(historyData.value?.data) ? historyData.value.data : []);

      // getTodaySchedule returns { sessions: [...], approved_charity: [...] }
      if (scheduleData.status === 'fulfilled' && scheduleData.value) {
        const scheduleResult = scheduleData.value;
        const sessions = Array.isArray(scheduleResult.sessions) ? scheduleResult.sessions : [];
        setVisitSchedule(sessions);
      } else {
        setVisitSchedule([]);
      }

      // getPendingCharity returns a flat array of bookings
      setCharityPending(
        charityData.status === 'fulfilled' && Array.isArray(charityData.value)
          ? charityData.value.filter(b => b.status === 'pending')
          : []
      );
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load gatekeeper dashboard'));
      setPending([]);
      setHistory([]);
      setVisitSchedule([]);
      setCharityPending([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const dashboardRows = useMemo(() => pending.map(normalizeConfirmation), [pending]);
  const today = useMemo(() => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return value;
  }, []);

  const dueToday = dashboardRows.filter((row) => {
    const releaseDate = toDateOnly(row.releaseDate);
    return releaseDate && releaseDate.getTime() === today.getTime();
  });

  const notYetDue = dashboardRows.filter((row) => {
    const releaseDate = toDateOnly(row.releaseDate);
    return releaseDate && releaseDate > today;
  });

  const overdue = dashboardRows.filter((row) => {
    const releaseDate = toDateOnly(row.releaseDate);
    return releaseDate && releaseDate < today;
  });

  const recentHistory = useMemo(() => history.map(normalizeHistory), [history]);

  const activeVisits = visitSchedule.filter(s => s.status === 'checked_in' || s.status === 'approved');
  const completedToday = visitSchedule.filter(s => s.status === 'checked_out');

  /* ── Quick access navigation tiles ── */
  const quickLinks = [
    { label: 'Today\'s Visits', desc: 'Manage visitation schedule', to: '/visitation', icon: FaUsers, gradient: 'from-emerald-500 to-teal-600', count: visitSchedule.length },
    { label: 'Confirm Releases', desc: 'Gate release confirmations', to: '/releases/confirmation', icon: FaCalendarCheck, gradient: 'from-blue-500 to-indigo-600', count: dueToday.length },
    { label: 'Charity Requests', desc: 'Pending charity bookings', to: '/visitation/charity-pending', icon: FaHeart, gradient: 'from-pink-500 to-rose-600', count: charityPending.length },
    { label: 'Visit History', desc: 'Browse past visits', to: '/visitation/history', icon: FaHistory, gradient: 'from-amber-500 to-orange-600' },
    { label: 'Visit Statistics', desc: 'Analytics & reports', to: '/visitation/statistics', icon: FaChartBar, gradient: 'from-violet-500 to-purple-600' },
    { label: 'Alerts', desc: 'Overdue & flagged visits', to: '/visitation/alerts', icon: FaBell, gradient: 'from-red-500 to-rose-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">

        {/* ── Hero header ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 shadow-xl">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djZoLTZWMzRoNnptMC0zMHY2aC02VjRoNnptMCAxMHY2aC02VjE0aDZ6bTAgMTB2Nmg2djZoLTZ2LTZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300">
                <FaShieldAlt className="h-3.5 w-3.5" /> Gatekeeper Control Panel
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Welcome back, {user?.name?.split(' ')[0]}
              </h1>
              <p className="mt-2 max-w-lg text-sm text-gray-400">
                Manage gate operations — visitation schedules, release confirmations, and security alerts all in one place.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={loadDashboard}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white shadow-sm backdrop-blur-sm transition hover:bg-white/10 disabled:opacity-50"
              >
                <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
              <Link
                to="/releases/confirmation"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400"
              >
                <FaCalendarCheck className="h-4 w-4" /> Confirm Releases
              </Link>
            </div>
          </div>

          {/* ── Inline KPI strip ── */}
          <div className="relative mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Releases Pending', value: dashboardRows.length, color: 'text-amber-300', bg: 'bg-amber-400/10 ring-amber-400/20', icon: FaClipboardList },
              { label: 'Due Today', value: dueToday.length, color: 'text-emerald-300', bg: 'bg-emerald-400/10 ring-emerald-400/20', icon: FaCalendarCheck },
              { label: 'Active Visits', value: activeVisits.length, color: 'text-blue-300', bg: 'bg-blue-400/10 ring-blue-400/20', icon: FaUsers },
              { label: 'Needs Review', value: overdue.length, color: 'text-red-300', bg: 'bg-red-400/10 ring-red-400/20', icon: FaExclamationTriangle },
            ].map((kpi) => (
              <div key={kpi.label} className={`rounded-xl ${kpi.bg} ring-1 p-4 backdrop-blur-sm`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{kpi.label}</p>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
                <p className={`mt-2 text-3xl font-extrabold ${kpi.color}`}>{loading ? '—' : kpi.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Quick access tiles ── */}
        <section>
          <h2 className="mb-4 text-lg font-bold tracking-tight text-gray-900">Quick Access</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {quickLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 transition-all duration-300 hover:shadow-lg hover:ring-gray-300 hover:-translate-y-0.5"
              >
                <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${link.gradient} shadow-lg`}>
                  <link.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">{link.label}</h3>
                <p className="mt-0.5 text-xs text-gray-500">{link.desc}</p>
                {link.count != null && link.count > 0 && (
                  <span className="absolute right-3 top-3 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white shadow-sm">
                    {link.count}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>

        {/* ── Main content grid ── */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">

          {/* Left column: Releases due today (wider) */}
          <section className="xl:col-span-3 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-gray-900">Ready For Gate Confirmation</h2>
                <p className="mt-0.5 text-xs text-gray-500">Only inmates due today can be confirmed at the gate.</p>
              </div>
              <Link to="/releases/confirmation" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition">
                View all →
              </Link>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-emerald-500" />
              </div>
            ) : dueToday.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 ring-1 ring-gray-100">
                  <FaCalendarCheck className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-500">No inmates due for gate confirmation today.</p>
                <p className="mt-1 text-xs text-gray-400">Check the upcoming releases panel for future dates.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/30">
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Prison #</th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Inmate</th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Release Date</th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Approved By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {dueToday.slice(0, 8).map((row) => (
                      <tr key={row.key} className="transition-colors hover:bg-emerald-50/30">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-gray-900">{row.prisonNumber || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{row.inmateName || '-'}</td>
                        <td className="px-6 py-4 text-sm"><DateBadge date={row.releaseDate} /></td>
                        <td className="px-6 py-4 text-sm text-gray-500">{row.approvedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Right column: Upcoming + Today's visits */}
          <div className="xl:col-span-2 space-y-6">
            {/* Upcoming Releases */}
            <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-6 py-5">
                <h2 className="text-lg font-bold tracking-tight text-gray-900">Upcoming Releases</h2>
                <span className="text-xs font-medium text-gray-400">Not yet confirmable</span>
              </div>

              {notYetDue.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">No upcoming confirmations.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {notYetDue.slice(0, 5).map((row) => (
                    <div key={row.key} className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-gray-50/50">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-900">{row.inmateName || '-'}</p>
                        <p className="text-xs text-gray-500">{row.prisonNumber || '-'}</p>
                      </div>
                      <DateBadge date={row.releaseDate} />
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-gray-100 bg-gray-50/30 px-6 py-3">
                <Link to="/releases/history" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition">
                  Open release history →
                </Link>
              </div>
            </section>

            {/* Today's Visitation Snapshot */}
            <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-6 py-5">
                <h2 className="text-lg font-bold tracking-tight text-gray-900">Today's Visits</h2>
                <Link to="/visitation" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition">
                  Manage →
                </Link>
              </div>

              <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
                {[
                  { label: 'Scheduled', value: visitSchedule.length, color: 'text-blue-600' },
                  { label: 'Active', value: activeVisits.length, color: 'text-emerald-600' },
                  { label: 'Completed', value: completedToday.length, color: 'text-gray-500' },
                ].map((s) => (
                  <div key={s.label} className="px-4 py-4 text-center">
                    <p className={`text-2xl font-extrabold ${s.color}`}>{loading ? '—' : s.value}</p>
                    <p className="mt-0.5 text-xs font-medium text-gray-400">{s.label}</p>
                  </div>
                ))}
              </div>

              {activeVisits.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">No active visits right now.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {activeVisits.slice(0, 4).map((session) => (
                    <div key={session.id} className="flex items-center justify-between gap-4 px-6 py-3.5 transition-colors hover:bg-gray-50/50">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-900">{session.visitor?.full_name || 'Visitor'}</p>
                        <p className="text-xs text-gray-500">
                          {[session.inmate?.first_name, session.inmate?.last_name].filter(Boolean).join(' ') || 'Group visit'}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${session.status === 'checked_in' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                        {session.status === 'checked_in' ? 'In Progress' : 'Approved'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

        {/* ── Recent release activity ── */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
          <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-5">
            <h2 className="text-lg font-bold tracking-tight text-gray-900">Recent Release Activity</h2>
          </div>
          {recentHistory.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">No recent release activity.</div>
          ) : (
            <div className="grid grid-cols-1 divide-y sm:grid-cols-2 sm:divide-y-0 sm:divide-x xl:grid-cols-5 divide-gray-100">
              {recentHistory.map((record) => (
                <div key={record.key} className="p-5 transition-colors hover:bg-gray-50/50">
                  <p className="text-sm font-bold text-gray-900">{record.inmateName || '-'}</p>
                  <p className="mt-1 text-xs text-gray-500">{record.prisonNumber || '-'}</p>
                  <p className="mt-3 text-xs font-bold capitalize text-emerald-600">{record.status?.replace(/_/g, ' ')}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {record.confirmedAt ? formatDate(record.confirmedAt) : record.approvedAt ? formatDate(record.approvedAt) : '-'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
};

export const HomePage = () => {
  const { user, isAdmin, getRoleName } = useAuth();
  const role = getRoleName();

  // Redirect admins to dashboard
  if (isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (role === ROLES.OFFICER_ON_DUTY) {
    return <OfficerAvailableActivitiesPage />;
  }

  if (role === ROLES.RECEPTION_OFFICER) {
    return <AdmissionsDashboardPage />;
  }

  if (role === ROLES.GATEKEEPER) {
    return <GatekeeperDashboard user={user} />;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-4xl font-bold text-gray-800 mb-2">
        Welcome, {user?.name}!
      </h1>
      <p className="text-gray-600 mb-8">User dashboard and information</p>

      {/* User Info Card */}
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Your Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-gray-600 text-sm font-semibold uppercase">Name</p>
            <p className="text-xl font-semibold text-gray-800 mt-1">{user?.name}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm font-semibold uppercase">Email</p>
            <p className="text-xl font-semibold text-gray-800 mt-1">{user?.email}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm font-semibold uppercase">Role</p>
            <p className="text-xl font-semibold text-blue-600 mt-1">
              {getRoleDisplayName(user)}
            </p>
          </div>
          <div>
            <p className="text-gray-600 text-sm font-semibold uppercase">Member Since</p>
            <p className="text-xl font-semibold text-gray-800 mt-1">
              {new Date(user?.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
