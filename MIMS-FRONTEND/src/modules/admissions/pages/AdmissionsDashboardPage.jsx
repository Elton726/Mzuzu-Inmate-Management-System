import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Spinner from '../../../components/common/Spinner';
import Button from '../../../components/common/Button';
import Card from '../../../components/common/Card';
import { useToast } from '../../../contexts/useToast';
import { getAvailableCells } from '../services/cellService';
import { listInmates } from '../services/inmateService';
import { formatDate } from '../../../utils/helpers';

const getAdmissionsCount = (inmate) => {
  const n = inmate?.admissions_count ?? inmate?.admissionsCount;
  return typeof n === 'number' ? n : 0;
};

const getCurrentAdmission = (inmate) => inmate?.current_admission || inmate?.currentAdmission || null;

const getCellLabel = (cell) => `Block ${cell.block} · Cell ${cell.cell_number}`;

function MetricCard({ label, value, helper, accent }) {
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${accent}`}>
      <div className="text-sm font-semibold uppercase tracking-[0.18em]">{label}</div>
      <div className="mt-3 text-4xl font-black">{value}</div>
      <div className="mt-2 text-sm opacity-80">{helper}</div>
    </div>
  );
}

function QueueCard({ title, subtitle, emptyText, children }) {
  return (
    <Card className="rounded-3xl shadow-lg">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      </div>
      <div className="mt-5 space-y-3">
        {children?.length ? children : (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-sm text-gray-500">
            {emptyText}
          </div>
        )}
      </div>
    </Card>
  );
}

export default function AdmissionsDashboardPage() {
  const toast = useToast();
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

  const enrichedInmates = useMemo(
    () => inmates.map((inmate) => {
      const currentAdmission = getCurrentAdmission(inmate);
      return {
        ...inmate,
        currentAdmission,
        neverAdmitted: getAdmissionsCount(inmate) === 0 && !currentAdmission?.id,
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
      <div className="min-h-screen bg-malawiGold px-4 py-8 md:px-8">
        <div className="mx-auto max-w-7xl">
          <Spinner label="Loading admissions dashboard..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-malawiGold px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[2rem] bg-malawiBlack text-white shadow-2xl">
          <div className="grid gap-8 px-6 py-8 md:grid-cols-[1.35fr_0.95fr] md:px-8">
            <div>
              <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-malawiGold">
                Reception Officer
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">
                Admissions Dashboard
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80 md:text-base">
                Start new admissions, review inmates who are still waiting, and keep an eye on available cells from one operational home screen.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/admissions/new">
                  <Button className="bg-malawiGold text-malawiBlack hover:opacity-90">
                    New Admission
                  </Button>
                </Link>
                <Link to="/admissions">
                  <Button variant="outline" className="border-white text-white hover:bg-white hover:text-malawiBlack">
                    Open Admissions Register
                  </Button>
                </Link>
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-white/8 p-5 backdrop-blur-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-malawiGold">Admission spotlight</div>
              {admissionQueue[0] ? (
                <div className="mt-4 space-y-3">
                  <div className="text-2xl font-bold">
                    {admissionQueue[0].first_name} {admissionQueue[0].last_name}
                  </div>
                  <div className="text-sm text-white/75">
                    {admissionQueue[0].prison_number || 'No prison number yet'} • National ID {admissionQueue[0].national_id || 'Not recorded'}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                      Awaiting admission
                    </span>
                    {admissionQueue[0].neverAdmitted && (
                      <span className="rounded-full bg-malawiGold px-3 py-1 text-xs font-semibold text-malawiBlack">
                        First admission
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/admissions/new?inmateId=${admissionQueue[0].id}`}>
                      <Button>Start Admission</Button>
                    </Link>
                    <Link to={`/inmates/${admissionQueue[0].id}`}>
                      <Button variant="outline" className="border-white text-white hover:bg-white hover:text-malawiBlack">
                        View Inmate
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-white/20 px-4 py-6 text-sm text-white/70">
                  No inmates are currently waiting for admission in the loaded list.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Ready For Admission"
            value={readyForAdmission.length}
            helper="Inmates without a current admission"
            accent="border-green-200 bg-green-50 text-green-900"
          />
          <MetricCard
            label="Active Admissions"
            value={activeAdmissions.length}
            helper="Inmates currently admitted in the loaded list"
            accent="border-blue-200 bg-blue-50 text-blue-900"
          />
          <MetricCard
            label="Available Cells"
            value={cells.length}
            helper="Cells ready for allocation right now"
            accent="border-amber-200 bg-amber-50 text-amber-900"
          />
          <MetricCard
            label="First-Time Cases"
            value={readyForAdmission.filter((inmate) => inmate.neverAdmitted).length}
            helper="Inmates who have never been admitted before"
            accent="border-malawiBlack/10 bg-white text-gray-900"
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <Card className="rounded-3xl shadow-lg">
            <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
            <p className="mt-1 text-sm text-gray-500">Common admissions tasks for a reception officer.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/admissions/new">
                <Button>Start New Admission</Button>
              </Link>
              <Link to="/admissions">
                <Button variant="outline">Admissions Register</Button>
              </Link>
              {admissionQueue[0] && (
                <Link to={`/admissions/new?inmateId=${admissionQueue[0].id}`}>
                  <Button variant="outline">Next Inmate In Queue</Button>
                </Link>
              )}
            </div>
          </Card>

          <Card className="rounded-3xl shadow-lg">
            <h2 className="text-xl font-bold text-gray-900">Cell Availability</h2>
            <p className="mt-1 text-sm text-gray-500">Quick security overview for auto-allocation and manual placement.</p>
            <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-900">
                <div className="font-semibold">Minimum</div>
                <div className="mt-2 text-2xl font-black">{cellBySecurity.minimum}</div>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4 text-amber-900">
                <div className="font-semibold">Medium</div>
                <div className="mt-2 text-2xl font-black">{cellBySecurity.medium}</div>
              </div>
              <div className="rounded-2xl bg-red-50 p-4 text-red-900">
                <div className="font-semibold">Maximum</div>
                <div className="mt-2 text-2xl font-black">{cellBySecurity.maximum}</div>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Refresh</h2>
                <p className="mt-1 text-sm text-gray-500">Reload the latest inmate and cell data.</p>
              </div>
              <Button onClick={load}>Refresh Dashboard</Button>
            </div>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <QueueCard
            title="Admission Queue"
            subtitle="Inmates without a current admission, ready for reception workflow."
            emptyText="No inmates waiting for admission were found."
          >
            {admissionQueue.map((inmate) => (
              <div key={inmate.id} className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {inmate.first_name} {inmate.last_name}
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      {inmate.prison_number || 'No prison number'} • DOB {inmate.date_of_birth ? formatDate(inmate.date_of_birth) : 'Not recorded'}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-white px-3 py-1 font-semibold text-gray-700">
                        Admissions: {getAdmissionsCount(inmate)}
                      </span>
                      {inmate.neverAdmitted && (
                        <span className="rounded-full bg-green-100 px-3 py-1 font-semibold text-green-800">
                          First admission
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/admissions/new?inmateId=${inmate.id}`}>
                      <Button className="px-3 py-1 text-xs">Start Admission</Button>
                    </Link>
                    <Link to={`/inmates/${inmate.id}`}>
                      <Button variant="outline" className="px-3 py-1 text-xs">View Inmate</Button>
                    </Link>
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
              <div key={inmate.id} className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {inmate.first_name} {inmate.last_name}
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      {inmate.prison_number || 'No prison number'} • Admission #{inmate.currentAdmission?.id}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-white px-3 py-1 font-semibold text-gray-700">
                        {inmate.currentAdmission?.inmate_type || 'Type unknown'}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 font-semibold text-gray-700">
                        {inmate.currentAdmission?.admission_date ? formatDate(inmate.currentAdmission.admission_date) : 'No date'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/admissions/${inmate.currentAdmission?.id}`}>
                      <Button className="px-3 py-1 text-xs">View Admission</Button>
                    </Link>
                    <Link to={`/inmates/${inmate.id}`}>
                      <Button variant="outline" className="px-3 py-1 text-xs">View Inmate</Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </QueueCard>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <QueueCard
            title="Recently Added Inmates"
            subtitle="Quick pickup list for new records recently created in the admissions module."
            emptyText="No inmate records are available."
          >
            {recentlyAdded.map((inmate) => (
              <div key={inmate.id} className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {inmate.first_name} {inmate.last_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {inmate.prison_number || 'No prison number'} • {inmate.status || 'No status'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/inmates/${inmate.id}`}>
                      <Button variant="outline" className="px-3 py-1 text-xs">Profile</Button>
                    </Link>
                    {!inmate.currentAdmission?.id && (
                      <Link to={`/admissions/new?inmateId=${inmate.id}`}>
                        <Button className="px-3 py-1 text-xs">Admit</Button>
                      </Link>
                    )}
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
              <div key={cell.id} className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <div className="font-semibold text-gray-900">{getCellLabel(cell)}</div>
                <div className="mt-1 text-sm text-gray-500">
                  {cell.security_classification} • {cell.current_occupancy}/{cell.capacity} occupied
                </div>
              </div>
            ))}
          </QueueCard>
        </section>
      </div>
    </div>
  );
}
