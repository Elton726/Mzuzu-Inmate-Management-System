import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Card from '../../../../components/common/Card';
import Spinner from '../../../../components/common/Spinner';
import Button from '../../../../components/common/Button';
import Select from '../../../../components/common/Select';
import Input from '../../../../components/common/Input';
import { useToast } from '../../../../contexts/useToast';
import * as officerSessionService from '../services/officerSessionService';

const attendanceOptions = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
  { value: 'excused', label: 'Excused' },
];

const normalizeRow = (r) => ({
  inmate_id: r.inmate_id,
  inmate_name: r.inmate_name,
  prison_number: r.prison_number,
  admission_id: r.admission_id,
  attendance_status: r.attendance_status,
  notes: r.notes ?? '',
  recorded_at: r.recorded_at ?? null,
});

export default function OfficerSessionDetailPage() {
  const { id } = useParams();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [session, setSession] = useState(null);
  const [summary, setSummary] = useState(null);
  const [report, setReport] = useState([]);
  const [originalReport, setOriginalReport] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [statusDraft, setStatusDraft] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const [sRes, repRes, sumRes] = await Promise.all([
        officerSessionService.getSession(id),
        officerSessionService.getAttendanceReport(id),
        officerSessionService.getAttendanceSummary(id),
      ]);
      setSession(sRes?.data || null);
      setStatusDraft(sRes?.data?.status || '');

      const rows = (repRes?.data || []).map(normalizeRow);
      setReport(rows);
      setOriginalReport(rows);
      setSummary(sumRes?.data || null);
    } catch (err) {
      toast.fromError(err, { title: 'Session' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const filteredReport = useMemo(() => {
    const q = String(filterText || '').trim().toLowerCase();
    if (!q) return report;
    return report.filter((r) => {
      return (
        String(r.inmate_name || '').toLowerCase().includes(q) ||
        String(r.prison_number || '').toLowerCase().includes(q)
      );
    });
  }, [filterText, report]);

  const setRow = (inmateId, patch) => {
    setReport((prev) =>
      prev.map((r) => (r.inmate_id === inmateId ? { ...r, ...patch } : r))
    );
  };

  const submitAttendance = async () => {
    try {
      setSaving(true);

      const before = new Map(originalReport.map((r) => [r.inmate_id, r]));
      const changed = report.filter((r) => {
        const prev = before.get(r.inmate_id);
        if (!prev) return r.attendance_status !== 'unmarked' || (r.notes || '') !== '';
        return r.attendance_status !== prev.attendance_status || (r.notes || '') !== (prev.notes || '');
      });

      const payload = changed
        .filter((r) => r.attendance_status && r.attendance_status !== 'unmarked')
        .map((r) => ({
          inmate_id: r.inmate_id,
          admission_id: r.admission_id,
          attendance_status: r.attendance_status,
          notes: r.notes || null,
        }));

      if (payload.length === 0) {
        toast.push({ title: 'Attendance', message: 'No changes to save.', variant: 'success' });
        return;
      }

      await officerSessionService.recordBulkAttendance(id, payload);
      toast.push({ title: 'Attendance', message: 'Saved successfully.', variant: 'success' });
      await load();
    } catch (err) {
      toast.fromError(err, { title: 'Save attendance failed' });
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (nextStatus = statusDraft) => {
    try {
      if (!session?.id) return;
      if (!nextStatus || nextStatus === session.status) {
        toast.push({ title: 'Session status', message: 'No status change to save.', variant: 'success' });
        return;
      }

      setUpdatingStatus(true);
      await officerSessionService.updateSession(session.id, { status: nextStatus });
      toast.push({ title: 'Session status', message: 'Updated successfully.', variant: 'success' });
      await load();
    } catch (err) {
      toast.fromError(err, { title: 'Status update failed' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-malawiGold p-8">
        <div className="max-w-7xl mx-auto">
          <Spinner label="Loading session..." />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-malawiGold p-8">
        <div className="max-w-7xl mx-auto">
          <Card>
            <p className="text-gray-700">Session not found.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-malawiGold p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Session #{session.id}</h1>
            <p className="text-sm text-gray-600">
              {session.session_date} • {session.session_time} • {session.activity?.name ?? `Activity #${session.activity_id}`} • {session.status}
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/officer/activity-sessions">
              <Button variant="outline">Back</Button>
            </Link>
          </div>
        </div>

        <Card title="Session status">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="min-w-56">
              <Select
                label="Status"
                value={statusDraft}
                onChange={(e) => setStatusDraft(e.target.value)}
                options={[
                  { value: 'scheduled', label: 'Scheduled' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
                hint="Session details stay locked, but status can still be changed."
              />
            </div>
            <Button onClick={() => updateStatus()} loading={updatingStatus}>
              Update Status
            </Button>
            {session.status !== 'completed' && (
              <Button variant="outline" onClick={() => updateStatus('completed')} loading={updatingStatus}>
                Mark Done
              </Button>
            )}
          </div>
        </Card>

        <Card title="Attendance summary">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div className="bg-gray-50 rounded p-3">
              <div className="text-gray-500">Recorded</div>
              <div className="text-lg font-bold">{summary?.total_recorded ?? 0}</div>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <div className="text-gray-500">Present</div>
              <div className="text-lg font-bold">{summary?.total_present ?? 0}</div>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <div className="text-gray-500">Absent</div>
              <div className="text-lg font-bold">{summary?.total_absent ?? 0}</div>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <div className="text-gray-500">Late</div>
              <div className="text-lg font-bold">{summary?.total_late ?? 0}</div>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <div className="text-gray-500">Excused</div>
              <div className="text-lg font-bold">{summary?.total_excused ?? 0}</div>
            </div>
          </div>
        </Card>

        <Card title="Record attendance">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <Input
              label="Search"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Search by name or prison number..."
              className="max-w-md"
            />
            <Button onClick={submitAttendance} loading={saving}>
              Save Attendance
            </Button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-700 border-b">
                  <th className="py-2 pr-4">Inmate</th>
                  <th className="py-2 pr-4">Prison #</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredReport.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-gray-600">
                      No assigned inmates found for this session.
                    </td>
                  </tr>
                ) : (
                  filteredReport.map((r) => (
                    <tr key={r.inmate_id} className="border-b last:border-b-0 align-top">
                      <td className="py-2 pr-4">
                        <div className="font-semibold text-gray-800">{r.inmate_name}</div>
                        <div className="text-xs text-gray-500">Admission #{r.admission_id}</div>
                      </td>
                      <td className="py-2 pr-4">{r.prison_number}</td>
                      <td className="py-2 pr-4 w-52">
                        <Select
                          label=""
                          value={r.attendance_status === 'unmarked' ? '' : r.attendance_status}
                          onChange={(e) =>
                            setRow(r.inmate_id, {
                              attendance_status: e.target.value ? e.target.value : 'unmarked',
                            })
                          }
                          options={attendanceOptions}
                          hint={r.attendance_status === 'unmarked' ? 'Unmarked' : undefined}
                        />
                      </td>
                      <td className="py-2 pr-4 w-[28rem]">
                        <Input
                          label=""
                          value={r.notes}
                          onChange={(e) => setRow(r.inmate_id, { notes: e.target.value })}
                          placeholder="Optional notes..."
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
