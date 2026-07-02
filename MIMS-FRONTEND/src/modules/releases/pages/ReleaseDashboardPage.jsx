import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FiArchive,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiTrendingUp,
} from 'react-icons/fi';
import {
  listConfirmedReleases,
  listEligibleReleases,
  listReleaseDateLookup,
  listReleaseHistory,
} from '../services/releaseService';
import DateBadge from '../components/DateBadge';
import ReleaseStatusBadge from '../components/ReleaseStatusBadge';
import SkeletonLoader from '../components/SkeletonLoader';
import Button from '../../../components/common/Button';
import { formatDate } from '../../../utils/helpers';

const extractRows = (response) => {
  if (Array.isArray(response)) return response;
  return Array.isArray(response?.data) ? response.data : [];
};

const extractTotal = (response) => {
  if (Array.isArray(response)) return response.length;
  return Number(response?.total ?? response?.data?.length ?? 0);
};

const normalizeRelease = (release) => {
  const admission = release?.admission || {};
  const inmate = release?.inmate || admission?.inmate || {};
  const firstName = inmate.first_name || inmate.firstName || release?.first_name || release?.firstName || '';
  const lastName = inmate.last_name || inmate.lastName || release?.last_name || release?.lastName || '';

  return {
    key: release?.workflow_id || release?.id || release?.admission_id || admission?.id || release?.inmate_id,
    admissionId: release?.admission_id || admission?.id,
    inmateName: release?.inmate_name || release?.inmateName || [firstName, lastName].filter(Boolean).join(' '),
    prisonNumber: inmate.prison_number || inmate.prisonNumber || release?.prison_number || release?.prisonNumber || '',
    projectedReleaseDate:
      release?.projected_release_date ||
      release?.projectedReleaseDate ||
      release?.release_date ||
      release?.releaseDate ||
      admission?.projected_release_date ||
      admission?.projectedReleaseDate,
    status: release?.status || release?.workflow_status || release?.workflowStatus || 'not_approved',
  };
};

const releaseLinks = [
  {
    title: 'Approve Releases',
    description: 'Review eligible inmates, clear checklists, and authorize approved release workflows.',
    to: '/releases/approval',
    icon: FiCheckCircle,
    tone: 'border-malawiGreen/30 bg-malawiGreen/5 text-malawiGreen',
  },
  {
    title: 'Sentence Lengths',
    description: 'Maintain active sentence terms before projected release dates are calculated.',
    to: '/releases/sentences',
    icon: FiFileText,
    tone: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  },
  {
    title: 'Release Date Lookup',
    description: 'Search current admissions by case, inmate number, status, and projected date.',
    to: '/releases/date-lookup',
    icon: FiSearch,
    tone: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
  },
  {
    title: 'Confirmed Releases',
    description: 'Inspect releases confirmed by gatekeeper officers after final exit checks.',
    to: '/releases/confirmed',
    icon: FiArchive,
    tone: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
  },
  {
    title: 'Release History',
    description: 'Open the permanent release audit trail for approvals, confirmations, and cancellations.',
    to: '/releases/history',
    icon: FiClock,
    tone: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300',
  },
];

