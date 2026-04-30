import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../../contexts/useAuth';
import { formatDate, getRoleDisplayName, ROLES } from '../../../utils/helpers';
import OfficerAvailableActivitiesPage from '../../activityAllocation/officer/pages/OfficerAvailableActivitiesPage';
import AdmissionsDashboardPage from '../../admissions/pages/AdmissionsDashboardPage';
import { listPendingConfirmations, listReleaseHistory } from '../../releases/services/releaseService';
import StatsCard from '../../releases/components/StatsCard';
import DateBadge from '../../releases/components/DateBadge';
import { FaCalendarCheck, FaClipboardList, FaHistory, FaHourglassHalf } from 'react-icons/fa';

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

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [pendingData, historyData] = await Promise.all([
        listPendingConfirmations({ per_page: 100, page: 1 }),
        listReleaseHistory({ per_page: 5, page: 1 }),
      ]);

      setPending(Array.isArray(pendingData.data) ? pendingData.data : []);
      setHistory(Array.isArray(historyData.data) ? historyData.data : []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load gatekeeper dashboard'));
      setPending([]);
      setHistory([]);
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

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
            Gatekeeper Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Welcome, {user?.name}. Review release confirmations scheduled for the gate.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            className="inline-flex items-center justify-center px-4 py-2 rounded bg-white border border-gray-300 text-gray-800 font-semibold shadow-sm hover:bg-gray-50 disabled:opacity-60"
          >
            Refresh
          </button>
          <Link
            to="/releases/confirmation"
            className="inline-flex items-center justify-center px-4 py-2 rounded bg-malawiGreen text-white font-semibold shadow-sm hover:opacity-90"
          >
            Confirm Releases
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatsCard title="Pending" value={dashboardRows.length} icon={FaClipboardList} color="malawiGold" />
        <StatsCard title="Due Today" value={dueToday.length} icon={FaCalendarCheck} color="malawiGreen" />
        <StatsCard title="Not Yet Due" value={notYetDue.length} icon={FaHourglassHalf} color="blue" />
        <StatsCard title="Needs Review" value={overdue.length} icon={FaHistory} color="malawiRed" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6">
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Ready For Confirmation</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Only inmates due today can be confirmed.</p>
            </div>
            <Link to="/releases/confirmation" className="text-sm font-semibold text-malawiGreen hover:underline">
              View all
            </Link>
          </div>

          {loading ? (
            <div className="p-6 text-gray-600 dark:text-gray-400">Loading dashboard...</div>
          ) : dueToday.length === 0 ? (
            <div className="p-8 text-center text-gray-600 dark:text-gray-400">
              No inmates are due for gate confirmation today.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Prison Number</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Inmate</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Release Date</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Approved By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {dueToday.slice(0, 8).map((row) => (
                    <tr key={row.key} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">{row.prisonNumber || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-800 dark:text-gray-200">{row.inmateName || '-'}</td>
                      <td className="px-6 py-4 text-sm"><DateBadge date={row.releaseDate} /></td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{row.approvedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Upcoming Releases</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Approved, but not confirmable yet.</p>
            </div>
          </div>

          {notYetDue.length === 0 ? (
            <div className="p-6 text-sm text-gray-600 dark:text-gray-400">No upcoming confirmations.</div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {notYetDue.slice(0, 5).map((row) => (
                <div key={row.key} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{row.inmateName || '-'}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{row.prisonNumber || '-'}</p>
                    </div>
                    <DateBadge date={row.releaseDate} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <Link to="/releases/history" className="text-sm font-semibold text-malawiGreen hover:underline">
              Open release history
            </Link>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden xl:col-span-2">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Recent Release Activity</h2>
          </div>
          {recentHistory.length === 0 ? (
            <div className="p-6 text-sm text-gray-600 dark:text-gray-400">No recent release activity.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700">
              {recentHistory.map((record) => (
                <div key={record.key} className="p-5">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{record.inmateName || '-'}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{record.prisonNumber || '-'}</p>
                  <p className="text-sm font-semibold text-malawiGreen mt-3 capitalize">{record.status?.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
