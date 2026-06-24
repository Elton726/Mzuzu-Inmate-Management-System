import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Spinner from '../../../components/common/Spinner';
import { useToast } from '../../../contexts/useToast';
import { useNotification } from '../../../contexts/useNotification';
import { listCells } from '../services/cellService';
import { listInmates } from '../services/inmateService';
import { formatDate } from '../../../utils/helpers';
import apiService from '../../../services/apiService';
import {
  MdArrowForward,
  MdAssignment,
  MdBalance,
  MdBed,
  MdCalendarToday,
  MdGroups,
  MdPersonOutline,
  MdPlayArrow,
  MdRefresh,
  MdVisibility,
} from 'react-icons/md';

const getAdmissionsCount = (inmate) => {
  const n = inmate?.admissions_count ?? inmate?.admissionsCount;
  const parsed = Number(n);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getCurrentAdmission = (inmate) => inmate?.current_admission || inmate?.currentAdmission || null;

const getFullName = (inmate) =>
  [inmate?.first_name, inmate?.last_name].filter(Boolean).join(' ') || 'Unnamed inmate';

const getInmateInitials = (inmate) => {
  const f = inmate?.first_name?.[0] || '';
  const l = inmate?.last_name?.[0] || '';
  return (f + l).toUpperCase() || 'IN';
};

const hasSystemReleaseHistory = (inmate) => Boolean(
  inmate?.last_release_date ||
  inmate?.lastReleaseDate ||
  inmate?.last_release_at ||
  inmate?.lastReleaseAt
);

const inmateTypeLabels = {
  convict: 'Convict',
  remandee: 'General Remandee',
  murder_remandee: 'Murder Remandee',
};

const typeTone = {
  convict: 'text-emerald-700 bg-emerald-50',
  remandee: 'text-orange-700 bg-orange-50',
  murder_remandee: 'text-red-700 bg-red-50',
};

const formatInmateType = (type) => inmateTypeLabels[type] || 'Not classified';

const getDateValue = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toIsoDate = (value) => {
  const parsed = getDateValue(value);
  return parsed ? parsed.toISOString().slice(0, 10) : null;
};

const daysUntil = (value) => {
  const target = getDateValue(value);
  if (!target) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((targetDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const fetchAllInmates = async () => {
  const firstPage = await listInmates({
    page: 1,
    per_page: 100,
    sort_by: 'id',
    sort_order: 'desc',
  });
  const firstRows = Array.isArray(firstPage?.data) ? firstPage.data : [];
  const lastPage = Number(firstPage?.last_page || 1);

  if (lastPage <= 1) return firstRows;

  const remainingPages = Array.from({ length: lastPage - 1 }, (_, index) => index + 2);
  const pageResponses = await Promise.all(
    remainingPages.map((page) =>
      listInmates({
        page,
        per_page: 100,
        sort_by: 'id',
        sort_order: 'desc',
      })
    )
  );

  return pageResponses.reduce((rows, page) => {
    const pageRows = Array.isArray(page?.data) ? page.data : [];
    return rows.concat(pageRows);
  }, firstRows);
};

function DashboardCard({ children, className = '' }) {
  return (
    <section className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}>
      {children}
    </section>
  );
}

function MetricCard({ label, value, helper, action, to, icon, tone }) {
  const iconNode = React.createElement(icon, { className: `text-2xl ${tone.icon}` });

  return (
    <DashboardCard className="p-5">
      <div className="flex items-start gap-5">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg ${tone.iconBg}`}>
          {iconNode}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-3xl font-bold leading-none text-gray-950">{value}</div>
          <div className="mt-3 text-sm font-bold text-gray-950">{label}</div>
          <div className="mt-1 text-sm text-gray-500">{helper}</div>
        </div>
      </div>
      <div className="mt-5 border-t border-gray-200 pt-3">
        <Link to={to} className={`inline-flex items-center gap-2 text-sm font-bold ${tone.link}`}>
          {action}
          <MdArrowForward className="text-base" />
        </Link>
      </div>
    </DashboardCard>
  );
}

function SectionHeader({ icon, title, badge, iconClass = 'text-malawiGreen' }) {
  const iconNode = React.createElement(icon, { className: `text-2xl ${iconClass}` });

  return (
    <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        {iconNode}
        <h2 className="truncate text-base font-bold text-gray-950">{title}</h2>
      </div>
      {badge != null && (
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-red-600 px-2 text-sm font-bold text-white">
          {badge}
        </span>
      )}
    </div>
  );
}

function TypeBadge({ type }) {
  return (
    <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-bold ${typeTone[type] || 'bg-gray-100 text-gray-700'}`}>
      {formatInmateType(type)}
    </span>
  );
}

function EmptyState({ text }) {
  return (
    <div className="px-5 py-10 text-center text-sm text-gray-500">
      {text}
    </div>
  );
}

export default function AdmissionsDashboardPage() {
  const toast = useToast();
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [inmates, setInmates] = useState([]);
  const [cells, setCells] = useState([]);
  const [populationStats, setPopulationStats] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const [inmateRows, cellData, populationData] = await Promise.all([
        fetchAllInmates(),
        listCells(),
        apiService.getPopulationStatistics(),
      ]);

      setInmates(Array.isArray(inmateRows) ? inmateRows : []);
      setCells(Array.isArray(cellData) ? cellData : []);
      setPopulationStats(populationData ?? null);
    } catch (err) {
      toast.error(err?.message || 'Failed to load admissions dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enrichedInmates = useMemo(
    () => inmates.map((inmate) => {
      const currentAdmission = getCurrentAdmission(inmate);
      const inmateType = currentAdmission?.inmate_type || currentAdmission?.inmateType;
      const courtDate = currentAdmission?.remand_next_court_date || currentAdmission?.remandNextCourtDate;

      return {
        ...inmate,
        currentAdmission,
        currentType: inmateType,
        courtDate,
        courtDaysRemaining: daysUntil(courtDate),
        neverAdmitted: !hasSystemReleaseHistory(inmate),
        readyForAdmission: !currentAdmission?.id,
      };
    }),
    [inmates]
  );

  const readyForAdmission = useMemo(
    () => enrichedInmates.filter((inmate) => inmate.readyForAdmission),
    [enrichedInmates]
  );

  const activeAdmissions = useMemo(
    () => enrichedInmates.filter((inmate) => inmate.currentAdmission?.id),
    [enrichedInmates]
  );

  const courtRows = useMemo(
    () => activeAdmissions
      .filter((inmate) =>
        (inmate.currentType === 'remandee' || inmate.currentType === 'murder_remandee') &&
        inmate.courtDate
      )
      .sort((a, b) => (a.courtDaysRemaining ?? 9999) - (b.courtDaysRemaining ?? 9999))
      .slice(0, 5),
    [activeAdmissions]
  );

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todayCourtRows = useMemo(
    () => courtRows.filter((inmate) => toIsoDate(inmate.courtDate) === todayIso),
    [courtRows, todayIso]
  );

  useEffect(() => {
    if (!todayCourtRows.length) return;

    todayCourtRows.forEach((inmate) => {
      addNotification({
        title: 'Court date arrived',
        message: `${getFullName(inmate)} has a court date today (${todayIso}).`,
        type: 'warning',
        duration: 0,
        action: { label: 'Open admission', url: `/admissions/${inmate.currentAdmission.id}` },
      });
    });
  }, [todayCourtRows, todayIso, addNotification]);

  const admissionQueue = useMemo(() => readyForAdmission.slice(0, 5), [readyForAdmission]);
  const currentAdmissionRows = useMemo(() => activeAdmissions.slice(0, 5), [activeAdmissions]);
  const nextAdmission = admissionQueue[0] || null;
  const firstTimeCases = useMemo(
    () => enrichedInmates.filter((inmate) => !hasSystemReleaseHistory(inmate)).length,
    [enrichedInmates]
  );
  const activeAdmissionsTotal = useMemo(() => {
    const statsTotal =
      Number(populationStats?.convict_count || 0) +
      Number(populationStats?.remandee_count || 0) +
      Number(populationStats?.murder_remandee_count || 0);

    return statsTotal || activeAdmissions.length;
  }, [activeAdmissions.length, populationStats]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
        <Spinner label="Loading admissions dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <main className="space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Ready For Admission"
            value={readyForAdmission.length}
            helper="Inmates waiting"
            action="View queue"
            to="/admissions"
            icon={MdGroups}
            tone={{ iconBg: 'bg-green-100', icon: 'text-green-700', link: 'text-blue-700' }}
          />
          <MetricCard
            label="Active Admissions"
            value={activeAdmissionsTotal}
            helper="Currently in progress"
            action="View active"
            to="/admissions"
            icon={MdAssignment}
            tone={{ iconBg: 'bg-blue-100', icon: 'text-blue-700', link: 'text-blue-700' }}
          />
          <MetricCard
            label="Total Cells"
            value={cells.length}
            helper="All security levels"
            action="View cells"
            to="/admissions"
            icon={MdBed}
            tone={{ iconBg: 'bg-violet-100', icon: 'text-violet-700', link: 'text-blue-700' }}
          />
          <MetricCard
            label="No Prior System Release"
            value={firstTimeCases}
            helper="Never released"
            action="View details"
            to="/admissions"
            icon={MdPersonOutline}
            tone={{ iconBg: 'bg-orange-100', icon: 'text-orange-700', link: 'text-orange-700' }}
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <DashboardCard>
            <SectionHeader icon={MdRefresh} title="Next Inmate for Admission" />
            {nextAdmission ? (
              <div className="p-5">
                <div className="grid gap-5 md:grid-cols-[180px_1fr]">
                  <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-gray-200 text-4xl font-bold text-gray-500">
                    {getInmateInitials(nextAdmission)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-950">
                          {nextAdmission.prison_number || `Inmate #${nextAdmission.id}`}
                        </h2>
                        <p className="mt-1 text-sm font-bold text-gray-800">{getFullName(nextAdmission)}</p>
                        <div className="mt-3">
                          <TypeBadge type={nextAdmission.currentType} />
                        </div>
                      </div>
                      <span className="rounded-md bg-amber-50 px-4 py-2 text-xs font-bold uppercase text-amber-700">
                        Priority
                      </span>
                    </div>

                    <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                      <div className="flex items-center gap-3">
                        <MdCalendarToday className="text-lg text-gray-500" />
                        <dt className="text-gray-600">Registered</dt>
                        <dd className="font-bold text-red-600">
                          {nextAdmission.created_at ? formatDate(nextAdmission.created_at) : 'Not recorded'}
                        </dd>
                      </div>
                      <div className="flex items-center gap-3">
                        <MdGroups className="text-lg text-gray-500" />
                        <dt className="text-gray-600">Admissions</dt>
                        <dd className="font-semibold text-gray-800">{getAdmissionsCount(nextAdmission)}</dd>
                      </div>
                    </dl>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <Link
                        to={`/admissions/new?inmateId=${nextAdmission.id}`}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800"
                      >
                        <MdPlayArrow className="text-lg" />
                        Start Admission
                      </Link>
                      <Link
                        to={`/inmates/${nextAdmission.id}`}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 text-sm font-bold text-gray-800 shadow-sm transition hover:bg-gray-50"
                      >
                        <MdVisibility className="text-lg" />
                        View Inmate
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState text="No inmates are currently waiting for admission." />
            )}
          </DashboardCard>

          <DashboardCard>
            <SectionHeader
              icon={MdBalance}
              title="Today's Court Dates"
              badge={todayCourtRows.length || courtRows.length}
              iconClass="text-red-600"
            />
            {courtRows.length ? (
              <div className="overflow-x-auto px-5 py-2">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <tbody className="divide-y divide-gray-200">
                    {courtRows.map((inmate) => {
                      const isToday = toIsoDate(inmate.courtDate) === todayIso;
                      return (
                        <tr key={inmate.currentAdmission.id}>
                          <td className="py-3 font-semibold text-gray-900">
                            {inmate.prison_number || `#${inmate.id}`}
                          </td>
                          <td className="py-3 text-gray-800">{getFullName(inmate)}</td>
                          <td className="py-3 text-gray-600">{formatInmateType(inmate.currentType)}</td>
                          <td className={`py-3 text-right font-bold ${isToday ? 'text-red-600' : 'text-gray-500'}`}>
                            {isToday ? 'Today' : formatDate(inmate.courtDate)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="border-t border-gray-200 py-4 text-center">
                  <Link to="/admissions" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700">
                    View full calendar
                    <MdArrowForward />
                  </Link>
                </div>
              </div>
            ) : (
              <EmptyState text="No upcoming court dates were found." />
            )}
          </DashboardCard>
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.98fr_1.02fr]">
          <DashboardCard>
            <SectionHeader icon={MdGroups} title="Admission Queue (Up to 5)" />
            {admissionQueue.length ? (
              <div className="overflow-x-auto px-5 py-3">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs font-bold text-gray-500">
                      <th className="py-3">#</th>
                      <th className="py-3">Inmate No.</th>
                      <th className="py-3">Name</th>
                      <th className="py-3">Type</th>
                      <th className="py-3">Registered</th>
                      <th className="py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {admissionQueue.map((inmate, index) => (
                      <tr key={inmate.id}>
                        <td className="py-3 text-gray-700">{index + 1}</td>
                        <td className="py-3 font-medium text-gray-800">{inmate.prison_number || `#${inmate.id}`}</td>
                        <td className="py-3 text-gray-800">{getFullName(inmate)}</td>
                        <td className="py-3 text-orange-600">Awaiting admission</td>
                        <td className="py-3 text-gray-700">{inmate.created_at ? formatDate(inmate.created_at) : '-'}</td>
                        <td className="py-3 text-right">
                          <Link to={`/inmates/${inmate.id}`} className="font-bold text-blue-700 hover:underline">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t border-gray-200 py-4 text-center">
                  <Link to="/admissions" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700">
                    View full queue
                    <MdArrowForward />
                  </Link>
                </div>
              </div>
            ) : (
              <EmptyState text="No inmates waiting for admission were found." />
            )}
          </DashboardCard>

          <DashboardCard>
            <SectionHeader icon={MdAssignment} title="Current Admissions (Up to 5)" iconClass="text-blue-700" />
            {currentAdmissionRows.length ? (
              <div className="overflow-x-auto px-5 py-3">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs font-bold text-gray-500">
                      <th className="py-3">Inmate No.</th>
                      <th className="py-3">Name</th>
                      <th className="py-3">Admission Type</th>
                      <th className="py-3">Admitted On</th>
                      <th className="py-3 text-right">Court In</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {currentAdmissionRows.map((inmate) => (
                      <tr key={inmate.currentAdmission.id}>
                        <td className="py-3 font-medium text-gray-800">{inmate.prison_number || `#${inmate.id}`}</td>
                        <td className="py-3 text-gray-800">{getFullName(inmate)}</td>
                        <td className={`py-3 font-medium ${typeTone[inmate.currentType]?.split(' ')[0] || 'text-gray-700'}`}>
                          {formatInmateType(inmate.currentType)}
                        </td>
                        <td className="py-3 text-gray-700">
                          {inmate.currentAdmission?.admission_date ? formatDate(inmate.currentAdmission.admission_date) : '-'}
                        </td>
                        <td className={`py-3 text-right font-bold ${inmate.courtDaysRemaining != null ? 'text-red-600' : 'text-gray-400'}`}>
                          {inmate.courtDaysRemaining == null
                            ? '-'
                            : inmate.courtDaysRemaining === 0
                              ? 'Today'
                              : `${inmate.courtDaysRemaining} days`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t border-gray-200 py-4 text-center">
                  <Link to="/admissions" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700">
                    View all active admissions
                    <MdArrowForward />
                  </Link>
                </div>
              </div>
            ) : (
              <EmptyState text="No active admissions were found." />
            )}
          </DashboardCard>
        </section>
      </main>
    </div>
  );
}
