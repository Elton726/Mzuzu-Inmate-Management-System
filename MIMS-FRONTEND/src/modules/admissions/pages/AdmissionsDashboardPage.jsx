import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Spinner from '../../../components/common/Spinner';
import Button from '../../../components/common/Button';
import Card from '../../../components/common/Card';
import { useToast } from '../../../contexts/useToast';
import { useNotification } from '../../../contexts/useNotification';
import { listCells } from '../services/cellService';
import { listInmates } from '../services/inmateService';
import { formatDate } from '../../../utils/helpers';
import apiService from '../../../services/apiService';
import {
  MdAssignment,
  MdCheckCircle,
  MdHome,
  MdPeople,
  MdLocalActivity,
  MdRefresh,
  MdAdd,
  MdArrowForward
} from 'react-icons/md';

const getAdmissionsCount = (inmate) => {
  const n = inmate?.admissions_count ?? inmate?.admissionsCount;
  const parsed = Number(n);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getCurrentAdmission = (inmate) => inmate?.current_admission || inmate?.currentAdmission || null;

const getCellLabel = (cell) => `Block ${cell.block} · Cell ${cell.cell_number}`;

const getInmateInitials = (inmate) => {
  const f = inmate?.first_name?.[0] || '';
  const l = inmate?.last_name?.[0] || '';
  return (f + l).toUpperCase() || 'IN';
};

const getCellOccupancyPercent = (cell) => {
  const capacity = Number(cell?.capacity || 0);
  const occupied = Number(cell?.current_occupancy || 0);
  if (capacity <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((occupied / capacity) * 100)));
};

const hasSystemReleaseHistory = (inmate) => Boolean(
  inmate?.last_release_date ||
  inmate?.lastReleaseDate ||
  inmate?.last_release_at ||
  inmate?.lastReleaseAt
);

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

