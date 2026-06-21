import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { admissionSchema } from '../../schemas/admissionSchemas';
import FormField from '../../../../components/common/FormField';
import { listActivities } from '../../services/activityService';
import { toast } from 'react-toastify';
import { calculateProjectedReleaseDate } from '../../../../utils/helpers';
import { MdError } from 'react-icons/md';

const todayIso = () => new Date().toISOString().slice(0, 10);

const getAdmissionsCount = (inmate) => {
  const n = inmate?.admissions_count ?? inmate?.admissionsCount;
  return Number.isFinite(Number(n)) ? Number(n) : 0;
};

const getAutomaticAdmissionType = (inmate) => (getAdmissionsCount(inmate) > 0 ? 'repeat' : 'first_time');

const formatAdmissionType = (type) => (type === 'repeat' ? 'Not-first-time' : 'First time');

const calculateRemandDurationDays = (admissionDate, nextCourtDate) => {
  if (!admissionDate || !nextCourtDate) return null;
  const start = new Date(admissionDate);
  const end = new Date(nextCourtDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const ms = end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0);
  const days = Math.round(ms / 86400000);
  return days > 0 ? days : null;
};

const mapInmateTypeToSecurityClassification = (inmateType) => {
  if (inmateType === 'murder_remandee') return 'maximum';
  if (inmateType === 'convict') return 'medium';
  return 'minimum';
};

const COURTS = [
  'Mzuzu High Court',
  'Chief Resident Magistrate Court (Mzuzu)',
  'Mzimba Magistrate Court',
  'Ezondweni Magistrate Court',
  'Encisweni Magistrate Court',
  'Luzi Magistrate Court',
  'Euthini Magistrate Court',
  'Enchakachakeni Magistrate Court',
  'Emfeni Magistrate Court',
  'Ephangweni Magistrate Court',
  'Edingeni Magistrate Court',
  'Eswazini Magistrate Court',
  'Karonga Magistrate Court',
  'Ngerenge Magistrate Court',
  'Mbande Magistrate Court',
  'Uliwa Magistrate Court',
  'Nyungwe Magistrate Court',
  'Ngana Magistrate Court',
  'Nkhata Bay Magistrate Court',
  'Kalambwe Magistrate Court',
  'Mpamba Magistrate Court',
  'Mzenga Magistrate Court',
  'Sanga Magistrate Court',
  'Chintheche Magistrate Court',
  'Tukombo Magistrate Court',
  'Likoma Magistrate Court',
  'Ruarwe Magistrate Court',
  'Usiska Magistrate Court',
  'Rumphi Magistrate Court',
  'Bolero Magistrate Court',
  'Katowo Magistrate Court',
  'Henga Magistrate Court',
  'Chinyolo Magistrate Court',
  'Tchalo Magistrate Court',
  'Phoka Magistrate Court',
  'Lura Magistrate Court',
  'Mlowe Magistrate Court',
  'Chitipa Magistrate Court',
  'Wilindi Magistrate Court',
  'Chinunkha Magistrate Court',
  'Ilongo Magistrate Court',
  'Nthalire Magistrate Court',
  'Wenya Magistrate Court'
];

const flattenErrors = (errs) => {
  const out = [];
  const walk = (node, path = []) => {
    if (!node) return;
    if (node.message && typeof node.message === 'string') {
      out.push({ path, message: node.message });
      return;
    }
    if (typeof node === 'object') {
      Object.entries(node).forEach(([key, val]) => {
        if (key === 'ref' || key === 'type') return;
        walk(val, [...path, key]);
      });
    }
  };
  walk(errs, []);
  return out;
};

const labelFor = (key) => {
  const map = {
    admissionDate: 'Admission date',
    admissionType: 'Admission type',
    inmateType: 'Inmate type',
    caseNumber: 'Case number',
    courtName: 'Court name',
    offenceDescription: 'Offence description',
    sentenceYears: 'Sentence years',
    sentenceMonths: 'Sentence months',
    sentenceStartDate: 'Sentence start date',
    remandNextCourtDate: 'Next court date',
    activityId: 'Activity'
  };
  return map[key] || key;
};

const inputCls = (hasError) =>
  `w-full px-3 py-2.5 border ${hasError ? 'border-red-400' : 'border-gray-300'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-malawiGreen focus:border-malawiGreen transition`;

const labelCls = 'block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5';

