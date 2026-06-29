import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Spinner from '../../../../components/common/Spinner';
import Card from '../../../../components/common/Card';
import Button from '../../../../components/common/Button';
import Input from '../../../../components/common/Input';
import Select from '../../../../components/common/Select';
import ConfirmModal from '../../../../components/common/ConfirmModal';
import { useToast } from '../../../../contexts/useToast';
import * as officerSessionService from '../services/officerSessionService';

const statusOptions = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function OfficerSessionsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [meta, setMeta] = useState(null);
  const [filters, setFilters] = useState({ per_page: 15 });
  const [deleteId, setDeleteId] = useState(null);

  const queryParams = useMemo(() => {
    const next = { ...filters };
    Object.keys(next).forEach((k) => {
      if (next[k] == null || next[k] === '') delete next[k];
    });
    return next;
  }, [filters]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await officerSessionService.getSessions(queryParams);
      const payload = res?.data || {};
      setSessions(payload?.data || []);
      setMeta({
        current_page: payload?.current_page,
        last_page: payload?.last_page,
        total: payload?.total,
      });
    } catch (err) {
      toast.fromError(err, { title: 'Activity sessions' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParams]);

  const confirmDelete = async () => {
    try {
      if (!deleteId) return;
      await officerSessionService.deleteSession(deleteId);
      setDeleteId(null);
      toast.push({ title: 'Activity session', message: 'Deleted successfully.', variant: 'success' });
      await load();
    } catch (err) {
      toast.fromError(err, { title: 'Delete failed' });
    }
  };

  return (
    <div className="min-h-screen bg-malawiGold p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">My Activity Sessions</h1>
            <p className="text-sm text-gray-600">You only see sessions created for your duty period.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/officer/activities">
              <Button variant="outline">Available Activities</Button>
            </Link>
            <Link to="/officer/activity-sessions/new">
              <Button>Create Session</Button>
            </Link>
          </div>
        </div>

        <Card title="Filters">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              label="Activity ID"
              type="number"
              value={filters.activity_id ?? ''}
              onChange={(e) => setFilters((p) => ({ ...p, activity_id: e.target.value }))}
              hint="Optional numeric activity id"
            />
            <Input
              label="Session date"
              type="date"
              value={filters.session_date ?? ''}
              onChange={(e) => setFilters((p) => ({ ...p, session_date: e.target.value }))}
            />
            <Select
              label="Status"
              value={filters.status ?? ''}
              onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
              options={statusOptions}
            />
            <div className="flex items-end">
              <p className="text-sm text-gray-600">Sessions are automatically filtered to your officer account.</p>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setFilters({ per_page: 15 })}
            >
              Clear
            </Button>
          </div>
        </Card>

        {loading ? (
          <Spinner label="Loading sessions..." />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-700 border-b">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Time</th>
                    <th className="py-2 pr-4">Activity</th>
                    <th className="py-2 pr-4">Officer</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-gray-600">
                        No sessions found.
                      </td>
                    </tr>
                  ) : (
                    sessions.map((s) => (
                      <tr key={s.id} className="border-b last:border-b-0">
                        <td className="py-2 pr-4">{s.session_date}</td>
                        <td className="py-2 pr-4">{s.session_time}</td>
                        <td className="py-2 pr-4">{s.activity?.name ?? `#${s.activity_id}`}</td>
                        <td className="py-2 pr-4">{s.supervising_officer?.name ?? `#${s.supervising_officer_id}`}</td>
                        <td className="py-2 pr-4">{s.status}</td>
                        <td className="py-2 pr-4">
                          <div className="flex flex-wrap gap-2">
                            <Link to={`/officer/activity-sessions/${s.id}`}>
                              <Button variant="outline" className="px-3 py-1 text-xs">View</Button>
                            </Link>
                            {s.status !== 'completed' && s.status !== 'in_progress' && (
                              <Button
                                variant="danger"
                                className="px-3 py-1 text-xs"
                                onClick={() => setDeleteId(s.id)}
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {meta && (
              <div className="mt-4 text-sm text-gray-600">
                Page {meta.current_page || 1} of {meta.last_page || 1} • Total {meta.total || 0}
              </div>
            )}
          </Card>
        )}

        <ConfirmModal
          open={!!deleteId}
          title="Delete Activity Session"
          message="Delete this session? This is only allowed when no attendance has been recorded."
          confirmText="Delete"
          confirmVariant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteId(null)}
        />
      </div>
    </div>
  );
}
