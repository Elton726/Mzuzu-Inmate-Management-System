import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Spinner from '../../../../components/common/Spinner';
import Button from '../../../../components/common/Button';
import { useAuth } from '../../../../contexts/useAuth';
import { useToast } from '../../../../contexts/useToast';
import * as officerActivityService from '../services/officerActivityService';
import * as officerSessionService from '../services/officerSessionService';
import * as officerDashboardService from '../services/officerDashboardService';
import ActivityQueueWidget from '../components/ActivityQueueWidget';

const defaultDashboardMetrics = {
  completion_rate: { percent: 0, completed_sessions: 0, total_sessions: 0 },
  participation: { allocated: 0, capacity: 0, percent: 0 },
};

const getTimeOfDayGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
};

function MetricCard({ label, value, description, accent, to, ariaLabel }) {
  const navigate = useNavigate();

  const handleActivate = () => {
    if (to) navigate(to);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleActivate();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel || `View ${label}`}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      className={`flex min-h-[160px] cursor-pointer flex-col rounded-2xl border border-gray-200 border-t-4 bg-white p-5 shadow-sm transition-all duration-200 hover:scale-[1.01] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-offset-2 dark:border-slate-600 dark:bg-slate-800 dark:hover:shadow-lg dark:hover:shadow-black/30 dark:focus:ring-green-400 dark:focus:ring-offset-slate-900 ${accent.card}`}
    >
      <div className={`text-xs font-bold uppercase tracking-widest ${accent.label}`}>{label}</div>
      <div className="mt-3 flex flex-1 flex-col justify-center">
        <div className={`text-4xl font-black tracking-tight ${accent.value}`}>{value}</div>
        <p className={`mt-2 text-sm leading-relaxed ${accent.description}`}>{description}</p>
      </div>
    </div>
  );
}

