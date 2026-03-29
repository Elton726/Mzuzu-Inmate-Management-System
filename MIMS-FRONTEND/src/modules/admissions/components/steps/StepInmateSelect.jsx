import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import FormField from '../../../../components/common/FormField';
import { inmateSchema } from '../../schemas/admissionSchemas';
import { checkDuplicate, createInmate } from '../../services/inmateService';
import { toast } from 'react-toastify';
import { useDebouncedValue } from '../../../../utils/useDebouncedValue';

const toIsoDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const YOUNG_OFFENDER_AGE_YEARS = 18;

const computeAgeYears = (dobIso) => {
  if (!dobIso) return null;
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
};

export default function StepInmateSelect({ defaultValues, onSelected }) {
  const [checking, setChecking] = useState(false);
  const [dupes, setDupes] = useState(null);
  const [creating, setCreating] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    watch,
    setValue,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(inmateSchema),
    defaultValues: { isYoungOffender: false, ...(defaultValues || {}) }
  });

  const watchFirst = watch('firstName');
  const watchLast = watch('lastName');
  const watchDob = watch('dateOfBirth');
  const watchYoungOffender = watch('isYoungOffender');
  const watchAge = useMemo(() => computeAgeYears(watchDob), [watchDob]);

  useEffect(() => {
    const age = computeAgeYears(watchDob);
    const isYoung = typeof age === 'number' ? age < YOUNG_OFFENDER_AGE_YEARS : false;
    setValue('isYoungOffender', isYoung, { shouldDirty: true, shouldValidate: true });
  }, [watchDob, setValue]);

  const canCheckDupes = useMemo(() => {
    return Boolean(watchFirst && watchLast && watchDob);
  }, [watchFirst, watchLast, watchDob]);

  const debouncedFormValues = useDebouncedValue({ firstName: watchFirst, lastName: watchLast, dateOfBirth: watchDob, nationalId: watch('nationalId') }, 500);

  // Auto check duplicates when form fields change
  useEffect(() => {
    const checkDupesImplicitly = async () => {
      if (!canCheckDupes) {
        setDupes(null);
        return;
      }

      try {
        setChecking(true);
        const v = getValues();
        const res = await checkDuplicate({
          first_name: v.firstName,
          last_name: v.lastName,
          date_of_birth: toIsoDate(v.dateOfBirth),
          national_id: v.nationalId || null
        });
        setDupes(res);
      } catch (err) {
        // Silently fail for implicit check - don't show toast
      } finally {
        setChecking(false);
      }
    };

    checkDupesImplicitly();
  }, [debouncedFormValues, canCheckDupes, getValues]);

  const onCreate = async (form) => {
    try {
      setCreating(true);
      const payload = {
        first_name: form.firstName,
        last_name: form.lastName,
        other_names: form.otherNames || null,
        date_of_birth: toIsoDate(form.dateOfBirth),
        place_of_birth: form.placeOfBirth || null,
        nationality: form.nationality || null,
        national_id: form.nationalId || null,
        marital_status: form.maritalStatus || null,
        next_of_kin_name: form.nextOfKinName || null,
        next_of_kin_contact: form.nextOfKinContact || null,
        is_young_offender: Boolean(form.isYoungOffender)
      };
      const created = await createInmate(payload);
      toast.success(`Inmate created (${created?.prison_number || created?.id})`);
      onSelected({ inmate: created, created: true, inmateDraft: form });
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to create inmate';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">Create new inmate</h2>

        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
          <input type="hidden" {...register('isYoungOffender')} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="First name *" error={errors.firstName?.message}>
              <input className="w-full border rounded px-3 py-2" {...register('firstName')} />
            </FormField>
            <FormField label="Last name *" error={errors.lastName?.message}>
              <input className="w-full border rounded px-3 py-2" {...register('lastName')} />
            </FormField>
            <FormField label="Other names" error={errors.otherNames?.message}>
              <input className="w-full border rounded px-3 py-2" {...register('otherNames')} />
            </FormField>
            <FormField label="Date of birth *" error={errors.dateOfBirth?.message}>
              <input type="date" className="w-full border rounded px-3 py-2" {...register('dateOfBirth')} />
            </FormField>
            <FormField label="National ID" error={errors.nationalId?.message}>
              <input className="w-full border rounded px-3 py-2" {...register('nationalId')} />
            </FormField>
            <FormField label="Nationality" error={errors.nationality?.message}>
              <input className="w-full border rounded px-3 py-2" {...register('nationality')} />
            </FormField>
            <FormField label="Next of kin name" error={errors.nextOfKinName?.message}>
              <input className="w-full border rounded px-3 py-2" {...register('nextOfKinName')} />
            </FormField>
            <FormField label="Next of kin contact" error={errors.nextOfKinContact?.message}>
              <input className="w-full border rounded px-3 py-2" {...register('nextOfKinContact')} />
            </FormField>
          </div>

          {watchDob && (
            <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              Young offender (auto):{' '}
              <span className={watchYoungOffender ? 'font-semibold text-malawiRed' : 'font-semibold text-gray-800'}>
                {watchYoungOffender ? 'Yes' : 'No'}
              </span>
              <span className="text-xs text-gray-500 ml-2">
                (Age: {typeof watchAge === 'number' ? watchAge : '—'} · Under {YOUNG_OFFENDER_AGE_YEARS})
              </span>
            </div>
          )}

          {dupes?.has_duplicates && Array.isArray(dupes?.matches) && (
            <div className="border border-yellow-200 bg-yellow-50 rounded p-3">
              <p className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                <span>⚠️ Possible matches found</span>
                {checking && <span className="text-xs">(checking…)</span>}
              </p>
              <p className="text-sm text-yellow-900 mb-2">An inmate with similar details may already exist. Please review the matches below before creating a new record:</p>
              <ul className="list-disc ml-5 text-sm text-yellow-900">
                {dupes.matches.slice(0, 5).map((m) => (
                  <li key={m.id}>
                    {m.prison_number ? `${m.prison_number} — ` : ''}{m.first_name} {m.last_name} (DOB: {m.date_of_birth || '--'})
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="submit"
            disabled={creating}
            className="bg-malawiGreen text-white px-5 py-2 rounded hover:opacity-90 transition disabled:opacity-60"
          >
            {creating ? 'Creating…' : 'Create inmate'}
          </button>
        </form>
      </div>
    </div>
  );
}

StepInmateSelect.propTypes = {
  defaultValues: PropTypes.object,
  onSelected: PropTypes.func.isRequired
};
