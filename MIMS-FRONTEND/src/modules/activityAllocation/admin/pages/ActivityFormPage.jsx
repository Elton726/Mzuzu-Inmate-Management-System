import React, { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import {
  createExternalActivity,
  createInternalActivity,
  fetchActivity,
  fetchCategories,
  updateActivity,
  updateExternalDetails,
} from '../store/activitySlice';
import { baseActivitySchema, externalDetailsSchema } from '../schemas/activitySchemas';
import Card from '../../../../components/common/Card';
import Input from '../../../../components/common/Input';
import Select from '../../../../components/common/Select';
import Button from '../../../../components/common/Button';
import Spinner from '../../../../components/common/Spinner';
import EligibilityCriteriaForm from '../components/ActivityManagement/EligibilityCriteriaForm';
import ExternalActivityForm from '../components/ActivityManagement/ExternalActivityForm';
import { useToast } from '../../../../contexts/useToast';

export default function ActivityFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();

  const { categories, currentActivity, loading } = useSelector((s) => s.activity);
  const categoryOptions = useMemo(
    () => (categories || []).map((c) => ({ value: c.id, label: c.name })),
    [categories]
  );

  const form = useForm({
    resolver: zodResolver(baseActivitySchema),
    defaultValues: {
      name: '',
      category_id: undefined,
      eligibility_criteria: {},
      max_participants: null,
      security_level: 'medium',
    },
  });

  const externalForm = useForm({
    resolver: zodResolver(externalDetailsSchema),
    defaultValues: {
      location: '',
      external_partner: '',
      requires_transport: false,
      transport_details: '',
      safety_requirements: '',
      supervisor_requirements: '',
    },
  });

  const watchCategoryId = useWatch({
    control: form.control,
    name: 'category_id',
  });
  const eligibilityCriteria = useWatch({
    control: form.control,
    name: 'eligibility_criteria',
  });

  const selectedCategory = useMemo(() => {
    if (!watchCategoryId) return null;
    return (categories || []).find((c) => c?.id === watchCategoryId) || null;
  }, [categories, watchCategoryId]);

  const isExternal = useMemo(
    () => String(selectedCategory?.name || '').toLowerCase() === 'external',
    [selectedCategory]
  );
  const hideMaxParticipants = selectedCategory?.name === 'Internal Predefined';

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  useEffect(() => {
    if (!isEdit) return;
    dispatch(fetchActivity(id));
  }, [dispatch, isEdit, id]);

  useEffect(() => {
    if (!isEdit) return;
    if (!currentActivity) return;

    form.reset({
      name: currentActivity.name || '',
      category_id: currentActivity.category_id ?? undefined,
      eligibility_criteria: currentActivity.eligibility_criteria || {},
      max_participants: currentActivity.max_participants ?? null,
      security_level: currentActivity.security_level || 'medium',
    });

    if (currentActivity.activity_type === 'external') {
      const ed = currentActivity.external_details || currentActivity.externalDetails || currentActivity.externalDetails;
      externalForm.reset({
        location: ed?.location || '',
        external_partner: ed?.external_partner || '',
        requires_transport: !!ed?.requires_transport,
        transport_details: ed?.transport_details || '',
        safety_requirements: ed?.safety_requirements || '',
        supervisor_requirements: ed?.supervisor_requirements || '',
      });
    }
  }, [currentActivity, isEdit, form, externalForm]);

  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        max_participants: hideMaxParticipants ? null : data.max_participants,
        is_active: isEdit ? currentActivity?.is_active ?? true : true,
        // Store as structured data (no JSON typing required).
        eligibility_criteria: { ...(data.eligibility_criteria || {}), allowed_inmate_types: ['convict'] },
      };

      if (isEdit) {
        await dispatch(updateActivity({ id, data: payload })).unwrap();
        if (isExternal) {
          await dispatch(updateExternalDetails({ id, data: externalForm.getValues() })).unwrap();
        }
        toast.push({ title: 'Activity', message: 'Updated successfully.', variant: 'success' });
      } else if (isExternal) {
        await dispatch(createExternalActivity({ activity: payload, external: externalForm.getValues() })).unwrap();
        toast.push({ title: 'Activity', message: 'External activity created.', variant: 'success' });
      } else {
        await dispatch(createInternalActivity(payload)).unwrap();
        toast.push({ title: 'Activity', message: 'Internal activity created.', variant: 'success' });
      }

      navigate('/admin/activities');
    } catch (err) {
      toast.fromError(err);
    }
  };

  return (
    <div className="min-h-screen bg-malawiGold p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">{isEdit ? 'Edit Activity' : 'Create Activity'}</h1>

        {isEdit && loading && !currentActivity ? (
          <Spinner label="Loading activity..." />
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Name" {...form.register('name')} error={form.formState.errors.name} />
                <Select
                  label="Category"
                  {...form.register('category_id', {
                    setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)),
                  })}
                  options={categoryOptions}
                  error={form.formState.errors.category_id}
                  hint="This determines internal/external and predefined/custom."
                />
                {!hideMaxParticipants && (
                  <Input
                    type="number"
                    label="Max Participants"
                    {...form.register('max_participants', {
                      setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
                    })}
                    error={form.formState.errors.max_participants}
                  />
                )}
                <Select
                  label="Security Level"
                  {...form.register('security_level')}
                  options={[
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                  ]}
                  error={form.formState.errors.security_level}
                />
              </div>
            </Card>

            <EligibilityCriteriaForm
              value={eligibilityCriteria}
              errors={form.formState.errors.eligibility_criteria}
              onChange={(val) => form.setValue('eligibility_criteria', val, { shouldDirty: true, shouldValidate: true })}
            />

            {isExternal && (
              <Card title="External Activity Details">
                <ExternalActivityForm form={externalForm} />
              </Card>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/admin/activities')}>
                Cancel
              </Button>
              <Button type="submit" loading={form.formState.isSubmitting}>
                {isEdit ? 'Save Changes' : 'Create Activity'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
