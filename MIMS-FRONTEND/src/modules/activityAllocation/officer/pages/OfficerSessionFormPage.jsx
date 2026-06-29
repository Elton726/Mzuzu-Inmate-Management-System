import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
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

  const prefillActivityId = useMemo(() => {
    const qs = new URLSearchParams(location.search);
    return qs.get('activity_id') || '';
  }, [location.search]);

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
    form.setValue('activity_id', prefillActivityId);
  }, [form, isEdit, prefillActivityId]);

  const activityId = form.watch('activity_id');

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

  const sessionTime = form.watch('session_time');
  const isInternal = selectedActivity?.activity_type === 'internal';
  const derivedSessionPeriod = useMemo(() => {
    if (isInternal) return 'Daily';
    if (!sessionTime) return '';
    return sessionPeriodPresets.some((p) => p.value === sessionTime) ? sessionTime : 'Custom';
  }, [isInternal, sessionTime]);

  // Auto-calculate start and end times when activity is selected
  useEffect(() => {
    if (isEdit) return;
    if (!selectedActivity) return;

    const currentStart = form.getValues('start_time');
    const currentEnd = form.getValues('end_time');

    // Only set times if they haven't been set yet
    if (!currentStart) {
      const now = toTimeString(new Date());
      form.setValue('start_time', now, { shouldDirty: true });

      // Calculate duration: 2 hours for internal, 3 hours for external
      const durationMinutes = selectedActivity.activity_type === 'internal' ? 120 : 180;
      const endTime = addMinutesToTime(now, durationMinutes);
      form.setValue('end_time', endTime, { shouldDirty: true });
    }

    if (selectedActivity.activity_type === 'internal') {
      const currentDate = form.getValues('session_date');
      const currentTime = form.getValues('session_time');
      if (!currentDate) form.setValue('session_date', todayLocal);
      if (!currentTime) form.setValue('session_time', 'Daily');
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
    try {
      const payload = {
        activity_id: Number(data.activity_id),
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

  const activityOptions = useMemo(
    () =>
      activities.map((a) => ({
        value: a.id,
        label: `${a.name} (${a.activity_type})`,
      })),
    [activities]
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
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" aria-disabled={isEdit}>
            <Card title="Session details">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Activity"
                  disabled={activitiesLoading || loading || isEdit}
                  {...form.register('activity_id', { required: 'Activity is required' })}
                  options={activityOptions}
                  error={form.formState.errors.activity_id?.message}
                />
                <Input
                  label="Session date"
                  type="date"
                  {...form.register('session_date', { required: 'Session date is required' })}
                  disabled
                  hint="Sessions are created for today."
                  error={form.formState.errors.session_date?.message}
                />
                {isInternal ? (
                  <Input
                    label="Session period"
                    disabled
                    value="Daily"
                    hint="Internal activities are tracked daily."
                  />
                ) : (
                  <Select
                    label="Session period"
                    value={derivedSessionPeriod}
                    onChange={(e) => {
                      const next = e.target.value;
                      if (next === 'Custom') {
                        form.setValue('session_time', '', { shouldValidate: true, shouldDirty: true });
                        return;
                      }
                      applySessionPreset(next);
                    }}
                    options={sessionPeriodOptions}
                    disabled={isEdit}
                    hint="Choose Custom to enter exact start and end times."
                  />
                )}
                <Input
                  label="Start time"
                  type="time"
                  {...form.register('start_time')}
                  disabled={isEdit || (!isInternal && derivedSessionPeriod !== 'Custom')}
                  hint={derivedSessionPeriod === 'Custom' ? 'Set the custom session start time.' : 'Filled from the selected period.'}
                />
                <Input
                  label="End time"
                  type="time"
                  {...form.register('end_time')}
                  disabled={isEdit || (!isInternal && derivedSessionPeriod !== 'Custom')}
                  hint={derivedSessionPeriod === 'Custom' ? 'Set the custom session end time.' : 'Filled from the selected period.'}
                />
                {!isInternal && derivedSessionPeriod === 'Custom' && (
                  <Input
                    label="Session label"
                    placeholder="e.g. Workshop"
                    {...form.register('session_time', { required: 'Session time is required' })}
                    disabled={isEdit}
                    error={form.formState.errors.session_time?.message}
                    hint="Shown on lists and reports."
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
                  <p className="text-sm text-gray-500 italic">No inmates are currently assigned to this activity.</p>
                ) : (
                  <div className="max-h-60 overflow-y-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left border-b text-gray-700">
                          <th className="py-2">Inmate Name</th>
                          <th className="py-2">Prison #</th>
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
              <Button type="submit" loading={form.formState.isSubmitting}>
                {isEdit ? 'Save Changes' : 'Create Session'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
