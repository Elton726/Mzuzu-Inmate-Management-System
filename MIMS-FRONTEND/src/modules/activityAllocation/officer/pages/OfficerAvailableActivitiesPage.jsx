import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MdChevronRight } from 'react-icons/md';
import Card from '../../../../components/common/Card';
import Spinner from '../../../../components/common/Spinner';
import Button from '../../../../components/common/Button';
import { useAuth } from '../../../../contexts/useAuth';
import { useToast } from '../../../../contexts/useToast';
import * as officerActivityService from '../services/officerActivityService';
import * as officerSessionService from '../services/officerSessionService';

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

const getTimeOfDayGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
};

function MetricCard({ label, value, description, accent, action }) {
  return (
    <div className={`flex min-h-[160px] flex-col rounded-2xl border border-gray-200 border-t-4 bg-white p-5 shadow-sm ${accent.card}`}>
      <div className={`text-xs font-bold uppercase tracking-widest ${accent.label}`}>{label}</div>
      <div className="mt-3 flex flex-1 flex-col justify-center">
        <div className={`text-4xl font-black tracking-tight ${accent.value}`}>{value}</div>
        <p className={`mt-2 text-sm leading-relaxed ${accent.description}`}>{description}</p>
      </div>
      {action ? <div className="mt-4 flex justify-end">{action}</div> : null}
    </div>
  );
}

function ProgressMetricCard({ label, value, subtitle, progress, accent, barClass = 'bg-malawiGreen' }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${accent}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">{label}</div>
      <div className="mt-2 text-3xl font-black text-gray-900">{value}</div>
      <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barClass}`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
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
  const { user } = useAuth();
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

  const greeting = getTimeOfDayGreeting();
  const displayName = user?.name || 'Officer';
  const internalQueue = internalActivities.slice(0, 5);
  const externalQueue = externalActivities.slice(0, 5);

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
        <section className="rounded-2xl bg-malawiBlack p-6 text-white shadow-xl md:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-malawiGold">🏠 Home</span>
            <span className="rounded-full bg-white/10 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/75">
              Officer On Duty
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight md:text-4xl lg:text-5xl">
            {greeting}, {displayName}
          </h1>
          <div className="mt-6">
            <Button onClick={load} className="bg-malawiGold text-malawiBlack hover:opacity-90">
              Refresh
            </Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Active Activities"
            value={activities.length}
            description="All activities available for officer actions"
            accent={{
              card: 'border-t-green-800',
              label: 'text-green-900',
              value: 'text-green-900',
              description: 'text-gray-600',
            }}
          />
          <MetricCard
            label="Internal Activities"
            value={internalActivities.length}
            description="Ready for daily session tracking"
            accent={{
              card: 'border-t-green-400 bg-green-50',
              label: 'text-green-700',
              value: 'text-green-800',
              description: 'text-green-900/70',
            }}
          />
          <MetricCard
            label="External Activities"
            value={externalActivities.length}
            description="Require one-time sessions or inmate allocation"
            accent={{
              card: 'border-t-blue-500 bg-blue-50',
              label: 'text-blue-700',
              value: 'text-blue-800',
              description: 'text-blue-900/70',
            }}
          />
          <MetricCard
            label="Open Sessions"
            value={openSessions.length}
            description="Sessions still active or waiting to be completed"
            accent={{
              card: 'border-t-amber-600 bg-amber-50',
              label: 'text-amber-800',
              value: 'text-amber-900',
              description: 'text-amber-900/70',
            }}
            action={
              openSessions.length > 0 ? (
                <Link to="/officer/activity-sessions">
                  <Button
                    variant="outline"
                    className="gap-1 border-amber-300 bg-white/80 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                  >
                    View
                    <MdChevronRight className="text-base" />
                  </Button>
                </Link>
              ) : null
            }
          />
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <ProgressMetricCard
            label="Completion Rate"
            value="80%"
            subtitle="Activities completed today."
            progress={80}
            accent="border-emerald-200 bg-white"
            barClass="bg-emerald-500"
          />
          <ProgressMetricCard
            label="Participation"
            value="45 / 60"
            subtitle="Inmates allocated today."
            progress={75}
            accent="border-violet-200 bg-white"
            barClass="bg-violet-500"
          />
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
