import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import FormField from '../../../../components/common/FormField';
import { inmateSchema } from '../../schemas/admissionSchemas';
import { checkDuplicate, createInmate, getInmate, searchInmates } from '../../services/inmateService';
import { toast } from 'react-toastify';

const toIsoDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

export default function StepInmateSelect({ defaultValues, onSelected }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [checking, setChecking] = useState(false);
  const [dupes, setDupes] = useState(null);
  const [creating, setCreating] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(inmateSchema),
    defaultValues: { isYoungOffender: false, ...(defaultValues || {}) }
  });

  const watchFirst = watch('firstName');
  const watchLast = watch('lastName');
  const watchDob = watch('dateOfBirth');

  const canCheckDupes = useMemo(() => {
    return Boolean(watchFirst && watchLast && watchDob);
  }, [watchFirst, watchLast, watchDob]);

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q.length < 2) {
      toast.error('Enter at least 2 characters to search.');
      return;
    }
    try {
      setSearching(true);
      const data = await searchInmates({ q });
      const items = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      setResults(items);
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const selectExisting = async (inmate) => {
    try {
      const full = await getInmate(inmate.id);
      onSelected({ inmate: full, created: false });
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to load inmate');
    }
  };

  const onCheckDuplicates = async () => {
    if (!canCheckDupes) return;
    try {
      setChecking(true);
      setDupes(null);
      const v = getValues();
      const res = await checkDuplicate({
        first_name: v.firstName,
        last_name: v.lastName,
        date_of_birth: toIsoDate(v.dateOfBirth),
        national_id: v.nationalId || null
      });
      setDupes(res);
      if (res?.has_duplicates) toast.warning('Possible duplicates found. Review matches before creating.');
      else toast.success('No duplicates found.');
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Duplicate check failed');
    } finally {
      setChecking(false);
    }
  };

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
        <h2 className="text-xl font-semibold text-gray-800 mb-3">Search existing inmate</h2>
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-malawiGold"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by prison number, name, or national ID"
          />
          <button
            type="submit"
            className="bg-malawiGold text-malawiBlack px-4 py-2 rounded hover:bg-malawiRed hover:text-malawiGold transition disabled:opacity-60"
            disabled={searching}
          >
            {searching ? 'Searching…' : 'Search'}
          </button>
        </form>

        <div className="mt-4">
          {results.length === 0 ? (
            <p className="text-gray-500 text-sm">No results.</p>
          ) : (
            <div className="border rounded divide-y">
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => selectExisting(r)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition"
                >
                  <div className="font-semibold text-gray-800">
                    {r.prison_number ? `${r.prison_number} — ` : ''}{r.first_name} {r.last_name}
                  </div>
                  <div className="text-sm text-gray-600">DOB: {r.date_of_birth || '--'} · National ID: {r.national_id || '--'}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-xl font-semibold text-gray-800">Create new inmate</h2>
          <button
            type="button"
            onClick={onCheckDuplicates}
            disabled={checking || !canCheckDupes}
            className="px-4 py-2 rounded border border-malawiBlack text-malawiBlack hover:bg-malawiBlack hover:text-malawiGold transition disabled:opacity-60"
            title={!canCheckDupes ? 'Fill first name, last name, and DOB first' : undefined}
          >
            {checking ? 'Checking…' : 'Check duplicates'}
          </button>
        </div>

        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
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
            <div className="md:col-span-2">
              <label className="inline-flex items-center gap-3 text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...register('isYoungOffender')}
                />
                Young offender
              </label>
              <p className="text-xs text-gray-500 mt-1">Select if the inmate should be treated as a young offender.</p>
            </div>
          </div>

          {dupes?.has_duplicates && Array.isArray(dupes?.matches) && (
            <div className="border border-yellow-200 bg-yellow-50 rounded p-3">
              <p className="font-semibold text-yellow-900 mb-2">Possible matches</p>
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