function MetricCard({ label, value, helper, icon: Icon, accent }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[140px] ${accent.card}`}>
      <div className="flex justify-between items-start">
        <div className={`text-[10px] font-bold uppercase tracking-widest ${accent.label}`}>{label}</div>
        {Icon && <Icon className={`text-xl ${accent.icon}`} />}
      </div>
      <div className="mt-2">
        <div className={`text-3xl font-black tracking-tight ${accent.value}`}>{value}</div>
        <div className={`mt-1 text-xs font-medium ${accent.helper}`}>{helper}</div>
      </div>
    </div>
  );
}

function QueueCard({ title, subtitle, emptyText, children }) {
  return (
    <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
      </div>
      <div className="mt-4 space-y-3">
        {children?.length ? children : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
            {emptyText}
          </div>
        )}
      </div>
    </Card>
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

  // Court-date arrived / overdue reminders
  useEffect(() => {
    if (!inmates?.length) return;

    const todayIso = new Date().toISOString().slice(0, 10);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const dueAdmissions = [];
    const notifiedKeySet = new Set();

    inmates.forEach((inmate) => {
      const admission = inmate?.current_admission || inmate?.currentAdmission;
      if (!admission?.id) return;

      const inmateType = admission.inmate_type || admission.inmateType;
      if (inmateType !== 'remandee' && inmateType !== 'murder_remandee') return;

      const courtDate = admission.remand_next_court_date || admission.remandNextCourtDate;
      if (!courtDate) return;

      const courtDay = new Date(courtDate);
      courtDay.setHours(0, 0, 0, 0);

      // Fire notification if court date is today OR has already passed (overdue)
      if (courtDay > todayStart) return;

      const courtIso = String(courtDate).slice(0, 10);
      const key = `${admission.id}:court-due`;
      if (notifiedKeySet.has(key)) return;
      notifiedKeySet.add(key);

      const isToday = courtIso === todayIso;
      dueAdmissions.push({
        admissionId: admission.id,
        inmateName: `${inmate.first_name || ''} ${inmate.last_name || ''}`.trim() || inmate.prison_number || 'Inmate',
        courtIso,
        isToday,
      });
    });

    dueAdmissions.forEach(({ admissionId, inmateName, courtIso, isToday }) => {
      addNotification({
        title: isToday ? '⚖️ Court date today' : '🚨 Court date overdue',
        message: isToday
          ? `${inmateName} must appear in court today (${courtIso}). Please arrange transport.`
          : `${inmateName}'s court date was ${courtIso} and has passed. Action required.`,
        type: 'warning',
        duration: 0,
        action: { label: 'Open admission', url: `/admissions/${admissionId}` },
      });
    });
  }, [inmates, addNotification]);

  const enrichedInmates = useMemo(
    () => inmates.map((inmate) => {
      const currentAdmission = getCurrentAdmission(inmate);

      const inmateType = currentAdmission?.inmate_type || currentAdmission?.inmateType;
      const courtDate = currentAdmission?.remand_next_court_date || currentAdmission?.remandNextCourtDate;
      const todayStart = new Date();
      const startToday = new Date(todayStart.getFullYear(), todayStart.getMonth(), todayStart.getDate());

      let daysRemaining = null;
      let isOverdue = false;
      if (
        (inmateType === 'remandee' || inmateType === 'murder_remandee') &&
        courtDate
      ) {
        const d = new Date(courtDate);
        if (!Number.isNaN(d.getTime())) {
          const startTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate());
          const diffMs = startTarget.getTime() - startToday.getTime();
          const rawDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
          // Clamp at 0 — timer never goes negative
          daysRemaining = Math.max(0, rawDays);
          isOverdue = rawDays < 0;
        }
      }

      return {
        ...inmate,
        currentAdmission,
        neverAdmitted: !hasSystemReleaseHistory(inmate),
        readyForAdmission: !currentAdmission?.id,
        daysRemaining,
        isOverdue,
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

  const recentlyAdded = useMemo(() => enrichedInmates.slice(0, 5), [enrichedInmates]);
  const admissionQueue = useMemo(() => readyForAdmission.slice(0, 5), [readyForAdmission]);
  const activeAdmissionQueue = useMemo(() => activeAdmissions.slice(0, 5), [activeAdmissions]);
  const sampleCells = useMemo(() => cells.slice(0, 6), [cells]);
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

  const cellBySecurity = useMemo(() => ({
    minimum: cells.filter((cell) => cell.security_classification === 'minimum').length,
    medium: cells.filter((cell) => cell.security_classification === 'medium').length,
    maximum: cells.filter((cell) => cell.security_classification === 'maximum').length,
  }), [cells]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8 md:px-8 flex items-center justify-center transition-colors duration-200">
        <div className="mx-auto max-w-7xl">
          <Spinner label="Loading admissions dashboard..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 md:px-8 text-gray-900 transition-colors duration-200">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Spotlight / Hero Area */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-200">
          <div className="grid gap-8 px-6 py-8 md:grid-cols-[1.35fr_0.95fr] md:px-8">
            <div className="flex flex-col justify-between">
              <div>
                <div className="inline-flex rounded-full bg-green-50 border border-green-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-malawiGreen">
                  Reception Officer
                </div>
                <h1 className="mt-4 text-3xl font-extrabold tracking-tight md:text-5xl text-gray-900">
                  Admissions Dashboard
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-gray-500 md:text-base">
                  Start new admissions, review inmates who are still waiting, and keep an eye on cell occupancy from one operational home screen.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/admissions/new">
                  <Button className="bg-malawiGreen hover:bg-green-800 text-white font-bold border-0 shadow transition duration-200">
                    New Admission
                  </Button>
                </Link>
                <Link to="/admissions">
                  <Button variant="outline" className="!border-gray-300 hover:!border-malawiGreen !text-gray-700 hover:!bg-green-50 transition duration-200">
                    Open Admissions Register
                  </Button>
                </Link>
                <Link to="/admissions/cells">
                  <Button variant="outline" className="!border-gray-300 hover:!border-malawiGreen !text-gray-700 hover:!bg-green-50 transition duration-200">
                    View Cell Management
                  </Button>
                </Link>
              </div>
            </div>

            <div className="rounded-2xl bg-gray-50 border border-gray-200 p-6 shadow-sm flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-malawiGreen flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-malawiGreen animate-pulse"></span>
                  Admission spotlight
                </div>
                {admissionQueue[0] ? (
                  <div className="mt-4 space-y-3">
                    <div className="text-2xl font-bold text-gray-900">
                      {admissionQueue[0].first_name} {admissionQueue[0].last_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {admissionQueue[0].prison_number || 'No prison number yet'} • National ID {admissionQueue[0].national_id || 'Not recorded'}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-white border border-gray-200 px-3 py-0.5 text-xs font-semibold text-gray-700">
                        Awaiting admission
                      </span>
                      <span className="rounded-full bg-white border border-gray-200 px-3 py-0.5 text-xs font-semibold text-gray-700">
                        Admitted {getAdmissionsCount(admissionQueue[0])} time{getAdmissionsCount(admissionQueue[0]) === 1 ? '' : 's'} before
                      </span>
                      {admissionQueue[0].neverAdmitted && (
                        <span className="rounded-full bg-yellow-50 border border-yellow-200 px-3 py-0.5 text-xs font-bold text-yellow-700">
                          No system release history
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-sm text-gray-500 text-center">
                    No inmates are currently waiting for admission.
                  </div>
                )}
              </div>
              
              {admissionQueue[0] && (
                <div className="mt-6 flex flex-wrap gap-2.5">
                  <Link to={`/admissions/new?inmateId=${admissionQueue[0].id}`} className="flex-1 min-w-[120px]">
                    <button className="w-full bg-malawiGreen hover:bg-green-800 active:scale-95 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition text-sm">
                      Start Admission
                    </button>
                  </Link>
                  <Link to={`/inmates/${admissionQueue[0].id}`} className="flex-1 min-w-[120px]">
                    <button className="w-full bg-white hover:bg-gray-100 active:scale-95 border border-gray-300 hover:border-gray-400 text-gray-700 font-medium py-2 px-4 rounded-lg transition text-sm">
                      View Inmate
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Metric Cards Area */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Ready For Admission"
            value={readyForAdmission.length}
            helper="Inmates without a current admission"
            icon={MdAssignment}
            accent={{
              card: 'border-green-200 bg-green-50/70',
              label: 'text-malawiGreen',
              value: 'text-gray-900',
              helper: 'text-green-700/80',
              icon: 'text-malawiGreen'
            }}
          />
          <MetricCard
            label="Active Admissions"
            value={activeAdmissionsTotal}
            helper="Inmates currently admitted in queue"
            icon={MdCheckCircle}
            accent={{
              card: 'border-gray-200 bg-white',
              label: 'text-gray-600',
              value: 'text-gray-900',
              helper: 'text-gray-500',
              icon: 'text-malawiGreen'
            }}
          />
          <MetricCard
            label="Total Cells"
            value={cells.length}
            helper="Cells tracked with current occupancy"
            icon={MdHome}
            accent={{
              card: 'border-yellow-200 bg-yellow-50/70',
              label: 'text-yellow-700',
              value: 'text-gray-900',
              helper: 'text-yellow-700/80',
              icon: 'text-yellow-600'
            }}
          />
          <MetricCard
            label="No Prior System Release"
            value={firstTimeCases}
            helper="Inmates not previously released by MIMS"
            icon={MdPeople}
            accent={{
              card: 'border-red-200 bg-red-50/60',
              label: 'text-malawiRed',
              value: 'text-gray-900',
              helper: 'text-red-700/80',
              icon: 'text-malawiRed'
            }}
          />
        </section>

        {/* Functional Panels Area */}
        <section className="grid gap-4 xl:grid-cols-3">
          <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <MdLocalActivity className="text-malawiGreen text-xl" />
                Quick Actions
              </h2>
              <p className="mt-1 text-xs text-gray-500">Common admissions tasks for a reception officer.</p>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Link to="/admissions/new" className="w-full">
                <button className="w-full flex items-center justify-between px-4 py-2.5 bg-malawiGreen hover:bg-green-700 text-white font-medium rounded-xl transition text-sm shadow-sm">
                  <span className="flex items-center gap-2"><MdAdd /> Start New Admission</span>
                  <MdArrowForward />
                </button>
              </Link>
              <Link to="/admissions" className="w-full">
                <button className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition text-sm">
                  <span className="flex items-center gap-2"><MdAssignment /> Admissions Register</span>
                  <MdArrowForward />
                </button>
              </Link>
              <Link to="/admissions/cells" className="w-full">
                <button className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition text-sm">
                  <span className="flex items-center gap-2"><MdHome /> Cell Management</span>
                  <MdArrowForward />
                </button>
              </Link>
            </div>
          </Card>

          <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <MdHome className="text-malawiGold text-xl" />
                Cell Security Overview
              </h2>
              <p className="mt-1 text-xs text-gray-500">Tracked cells by security classification.</p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-malawiGreen">
                <div className="text-[10px] font-bold uppercase tracking-wider">Min</div>
                <div className="mt-1.5 text-2xl font-black leading-none">{cellBySecurity.minimum}</div>
              </div>
              <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-3 text-yellow-700">
                <div className="text-[10px] font-bold uppercase tracking-wider">Med</div>
                <div className="mt-1.5 text-2xl font-black leading-none">{cellBySecurity.medium}</div>
              </div>
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-malawiRed">
                <div className="text-[10px] font-bold uppercase tracking-wider">Max</div>
                <div className="mt-1.5 text-2xl font-black leading-none">{cellBySecurity.maximum}</div>
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <MdRefresh className="text-malawiGreen text-xl" />
                Sync Dashboard
              </h2>
              <p className="mt-1 text-xs text-gray-500">Reload latest inmate and cell occupancy data.</p>
            </div>
            <div className="mt-4">
              <button
                onClick={load}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-malawiGreen hover:bg-green-800 active:scale-95 text-white font-medium rounded-xl transition text-sm shadow-sm"
              >
                <MdRefresh className="text-lg" />
                Refresh Data
              </button>
            </div>
          </Card>
        </section>

        {/* Queues Section */}
        <section className="grid gap-6 xl:grid-cols-2">
          <QueueCard
            title="Admission Queue"
            subtitle="Inmates without a current admission, ready for reception workflow."
            emptyText="No inmates waiting for admission were found."
          >
            {admissionQueue.map((inmate) => (
              <div key={inmate.id} className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 transition hover:bg-gray-50 duration-200">
                <div className="flex items-start gap-4">
                  <div className="flex shrink-0 items-center justify-center rounded-full font-bold h-10 w-10 bg-malawiBlack text-malawiGold border border-gray-200">
                    {getInmateInitials(inmate)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 truncate">
                          {inmate.first_name} {inmate.last_name}
                        </div>
                        <div className="mt-0.5 text-xs text-gray-500">
                          {inmate.prison_number || 'No prison number'} • DOB {inmate.date_of_birth ? formatDate(inmate.date_of_birth) : 'Not recorded'}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                          <span className="rounded-full bg-white border border-gray-200 px-2.5 py-0.5 font-semibold text-gray-600">
                            Admissions: {getAdmissionsCount(inmate)}
                          </span>
                          {inmate.neverAdmitted && (
                            <span className="rounded-full bg-green-100 border border-green-200 px-2.5 py-0.5 font-bold text-malawiGreen">
                              No system release history
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link to={`/admissions/new?inmateId=${inmate.id}`}>
                          <button className="px-3 py-1.5 bg-malawiGreen hover:bg-green-700 text-white font-semibold rounded-lg text-xs transition duration-150 shadow-sm">
                            Admit
                          </button>
                        </Link>
                        <Link to={`/inmates/${inmate.id}`}>
                          <button className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 font-medium rounded-lg text-xs transition duration-150">
                            View
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </QueueCard>

          <QueueCard
            title="Current Admissions"
            subtitle="Recently loaded inmates who already have an active admission."
            emptyText="No active admissions were found in the loaded list."
          >
            {activeAdmissionQueue.map((inmate) => (
              <div key={inmate.id} className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 transition hover:bg-gray-50 duration-200">
                <div className="flex items-start gap-4">
                  <div className="flex shrink-0 items-center justify-center rounded-full font-bold h-10 w-10 bg-malawiBlack text-malawiGold border border-gray-200">
                    {getInmateInitials(inmate)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-gray-900 truncate">
                          {inmate.first_name} {inmate.last_name}
                        </div>
                        <div className="mt-0.5 text-xs text-gray-500">
                          {inmate.prison_number || 'No prison number'} • Admission #{inmate.currentAdmission?.id}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                          <span className="rounded-full bg-white border border-gray-200 px-2.5 py-0.5 font-semibold text-gray-600">
                            {inmate.currentAdmission?.inmate_type || 'Type unknown'}
                          </span>
                          <span className="rounded-full bg-white border border-gray-200 px-2.5 py-0.5 font-semibold text-gray-600">
                            {inmate.currentAdmission?.admission_date ? formatDate(inmate.currentAdmission.admission_date) : 'No date'}
                          </span>
                          <span className="rounded-full bg-white border border-gray-200 px-2.5 py-0.5 font-semibold text-gray-600">
                            Admissions: {getAdmissionsCount(inmate)}
                          </span>
                          {inmate.daysRemaining != null && (
                            <span className={`rounded-full border px-2.5 py-0.5 font-bold ${
                              inmate.isOverdue
                                ? 'bg-red-100 border-red-300 text-red-700 animate-pulse'
                                : inmate.daysRemaining === 0
                                  ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                                  : 'bg-gray-100 border-gray-200 text-gray-700'
                            }`}>
                              {inmate.isOverdue
                                ? '🚨 Court overdue!'
                                : inmate.daysRemaining === 0
                                  ? '⚖️ Court today!'
                                  : `${inmate.daysRemaining} day(s) left`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {(inmate.currentAdmission?.inmate_type === 'remandee' || inmate.currentAdmission?.inmate_type === 'murder_remandee') && (
                          (() => {
                            const nextCourtDate = inmate.currentAdmission.remand_next_court_date || inmate.currentAdmission.remandNextCourtDate;
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const courtDate = nextCourtDate ? new Date(nextCourtDate) : null;
                            if (courtDate) {
                              courtDate.setHours(0, 0, 0, 0);
                            }
                            const courtReached = courtDate ? today >= courtDate : false;

                            return courtReached ? (
                              <Link to={`/admissions/new?inmateId=${inmate.id}`}>
                                <button className="px-3 py-1.5 bg-malawiGold hover:bg-yellow-400 text-gray-900 font-semibold rounded-lg text-xs transition duration-150 shadow-sm">
                                  Admit Convict
                                </button>
                              </Link>
                            ) : (
                              <button
                                disabled
                                title={nextCourtDate ? `Next court date (${formatDate(nextCourtDate)}) has not been reached yet` : 'No court date specified'}
                                className="px-3 py-1.5 bg-yellow-50 border border-yellow-200 text-gray-400 font-semibold rounded-lg text-xs cursor-not-allowed opacity-60"
                              >
                                Admit Convict
                              </button>
                            );
                          })()
                        )}
                        <Link to={`/admissions/${inmate.currentAdmission?.id}`}>
                          <button className="px-3 py-1.5 bg-malawiGreen hover:bg-green-800 text-white font-semibold rounded-lg text-xs transition duration-150 shadow-sm">
                            Details
                          </button>
                        </Link>
                        <Link to={`/inmates/${inmate.id}`}>
                          <button className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 font-medium rounded-lg text-xs transition duration-150">
                            View
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </QueueCard>
        </section>

        {/* Recently Added & Cell Occupancy section */}
        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <QueueCard
            title="Recently Added Inmates"
            subtitle="Quick pickup list for new records recently created in the admissions module."
            emptyText="No inmate records are available."
          >
            {recentlyAdded.map((inmate) => (
              <div key={inmate.id} className="rounded-xl border border-gray-200 bg-white p-4 transition hover:bg-gray-50 duration-200">
                <div className="flex items-center gap-4">
                  <div className="flex shrink-0 items-center justify-center rounded-full font-bold h-10 w-10 bg-malawiBlack text-malawiGold border border-gray-200">
                    {getInmateInitials(inmate)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-gray-900 truncate">
                          {inmate.first_name} {inmate.last_name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {inmate.prison_number || 'No prison number'} • Status: <span className="font-medium text-gray-700">{inmate.status || 'No status'}</span>
                        </div>
                        <div className="mt-2 text-[10px]">
                          <span className="rounded-full bg-white border border-gray-200 px-2.5 py-0.5 font-semibold text-gray-600">
                            Admissions: {getAdmissionsCount(inmate)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link to={`/inmates/${inmate.id}`}>
                          <button className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 font-medium rounded-lg text-xs transition duration-150">
                            Profile
                          </button>
                        </Link>
                        {!inmate.currentAdmission?.id && (
                          <Link to={`/admissions/new?inmateId=${inmate.id}`}>
                            <button className="px-3 py-1.5 bg-malawiGreen hover:bg-green-700 text-white font-semibold rounded-lg text-xs transition duration-150 shadow-sm">
                              Admit
                            </button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </QueueCard>

          <QueueCard
            title="Cell Occupancy"
            subtitle="Sample of tracked cells with current occupancy."
            emptyText="No cells were returned."
          >
            {sampleCells.map((cell) => (
              <div key={cell.id} className="rounded-xl border border-gray-200 bg-white p-4 transition hover:bg-gray-50 duration-200">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">{getCellLabel(cell)}</div>
                      <div className="mt-0.5 text-xs text-gray-500">
                        Security: <span className="capitalize font-semibold text-gray-700">{cell.security_classification}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex rounded px-2 py-1 text-[10px] font-bold ${
                        cell.current_occupancy >= cell.capacity
                          ? 'bg-red-100 text-malawiRed border border-red-200'
                          : 'bg-green-100 text-malawiGreen border border-green-200'
                      }`}>
                        {cell.current_occupancy}/{cell.capacity} Occupied
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getCellOccupancyPercent(cell) >= 100 ? 'bg-malawiRed' : 'bg-malawiGreen'}`}
                      style={{ width: `${getCellOccupancyPercent(cell)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    <span>{getCellOccupancyPercent(cell)}% full</span>
                    <span className="capitalize">{cell.status || 'No status'}</span>
                  </div>
                </div>
              </div>
            ))}
          </QueueCard>
        </section>
      </div>
    </div>
  );
}