export default function StepAdmissionDetails({ defaultValues, selectedInmate, onBack, onNext }) {
  const automaticAdmissionType = useMemo(() => getAutomaticAdmissionType(selectedInmate), [selectedInmate]);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
    trigger
  } = useForm({
    resolver: zodResolver(admissionSchema),
    defaultValues: {
      admissionDate: todayIso(),
      admissionType: automaticAdmissionType,
      inmateType: 'remandee',
      caseNumber: '',
      courtName: '',
      offenceDescription: '',
      sentenceYears: '',
      sentenceMonths: '',
      sentenceStartDate: '',
      remandNextCourtDate: '',
      remandDurationDays: '',
      activityId: '',
      ...(defaultValues || {})
    }
  });

  const inmateType = watch('inmateType');
  const admissionDate = watch('admissionDate');
  const remandNextCourtDate = watch('remandNextCourtDate');
  const security = useMemo(() => mapInmateTypeToSecurityClassification(inmateType), [inmateType]);

  const sentenceYears = watch('sentenceYears');
  const sentenceMonths = watch('sentenceMonths');
  const sentenceStartDate = watch('sentenceStartDate');

  // Clear sentence fields when inmate type changes from convict to remandee
  useEffect(() => {
    setValue('admissionType', automaticAdmissionType, { shouldDirty: true, shouldValidate: true });
  }, [automaticAdmissionType, setValue]);

  useEffect(() => {
    if (inmateType !== 'convict') {
      setValue('sentenceYears', '', { shouldValidate: false });
      setValue('sentenceMonths', '', { shouldValidate: false });
      setValue('sentenceStartDate', '', { shouldValidate: false });
      // Trigger validation to clear errors
      setTimeout(() => trigger(['sentenceYears', 'sentenceMonths', 'sentenceStartDate']), 0);
    }
  }, [inmateType, setValue, trigger]);

  const remandDurationDays = useMemo(
    () => calculateRemandDurationDays(admissionDate, remandNextCourtDate),
    [admissionDate, remandNextCourtDate]
  );

  useEffect(() => {
    setValue('remandDurationDays', remandDurationDays || '', { shouldValidate: true });
  }, [remandDurationDays, setValue]);

  const projectedReleaseDate = useMemo(() => {
    if (inmateType === 'convict' && sentenceStartDate && sentenceYears !== undefined && sentenceYears !== '') {
      try {
        return calculateProjectedReleaseDate(sentenceStartDate, Number(sentenceYears), Number(sentenceMonths || 0));
      } catch (error) {
        console.error('Error calculating projected release date:', error);
        return null;
      }
    }
    return null;
  }, [inmateType, sentenceStartDate, sentenceYears, sentenceMonths]);

  const [loadingLookups, setLoadingLookups] = useState(true);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingLookups(true);
        const actsRes = await listActivities();
        setActivities(Array.isArray(actsRes) ? actsRes : []);
      } catch (err) {
        toast.error(err?.response?.data?.message || err.message || 'Failed to load lookups');
      } finally {
        setLoadingLookups(false);
      }
    };
    load();
  }, []);

  const errorList = flattenErrors(errors).slice(0, 8);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Admission Details</h2>

      {/* ── Error Summary ── */}
      {errorList.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="font-semibold text-red-800 mb-2 flex items-center gap-2">
            <MdError className="text-lg" />
            Fix these fields to continue:
          </p>
          <ul className="list-disc ml-5 space-y-1 text-sm text-red-700">
            {errorList.map((e, idx) => {
              const key = e.path?.[0];
              return (
                <li key={`${key || 'err'}-${idx}`}>
                  <span className="font-semibold">{labelFor(key)}:</span> {e.message}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <form
        onSubmit={handleSubmit(
          (data) => onNext(data),
          () => toast.error('Please fix validation errors on this step.')
        )}
        className="space-y-8"
      >
        {/* ── Section 1: Case Details ── */}
        <div className="space-y-4">
          <h3 className="border-l-4 border-malawiGreen pl-3 text-sm font-bold text-gray-800 uppercase tracking-wide">
            Case Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Admission Date *</label>
              <input
                type="date"
                className={inputCls(!!errors.admissionDate)}
                {...register('admissionDate')}
              />
              {errors.admissionDate && <p className="mt-1 text-xs text-red-500">{errors.admissionDate.message}</p>}
            </div>

            <div>
              <label className={labelCls}>Admission Type *</label>
              <input type="hidden" {...register('admissionType')} />
              <div className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-700 font-semibold">
                {formatAdmissionType(automaticAdmissionType)}
              </div>
              {errors.admissionType && <p className="mt-1 text-xs text-red-500">{errors.admissionType.message}</p>}
            </div>

            <div>
              <label className={labelCls}>Inmate Type *</label>
              <select className={inputCls(!!errors.inmateType)} {...register('inmateType')}>
                <option value="convict">Convict</option>
                <option value="remandee">Remandee</option>
                <option value="murder_remandee">Murder remandee</option>
              </select>
              {errors.inmateType && <p className="mt-1 text-xs text-red-500">{errors.inmateType.message}</p>}
            </div>

            <div>
              <label className={labelCls}>Case Number *</label>
              <input className={inputCls(!!errors.caseNumber)} {...register('caseNumber')} />
              {errors.caseNumber && <p className="mt-1 text-xs text-red-500">{errors.caseNumber.message}</p>}
            </div>

            <div>
              <label className={labelCls}>Court Name</label>
              <select className={inputCls(!!errors.courtName)} {...register('courtName')}>
                <option value="">Select a court</option>
                {COURTS.map((court) => (
                  <option key={court} value={court}>
                    {court}
                  </option>
                ))}
              </select>
              {errors.courtName && <p className="mt-1 text-xs text-red-500">{errors.courtName.message}</p>}
            </div>

            <div>
              <label className={labelCls}>Offence Description</label>
              <input className={inputCls(!!errors.offenceDescription)} {...register('offenceDescription')} />
              {errors.offenceDescription && <p className="mt-1 text-xs text-red-500">{errors.offenceDescription.message}</p>}
            </div>
          </div>
        </div>

        {/* ── Section 2: Sentence / Remand ── */}
        <div className="space-y-4">
          <h3 className="border-l-4 border-malawiGreen pl-3 text-sm font-bold text-gray-800 uppercase tracking-wide">
            {inmateType === 'convict' ? 'Sentence Details' : 'Remand Details'}
          </h3>

          {inmateType === 'convict' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Sentence Years *</label>
                  <input
                    type="number"
                    min={0}
                    className={inputCls(!!errors.sentenceYears)}
                    {...register('sentenceYears', {
                      setValueAs: (v) => {
                        if (v === '' || v == null) return undefined;
                        const n = Number(v);
                        return Number.isFinite(n) ? n : undefined;
                      }
                    })}
                  />
                  {errors.sentenceYears && <p className="mt-1 text-xs text-red-500">{errors.sentenceYears.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Sentence Months</label>
                  <input
                    type="number"
                    min={0}
                    max={11}
                    className={inputCls(!!errors.sentenceMonths)}
                    {...register('sentenceMonths', {
                      setValueAs: (v) => {
                        if (v === '' || v == null) return undefined;
                        const n = Number(v);
                        return Number.isFinite(n) ? n : undefined;
                      }
                    })}
                  />
                  {errors.sentenceMonths && <p className="mt-1 text-xs text-red-500">{errors.sentenceMonths.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Sentence Start Date *</label>
                  <input
                    type="date"
                    className={inputCls(!!errors.sentenceStartDate)}
                    {...register('sentenceStartDate')}
                  />
                  {errors.sentenceStartDate && <p className="mt-1 text-xs text-red-500">{errors.sentenceStartDate.message}</p>}
                </div>
              </div>

              {projectedReleaseDate && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">Projected release date (with 1/3 remission):</span>{' '}
                    {new Date(projectedReleaseDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div>
                <label className={labelCls}>Next Court Date *</label>
                <input
                  type="date"
                  className={inputCls(!!errors.remandNextCourtDate)}
                  {...register('remandNextCourtDate')}
                />
                {errors.remandNextCourtDate && (
                  <p className="mt-1 text-xs text-red-500">{errors.remandNextCourtDate.message}</p>
                )}
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-600 space-y-1 mt-0 md:mt-5">
                <input type="hidden" {...register('remandDurationDays')} />
                <p>
                  Security classification:{' '}
                  <span className="font-semibold text-gray-800 capitalize">{security}</span>
                </p>
                <p>
                  Remand duration:{' '}
                  <span className="font-semibold text-gray-800">
                    {remandDurationDays
                      ? `${remandDurationDays} day${remandDurationDays === 1 ? '' : 's'}`
                      : 'Select a later court date'}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Cell allocation info + Activity (convict) */}
          <div className={inmateType === 'convict' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-emerald-900">Cell allocation is automatic</p>
              <p className="mt-1 text-sm text-emerald-800">
                The system will assign the inmate to the least occupied available{' '}
                <span className="font-semibold capitalize">{security}</span> security cell when the admission is submitted.
              </p>
            </div>
            {inmateType === 'convict' && (
              <div>
                <label className={labelCls}>Activity (optional)</label>
                <select
                  className={inputCls(!!errors.activityId)}
                  disabled={loadingLookups}
                  {...register('activityId')}
                >
                  <option value="">Auto-assign</option>
                  {activities.map((a) => (
                    <option key={a.id} value={String(a.id)}>{a.name}</option>
                  ))}
                </select>
                {errors.activityId && <p className="mt-1 text-xs text-red-500">{errors.activityId.message}</p>}
              </div>
            )}
          </div>
        </div>

        {/* ── Navigation ── */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            ← Back
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 bg-malawiGreen hover:bg-green-800 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow transition-all duration-200"
          >
            Next →
          </button>
        </div>
      </form>
    </div>
  );
}

StepAdmissionDetails.propTypes = {
  defaultValues: PropTypes.object,
  selectedInmate: PropTypes.object,
  onBack: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired
};
