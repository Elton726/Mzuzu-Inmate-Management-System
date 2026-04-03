import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../../../components/common/Card';
import Spinner from '../../../../components/common/Spinner';
import Button from '../../../../components/common/Button';
import Input from '../../../../components/common/Input';
import Select from '../../../../components/common/Select';
import { useToast } from '../../../../contexts/useToast';
import * as officerActivityService from '../services/officerActivityService';
import * as officerSessionService from '../services/officerSessionService';

const typeOptions = [
  { value: '', label: 'All' },
  { value: 'internal', label: 'Internal' },
  { value: 'external', label: 'External' },
];

export default function OfficerAvailableActivitiesPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [filters, setFilters] = useState({ per_page: 100, activity_type: '', search: '' });

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
      const res = await officerActivityService.getAvailableActivities(queryParams);
      const payload = res?.data || {};
      setActivities(payload?.data || []);
    } catch (err) {
      toast.fromError(err, { title: 'Available activities' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParams]);

  const openCreateSession = (activity) => {
    navigate(`/officer/activity-sessions/new?activity_id=${activity.id}`);
  };

  const openTodaySession = async (activity) => {
    try {
      const res = await officerSessionService.getOrCreateDailySession({ activity_id: activity.id });
      const session = res?.data;
      if (!session?.id) {
        toast.push({ title: 'Daily session', message: 'Session created, but no id returned.', variant: 'error' });
        return;
      }
      toast.push({
        title: 'Daily session',
        message: res?.status === 200 ? 'Today’s session already exists.' : 'Today’s session created.',
        variant: 'success',
      });
      navigate(`/officer/activity-sessions/${session.id}`);
    } catch (err) {
      toast.fromError(err, { title: 'Daily session' });
    }
  };

  const openExternalOnceSession = async (activity) => {
    try {
      const res = await officerSessionService.getOrCreateExternalOnceSession({ activity_id: activity.id });
      const session = res?.data;
      if (!session?.id) {
        toast.push({ title: 'External session', message: 'Session created, but no id returned.', variant: 'error' });
        return;
      }
      toast.push({
        title: 'External session',
        message: res?.status === 200 ? 'Session already exists.' : 'Session created.',
        variant: 'success',
      });
      navigate(`/officer/activity-sessions/${session.id}`);
    } catch (err) {
      toast.fromError(err, { title: 'External session' });
    }
  };

  const openAllocation = (activity) => {
    navigate(`/officer/activities/${activity.id}/allocations`);
  };

  return (
    <div className="min-h-screen bg-malawiGold p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Available Activities</h1>
          <Button variant="outline" onClick={() => navigate('/officer/activity-sessions')}>
            View Sessions
          </Button>
        </div>

        <Card title="Filters">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Search"
              value={filters.search ?? ''}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              placeholder="Activity name"
            />
            <Select
              label="Type"
              value={filters.activity_type ?? ''}
              onChange={(e) => setFilters((p) => ({ ...p, activity_type: e.target.value }))}
              options={typeOptions}
            />
            <div className="flex items-end justify-end">
              <Button variant="outline" onClick={() => setFilters({ per_page: 100, activity_type: '', search: '' })}>
                Clear
              </Button>
            </div>
          </div>
        </Card>

        {loading ? (
          <Spinner label="Loading activities..." />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-700 border-b">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Category</th>
                    <th className="py-2 pr-4">Security</th>
                    <th className="py-2 pr-4">Max</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-gray-600">
                        No active activities found.
                      </td>
                    </tr>
                  ) : (
                    activities.map((a) => (
                      <tr key={a.id} className="border-b last:border-b-0">
                        <td className="py-2 pr-4">{a.name}</td>
                        <td className="py-2 pr-4">{a.activity_type}</td>
                        <td className="py-2 pr-4">{a.category?.name ?? '-'}</td>
                        <td className="py-2 pr-4">{a.security_level ?? '-'}</td>
                        <td className="py-2 pr-4">{a.max_participants ?? '-'}</td>
                        <td className="py-2 pr-4">
                          <div className="flex flex-wrap gap-2">
                            {a.activity_type === 'internal' ? (
                              <Button
                                className="px-3 py-1 text-xs"
                                onClick={() => openTodaySession(a)}
                              >
                                Today’s Session
                              </Button>
                            ) : (
                              <>
                                <Button className="px-3 py-1 text-xs" onClick={() => openExternalOnceSession(a)}>
                                  Create Session
                                </Button>
                                <Button
                                  variant="outline"
                                  className="px-3 py-1 text-xs"
                                  onClick={() => openAllocation(a)}
                                >
                                  Allocate Inmates
                                </Button>
                              </>
                            )}
                            <Button
                              variant="outline"
                              className="px-3 py-1 text-xs"
                              onClick={() => openCreateSession(a)}
                            >
                              Open Form
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
