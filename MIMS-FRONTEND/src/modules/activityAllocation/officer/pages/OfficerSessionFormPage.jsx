import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FiAlertTriangle } from 'react-icons/fi';
import Card from '../../../../components/common/Card';
import Input from '../../../../components/common/Input';
import Select from '../../../../components/common/Select';
import Textarea from '../../../../components/common/Textarea';
import Button from '../../../../components/common/Button';
import Spinner from '../../../../components/common/Spinner';
import { useToast } from '../../../../contexts/useToast';
import { useAuth } from '../../../../contexts/useAuth';
import * as officerSessionService from '../services/officerSessionService';
import * as officerActivityService from '../services/officerActivityService';

const statusOptions = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const sessionPeriodPresets = [
  { value: 'Morning', label: 'Morning', start: '08:00', end: '12:00' },
  { value: 'Afternoon', label: 'Afternoon', start: '13:00', end: '17:00' },
  { value: 'Evening', label: 'Evening', start: '18:00', end: '20:00' },
  { value: 'Night', label: 'Night', start: '20:00', end: '22:00' },
];

const activeSessionStatuses = ['scheduled', 'in_progress'];

const pad2 = (n) => String(n).padStart(2, '0');

const toTimeString = (date) => `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

const addMinutesToTime = (timeStr, minutesToAdd) => {
  if (!timeStr) return '';
  const [h, m] = String(timeStr).split(':').map((v) => Number(v));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return '';
  const total = h * 60 + m + minutesToAdd;
  const wrapped = ((total % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hh = Math.floor(wrapped / 60);
  const mm = wrapped % 60;
  return `${pad2(hh)}:${pad2(mm)}`;
};

export default function OfficerSessionFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(isEdit);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activities, setActivities] = useState([]);
  const [checkingExistingSession, setCheckingExistingSession] = useState(false);
  const [duplicateSession, setDuplicateSession] = useState(null);

  const prefillActivityId = useMemo(() => {
    const qs = new URLSearchParams(location.search);
    return qs.get('activity_id') || qs.get('activityId') || location.state?.activityId || '';
  }, [location.search, location.state]);

  const prefillActivityName = location.state?.activityName || '';
  const isActivityLocked = !isEdit && !!prefillActivityId;

  const todayLocal = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const defaults = useMemo(
    () => ({
      activity_id: '',
      session_date: todayLocal,
      session_time: '',
      start_time: '',
      end_time: '',
      status: 'in_progress',
      notes: '',
    }),
    [todayLocal]
  );

  const [assignedInmates, setAssignedInmates] = useState([]);
  const [inmatesLoading, setInmatesLoading] = useState(false);

  const form = useForm({ defaultValues: defaults });

  useEffect(() => {
    form.reset(defaults);
  }, [defaults, form]);

  useEffect(() => {
    const loadActivities = async () => {
      try {
        setActivitiesLoading(true);
        const res = await officerActivityService.getAvailableActivities({ per_page: 200 });
        const payload = res?.data || {};
        setActivities(payload?.data || []);
      } catch (err) {
        toast.fromError(err, { title: 'Activities' });
      } finally {
        setActivitiesLoading(false);
      }
    };
    loadActivities();
  }, [toast]);

  useEffect(() => {
    const load = async () => {
      try {
        if (!isEdit) return;
        setLoading(true);
        const res = await officerSessionService.getSession(id);
        const s = res?.data || {};
        form.reset({
          activity_id: s.activity_id ?? '',
          session_date: s.session_date ?? '',
          session_time: s.session_time ?? '',
          start_time: s.start_time ? String(s.start_time).slice(0, 5) : '',
          end_time: s.end_time ? String(s.end_time).slice(0, 5) : '',
          status: s.status ?? 'scheduled',
          notes: s.notes ?? '',
        });
      } catch (err) {
        toast.fromError(err, { title: 'Activity session' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isEdit, form, toast]);

  useEffect(() => {
    if (isEdit) return;
    if (!prefillActivityId) return;
    form.setValue('activity_id', String(prefillActivityId), { shouldValidate: true });
  }, [form, isEdit, prefillActivityId]);

  const activityId = form.watch('activity_id');
  const sessionDate = form.watch('session_date');

  const validateSessionDate = (value) => {
    if (!value) return 'Session date is required';
    if (value < todayLocal) return 'Session date cannot be in the past';
    return true;
  };

  const validateStartTime = (value) => {
    if (!value) return 'Start time is required';
    const selectedDate = form.getValues('session_date');
    if (selectedDate === todayLocal && value < toTimeString(new Date())) {
      return 'Start time cannot be in the past';
    }
    return true;
  };

  const validateEndTime = (value) => {
    if (!value) return 'End time is required';
    const values = form.getValues();
    if (values.session_date === todayLocal && value < toTimeString(new Date())) {
      return 'End time cannot be in the past';
    }
    if (values.start_time && value <= values.start_time) {
      return 'End time must be after start time';
    }
    return true;
  };

  useEffect(() => {
    if (isEdit || !activityId) {
      setAssignedInmates([]);
      return;
    }

    const loadAssignedInmates = async () => {
      try {
        setInmatesLoading(true);
        const res = await officerSessionService.getAssignedInmates(activityId);
        setAssignedInmates(res?.data || []);
      } catch (err) {
        toast.fromError(err, { title: 'Assigned Inmates' });
      } finally {
        setInmatesLoading(false);
      }
    };

    loadAssignedInmates();
  }, [activityId, isEdit, toast]);
  const selectedActivity = useMemo(
    () => activities.find((a) => String(a.id) === String(activityId)),
    [activities, activityId]
  );

  const lockedActivityLabel = selectedActivity
    ? `${selectedActivity.name} (${selectedActivity.activity_type})`
    : prefillActivityName || 'Selected activity';
  const lockedActivityName = selectedActivity?.name || prefillActivityName || 'this activity';

  useEffect(() => {
    if (isEdit || !prefillActivityId) {
      setDuplicateSession(null);
      return;
    }

    let ignore = false;

    const checkExistingSession = async () => {
      try {
        setCheckingExistingSession(true);
        setDuplicateSession(null);
        const res = await officerSessionService.getSessions({
          activity_id: prefillActivityId,
          session_date: todayLocal,
          per_page: 10,
        });
        if (ignore) return;

        const sessions = res?.data?.data || [];
        const activeSession = sessions.find((session) =>
          activeSessionStatuses.includes(session.status)
        );
        setDuplicateSession(activeSession || null);

        if (activeSession) {
          toast.push({
            title: 'Session already active',
            message: `A session for ${activeSession.activity?.name || prefillActivityName || 'this activity'} is already active today.`,
            variant: 'error',
          });
        }
      } catch (err) {
        if (!ignore) toast.fromError(err, { title: 'Session check' });
      } finally {
        if (!ignore) setCheckingExistingSession(false);
      }
    };

    checkExistingSession();

    return () => {
      ignore = true;
    };
  }, [isEdit, prefillActivityId, prefillActivityName, todayLocal, toast]);

  const sessionTime = form.watch('session_time');
  const isInternal = selectedActivity?.activity_type === 'internal';
  const isCustomPeriod = !isInternal && sessionTime === 'Custom';
  const derivedSessionPeriod = useMemo(() => {
    if (isInternal) return 'Daily';
    if (!sessionTime) return '';
    if (sessionTime === 'Custom') return 'Custom';
    return sessionPeriodPresets.some((p) => p.value === sessionTime) ? sessionTime : 'Custom';
  }, [isInternal, sessionTime]);

  // Auto-calculate start and end times when activity is selected
  useEffect(() => {
    if (isEdit) return;
    if (!selectedActivity) return;

    if (selectedActivity.activity_type === 'internal') {
      const currentDate = form.getValues('session_date');
      const currentTime = form.getValues('session_time');
      if (!currentDate) form.setValue('session_date', todayLocal);
      if (!currentTime) form.setValue('session_time', 'Daily');
      if (!form.getValues('start_time')) {
        const now = toTimeString(new Date());
        form.setValue('start_time', now, { shouldDirty: true });
        form.setValue('end_time', addMinutesToTime(now, 120), { shouldDirty: true });
      }
      return;
    }

    if (selectedActivity.activity_type === 'external') {
      const currentTime = form.getValues('session_time');
      if (!currentTime) {
        applySessionPreset('Morning');
      }
    }
  }, [form, isEdit, selectedActivity, todayLocal]);

  const applySessionPreset = (presetValue) => {
    const preset = sessionPeriodPresets.find((p) => p.value === presetValue);
    if (!preset) return;

    form.setValue('session_time', preset.value, { shouldValidate: true, shouldDirty: true });
    form.setValue('start_time', preset.start, { shouldValidate: true, shouldDirty: true });
    form.setValue('end_time', preset.end, { shouldValidate: true, shouldDirty: true });
  };

  const onSubmit = async (data) => {
    // Block session creation when no inmates are assigned to the activity
    if (!isEdit && assignedInmates.length === 0 && activityId && !inmatesLoading) {
      toast.push({
        title: 'No inmates assigned',
        message:
          'This activity has no inmates assigned to it. Please assign inmates to the activity before creating a session.',
        variant: 'error',
      });
      return;
    }

    try {
      const submittedActivityId = data.activity_id || prefillActivityId || form.getValues('activity_id');
      const payload = {
        activity_id: Number(submittedActivityId),
        session_date: data.session_date || todayLocal,
        session_time: data.session_time,
        start_time: data.start_time || null,
        end_time: data.end_time || null,
        status: data.status,
        notes: data.notes || null,
      };

      if (isEdit) {
        await officerSessionService.updateSession(id, payload);
        toast.push({ title: 'Activity session', message: 'Updated successfully.', variant: 'success' });
        navigate('/officer/activity-sessions');
        return;
      }

      const res =
        selectedActivity?.activity_type === 'internal'
          ? await officerSessionService.getOrCreateDailySession(payload)
          : selectedActivity?.activity_type === 'external'
            ? await officerSessionService.getOrCreateExternalOnceSession(payload)
          : await officerSessionService.createSession(payload);

      const created = res?.data;
      toast.push({
        title: 'Activity session',
        message:
          selectedActivity?.activity_type === 'internal' && res?.status === 200
            ? 'Today’s session already exists.'
            : selectedActivity?.activity_type === 'external' && res?.status === 200
              ? 'Session already exists.'
            : 'Created successfully.',
        variant: 'success',
      });

      if (created?.id) {
        navigate(`/officer/activity-sessions/${created.id}`);
      } else {
        navigate('/officer/activity-sessions');
      }
    } catch (err) {
      toast.fromError(err, { title: isEdit ? 'Update failed' : 'Create failed' });
    }
  };

  // A session can only be created when inmates are loaded and at least one is assigned
  const canCreateSession = isEdit || !activityId || inmatesLoading || assignedInmates.length > 0;

  const activityOptions = useMemo(
    () => {
      const options = activities.map((a) => ({
        value: a.id,
        label: `${a.name} (${a.activity_type})`,
      }));

      if (
        prefillActivityId &&
        prefillActivityName &&
        !options.some((option) => String(option.value) === String(prefillActivityId))
      ) {
        options.unshift({
          value: prefillActivityId,
          label: prefillActivityName,
        });
      }

      return options;
    },
    [activities, prefillActivityId, prefillActivityName]
  );

  const sessionPeriodOptions = useMemo(
    () => [
      ...sessionPeriodPresets.map((p) => ({ value: p.value, label: `${p.label} (${p.start}–${p.end})` })),
      { value: 'Custom', label: 'Custom' },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-malawiGold p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">{isEdit ? 'Edit Session' : 'Create Session'}</h1>

        {isEdit && (
          <Card title="Editing disabled">
            <p className="text-gray-700">
              Session details cannot be edited once created. You can still change the status from the session details page.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate(`/officer/activity-sessions/${id}`)}>
                View Session
              </Button>
              <Button type="button" onClick={() => navigate('/officer/activity-sessions/new')}>
                Create New
              </Button>
            </div>
          </Card>
        )}

        {loading ? (
          <Spinner label="Loading session..." />
        ) : checkingExistingSession ? (
          <Spinner label="Checking today's active session..." />
        ) : duplicateSession ? (
          <Card title="Session already active">
            <p className="text-gray-700">
              A session for {duplicateSession.activity?.name || lockedActivityName} is already active today.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/officer/activities')}>
                Back to Activities
              </Button>
              <Button type="button" onClick={() => navigate(`/officer/activity-sessions/${duplicateSession.id}`)}>
                View Session
              </Button>
            </div>
          </Card>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" aria-disabled={isEdit}>
            <Card title={isActivityLocked ? null : 'Session details'}>
              {isActivityLocked && (
                <div className="mb-5 border-b border-gray-100 pb-4 dark:border-slate-700">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {lockedActivityLabel}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-gray-500 dark:text-slate-400">
                    Session details
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!isActivityLocked && (
                  <Select
                    label="Activity"
                    disabled={activitiesLoading || loading || isEdit}
                    {...form.register('activity_id', { required: 'Activity is required' })}
                    options={activityOptions}
                    error={form.formState.errors.activity_id?.message}
                  />
                )}
                <Input
                  label="Session date"
                  type="date"
                  min={todayLocal}
                  {...form.register('session_date', { validate: validateSessionDate })}
                  disabled={isEdit}
                  error={form.formState.errors.session_date?.message}
                />
                {isInternal ? (
                  <Input
                    label="Session period"
                    disabled
                    value="Daily"
                  />
                ) : isCustomPeriod ? (
                  <div className="min-h-[74px]" aria-hidden="true" />
                ) : (
                  <Select
                    label="Session period"
                    value={derivedSessionPeriod}
                    onChange={(e) => {
                      const next = e.target.value;
                      if (next === 'Custom') {
                        form.setValue('session_time', 'Custom', { shouldValidate: true, shouldDirty: true });
                        return;
                      }
                      applySessionPreset(next);
                    }}
                    options={sessionPeriodOptions}
                    disabled={isEdit}
                  />
                )}
                <Input
                  label="Start time"
                  type="time"
                  {...form.register('start_time', { validate: validateStartTime })}
                  disabled={isEdit || (!isInternal && derivedSessionPeriod !== 'Custom')}
                  hint={isCustomPeriod ? 'Select the exact start and end times manually.' : 'Filled from the selected period.'}
                  error={form.formState.errors.start_time?.message}
                />
                <Input
                  label="End time"
                  type="time"
                  {...form.register('end_time', { validate: validateEndTime })}
                  disabled={isEdit || (!isInternal && derivedSessionPeriod !== 'Custom')}
                  hint={isCustomPeriod ? 'Select the exact start and end times manually.' : 'Filled from the selected period.'}
                  error={form.formState.errors.end_time?.message}
                />
                {!isInternal && derivedSessionPeriod === 'Custom' && (
                  <Input
                    label="Session label"
                    placeholder="e.g. Workshop"
                    {...form.register('session_time', { required: 'Session time is required' })}
                    disabled={isEdit}
                    error={form.formState.errors.session_time?.message}
                  />
                )}
                <Input
                  label="Status"
                  disabled
                  value="In Progress"
                  hint="New sessions always start in progress."
                />
                <div className="md:col-span-2">
                  <Textarea label="Notes" rows={4} {...form.register('notes')} disabled={isEdit} />
                </div>
              </div>
            </Card>

            {!isEdit && activityId && (
              <Card title="Assigned Inmates Preview" subtitle="These inmates will be automatically added to the session attendance.">
                {inmatesLoading ? (
                  <Spinner label="Loading assigned inmates..." />
                ) : assignedInmates.length === 0 ? (
                  <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-4">
                    <FiAlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                    <div>
                      <p className="text-sm font-semibold text-red-700">No inmates assigned to this activity</p>
                      <p className="mt-1 text-sm text-red-600">
                        A session cannot be created because there are no inmates assigned to this activity.
                        Please go to the activity's allocation page and assign inmates before creating a session.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left border-b text-gray-700">
                          <th className="py-2">Inmate Name</th>
                          <th className="py-2">Inmate number</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignedInmates.map((inmate) => (
                          <tr key={inmate.inmate_id} className="border-b last:border-b-0">
                            <td className="py-2 font-medium">{inmate.inmate_name}</td>
                            <td className="py-2">{inmate.prison_number}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/officer/activity-sessions')}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={form.formState.isSubmitting}
                disabled={!canCreateSession}
                title={
                  !canCreateSession
                    ? 'Cannot create a session: no inmates are assigned to this activity.'
                    : undefined
                }
              >
                {isEdit ? 'Save Changes' : 'Create Session'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
