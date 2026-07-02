import React, { useCallback, useEffect, useState } from 'react';
import Card from '../../../../components/common/Card';
import Button from '../../../../components/common/Button';
import Select from '../../../../components/common/Select';
import Input from '../../../../components/common/Input';
import Spinner from '../../../../components/common/Spinner';
import { useToast } from '../../../../contexts/useToast';
import * as officerSessionService from '../services/officerSessionService';
import { MdPrint, MdRefresh } from 'react-icons/md';

const periodOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const statusColor = {
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-700',
  in_progress: 'bg-blue-100 text-blue-800',
  scheduled: 'bg-yellow-100 text-yellow-800',
};

export default function ActivityReportsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('monthly');
  const [date, setDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [report, setReport] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await officerSessionService.getActivityReports({ period, date });
      setReport(res?.data || null);
    } catch (err) {
      toast.fromError(err, { title: 'Activity Reports' });
    } finally {
      setLoading(false);
    }
  }, [period, date, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = report?.summary;
  const meta = report?.meta;
  const dateInputType = period === 'yearly' ? 'number' : period === 'monthly' ? 'month' : 'date';

  const handlePeriodChange = (e) => {
    const next = e.target.value;
    const now = new Date();
    setPeriod(next);
    if (next === 'daily' || next === 'weekly') setDate(now.toISOString().slice(0, 10));
    if (next === 'monthly') setDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    if (next === 'yearly') setDate(String(now.getFullYear()));
  };

  const printReport = async () => {
    await load();
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  };

  return (
    <>
    <style>{`
      @media print {
        body * { visibility: hidden !important; }
        #activity-print-root, #activity-print-root * { visibility: visible !important; }
        #activity-print-root {
          display: block !important;
          position: absolute;
          inset: 0 auto auto 0;
          width: 100%;
          background: #fff !important;
          color: #111 !important;
          font-family: 'Times New Roman', Times, serif;
          padding: 18mm;
        }
        .activity-print-section { break-inside: avoid; page-break-inside: avoid; margin-bottom: 18pt; }
        #activity-print-root table { width: 100%; border-collapse: collapse; font-size: 10pt; }
        #activity-print-root th { background: #111; color: #fff; text-align: left; }
        #activity-print-root th, #activity-print-root td { border: 1px solid #d1d5db; padding: 5pt 6pt; }
      }
      @media screen { #activity-print-root { display: none !important; } }
    `}</style>
    <div className="min-h-screen bg-malawiGold p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Activity Reports</h1>
            <p className="text-sm text-gray-600">
              {meta ? `Report for ${meta.label} · Generated ${new Date(meta.generated_at).toLocaleString()}` : 'Select a period and date to generate a report.'}
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card title="Report Period">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <Select
              label="Period"
              value={period}
              onChange={handlePeriodChange}
              options={periodOptions}
            />
            <Input
              label="Reference Date"
              type={dateInputType}
              value={date}
              min={period === 'yearly' ? '2000' : undefined}
              max={period === 'yearly' ? String(new Date().getFullYear()) : undefined}
              onChange={(e) => setDate(e.target.value)}
              hint="For monthly: any day in that month. For yearly: any day in that year."
            />
            <div className="flex flex-wrap items-end gap-2">
              <Button onClick={load} loading={loading} className="w-full md:w-auto">
                <MdRefresh /> Generate Report
              </Button>
              <Button onClick={printReport} variant="outline" disabled={loading || !report} className="w-full md:w-auto">
                <MdPrint /> Export PDF
              </Button>
            </div>
          </div>
        </Card>

        {loading && <Spinner label="Generating report..." />}

        {!loading && report && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Sessions', value: summary.total_sessions, color: 'bg-white' },
                { label: 'Completed', value: summary.completed_sessions, color: 'bg-green-50' },
                { label: 'Cancelled', value: summary.cancelled_sessions, color: 'bg-red-50' },
                { label: 'In Progress', value: summary.in_progress_sessions, color: 'bg-blue-50' },
                { label: 'Total Participations', value: summary.total_participations, color: 'bg-white' },
                { label: 'Present', value: summary.total_present, color: 'bg-green-50' },
                { label: 'Absent', value: summary.total_absent, color: 'bg-red-50' },
                { label: 'Late / Excused', value: `${summary.total_late} / ${summary.total_excused}`, color: 'bg-yellow-50' },
              ].map((card) => (
                <div key={card.label} className={`${card.color} rounded-2xl border border-gray-200 p-4 shadow-sm`}>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{card.label}</div>
                  <div className="text-3xl font-bold text-gray-800 mt-1">{card.value}</div>
                </div>
              ))}
            </div>

            {/* Activity Breakdown */}
            {report.activities?.length > 0 && (
              <Card title="Activity Breakdown">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-700 border-b">
                        <th className="py-2 pr-4">Activity</th>
                        <th className="py-2 pr-4">Type</th>
                        <th className="py-2 pr-4">Sessions</th>
                        <th className="py-2 pr-4">Completed</th>
                        <th className="py-2 pr-4">Total Participations</th>
                        <th className="py-2 pr-4">Present</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.activities.map((a) => (
                        <tr key={a.activity_id} className="border-b last:border-b-0">
                          <td className="py-2 pr-4 font-semibold text-gray-800">{a.activity_name}</td>
                          <td className="py-2 pr-4">
                            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium capitalize">{a.activity_type}</span>
                          </td>
                          <td className="py-2 pr-4">{a.sessions_count}</td>
                          <td className="py-2 pr-4">{a.completed_count}</td>
                          <td className="py-2 pr-4">{a.participations_count}</td>
                          <td className="py-2 pr-4">{a.present_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Sessions List */}
            {report.sessions?.length > 0 && (
              <Card title="Session Log">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-700 border-b">
                        <th className="py-2 pr-4">Date</th>
                        <th className="py-2 pr-4">Activity</th>
                        <th className="py-2 pr-4">Officer</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Attendance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.sessions.map((s) => (
                        <tr key={s.id} className="border-b last:border-b-0">
                          <td className="py-2 pr-4">{s.session_date}</td>
                          <td className="py-2 pr-4 font-medium">{s.activity_name}</td>
                          <td className="py-2 pr-4">{s.officer_name}</td>
                          <td className="py-2 pr-4">
                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusColor[s.status] || 'bg-gray-100 text-gray-700'}`}>
                              {s.status}
                            </span>
                          </td>
                          <td className="py-2 pr-4">{s.present_count} / {s.total_count} present</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Incidents / Notes */}
            {report.incidents?.length > 0 && (
              <Card title="Incident Notes">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-700 border-b">
                        <th className="py-2 pr-4">Date</th>
                        <th className="py-2 pr-4">Activity</th>
                        <th className="py-2 pr-4">Inmate</th>
                        <th className="py-2 pr-4">Inmate number</th>
                        <th className="py-2 pr-4">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.incidents.map((inc, i) => (
                        <tr key={i} className="border-b last:border-b-0 align-top">
                          <td className="py-2 pr-4 whitespace-nowrap">{inc.session_date}</td>
                          <td className="py-2 pr-4">{inc.activity_name}</td>
                          <td className="py-2 pr-4 font-medium">{inc.inmate_name}</td>
                          <td className="py-2 pr-4">{inc.prison_number}</td>
                          <td className="py-2 pr-4 text-gray-700 italic">{inc.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {report.incidents?.length === 0 && report.sessions?.length === 0 && (
              <Card>
                <p className="text-gray-500 text-sm italic">No activity data found for this period.</p>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
    {report && (
      <div id="activity-print-root">
        <div className="activity-print-section" style={{ borderBottom: '3px double #111', paddingBottom: 12, marginBottom: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>Republic of Malawi - Malawi Prison Service</div>
            <div style={{ fontSize: 10, marginTop: 2 }}>Mzuzu Correctional Facility</div>
            <div style={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase', marginTop: 8 }}>Activity Operational Report</div>
            <div style={{ display: 'inline-block', background: '#111', color: '#fff', padding: '2px 14px', fontSize: 10, marginTop: 4 }}>
              {meta?.label?.toUpperCase() || 'PERIOD REPORT'}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginTop: 12 }}>
            <span><strong>Period:</strong> {meta?.from} to {meta?.to}</span>
            <span><strong>Generated:</strong> {meta ? new Date(meta.generated_at).toLocaleString() : '-'}</span>
            <span><strong>Prepared by:</strong> {meta?.generated_by || '-'}</span>
          </div>
        </div>

        <div className="activity-print-section">
          <h2>1. Summary</h2>
          <table>
            <tbody>
              <tr><td>Total Sessions</td><td>{summary?.total_sessions ?? 0}</td><td>Completed</td><td>{summary?.completed_sessions ?? 0}</td></tr>
              <tr><td>Cancelled</td><td>{summary?.cancelled_sessions ?? 0}</td><td>In Progress</td><td>{summary?.in_progress_sessions ?? 0}</td></tr>
              <tr><td>Total Participations</td><td>{summary?.total_participations ?? 0}</td><td>Present</td><td>{summary?.total_present ?? 0}</td></tr>
              <tr><td>Absent</td><td>{summary?.total_absent ?? 0}</td><td>Late / Excused</td><td>{summary?.total_late ?? 0} / {summary?.total_excused ?? 0}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="activity-print-section">
          <h2>2. Activity Breakdown</h2>
          <table>
            <thead><tr><th>Activity</th><th>Type</th><th>Sessions</th><th>Completed</th><th>Participations</th><th>Present</th></tr></thead>
            <tbody>
              {(report.activities || []).map((activity) => (
                <tr key={activity.activity_id}>
                  <td>{activity.activity_name}</td>
                  <td>{activity.activity_type}</td>
                  <td>{activity.sessions_count}</td>
                  <td>{activity.completed_count}</td>
                  <td>{activity.participations_count}</td>
                  <td>{activity.present_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="activity-print-section">
          <h2>3. Session Log</h2>
          <table>
            <thead><tr><th>Date</th><th>Activity</th><th>Officer</th><th>Status</th><th>Attendance</th></tr></thead>
            <tbody>
              {(report.sessions || []).map((session) => (
                <tr key={session.id}>
                  <td>{session.session_date}</td>
                  <td>{session.activity_name}</td>
                  <td>{session.officer_name}</td>
                  <td>{session.status}</td>
                  <td>{session.present_count} / {session.total_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
    </>
  );
}