function ProgressMetricCard({ label, value, subtitle, progress, accent, barClass = 'bg-malawiGreen', valueClass = 'text-gray-900' }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${accent}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-slate-400">{label}</div>
      <div className={`mt-2 text-3xl font-black ${valueClass}`}>{value}</div>
      <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">{subtitle}</p>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barClass}`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}

export default function OfficerAvailableActivitiesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isActivitiesPage = location.pathname === '/officer/activities';
  const activityTypeFilter = searchParams.get('type');
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [workingAction, setWorkingAction] = useState('');
  const [dashboardMetrics, setDashboardMetrics] = useState(defaultDashboardMetrics);

  const filters = useMemo(() => {
    const next = { per_page: 100, activity_type: '', search: '' };

    if (isActivitiesPage && (activityTypeFilter === 'internal' || activityTypeFilter === 'external')) {
      next.activity_type = activityTypeFilter;
    }

    return next;
  }, [isActivitiesPage, activityTypeFilter]);

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
      const requests = [
        officerActivityService.getAvailableActivities(queryParams),
        officerSessionService.getSessions({ per_page: 8 }),
      ];

      if (!isActivitiesPage) {
        requests.push(officerDashboardService.getDashboardMetrics());
      }

      const results = await Promise.all(requests);
      const activitiesRes = results[0];
      const sessionsRes = results[1];
      const metricsRes = !isActivitiesPage ? results[2] : null;

      const activitiesPayload = activitiesRes?.data || {};
      const sessionsPayload = sessionsRes?.data || {};

      setActivities(activitiesPayload?.data || []);
      setSessions(sessionsPayload?.data || []);

      if (metricsRes?.data) {
        setDashboardMetrics({
          completion_rate: {
            percent: metricsRes.data?.completion_rate?.percent ?? 0,
            completed_sessions: metricsRes.data?.completion_rate?.completed_sessions ?? 0,
            total_sessions: metricsRes.data?.completion_rate?.total_sessions ?? 0,
          },
          participation: {
            allocated: metricsRes.data?.participation?.allocated ?? 0,
            capacity: metricsRes.data?.participation?.capacity ?? 0,
            percent: metricsRes.data?.participation?.percent ?? 0,
          },
        });
      }
    } catch (err) {
      toast.fromError(err, { title: isActivitiesPage ? 'Available activities' : 'Officer dashboard' });
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

  const openAutoAssign = (activity) => {
    navigate(`/officer/internal-activities/${activity.id}/auto-assign`);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-malawiGold px-4 py-8 md:px-8">
        <div className="mx-auto max-w-7xl">
          <Spinner label={isActivitiesPage ? 'Loading available activities...' : 'Loading officer dashboard...'} />
        </div>
      </div>
    );
  }

  if (isActivitiesPage) {
    const queueHandlers = {
      workingAction,
      onOpenTodaySession: openTodaySession,
      onOpenExternalOnceSession: openExternalOnceSession,
      onOpenAllocation: openAllocation,
      onOpenCreateSession: openCreateSession,
      onOpenAutoAssign: openAutoAssign,
    };

    const showInternal = !activityTypeFilter || activityTypeFilter === 'internal';
    const showExternal = !activityTypeFilter || activityTypeFilter === 'external';

    return (
      <div className="min-h-screen bg-malawiGold px-4 py-8 md:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {showInternal ? (
            <ActivityQueueWidget
              title="Internal Activity Queue"
              subtitle="Internal activities are tracked daily. Open today’s session or go to the full form when you need manual control."
              emptyText="No internal activities match the current filters."
              activities={internalActivities}
              activityType="internal"
              {...queueHandlers}
            />
          ) : null}
          {showExternal ? (
            <ActivityQueueWidget
              title="External Allocation Queue"
              subtitle="External activities usually need inmate allocation plus a one-time session before attendance can be tracked."
              emptyText="No external activities match the current filters."
              activities={externalActivities}
              activityType="external"
              {...queueHandlers}
            />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-malawiGold px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl bg-malawiBlack p-6 text-white shadow-xl dark:bg-slate-800 md:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-malawiGold dark:text-amber-300">🏠 Home</span>
            <span className="rounded-full bg-white/10 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/75 dark:bg-slate-700/80 dark:text-slate-300">
              Officer On Duty
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-white md:text-4xl lg:text-5xl">
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
            to="/officer/activities"
            accent={{
              card: 'border-t-green-800 dark:border-t-green-400 dark:!bg-slate-800',
              label: 'text-green-900 dark:text-slate-400',
              value: 'text-green-900 dark:text-green-400',
              description: 'text-gray-600 dark:text-slate-300',
            }}
          />
          <MetricCard
            label="Internal Activities"
            value={internalActivities.length}
            description="Ready for daily session tracking"
            to="/officer/activities?type=internal"
            accent={{
              card: 'border-t-green-400 bg-green-50 dark:border-t-green-400 dark:!bg-slate-800',
              label: 'text-green-700 dark:text-slate-400',
              value: 'text-green-800 dark:text-green-400',
              description: 'text-green-900/70 dark:text-slate-300',
            }}
          />
          <MetricCard
            label="External Activities"
            value={externalActivities.length}
            description="Require one-time sessions or inmate allocation"
            to="/officer/activities?type=external"
            accent={{
              card: 'border-t-blue-500 bg-blue-50 dark:border-t-blue-400 dark:!bg-slate-800',
              label: 'text-blue-700 dark:text-slate-400',
              value: 'text-blue-800 dark:text-blue-400',
              description: 'text-blue-900/70 dark:text-slate-300',
            }}
          />
          <MetricCard
            label="Open Sessions"
            value={openSessions.length}
            description="Sessions still active or waiting to be completed"
            to="/officer/activity-sessions"
            accent={{
              card: 'border-t-amber-600 bg-amber-50 dark:border-t-amber-400 dark:!bg-slate-800',
              label: 'text-amber-800 dark:text-slate-400',
              value: 'text-amber-900 dark:text-amber-400',
              description: 'text-amber-900/70 dark:text-slate-300',
            }}
          />
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <ProgressMetricCard
            label="Completion Rate"
            value={`${dashboardMetrics.completion_rate.percent}%`}
            subtitle="Activities completed today."
            progress={dashboardMetrics.completion_rate.percent}
            accent="border-emerald-200 bg-white dark:border-slate-600 dark:!bg-slate-800"
            barClass="bg-emerald-500 dark:bg-emerald-400"
            valueClass="text-gray-900 dark:text-emerald-400"
          />
          <ProgressMetricCard
            label="Participation"
            value={
              dashboardMetrics.participation.capacity > 0
                ? `${dashboardMetrics.participation.allocated} / ${dashboardMetrics.participation.capacity}`
                : `${dashboardMetrics.participation.allocated}`
            }
            subtitle="Inmates allocated today."
            progress={dashboardMetrics.participation.percent}
            accent="border-violet-200 bg-white dark:border-slate-600 dark:!bg-slate-800"
            barClass="bg-violet-500 dark:bg-violet-400"
            valueClass="text-gray-900 dark:text-violet-400"
          />
        </section>
      </div>
    </div>
  );
}
