import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Card from '../../../../components/common/Card';
import Spinner from '../../../../components/common/Spinner';
import Button from '../../../../components/common/Button';
import Input from '../../../../components/common/Input';
import Select from '../../../../components/common/Select';
import { useToast } from '../../../../contexts/useToast';
import * as officerActivityService from '../services/officerActivityService';
import * as officerSessionService from '../services/officerSessionService';

const typeOptions = [
  { value: '', label: 'All activities' },
  { value: 'internal', label: 'Internal only' },
  { value: 'external', label: 'External only' },
];

const statusTone = {
  scheduled: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const securityTone = {
  maximum: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  minimum: 'bg-emerald-100 text-emerald-700',
};

const formatStatusLabel = (value) =>
  String(value || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const formatSessionMeta = (session) => {
  const bits = [
    session?.session_date || 'No date',
    session?.session_time || 'No time',
    formatStatusLabel(session?.status || 'scheduled'),
  ];

  return bits.join(' • ');
};

function MetricCard({ label, value, helper, accent }) {
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${accent}`}>
      <div className="text-sm font-semibold uppercase tracking-[0.18em]">{label}</div>
      <div className="mt-3 text-4xl font-black">{value}</div>
      <div className="mt-2 text-sm opacity-80">{helper}</div>
    </div>
  );
}

function ActionTile({ title, description, action, secondary, tone = 'light' }) {
  const tones = {
    light: 'bg-white border border-gray-200 text-gray-800',
    dark: 'bg-malawiBlack text-malawiGold border border-malawiBlack',
    green: 'bg-malawiGreen text-white border border-malawiGreen',
  };

  return (
    <div className={`rounded-3xl p-5 shadow-sm ${tones[tone] || tones.light}`}>
      <div className="text-lg font-bold">{title}</div>
      <p className="mt-2 text-sm opacity-90">{description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {action}
        {secondary}
      </div>
    </div>
  );
}

function SessionRow({ session }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3">
      <div>
        <div className="font-semibold text-gray-900">{session.activity?.name ?? `Activity #${session.activity_id}`}</div>
        <div className="text-sm text-gray-500">{formatSessionMeta(session)}</div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone[session.status] || 'bg-gray-100 text-gray-700'}`}>
          {formatStatusLabel(session.status)}
        </span>
        <Link to={`/officer/activity-sessions/${session.id}`}>
          <Button variant="outline" className="px-3 py-1 text-xs">
            Open
          </Button>
        </Link>
      </div>
    </div>
  );
}

function ActivityQueueCard({ title, subtitle, emptyText, activities, renderActions }) {
  return (
    <Card className="rounded-3xl shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </div>
        <div className="rounded-full bg-malawiGold px-3 py-1 text-xs font-semibold text-malawiBlack">
          {activities.length} shown
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {activities.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-sm text-gray-500">
            {emptyText}
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-gray-900">{activity.name}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-white px-3 py-1 font-semibold text-gray-700">
                      {activity.category?.name ?? 'Uncategorized'}
                    </span>
                    <span className={`rounded-full px-3 py-1 font-semibold ${securityTone[activity.security_level] || 'bg-gray-200 text-gray-700'}`}>
                      {activity.security_level || 'No security'}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 font-semibold text-gray-700">
                      {formatStatusLabel(activity.activity_type)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">{renderActions(activity)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

export default function OfficerAvailableActivitiesPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [filters, setFilters] = useState({ per_page: 100, activity_type: '', search: '' });
  const [workingAction, setWorkingAction] = useState('');

  const queryParams = useMemo(() => {
    const next = { ...filters };
    Object.keys(next).forEach((key) => {
      if (next[key] == null || next[key] === '') delete next[key];
    });
    return next;
  }, [filters]);

  const load = async () => {
    try {
      setLoading(true);
      const [activitiesRes, sessionsRes] = await Promise.all([
        officerActivityService.getAvailableActivities(queryParams),
        officerSessionService.getSessions({ per_page: 8 }),
      ]);

      const activitiesPayload = activitiesRes?.data || {};
      const sessionsPayload = sessionsRes?.data || {};

      setActivities(activitiesPayload?.data || []);
      setSessions(sessionsPayload?.data || []);
    } catch (err) {
      toast.fromError(err, { title: 'Officer dashboard' });
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
    const actionKey = `internal-${activity.id}`;
    try {
      setWorkingAction(actionKey);
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
    } finally {
      setWorkingAction('');
    }
  };

  const openExternalOnceSession = async (activity) => {
    const actionKey = `external-${activity.id}`;
    try {
      setWorkingAction(actionKey);
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
    } finally {
      setWorkingAction('');
    }
  };

  const openAllocation = (activity) => {
    navigate(`/officer/activities/${activity.id}/allocations`);
  };

  const internalActivities = useMemo(
    () => activities.filter((activity) => activity.activity_type === 'internal'),
    [activities]
  );

  const externalActivities = useMemo(
    () => activities.filter((activity) => activity.activity_type === 'external'),
    [activities]
  );

  const openSessions = useMemo(
    () => sessions.filter((session) => !['completed', 'cancelled'].includes(session.status)),
    [sessions]
  );

  const spotlightSession = openSessions[0] ?? sessions[0] ?? null;
  const recentSessions = sessions.slice(0, 4);
  const internalQueue = internalActivities.slice(0, 5);
  const externalQueue = externalActivities.slice(0, 5);
  const firstInternal = internalActivities[0] ?? null;
  const firstExternal = externalActivities[0] ?? null;

  if (loading) {
    return (
      <div className="min-h-screen bg-malawiGold px-4 py-8 md:px-8">
        <div className="mx-auto max-w-7xl">
          <Spinner label="Loading officer dashboard..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-malawiGold px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[2rem] bg-malawiBlack text-white shadow-2xl">
          <div className="grid gap-8 px-6 py-8 md:grid-cols-[1.4fr_0.9fr] md:px-8">
            <div>
              <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-malawiGold">
                Officer On Duty
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">
                Activity Allocation Dashboard
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80 md:text-base">
                Start sessions, move into attendance quickly, and follow up on external allocations from one working screen.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={load} className="bg-malawiGold text-malawiBlack hover:opacity-90">
                  Refresh Dashboard
                </Button>
                <Link to="/officer/activity-sessions">
                  <Button variant="outline" className="border-white text-white hover:bg-white hover:text-malawiBlack">
                    View All Sessions
                  </Button>
                </Link>
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-white/8 p-5 backdrop-blur-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-malawiGold">Session spotlight</div>
              {spotlightSession ? (
                <div className="mt-4 space-y-3">
                  <div className="text-2xl font-bold">{spotlightSession.activity?.name ?? `Activity #${spotlightSession.activity_id}`}</div>
                  <div className="text-sm text-white/75">{formatSessionMeta(spotlightSession)}</div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone[spotlightSession.status] || 'bg-gray-100 text-gray-700'}`}>
                      {formatStatusLabel(spotlightSession.status)}
                    </span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                      Officer session queue
                    </span>
                  </div>
                  <Link to={`/officer/activity-sessions/${spotlightSession.id}`}>
                    <Button className="mt-2 w-full">Open Session Workspace</Button>
                  </Link>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-white/20 px-4 py-6 text-sm text-white/70">
                  No recent sessions yet. Use the action tiles below to start today’s work.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Active Activities"
            value={activities.length}
            helper="All activities available for officer actions"
            accent="border-malawiBlack/10 bg-white text-gray-900"
          />
          <MetricCard
            label="Internal Activities"
            value={internalActivities.length}
            helper="Ready for daily session tracking"
            accent="border-green-200 bg-green-50 text-green-900"
          />
          <MetricCard
            label="External Activities"
            value={externalActivities.length}
            helper="Require one-time sessions or inmate allocation"
            accent="border-blue-200 bg-blue-50 text-blue-900"
          />
          <MetricCard
            label="Open Sessions"
            value={openSessions.length}
            helper="Sessions still active or waiting to be completed"
            accent="border-amber-200 bg-amber-50 text-amber-900"
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <ActionTile
            title="Start Internal Work"
            description="Jump straight into the first available internal activity and open or reuse today’s session."
            tone="green"
            action={
              <Button
                onClick={() => firstInternal && openTodaySession(firstInternal)}
                disabled={!firstInternal}
                loading={workingAction === `internal-${firstInternal?.id}`}
              >
                {firstInternal ? `Open ${firstInternal.name}` : 'No internal activity'}
              </Button>
            }
            secondary={
              <Link to="/officer/activity-sessions/new">
                <Button variant="outline" className="border-white text-white hover:bg-white hover:text-malawiGreen">
                  New Session Form
                </Button>
              </Link>
            }
          />
          <ActionTile
            title="Handle External Allocation"
            description="Move into allocation or create the one-time external session for the next external activity in queue."
            tone="dark"
            action={
              <Button
                onClick={() => firstExternal && openAllocation(firstExternal)}
                disabled={!firstExternal}
              >
                {firstExternal ? 'Open Allocation Queue' : 'No external activity'}
              </Button>
            }
            secondary={
              <Button
                variant="outline"
                className="border-malawiGold text-malawiGold hover:bg-malawiGold hover:text-malawiBlack"
                onClick={() => firstExternal && openExternalOnceSession(firstExternal)}
                disabled={!firstExternal}
                loading={workingAction === `external-${firstExternal?.id}`}
              >
                Create One-Time Session
              </Button>
            }
          />
          <ActionTile
            title="Useful Shortcuts"
            description="Open the core module screens officers use most during a duty period."
            action={
              <Link to="/officer/activity-sessions">
                <Button>Session Register</Button>
              </Link>
            }
            secondary={
              <Link to="/officer/activity-sessions/new">
                <Button variant="outline">Manual Session Setup</Button>
              </Link>
            }
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="rounded-3xl shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Recent Session Activity</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Pick up ongoing work or reopen a recently created session.
                </p>
              </div>
              <Link to="/officer/activity-sessions">
                <Button variant="outline">Full Register</Button>
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {recentSessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-sm text-gray-500">
                  No sessions available yet.
                </div>
              ) : (
                recentSessions.map((session) => <SessionRow key={session.id} session={session} />)
              )}
            </div>
          </Card>

          <Card className="rounded-3xl shadow-lg">
            <h2 className="text-xl font-bold text-gray-900">Activity Filters</h2>
            <p className="mt-1 text-sm text-gray-500">
              Narrow the activity workspace below by name or type.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-3 xl:grid-cols-1">
              <Input
                label="Search"
                value={filters.search ?? ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                placeholder="Activity name"
              />
              <Select
                label="Type"
                value={filters.activity_type ?? ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, activity_type: e.target.value }))}
                options={typeOptions}
              />
              <div className="flex items-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setFilters({ per_page: 100, activity_type: '', search: '' })}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <ActivityQueueCard
            title="Internal Session Queue"
            subtitle="Internal activities are tracked daily. Open today’s session or go to the full form when you need manual control."
            emptyText="No internal activities match the current filters."
            activities={internalQueue}
            renderActions={(activity) => (
              <>
                <Button
                  className="px-3 py-1 text-xs"
                  onClick={() => openTodaySession(activity)}
                  loading={workingAction === `internal-${activity.id}`}
                >
                  Today’s Session
                </Button>
                <Button
                  variant="outline"
                  className="px-3 py-1 text-xs"
                  onClick={() => openCreateSession(activity)}
                >
                  Open Form
                </Button>
              </>
            )}
          />

          <ActivityQueueCard
            title="External Allocation Queue"
            subtitle="External activities usually need inmate allocation plus a one-time session before attendance can be tracked."
            emptyText="No external activities match the current filters."
            activities={externalQueue}
            renderActions={(activity) => (
              <>
                <Button
                  className="px-3 py-1 text-xs"
                  onClick={() => openAllocation(activity)}
                >
                  Allocate Inmates
                </Button>
                <Button
                  variant="outline"
                  className="px-3 py-1 text-xs"
                  onClick={() => openExternalOnceSession(activity)}
                  loading={workingAction === `external-${activity.id}`}
                >
                  Create Session
                </Button>
              </>
            )}
          />
        </section>

        <Card className="rounded-3xl shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Operational Activity List</h2>
              <p className="mt-1 text-sm text-gray-500">
                Full list of active activities with the most common officer actions kept close at hand.
              </p>
            </div>
            <div className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
              {activities.length} active activities
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-700">
                  <th className="py-3 pr-4">Name</th>
                  <th className="py-3 pr-4">Type</th>
                  <th className="py-3 pr-4">Category</th>
                  <th className="py-3 pr-4">Security</th>
                  <th className="py-3 pr-4">Max</th>
                  <th className="py-3 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activities.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-gray-500">
                      No active activities found for the current filters.
                    </td>
                  </tr>
                ) : (
                  activities.map((activity) => (
                    <tr key={activity.id} className="border-b last:border-b-0">
                      <td className="py-3 pr-4 font-semibold text-gray-900">{activity.name}</td>
                      <td className="py-3 pr-4">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                          {formatStatusLabel(activity.activity_type)}
                        </span>
                      </td>
                      <td className="py-3 pr-4">{activity.category?.name ?? '-'}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${securityTone[activity.security_level] || 'bg-gray-100 text-gray-700'}`}>
                          {activity.security_level ?? 'No security'}
                        </span>
                      </td>
                      <td className="py-3 pr-4">{activity.max_participants ?? '-'}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-2">
                          {activity.activity_type === 'internal' ? (
                            <Button
                              className="px-3 py-1 text-xs"
                              onClick={() => openTodaySession(activity)}
                              loading={workingAction === `internal-${activity.id}`}
                            >
                              Today’s Session
                            </Button>
                          ) : (
                            <>
                              <Button
                                className="px-3 py-1 text-xs"
                                onClick={() => openExternalOnceSession(activity)}
                                loading={workingAction === `external-${activity.id}`}
                              >
                                Create Session
                              </Button>
                              <Button
                                variant="outline"
                                className="px-3 py-1 text-xs"
                                onClick={() => openAllocation(activity)}
                              >
                                Allocate Inmates
                              </Button>
                            </>
                          )}
                          <Button
                            variant="outline"
                            className="px-3 py-1 text-xs"
                            onClick={() => openCreateSession(activity)}
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
      </div>
    </div>
  );
}
