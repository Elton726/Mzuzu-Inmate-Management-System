import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import Button from '../../../components/common/Button';
import { exportVisitHistory, getVisitHistory } from '../services/visitationService';
import {
  FiRefreshCw,
  FiDownload,
  FiShield,
  FiTable,
  FiTrendingUp,
} from 'react-icons/fi';
import VisitationHistoryDetailsDrawer from './VisitationHistoryDetailsDrawer';


const todayIso = () => new Date().toISOString().slice(0, 10);
const oneMonthAgoIso = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
};

const getErrorMessage = (err, fallback) =>
  err?.response?.data?.message || err?.response?.data?.error || err?.message || fallback;

const labelize = (value) => String(value || '')
  .replaceAll('_', ' ')
  .replace(/\b\w/g, (char) => char.toUpperCase());

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-lg border text-sm font-bold transition ${
        active
          ? 'border-malawiGreen bg-malawiGreen/15 text-malawiGreen'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
      <div className="text-sm font-semibold text-slate-500">{text}</div>
    </div>
  );
}

function NormalVisitsTable({ rows, onOpen }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="px-4 py-3 font-bold text-slate-600">Date</th>
              <th className="px-4 py-3 font-bold text-slate-600">Visitor</th>
              <th className="px-4 py-3 font-bold text-slate-600">Group visited</th>
              <th className="px-4 py-3 font-bold text-slate-600">Status</th>
              <th className="px-4 py-3 font-bold text-slate-600">Type</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr
                key={s.id}
                className="border-b border-slate-100 last:border-b-0 cursor-pointer hover:bg-slate-50"
                onClick={() => onOpen?.(s)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onOpen?.(s);
                }}
              >
                <td className="px-4 py-3 text-slate-900 font-semibold">
                  {s.created_at ? new Date(s.created_at).toLocaleDateString() : '-'}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {s.visitor?.full_name || '-'}
                  <div className="text-xs text-slate-500">{s.visitor?.phone || ''}</div>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {s.inmate ? `${s.inmate.first_name || ''} ${s.inmate.last_name || ''}`.trim() : '-'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase ${
                      s.status === 'completed'
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : s.status === 'denied' || s.status === 'cancelled'
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : 'border-amber-200 bg-amber-50 text-amber-800'
                    }`}
                  >
                    {labelize(s.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">{labelize(s.visit_type)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CharityVisitsTable({ rows, onOpen }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="px-4 py-3 font-bold text-slate-600">Proposed Date</th>
              <th className="px-4 py-3 font-bold text-slate-600">Organisation</th>
              <th className="px-4 py-3 font-bold text-slate-600">Group visited</th>
              <th className="px-4 py-3 font-bold text-slate-600">Status</th>
              <th className="px-4 py-3 font-bold text-slate-600">Purpose</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr
                key={b.id}
                className="border-b border-slate-100 last:border-b-0 cursor-pointer hover:bg-slate-50"
                onClick={() => onOpen?.(b)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onOpen?.(b);
                }}
              >
                <td className="px-4 py-3 text-slate-900 font-semibold">
                  {b.proposed_date ? new Date(b.proposed_date).toLocaleDateString() : '-'}
                  <div className="text-xs text-slate-500">{b.proposed_time || ''}</div>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {b.organisation_name || '-'}
                  <div className="text-xs text-slate-500">{b.contact_person_phone || ''}</div>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {b.inmate ? `${b.inmate.first_name || ''} ${b.inmate.last_name || ''}`.trim() : '-'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase ${
                      b.status === 'approved'
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : b.status === 'rejected' || b.status === 'denied'
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : 'border-amber-200 bg-amber-50 text-amber-800'
                    }`}
                  >
                    {labelize(b.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">{b.purpose || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function VisitationHistoryPage() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('normal');
  const [filters, setFilters] = useState({ from: oneMonthAgoIso(), to: todayIso() });
  const [history, setHistory] = useState({ normal: [], charity: [] });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('normal');
  const [drawerRecord, setDrawerRecord] = useState(null);

  const openRecord = (mode, record) => {
    setDrawerMode(mode);
    setDrawerRecord(record);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerRecord(null);
  };

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await getVisitHistory(filters);
      setHistory(data || { normal: [], charity: [] });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load visitation history'));
    } finally {
      setLoading(false);
    }
  };

  const exportHistory = async (format) => {
    try {
      await exportVisitHistory({ ...filters, format }, `visitation-history-${filters.from}-to-${filters.to}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to export visitation history'));
    }
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalRows = useMemo(() => history?.normal || [], [history]);
  const charityRows = useMemo(() => history?.charity || [], [history]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold uppercase text-malawiGreen">
                <FiShield className="h-4 w-4" />
                Visitation history
              </div>
              <h1 className="text-3xl font-bold text-slate-950">Visit History</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Review all normal and charity visitation records for the selected period.
              </p>
            </div>

            <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-[150px_150px_auto]">
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase text-slate-500">From</span>
                <input
                  type="date"
                  value={filters.from}
                  onChange={(e) => setFilters((c) => ({ ...c, from: e.target.value }))}
                  className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-malawiGreen focus:ring-2 focus:ring-green-100"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase text-slate-500">To</span>
                <input
                  type="date"
                  value={filters.to}
                  onChange={(e) => setFilters((c) => ({ ...c, to: e.target.value }))}
                  className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-malawiGreen focus:ring-2 focus:ring-green-100"
                />
              </label>

              <div className="flex items-end">
                <Button className="w-full" loading={loading} onClick={loadHistory}>
                  <FiRefreshCw /> Load
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <TabButton active={activeTab === 'normal'} onClick={() => setActiveTab('normal')}>
                <span className="inline-flex items-center gap-2">
                  <FiTable /> Normal visits ({normalRows.length})
                </span>
              </TabButton>
              <TabButton active={activeTab === 'charity'} onClick={() => setActiveTab('charity')}>
                <span className="inline-flex items-center gap-2">
                  <FiTrendingUp /> Charity visits ({charityRows.length})
                </span>
              </TabButton>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => exportHistory('csv')}><FiDownload /> CSV</Button>
              <Button variant="outline" onClick={() => exportHistory('pdf')}><FiDownload /> PDF</Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
            <div className="text-center text-sm font-semibold text-slate-600">Loading history...</div>
          </div>
        ) : activeTab === 'normal' ? (
          normalRows.length === 0 ? <EmptyState text="No normal visits found in this period." /> : <NormalVisitsTable rows={normalRows} onOpen={(r) => openRecord('normal', r)} />
        ) : charityRows.length === 0 ? (
          <EmptyState text="No charity visits found in this period." />
        ) : (
          <CharityVisitsTable rows={charityRows} onOpen={(r) => openRecord('charity', r)} />
        )}

        <VisitationHistoryDetailsDrawer
          open={drawerOpen}
          onClose={closeDrawer}
          record={drawerRecord}
          mode={drawerMode}
        />
      </div>
    </div>
  );
}

