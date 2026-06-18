import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { admissionSchema } from '../../schemas/admissionSchemas';
import FormField from '../../../../components/common/FormField';
import { listActivities } from '../../services/activityService';
import { getAvailableCells } from '../../services/cellService';
import { toast } from 'react-toastify';
import { calculateProjectedReleaseDate } from '../../../../utils/helpers';

const todayIso = () => new Date().toISOString().slice(0, 10);

const getAdmissionsCount = (inmate) => {
  const n = inmate?.admissions_count ?? inmate?.admissionsCount;
  return Number.isFinite(Number(n)) ? Number(n) : 0;
};

const getAutomaticAdmissionType = (inmate) => (getAdmissionsCount(inmate) > 0 ? 'repeat' : 'first_time');

const formatAdmissionType = (type) => (type === 'repeat' ? 'Repeat' : 'First time');

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
    cellId: 'Cell',
    activityId: 'Activity'
  };
  return map[key] || key;
};

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
      cellId: '',
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
  const [cells, setCells] = useState([]);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingLookups(true);
        const [cellsRes, actsRes] = await Promise.all([
          getAvailableCells({ security_classification: security }),
          listActivities()
        ]);
        setCells(Array.isArray(cellsRes) ? cellsRes : []);
        setActivities(Array.isArray(actsRes) ? actsRes : []);
      } catch (err) {
        toast.error(err?.response?.data?.message || err.message || 'Failed to load lookups');
      } finally {
        setLoadingLookups(false);
      }
    };
    load();
  }, [security]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Admission details</h2>

      {Object.keys(errors || {}).length > 0 && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-800 text-sm">
          <p className="font-semibold mb-2">Fix these fields to continue:</p>
          <ul className="list-disc ml-5 space-y-1">
            {flattenErrors(errors).slice(0, 8).map((e, idx) => {
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
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Admission date *" error={errors.admissionDate?.message}>
            <input
              type="date"
              className={`w-full border rounded px-3 py-2 ${errors.admissionDate ? 'border-red-500' : ''}`}
              {...register('admissionDate')}
            />
          </FormField>
          <FormField label="Admission type *" error={errors.admissionType?.message}>
            <input type="hidden" {...register('admissionType')} />
            <div className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-800 font-semibold">
              {formatAdmissionType(automaticAdmissionType)}
            </div>
          </FormField>
          <FormField label="Inmate type *" error={errors.inmateType?.message}>
            <select className={`w-full border rounded px-3 py-2 ${errors.inmateType ? 'border-red-500' : ''}`} {...register('inmateType')}>
              <option value="convict">Convict</option>
              <option value="remandee">Remandee</option>
              <option value="murder_remandee">Murder remandee</option>
            </select>
          </FormField>
          <FormField label="Case number *" error={errors.caseNumber?.message}>
            <input className={`w-full border rounded px-3 py-2 ${errors.caseNumber ? 'border-red-500' : ''}`} {...register('caseNumber')} />
          </FormField>
          <FormField label="Court name" error={errors.courtName?.message}>
            <select className={`w-full border rounded px-3 py-2 ${errors.courtName ? 'border-red-500' : ''}`} {...register('courtName')}>
              <option value="">Select a court</option>
              {COURTS.map((court) => (
                <option key={court} value={court}>
                  {court}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Offence description" error={errors.offenceDescription?.message}>
            <input className={`w-full border rounded px-3 py-2 ${errors.offenceDescription ? 'border-red-500' : ''}`} {...register('offenceDescription')} />
          </FormField>
        </div>

        {inmateType === 'convict' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Sentence years *" error={errors.sentenceYears?.message}>
                <input
                  type="number"
                  min={0}
                  className={`w-full border rounded px-3 py-2 ${errors.sentenceYears ? 'border-red-500' : ''}`}
                  {...register('sentenceYears', {
                    setValueAs: (v) => {
                      if (v === '' || v == null) return undefined;
                      const n = Number(v);
                      return Number.isFinite(n) ? n : undefined;
                    }
                  })}
                />
              </FormField>
              <FormField label="Sentence months" error={errors.sentenceMonths?.message}>
                <input
                  type="number"
                  min={0}
                  max={11}
                  className={`w-full border rounded px-3 py-2 ${errors.sentenceMonths ? 'border-red-500' : ''}`}
                  {...register('sentenceMonths', {
                    setValueAs: (v) => {
                      if (v === '' || v == null) return undefined;
                      const n = Number(v);
                      return Number.isFinite(n) ? n : undefined;
                    }
                  })}
                />
              </FormField>
              <FormField label="Sentence start date *" error={errors.sentenceStartDate?.message}>
                <input
                  type="date"
                  className={`w-full border rounded px-3 py-2 ${errors.sentenceStartDate ? 'border-red-500' : ''}`}
                  {...register('sentenceStartDate')}
                />
              </FormField>
            </div>
            {projectedReleaseDate && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Projected release date (with 1/3 remission):</span> {new Date(projectedReleaseDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <FormField label="Next court date *" error={errors.remandNextCourtDate?.message}>
              <input
                type="date"
                className={`w-full border rounded px-3 py-2 ${errors.remandNextCourtDate ? 'border-red-500' : ''}`}
                {...register('remandNextCourtDate')}
              />
            </FormField>
            <div className="text-sm text-gray-600">
              <input type="hidden" {...register('remandDurationDays')} />
              <p>
                Security classification: <span className="font-semibold text-gray-800">{security}</span>
              </p>
              <p className="mt-1">
                Remand duration: <span className="font-semibold text-gray-800">{remandDurationDays ? `${remandDurationDays} day${remandDurationDays === 1 ? '' : 's'}` : 'Select a later court date'}</span>
              </p>
            </div>
          </div>
        )}

        <div className={inmateType === 'convict' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}>
          <FormField label="Cell (optional)" error={errors.cellId?.message}>
            <select
              className={`w-full border rounded px-3 py-2 ${errors.cellId ? 'border-red-500' : ''}`}
              disabled={loadingLookups}
              {...register('cellId')}
            >
              <option value="">Auto-allocate</option>
              {cells.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  Block {c.block} · Cell {c.cell_number} · {c.security_classification} ({c.current_occupancy}/{c.capacity})
                </option>
              ))}
            </select>
          </FormField>
          {inmateType === 'convict' && (
            <FormField label="Activity (optional)" error={errors.activityId?.message}>
              <select
                className={`w-full border rounded px-3 py-2 ${errors.activityId ? 'border-red-500' : ''}`}
                disabled={loadingLookups}
                {...register('activityId')}
              >
                <option value="">Auto-assign</option>
                {activities.map((a) => (
                  <option key={a.id} value={String(a.id)}>{a.name}</option>
                ))}
              </select>
            </FormField>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2 rounded border border-gray-300 text-gray-800 hover:bg-gray-50 transition"
          >
            Back
          </button>
          <button
            type="submit"
            className="bg-malawiRed text-malawiGold px-5 py-2 rounded hover:opacity-90 transition"
          >
            Next
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
