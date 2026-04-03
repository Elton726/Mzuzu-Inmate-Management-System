import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import Card from '../../../../components/common/Card';
import Input from '../../../../components/common/Input';
import Select from '../../../../components/common/Select';
import Textarea from '../../../../components/common/Textarea';
import Button from '../../../../components/common/Button';
import Spinner from '../../../../components/common/Spinner';
import TimeClockInput from '../../../../components/common/TimeClockInput';
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

const roundToMinutes = (date, stepMinutes) => {
  const d = new Date(date);
  const minutes = d.getMinutes();
  const rounded = Math.round(minutes / stepMinutes) * stepMinutes;
  d.setMinutes(rounded, 0, 0);
  return d;
};

const addMinutes = (timeStr, minutesToAdd) => {
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
      session_date: '',
      session_time: '',
      supervising_officer_id: user?.id ?? '',
      start_time: '',
      end_time: '',
      status: 'scheduled',
      notes: '',
    }),
    [user]
  );

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
          supervising_officer_id: s.supervising_officer_id ?? (user?.id ?? ''),
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
  }, [id, isEdit, form, toast, user]);

  useEffect(() => {
    if (isEdit) return;
    if (!prefillActivityId) return;
    form.setValue('activity_id', prefillActivityId);
  }, [form, isEdit, prefillActivityId]);

  const activityId = form.watch('activity_id');
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

  const startTime = form.watch('start_time');
  const endTime = form.watch('end_time');

  useEffect(() => {
    if (isEdit) return;
    if (!selectedActivity) return;

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

    const currentStart = form.getValues('start_time');
    const currentEnd = form.getValues('end_time');
    if (!currentStart) form.setValue('start_time', preset.start);
    if (!currentEnd) form.setValue('end_time', preset.end);
  };

  const setStartToNow = () => {
    const next = toTimeString(roundToMinutes(new Date(), 5));
    form.setValue('start_time', next, { shouldDirty: true });
  };

  const setEndFromStart = (mins) => {
    const base = startTime || toTimeString(roundToMinutes(new Date(), 5));
    if (!startTime) {
      form.setValue('start_time', base, { shouldDirty: true });
    }
    form.setValue('end_time', addMinutes(base, mins), { shouldDirty: true });
  };

  const bumpEnd = (mins) => {
    if (!endTime) return setEndFromStart(mins);
    form.setValue('end_time', addMinutes(endTime, mins), { shouldDirty: true });
  };

  const onSubmit = async (data) => {
    try {
      const payload = {
        activity_id: Number(data.activity_id),
        session_date: data.session_date,
        session_time: data.session_time,
        supervising_officer_id: Number(data.supervising_officer_id || user?.id),
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
                  hint={activitiesLoading ? 'Loading activities…' : 'Only active activities are listed.'}
                />
                <Input
                  label="Session date"
                  type="date"
                  {...form.register('session_date', { required: 'Session date is required' })}
                  disabled={isEdit}
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
                    hint="Choosing a period can auto-fill start/end times (editable)."
                  />
                )}
                <Input
                  label="Supervising officer ID"
                  type="number"
                  {...form.register('supervising_officer_id')}
                  disabled
                  hint="Defaults to your user id"
                />
                <input type="hidden" {...form.register('start_time')} />
                <TimeClockInput
                  label="Start time"
                  value={startTime}
                  disabled={loading || isEdit}
                  onChange={(v) => form.setValue('start_time', v || null, { shouldDirty: true })}
                  hint="Set HH:MM (24-hour clock)."
                />
                <div className="-mt-2 md:col-span-2 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" className="px-3 py-1 text-xs" onClick={setStartToNow} disabled={isEdit}>
                    Start: Now
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="px-3 py-1 text-xs"
                    onClick={() => form.setValue('start_time', '', { shouldDirty: true })}
                    disabled={isEdit || !startTime}
                  >
                    Clear start
                  </Button>
                  <Button type="button" variant="outline" className="px-3 py-1 text-xs" onClick={() => setEndFromStart(30)} disabled={isEdit}>
                    End = Start + 30m
                  </Button>
                  <Button type="button" variant="outline" className="px-3 py-1 text-xs" onClick={() => setEndFromStart(60)} disabled={isEdit}>
                    End = Start + 1h
                  </Button>
                  <Button type="button" variant="outline" className="px-3 py-1 text-xs" onClick={() => setEndFromStart(120)} disabled={isEdit}>
                    End = Start + 2h
                  </Button>
                </div>
                <input type="hidden" {...form.register('end_time')} />
                <TimeClockInput
                  label="End time"
                  value={endTime}
                  disabled={loading || isEdit}
                  onChange={(v) => form.setValue('end_time', v || null, { shouldDirty: true })}
                  hint="Optional. Must be after start time."
                />
                <div className="-mt-2 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" className="px-3 py-1 text-xs" onClick={() => bumpEnd(15)} disabled={isEdit || (!startTime && !endTime)}>
                    +15m
                  </Button>
                  <Button type="button" variant="outline" className="px-3 py-1 text-xs" onClick={() => bumpEnd(30)} disabled={isEdit || (!startTime && !endTime)}>
                    +30m
                  </Button>
                  <Button type="button" variant="outline" className="px-3 py-1 text-xs" onClick={() => bumpEnd(-15)} disabled={isEdit || !endTime}>
                    −15m
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="px-3 py-1 text-xs"
                    onClick={() => form.setValue('end_time', '', { shouldDirty: true })}
                    disabled={isEdit || !endTime}
                  >
                    Clear end
                  </Button>
                </div>
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
                <Select
                  label="Status"
                  {...form.register('status')}
                  options={statusOptions}
                  disabled={isEdit}
                />
                <div className="md:col-span-2">
                  <Textarea label="Notes" rows={4} {...form.register('notes')} disabled={isEdit} />
                </div>
              </div>
            </Card>

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