export default function ReleaseDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [eligibleResponse, setEligibleResponse] = useState(null);
  const [confirmedResponse, setConfirmedResponse] = useState(null);
  const [historyResponse, setHistoryResponse] = useState(null);
  const [dateLookupResponse, setDateLookupResponse] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);

      const [eligible, confirmed, history, releaseDates] = await Promise.allSettled([
        listEligibleReleases({ per_page: 6, page: 1 }),
        listConfirmedReleases({ per_page: 6, page: 1 }),
        listReleaseHistory({ per_page: 6, page: 1 }),
        listReleaseDateLookup({ per_page: 100, page: 1 }),
      ]);

      if (eligible.status === 'fulfilled') setEligibleResponse(eligible.value);
      if (confirmed.status === 'fulfilled') setConfirmedResponse(confirmed.value);
      if (history.status === 'fulfilled') setHistoryResponse(history.value);
      if (releaseDates.status === 'fulfilled') setDateLookupResponse(releaseDates.value);

      const failed = [eligible, confirmed, history, releaseDates].some((result) => result.status === 'rejected');
      if (failed) {
        toast.warning('Some release dashboard information could not be refreshed.');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to load release dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const eligibleRows = useMemo(() => extractRows(eligibleResponse).map(normalizeRelease), [eligibleResponse]);
  const confirmedRows = useMemo(() => extractRows(confirmedResponse), [confirmedResponse]);
  const historyRows = useMemo(() => extractRows(historyResponse), [historyResponse]);
  const releaseDateRows = useMemo(() => extractRows(dateLookupResponse), [dateLookupResponse]);

  const releaseDateStats = useMemo(() => {
    return releaseDateRows.reduce(
      (summary, record) => {
        const status = record?.release_status;
        if (status === 'due_today') summary.dueToday += 1;
        if (status === 'overdue') summary.overdue += 1;
        if (status === 'upcoming') summary.upcoming += 1;
        return summary;
      },
      { dueToday: 0, overdue: 0, upcoming: 0 }
    );
  }, [releaseDateRows]);

  const totalEligible = extractTotal(eligibleResponse);
  const totalConfirmed = extractTotal(confirmedResponse);
  const totalHistory = extractTotal(historyResponse);
  const totalReleaseDates = extractTotal(dateLookupResponse);

  const kpis = [
    {
      label: 'Eligible for Review',
      value: totalEligible,
      detail: 'Awaiting station officer decision',
      icon: FiShield,
      className: 'border-malawiGreen/25 bg-malawiGreen/10 text-malawiGreen',
    },
    {
      label: 'Due Today',
      value: releaseDateStats.dueToday,
      detail: `${releaseDateStats.overdue} overdue case${releaseDateStats.overdue === 1 ? '' : 's'}`,
      icon: FiCalendar,
      className: 'border-malawiGold/40 bg-malawiGold/15 text-yellow-700 dark:text-yellow-300',
    },
    {
      label: 'Confirmed by Gate',
      value: totalConfirmed,
      detail: 'Completed confirmation records',
      icon: FiCheckCircle,
      className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    },
    {
      label: 'Audit Records',
      value: totalHistory,
      detail: `${totalReleaseDates} date record${totalReleaseDates === 1 ? '' : 's'} indexed`,
      icon: FiTrendingUp,
      className: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950 text-white shadow-lg dark:border-slate-700">
          <div className="grid gap-6 px-6 py-7 lg:grid-cols-[1fr_340px] lg:px-8">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-200">
                <FiShield />
                Station Officer Release Command
              </div>
              <h1 className="text-3xl font-bold sm:text-4xl">Release Management Dashboard</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                Monitor release readiness, sentence dates, approval queues, and gate confirmations from one control point.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/releases/approval"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-malawiGreen px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                >
                  <FiCheckCircle />
                  Review Approvals
                </Link>
                <Button variant="outline" onClick={loadDashboard} disabled={loading} className="border-white text-white hover:bg-white hover:text-slate-950">
                  <FiRefreshCw />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-300">Operational Snapshot</p>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-sm text-slate-300">Upcoming releases</span>
                  <span className="text-2xl font-bold">{releaseDateStats.upcoming}</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-sm text-slate-300">Due today</span>
                  <span className="text-2xl font-bold text-malawiGold">{releaseDateStats.dueToday}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Overdue</span>
                  <span className="text-2xl font-bold text-red-300">{releaseDateStats.overdue}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpis.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`rounded-lg border p-5 shadow-sm ${item.className}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">{item.label}</p>
                    <p className="mt-2 text-3xl font-bold text-gray-950 dark:text-white">{loading ? '...' : item.value}</p>
                    <p className="mt-1 text-xs text-gray-600 dark:text-slate-400">{item.detail}</p>
                  </div>
                  <Icon className="text-3xl" />
                </div>
              </div>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-6 py-4 dark:border-slate-700">
              <div>
                <h2 className="text-lg font-bold text-gray-950 dark:text-white">Priority Release Queue</h2>
                <p className="text-sm text-gray-600 dark:text-slate-400">Nearest eligible records requiring station officer attention.</p>
              </div>
              <Link to="/releases/approval" className="text-sm font-semibold text-malawiGreen hover:underline">
                Open queue
              </Link>
            </div>

            {loading ? (
              <div className="p-6">
                <SkeletonLoader rows={4} columns={5} />
              </div>
            ) : eligibleRows.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-gray-600 dark:text-slate-400">
                No eligible releases are waiting for review.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-left text-sm font-semibold text-gray-700 dark:bg-slate-800 dark:text-slate-300">
                    <tr>
                      <th className="px-6 py-3">Inmate</th>
                      <th className="px-6 py-3">Inmate number</th>
                      <th className="px-6 py-3">Release Date</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {eligibleRows.map((release) => (
                      <tr key={release.key} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                        <td className="px-6 py-4 text-sm">
                          <p className="font-semibold text-gray-950 dark:text-white">{release.inmateName || '-'}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">Admission #{release.admissionId || '-'}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-slate-300">{release.prisonNumber || '-'}</td>
                        <td className="px-6 py-4 text-sm">
                          <DateBadge date={release.projectedReleaseDate} />
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <ReleaseStatusBadge status={release.status} />
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <Link
                            to="/releases/approval"
                            className="inline-flex items-center justify-center rounded-lg border border-malawiGreen px-3 py-2 text-sm font-semibold text-malawiGreen transition hover:bg-malawiGreen hover:text-white"
                          >
                            Review
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-lg font-bold text-gray-950 dark:text-white">Module Links</h2>
              <div className="mt-4 space-y-3">
                {releaseLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 transition hover:border-malawiGreen hover:shadow-sm dark:border-slate-700 dark:hover:border-malawiGreen"
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${item.tone}`}>
                        <Icon className="text-xl" />
                      </span>
                      <span>
                        <span className="block text-sm font-bold text-gray-950 dark:text-white">{item.title}</span>
                        <span className="mt-1 block text-xs leading-5 text-gray-600 dark:text-slate-400">{item.description}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-lg font-bold text-gray-950 dark:text-white">Recent Release Activity</h2>
              <div className="mt-4 space-y-3">
                {loading ? (
                  <SkeletonLoader rows={3} columns={2} />
                ) : historyRows.length === 0 ? (
                  <p className="text-sm text-gray-600 dark:text-slate-400">No recent release activity found.</p>
                ) : (
                  historyRows.slice(0, 4).map((record) => {
                    const normalized = normalizeRelease(record);
                    const activityDate = record?.confirmed_at || record?.approved_at || record?.updated_at || record?.created_at;

                    return (
                      <div key={normalized.key} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0 dark:border-slate-800">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-950 dark:text-white">{normalized.inmateName || 'Release record'}</p>
                            <p className="text-xs text-gray-600 dark:text-slate-400">
                              {normalized.prisonNumber || 'No inmate number'} {activityDate ? `- ${formatDate(activityDate)}` : ''}
                            </p>
                          </div>
                          <ReleaseStatusBadge status={normalized.status} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
