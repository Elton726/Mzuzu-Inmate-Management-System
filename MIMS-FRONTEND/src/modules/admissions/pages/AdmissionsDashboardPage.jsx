import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Spinner from '../../../components/common/Spinner';
import Button from '../../../components/common/Button';
import Card from '../../../components/common/Card';
import { useToast } from '../../../contexts/useToast';
import { useNotification } from '../../../contexts/useNotification';
import { getAvailableCells } from '../services/cellService';
import { listInmates } from '../services/inmateService';
import { formatDate } from '../../../utils/helpers';
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
  return typeof n === 'number' ? n : 0;
};

const getCurrentAdmission = (inmate) => inmate?.current_admission || inmate?.currentAdmission || null;

const getCellLabel = (cell) => `Block ${cell.block} · Cell ${cell.cell_number}`;

const getInmateInitials = (inmate) => {
  const f = inmate?.first_name?.[0] || '';
  const l = inmate?.last_name?.[0] || '';
  return (f + l).toUpperCase() || 'IN';
};

function MetricCard({ label, value, helper, icon: Icon, accent }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[140px] ${accent.card}`}>
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
    <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-6">
      <div>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{title}</h2>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      </div>
      <div className="mt-4 space-y-3">
        {children?.length ? children : (
          <div className="rounded-xl border border-dashed border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-4 py-8 text-center text-sm text-zinc-500">
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

  const load = async () => {
    try {
      setLoading(true);
      const [inmateData, cellData] = await Promise.all([
        listInmates({ per_page: 100, sort_by: 'id', sort_order: 'desc' }),
        getAvailableCells(),
      ]);

      setInmates(Array.isArray(inmateData?.data) ? inmateData.data : []);
      setCells(Array.isArray(cellData) ? cellData : []);
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

  // Court-date arrived reminders
  useEffect(() => {
    if (!inmates?.length) return;

    const todayIso = new Date().toISOString().slice(0, 10);
    const dueAdmissions = [];
    const notifiedKeySet = new Set();

    inmates.forEach((inmate) => {
      const admission = inmate?.current_admission || inmate?.currentAdmission;
      if (!admission?.id) return;

      const inmateType = admission.inmate_type || admission.inmateType;
      if (inmateType !== 'remandee' && inmateType !== 'murder_remandee') return;

      const courtDate = admission.remand_next_court_date || admission.remandNextCourtDate;
      if (!courtDate) return;

      const courtIso = String(courtDate).slice(0, 10);
      if (courtIso !== todayIso) return;

      const key = `${admission.id}:${courtIso}`;
      if (notifiedKeySet.has(key)) return;
      notifiedKeySet.add(key);

      dueAdmissions.push({
        admissionId: admission.id,
        inmateName: `${inmate.first_name || ''} ${inmate.last_name || ''}`.trim() || inmate.prison_number || 'Inmate',
        courtIso,
      });
    });

    dueAdmissions.forEach(({ admissionId, inmateName, courtIso }) => {
      addNotification({
        title: 'Court date arrived',
        message: `${inmateName}'s court date is today (${courtIso}).`,
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
      if (
        (inmateType === 'remandee' || inmateType === 'murder_remandee') &&
        courtDate
      ) {
        const d = new Date(courtDate);
        if (!Number.isNaN(d.getTime())) {
          const startTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate());
          const diffMs = startTarget.getTime() - startToday.getTime();
          daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));
        }
      }

      return {
        ...inmate,
        currentAdmission,
        neverAdmitted: getAdmissionsCount(inmate) === 0 && !currentAdmission?.id,
        readyForAdmission: !currentAdmission?.id,
        daysRemaining,
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
  const availableCells = useMemo(() => cells.slice(0, 6), [cells]);

  const cellBySecurity = useMemo(() => ({
    minimum: cells.filter((cell) => cell.security_classification === 'minimum').length,
    medium: cells.filter((cell) => cell.security_classification === 'medium').length,
    maximum: cells.filter((cell) => cell.security_classification === 'maximum').length,
  }), [cells]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 px-4 py-8 md:px-8 flex items-center justify-center transition-colors duration-200">
        <div className="mx-auto max-w-7xl">
          <Spinner label="Loading admissions dashboard..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 px-4 py-8 md:px-8 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Spotlight / Hero Area */}
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 to-black text-white shadow-xl border border-zinc-800">
          <div className="grid gap-8 px-6 py-8 md:grid-cols-[1.35fr_0.95fr] md:px-8">
            <div className="flex flex-col justify-between">
              <div>
                <div className="inline-flex rounded-full bg-malawiGreen/25 border border-malawiGreen/30 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-green-400">
                  Reception Officer
                </div>
                <h1 className="mt-4 text-3xl font-extrabold tracking-tight md:text-5xl bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                  Admissions Dashboard
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400 md:text-base">
                  Start new admissions, review inmates who are still waiting, and keep an eye on available cells from one operational home screen.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/admissions/new">
                  <Button className="bg-malawiGold hover:bg-yellow-400 text-zinc-950 font-bold border-0 shadow transition hover:scale-[1.02] duration-200">
                    New Admission
                  </Button>
                </Link>
                <Link to="/admissions">
                  <Button variant="outline" className="!border-zinc-700 hover:!border-zinc-500 !text-white hover:!bg-white/5 transition hover:scale-[1.02] duration-200">
                    Open Admissions Register
                  </Button>
                </Link>
              </div>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md shadow-lg flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-malawiGold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-malawiGold animate-pulse"></span>
                  Admission spotlight
                </div>
                {admissionQueue[0] ? (
                  <div className="mt-4 space-y-3">
                    <div className="text-2xl font-bold text-white">
                      {admissionQueue[0].first_name} {admissionQueue[0].last_name}
                    </div>
                    <div className="text-sm text-zinc-400">
                      {admissionQueue[0].prison_number || 'No prison number yet'} • National ID {admissionQueue[0].national_id || 'Not recorded'}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-zinc-800 border border-zinc-700 px-3 py-0.5 text-xs font-semibold text-zinc-300">
                        Awaiting admission
                      </span>
                      {admissionQueue[0].neverAdmitted && (
                        <span className="rounded-full bg-malawiGold/20 border border-malawiGold/30 px-3 py-0.5 text-xs font-bold text-malawiGold">
                          First admission
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-sm text-zinc-500 text-center">
                    No inmates are currently waiting for admission.
                  </div>
                )}
              </div>
              
              {admissionQueue[0] && (
                <div className="mt-6 flex flex-wrap gap-2.5">
                  <Link to={`/admissions/new?inmateId=${admissionQueue[0].id}`} className="flex-1 min-w-[120px]">
                    <button className="w-full bg-malawiGold hover:bg-yellow-400 active:scale-95 text-zinc-950 font-bold py-2 px-4 rounded-lg shadow-sm transition text-sm">
                      Start Admission
                    </button>
                  </Link>
                  <Link to={`/inmates/${admissionQueue[0].id}`} className="flex-1 min-w-[120px]">
                    <button className="w-full bg-transparent hover:bg-white/5 active:scale-95 border border-zinc-700 hover:border-zinc-500 text-white font-medium py-2 px-4 rounded-lg transition text-sm">
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
              card: 'border-emerald-205 bg-emerald-50/50 dark:border-emerald-950/30 dark:bg-emerald-950/20',
              label: 'text-emerald-800 dark:text-emerald-400',
              value: 'text-emerald-900 dark:text-emerald-100',
              helper: 'text-emerald-700/80 dark:text-emerald-400/80',
              icon: 'text-emerald-600 dark:text-emerald-500'
            }}
          />
          <MetricCard
            label="Active Admissions"
            value={activeAdmissions.length}
            helper="Inmates currently admitted in queue"
            icon={MdCheckCircle}
            accent={{
              card: 'border-blue-205 bg-blue-50/50 dark:border-blue-950/30 dark:bg-blue-950/20',
              label: 'text-blue-800 dark:text-blue-400',
              value: 'text-blue-900 dark:text-blue-100',
              helper: 'text-blue-700/80 dark:text-blue-400/80',
              icon: 'text-blue-600 dark:text-blue-500'
            }}
          />
          <MetricCard
            label="Available Cells"
            value={cells.length}
            helper="Cells ready for allocation right now"
            icon={MdHome}
            accent={{
              card: 'border-amber-205 bg-amber-50/50 dark:border-amber-950/30 dark:bg-amber-950/20',
              label: 'text-amber-805 dark:text-amber-400',
              value: 'text-amber-900 dark:text-amber-100',
              helper: 'text-amber-700/80 dark:text-amber-400/80',
              icon: 'text-amber-600 dark:text-amber-500'
            }}
          />
          <MetricCard
            label="First-Time Cases"
            value={readyForAdmission.filter((inmate) => inmate.neverAdmitted).length}
            helper="Inmates who have never been admitted"
            icon={MdPeople}
            accent={{
              card: 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900',
              label: 'text-zinc-500 dark:text-zinc-400',
              value: 'text-zinc-900 dark:text-zinc-100',
              helper: 'text-zinc-600 dark:text-zinc-405',
              icon: 'text-zinc-400 dark:text-zinc-500'
            }}
          />
        </section>

        {/* Functional Panels Area */}
        <section className="grid gap-4 xl:grid-cols-3">
          <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <MdLocalActivity className="text-malawiGreen text-xl" />
                Quick Actions
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-455">Common admissions tasks for a reception officer.</p>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Link to="/admissions/new" className="w-full">
                <button className="w-full flex items-center justify-between px-4 py-2.5 bg-malawiGreen hover:bg-green-700 text-white font-medium rounded-xl transition text-sm shadow-sm">
                  <span className="flex items-center gap-2"><MdAdd /> Start New Admission</span>
                  <MdArrowForward />
                </button>
              </Link>
              <Link to="/admissions" className="w-full">
                <button className="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-medium rounded-xl transition text-sm">
                  <span className="flex items-center gap-2"><MdAssignment /> Admissions Register</span>
                  <MdArrowForward />
                </button>
              </Link>
            </div>
          </Card>

          <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <MdHome className="text-malawiGold text-xl" />
                Cell Security Overview
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-455">Sample of available cells by security classification.</p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 p-3 text-emerald-900 dark:text-emerald-400">
                <div className="text-[10px] font-bold uppercase tracking-wider">Min</div>
                <div className="mt-1.5 text-2xl font-black leading-none">{cellBySecurity.minimum}</div>
              </div>
              <div className="rounded-xl bg-amber-55 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 p-3 text-amber-900 dark:text-amber-400">
                <div className="text-[10px] font-bold uppercase tracking-wider">Med</div>
                <div className="mt-1.5 text-2xl font-black leading-none">{cellBySecurity.medium}</div>
              </div>
              <div className="rounded-xl bg-red-55 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 p-3 text-red-900 dark:text-red-400">
                <div className="text-[10px] font-bold uppercase tracking-wider">Max</div>
                <div className="mt-1.5 text-2xl font-black leading-none">{cellBySecurity.maximum}</div>
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <MdRefresh className="text-blue-500 text-xl" />
                Sync Dashboard
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-455">Reload latest inmate and cell occupancy data.</p>
            </div>
            <div className="mt-4">
              <button
                onClick={load}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-medium rounded-xl transition text-sm shadow-sm"
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
              <div key={inmate.id} className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 p-4 transition hover:bg-zinc-50 dark:hover:bg-zinc-900/60 duration-200">
                <div className="flex items-start gap-4">
                  <div className="flex shrink-0 items-center justify-center rounded-full font-bold h-10 w-10 bg-zinc-105 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    {getInmateInitials(inmate)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-zinc-900 dark:text-white truncate">
                          {inmate.first_name} {inmate.last_name}
                        </div>
                        <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                          {inmate.prison_number || 'No prison number'} • DOB {inmate.date_of_birth ? formatDate(inmate.date_of_birth) : 'Not recorded'}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                          <span className="rounded-full bg-white dark:bg-zinc-800 border border-zinc-250 dark:border-zinc-700 px-2.5 py-0.5 font-semibold text-zinc-600 dark:text-zinc-300">
                            Admissions: {getAdmissionsCount(inmate)}
                          </span>
                          {inmate.neverAdmitted && (
                            <span className="rounded-full bg-green-100 dark:bg-green-950/40 border border-green-200 dark:border-green-900/40 px-2.5 py-0.5 font-bold text-green-700 dark:text-green-400">
                              First admission
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
                          <button className="px-3 py-1.5 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg text-xs transition duration-150">
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
              <div key={inmate.id} className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 p-4 transition hover:bg-zinc-50 dark:hover:bg-zinc-900/60 duration-200">
                <div className="flex items-start gap-4">
                  <div className="flex shrink-0 items-center justify-center rounded-full font-bold h-10 w-10 bg-zinc-105 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    {getInmateInitials(inmate)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-zinc-900 dark:text-white truncate">
                          {inmate.first_name} {inmate.last_name}
                        </div>
                        <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                          {inmate.prison_number || 'No prison number'} • Admission #{inmate.currentAdmission?.id}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                          <span className="rounded-full bg-white dark:bg-zinc-800 border border-zinc-250 dark:border-zinc-700 px-2.5 py-0.5 font-semibold text-zinc-600 dark:text-zinc-300">
                            {inmate.currentAdmission?.inmate_type || 'Type unknown'}
                          </span>
                          <span className="rounded-full bg-white dark:bg-zinc-800 border border-zinc-250 dark:border-zinc-700 px-2.5 py-0.5 font-semibold text-zinc-600 dark:text-zinc-300">
                            {inmate.currentAdmission?.admission_date ? formatDate(inmate.currentAdmission.admission_date) : 'No date'}
                          </span>
                          {inmate.daysRemaining != null && (
                            <span className={`rounded-full border px-2.5 py-0.5 font-bold ${
                              inmate.daysRemaining === 0 
                                ? 'bg-amber-105 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900/40 dark:text-amber-400' 
                                : 'bg-zinc-100 border-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300'
                            }`}>
                              {inmate.daysRemaining === 0
                                ? 'Court today'
                                : `${inmate.daysRemaining} day(s) left`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link to={`/admissions/${inmate.currentAdmission?.id}`}>
                          <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition duration-150 shadow-sm">
                            Details
                          </button>
                        </Link>
                        <Link to={`/inmates/${inmate.id}`}>
                          <button className="px-3 py-1.5 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg text-xs transition duration-150">
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

        {/* Recently Added & Open Cells section */}
        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <QueueCard
            title="Recently Added Inmates"
            subtitle="Quick pickup list for new records recently created in the admissions module."
            emptyText="No inmate records are available."
          >
            {recentlyAdded.map((inmate) => (
              <div key={inmate.id} className="rounded-xl border border-zinc-250/50 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 transition hover:bg-zinc-50 dark:hover:bg-zinc-850 duration-200">
                <div className="flex items-center gap-4">
                  <div className="flex shrink-0 items-center justify-center rounded-full font-bold h-10 w-10 bg-zinc-100 dark:bg-zinc-850 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
                    {getInmateInitials(inmate)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-zinc-900 dark:text-white truncate">
                          {inmate.first_name} {inmate.last_name}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                          {inmate.prison_number || 'No prison number'} • Status: <span className="font-medium text-zinc-700 dark:text-zinc-300">{inmate.status || 'No status'}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link to={`/inmates/${inmate.id}`}>
                          <button className="px-3 py-1.5 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg text-xs transition duration-150">
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
            title="Open Cells"
            subtitle="Sample of available cells ready for manual selection."
            emptyText="No available cells were returned."
          >
            {availableCells.map((cell) => (
              <div key={cell.id} className="rounded-xl border border-zinc-250/50 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 transition hover:bg-zinc-50 dark:hover:bg-zinc-850 duration-200">
                <div className="flex items-center gap-3 justify-between">
                  <div>
                    <div className="font-semibold text-zinc-900 dark:text-white">{getCellLabel(cell)}</div>
                    <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      Security: <span className="capitalize font-semibold text-zinc-700 dark:text-zinc-300">{cell.security_classification}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex rounded px-2 py-1 text-[10px] font-bold ${
                      cell.current_occupancy >= cell.capacity
                        ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/40'
                        : 'bg-green-105 text-green-800 dark:bg-green-950/40 dark:text-green-400 border border-green-200 dark:border-green-900/40'
                    }`}>
                      {cell.current_occupancy}/{cell.capacity} Occupied
                    </span>
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
