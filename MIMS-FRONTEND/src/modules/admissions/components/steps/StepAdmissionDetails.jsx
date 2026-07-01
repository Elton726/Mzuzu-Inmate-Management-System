import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { admissionSchema } from '../../schemas/admissionSchemas';
import { listActivities } from '../../services/activityService';
import { toast } from 'react-toastify';
import { calculateProjectedReleaseDate } from '../../../../utils/helpers';
import { MdError, MdSearch, MdClose } from 'react-icons/md';

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
    sentenceDays: 'Sentence days',
    sentenceStartDate: 'Sentence start date',
    remandNextCourtDate: 'Next court date',
    remandNextCourtTime: 'Next court time',
    activityId: 'Activity'
  };
  return map[key] || key;
};

const inputCls = (hasError) =>
  `w-full px-3 py-2.5 border ${hasError ? 'border-red-400' : 'border-gray-300'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-malawiGreen focus:border-malawiGreen transition`;

const labelCls = 'block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5';

// ── Searchable Court Dropdown ─────────────────────────────────────────────────
function CourtSearchableSelect({ value, onChange, hasError }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Derive display label from the current value
  const displayLabel = value || '';

  const filtered = useMemo(
    () =>
      query.trim() === ''
        ? COURTS
        : COURTS.filter((c) => c.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (court) => {
    onChange(court);
    setQuery('');
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
  };

  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        className={`${inputCls(hasError)} flex items-center justify-between text-left`}
      >
        <span className={displayLabel ? 'text-gray-900' : 'text-gray-400'}>
          {displayLabel || 'Select a court'}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {displayLabel && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => e.key === 'Enter' && handleClear(e)}
              className="p-0.5 text-gray-400 hover:text-red-500 transition rounded"
              aria-label="Clear court selection"
            >
              <MdClose className="text-base" />
            </span>
          )}
          <MdSearch className="text-gray-400 text-base" />
        </div>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
          {/* Search input */}
          <div className="border-b border-gray-100 p-2">
            <div className="relative">
              <MdSearch className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search courts…"
                className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-3 text-sm text-gray-900 outline-none focus:border-malawiGreen focus:ring-2 focus:ring-malawiGreen/20"
              />
            </div>
          </div>

          {/* Options list */}
          <ul className="max-h-56 overflow-y-auto py-1 text-sm">
            {/* Blank / clear option */}
            <li>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-gray-400 hover:bg-gray-50 transition"
                onClick={() => handleSelect('')}
              >
                — None —
              </button>
            </li>

            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-gray-400">No courts match "{query}"</li>
            ) : (
              filtered.map((court) => (
                <li key={court}>
                  <button
                    type="button"
                    className={`w-full px-3 py-2 text-left transition hover:bg-emerald-50 hover:text-malawiGreen ${
                      court === value ? 'bg-emerald-50 font-semibold text-malawiGreen' : 'text-gray-800'
                    }`}
                    onClick={() => handleSelect(court)}
                  >
                    {court}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

CourtSearchableSelect.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  hasError: PropTypes.bool,
};

// ── Common Offences list ─────────────────────────────────────────────────────
const COMMON_OFFENCES = [
  // Violent offences
  'Murder',
  'Manslaughter',
  'Attempted Murder',
  'Grievous Bodily Harm (GBH)',
  'Common Assault',
  'Assault Occasioning Actual Bodily Harm (ABH)',
  'Wounding with Intent',
  'Kidnapping',
  'Unlawful Detention / False Imprisonment',
  'Domestic Violence',
  // Sexual offences
  'Rape',
  'Attempted Rape',
  'Defilement (under 16)',
  'Defilement (under 13)',
  'Indecent Assault',
  'Sexual Harassment',
  'Trafficking for Sexual Exploitation',
  // Property offences
  'Theft',
  'Burglary',
  'Robbery',
  'Armed Robbery',
  'Arson',
  'Malicious Damage to Property',
  'Housebreaking',
  'Motor Vehicle Theft',
  'Receiving Stolen Property',
  'Fraud',
  'Forgery',
  'Obtaining by False Pretences',
  'Embezzlement',
  'Breach of Trust',
  // Drug offences
  'Possession of Controlled Substances',
  'Trafficking in Controlled Substances',
  'Cultivating Cannabis',
  // Public-order offences
  'Unlawful Wounding',
  'Affray',
  'Rioting',
  'Incitement to Violence',
  'Breach of Peace',
  'Trespass',
  // Road-traffic offences
  'Dangerous Driving Causing Death',
  'Dangerous Driving',
  'Driving Under the Influence (DUI)',
  'Driving Without a Licence',
  'Hit-and-Run',
  // Weapons offences
  'Possession of Offensive Weapon',
  'Possession of Firearm Without Licence',
  'Illegal Possession of Ammunition',
  // Financial / corruption
  'Bribery',
  'Corruption',
  'Money Laundering',
  // Against the state
  'Treason',
  'Sedition',
  'Espionage',
  // Other
  'Poaching / Wildlife Trafficking',
  'Human Trafficking',
  'Child Abduction',
  'Neglect / Cruelty to Children',
  'Contempt of Court',
];

// ── Searchable Offence Dropdown ───────────────────────────────────────────────
function OffenceSearchableSelect({ value, onChange, hasError }) {
  // Determine whether the stored value is a preset or custom text
  const isOther = value !== '' && !COMMON_OFFENCES.includes(value);
  const [mode, setMode] = useState(isOther ? 'other' : 'preset');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [customText, setCustomText] = useState(isOther ? value : '');
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const customRef = useRef(null);

  const displayLabel = mode === 'other' ? 'Other — type manually' : (value || '');

  const filtered = useMemo(() => {
    const items = [...COMMON_OFFENCES, '— Other — type manually'];
    if (query.trim() === '') return items;
    return items.filter((c) => c.toLowerCase().includes(query.toLowerCase()));
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // When switching into Other mode, focus the textarea
  useEffect(() => {
    if (mode === 'other') {
      setTimeout(() => customRef.current?.focus(), 50);
    }
  }, [mode]);

  const handleSelect = (item) => {
    setQuery('');
    setOpen(false);
    if (item === '— Other — type manually') {
      setMode('other');
      setCustomText('');
      onChange('');
    } else {
      setMode('preset');
      setCustomText('');
      onChange(item);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setMode('preset');
    setCustomText('');
    setQuery('');
    onChange('');
  };

  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleCustomChange = (e) => {
    setCustomText(e.target.value);
    onChange(e.target.value);
  };

  return (
    <div ref={containerRef} className="space-y-2">
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        className={`${inputCls(hasError)} flex items-center justify-between text-left`}
      >
        <span className={displayLabel ? 'text-gray-900' : 'text-gray-400'}>
          {displayLabel || 'Select or search an offence…'}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {(value || mode === 'other') && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => e.key === 'Enter' && handleClear(e)}
              className="p-0.5 text-gray-400 hover:text-red-500 transition rounded"
              aria-label="Clear offence selection"
            >
              <MdClose className="text-base" />
            </span>
          )}
          <MdSearch className="text-gray-400 text-base" />
        </div>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
          {/* Search input */}
          <div className="border-b border-gray-100 p-2">
            <div className="relative">
              <MdSearch className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search offences…"
                className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-3 text-sm text-gray-900 outline-none focus:border-malawiGreen focus:ring-2 focus:ring-malawiGreen/20"
              />
            </div>
          </div>

          {/* Options list */}
          <ul className="max-h-60 overflow-y-auto py-1 text-sm">
            {/* Blank / clear option */}
            <li>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-gray-400 hover:bg-gray-50 transition"
                onClick={() => handleSelect('')}
              >
                — None —
              </button>
            </li>

            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-gray-400">No offences match "{query}"</li>
            ) : (
              filtered.map((item) => {
                const isOtherItem = item === '— Other — type manually';
                const isSelected = isOtherItem ? mode === 'other' : item === value;
                return (
                  <li key={item}>
                    <button
                      type="button"
                      className={`w-full px-3 py-2 text-left transition ${
                        isOtherItem
                          ? 'border-t border-gray-100 mt-1 pt-2 text-malawiGold font-semibold hover:bg-yellow-50'
                          : `hover:bg-emerald-50 hover:text-malawiGreen ${
                              isSelected ? 'bg-emerald-50 font-semibold text-malawiGreen' : 'text-gray-800'
                            }`
                      }`}
                      onClick={() => handleSelect(item)}
                    >
                      {isOtherItem ? '✏️  Other — type manually' : item}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {/* Free-text area shown when Other is selected */}
      {mode === 'other' && (
        <textarea
          ref={customRef}
          rows={3}
          value={customText}
          onChange={handleCustomChange}
          placeholder="Describe the offence in detail…"
          className={`${inputCls(hasError)} resize-none`}
        />
      )}
    </div>
  );
}

OffenceSearchableSelect.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  hasError: PropTypes.bool,
};

// ─────────────────────────────────────────────────────────────────────────────

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
      sentenceDays: '',
      sentenceStartDate: '',
      remandNextCourtDate: '',
      remandNextCourtTime: '',
      remandDurationDays: '',
      activityId: '',
      ...(defaultValues || {})
    }
  });

  const inmateType = watch('inmateType');
  const admissionDate = watch('admissionDate');
  const remandNextCourtDate = watch('remandNextCourtDate');
  const remandNextCourtTime = watch('remandNextCourtTime');
  const courtName = watch('courtName');
  const security = useMemo(() => mapInmateTypeToSecurityClassification(inmateType), [inmateType]);

  const sentenceYears = watch('sentenceYears');
  const sentenceMonths = watch('sentenceMonths');
  const sentenceDays = watch('sentenceDays');
  const sentenceStartDate = watch('sentenceStartDate');

  // Sync admission type automatically
  useEffect(() => {
    setValue('admissionType', automaticAdmissionType, { shouldDirty: true, shouldValidate: true });
  }, [automaticAdmissionType, setValue]);

  // Clear sentence fields when switching away from convict
  useEffect(() => {
    if (inmateType !== 'convict') {
      setValue('sentenceYears', '', { shouldValidate: false });
      setValue('sentenceMonths', '', { shouldValidate: false });
      setValue('sentenceDays', '', { shouldValidate: false });
      setValue('sentenceStartDate', '', { shouldValidate: false });
      setTimeout(() => trigger(['sentenceYears', 'sentenceMonths', 'sentenceDays', 'sentenceStartDate']), 0);
    }
  }, [inmateType, setValue, trigger]);

  const remandDurationDays = useMemo(
    () => calculateRemandDurationDays(admissionDate, remandNextCourtDate),
    [admissionDate, remandNextCourtDate]
  );

  const courtDateIsToday = useMemo(() => remandNextCourtDate === todayIso(), [remandNextCourtDate]);

  useEffect(() => {
    setValue('remandDurationDays', remandDurationDays || '', { shouldValidate: true });
  }, [remandDurationDays, setValue]);

  useEffect(() => {
    if (!courtDateIsToday && remandNextCourtTime) {
      setValue('remandNextCourtTime', '', { shouldDirty: true, shouldValidate: true });
    }
  }, [courtDateIsToday, remandNextCourtTime, setValue]);

  const projectedReleaseDate = useMemo(() => {
    if (inmateType === 'convict' && sentenceStartDate && sentenceYears !== undefined && sentenceYears !== '') {
      try {
        return calculateProjectedReleaseDate(
          sentenceStartDate,
          Number(sentenceYears),
          Number(sentenceMonths || 0),
          Number(sentenceDays || 0)
        );
      } catch (error) {
        console.error('Error calculating projected release date:', error);
        return null;
      }
    }
    return null;
  }, [inmateType, sentenceStartDate, sentenceYears, sentenceMonths, sentenceDays]);

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
              <label className={labelCls}>Case Number * <span className="text-gray-400 normal-case font-normal">(max 5 chars)</span></label>
              <input
                className={inputCls(!!errors.caseNumber)}
                maxLength={5}
                {...register('caseNumber')}
              />
              {errors.caseNumber && <p className="mt-1 text-xs text-red-500">{errors.caseNumber.message}</p>}
            </div>

            {/* ── Searchable Court Dropdown ── */}
            <div>
              <label className={labelCls}>Court Name</label>
              {/* hidden field to integrate with react-hook-form */}
              <input type="hidden" {...register('courtName')} />
              <CourtSearchableSelect
                value={courtName}
                onChange={(val) => setValue('courtName', val, { shouldDirty: true, shouldValidate: true })}
                hasError={!!errors.courtName}
              />
              {errors.courtName && <p className="mt-1 text-xs text-red-500">{errors.courtName.message}</p>}
            </div>

            <div className="relative">
              <label className={labelCls}>Offence Description</label>
              {/* hidden field keeps react-hook-form in sync */}
              <input type="hidden" {...register('offenceDescription')} />
              <OffenceSearchableSelect
                value={watch('offenceDescription')}
                onChange={(val) => setValue('offenceDescription', val, { shouldDirty: true, shouldValidate: true })}
                hasError={!!errors.offenceDescription}
              />
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
              {/* Years · Months · Days grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className={labelCls}>Years *</label>
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
                  <label className={labelCls}>Months</label>
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
                  <label className={labelCls}>Days</label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    className={inputCls(!!errors.sentenceDays)}
                    {...register('sentenceDays', {
                      setValueAs: (v) => {
                        if (v === '' || v == null) return undefined;
                        const n = Number(v);
                        return Number.isFinite(n) ? n : undefined;
                      }
                    })}
                  />
                  {errors.sentenceDays && <p className="mt-1 text-xs text-red-500">{errors.sentenceDays.message}</p>}
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
              {courtDateIsToday && (
                <div>
                  <label className={labelCls}>Next Court Time *</label>
                  <input
                    type="time"
                    className={inputCls(!!errors.remandNextCourtTime)}
                    {...register('remandNextCourtTime')}
                  />
                  {errors.remandNextCourtTime && (
                    <p className="mt-1 text-xs text-red-500">{errors.remandNextCourtTime.message}</p>
                  )}
                </div>
              )}
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
