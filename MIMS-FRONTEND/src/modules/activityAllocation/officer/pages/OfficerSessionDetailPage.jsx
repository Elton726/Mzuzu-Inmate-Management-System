import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Card from '../../../../components/common/Card';
import Spinner from '../../../../components/common/Spinner';
import Button from '../../../../components/common/Button';
import Input from '../../../../components/common/Input';
import { useToast } from '../../../../contexts/useToast';
import * as officerSessionService from '../services/officerSessionService';


const normalizeRow = (r) => ({
  id: r.id ?? null,
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
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [session, setSession] = useState(null);
  const [summary, setSummary] = useState(null);
  const [report, setReport] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [countdown, setCountdown] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  const load = async () => {
    try {
      setLoading(true);
      const [sRes, repRes, sumRes] = await Promise.all([
        officerSessionService.getSession(id),
        officerSessionService.getAttendanceReport(id),
        officerSessionService.getAttendanceSummary(id),
      ]);
      setSession(sRes?.data || null);

      const rows = (repRes?.data || []).map(normalizeRow);
      setReport(rows);
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

  // Countdown timer effect
  useEffect(() => {
    if (!session?.start_time || !session?.end_time) return;
    if (session.status === 'completed' || session.status === 'cancelled') return;

    const updateCountdown = () => {
      const now = new Date();
      const [startHours, startMinutes] = String(session.start_time).split(':').map(Number);
      const [endHours, endMinutes] = String(session.end_time).split(':').map(Number);

      const startDate = new Date();
      startDate.setHours(startHours, startMinutes, 0, 0);

      const endDate = new Date();
      endDate.setHours(endHours, endMinutes, 0, 0);

      // If end time is before start time (e.g., 20:00 to 02:00), add a day to end time
      if (endDate < startDate) {
        endDate.setDate(endDate.getDate() + 1);
      }

      const diff = endDate - now;

      if (diff <= 0) {
        setCountdown({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
        // Auto-update status to completed if not already
        if (session.status !== 'completed') {
          updateStatus('completed');
        }
      } else {
        const totalSeconds = Math.floor(diff / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        setCountdown({ hours, minutes, seconds, isExpired: false });

        // Auto-set to in_progress if not scheduled
        if (now >= startDate && session.status === 'scheduled') {
          updateStatus('in_progress');
        }
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [session]);

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

  const handleNotesBlur = async (attendanceId, status, notes) => {
    try {
      if (!attendanceId) return;
      await officerSessionService.updateAttendance(attendanceId, {
        attendance_status: status || 'present',
        notes: notes || null,
      });
      toast.push({ title: 'Incident log', message: 'Notes auto-saved.', variant: 'success' });
    } catch (err) {
      toast.fromError(err, { title: 'Notes auto-save failed' });
    }
  };

  const updateStatus = async (nextStatus) => {
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
          <Card><p className="text-gray-700">Session not found.</p></Card>
        </div>
      </div>
    );
  }

  const formattedDate = session.session_date ? String(session.session_date).split('T')[0] : '';

  return (
    <div className="min-h-screen bg-malawiGold p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Session #{session.id}</h1>
            <p className="text-sm text-gray-600">
              {formattedDate} • {session.session_time} • {session.activity?.name ?? `Activity #${session.activity_id}`} • {session.status}
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/officer/activity-sessions">
              <Button variant="outline">Back</Button>
            </Link>
          </div>
        </div>

        <Card title="Session status">
          <div className="space-y-4">
            {session.start_time && session.end_time && (
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <div className="text-sm text-blue-800 mb-2">Time remaining:</div>
                <div className="text-3xl font-bold text-blue-900">
                  {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
                </div>
                <div className="text-xs text-blue-700 mt-2">
                  Started at: {session.start_time} | Ends at: {session.end_time}
                </div>
                {countdown.isExpired && (
                  <div className="text-sm text-red-600 mt-2 font-semibold">
                    Session time has expired
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-4 flex-wrap">
              {session.status === 'in_progress' && (
                <>
                  <Button onClick={() => updateStatus('completed')} loading={updatingStatus}>
                    Mark Done
                  </Button>
                  <Button variant="outline" className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200" onClick={() => updateStatus('cancelled')} loading={updatingStatus}>
                    Cancel Activity
                  </Button>
                </>
              )}
            </div>
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

        <Card title="Assigned Inmates">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <Input
              label="Search"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Search by name or prison number..."
              className="max-w-md"
            />
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-700 border-b">
                  <th className="py-2 pr-4">Inmate</th>
                  <th className="py-2 pr-4">Prison #</th>
                  <th className="py-2 pr-4">Notes / Incidents</th>
                </tr>
              </thead>
              <tbody>
                {filteredReport.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-gray-600">
                      No assigned inmates found for this session.
                    </td>
                  </tr>
                ) : (
                  filteredReport.map((r) => (
                    <tr key={r.inmate_id} className="border-b last:border-b-0 align-top animate-fade-in">
                      <td className="py-2 pr-4">
                        <div className="font-semibold text-gray-800">{r.inmate_name}</div>
                        <div className="text-xs text-gray-500">Admission #{r.admission_id}</div>
                      </td>
                      <td className="py-2 pr-4">{r.prison_number}</td>
                      <td className="py-2 pr-4 w-[28rem]">
                        <Input
                          label=""
                          value={r.notes}
                          onChange={(e) => setRow(r.inmate_id, { notes: e.target.value })}
                          onBlur={() => handleNotesBlur(r.id, r.attendance_status, r.notes)}
                          placeholder="Record incidents (auto-saves on focus out)..."
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
