import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDropzone } from 'react-dropzone';
import { MdCameraAlt, MdCloudUpload, MdDelete } from 'react-icons/md';
import FormField from '../../../../components/common/FormField';
import { inmateSchema } from '../../schemas/admissionSchemas';
import { checkDuplicate, createInmate } from '../../services/inmateService';
import { uploadDocument } from '../../services/documentService';
import { toast } from 'react-toastify';
import CameraCapture from '../CameraCapture';

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

const formatBytes = (bytes) => {
  if (typeof bytes !== 'number' || Number.isNaN(bytes) || bytes < 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  const precision = i === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[i]}`;
};

const inputCls = (hasError) =>
  `w-full px-3 py-2.5 border ${hasError ? 'border-red-400' : 'border-gray-300'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-malawiGreen focus:border-malawiGreen transition`;

const labelCls = 'block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5';

function DropzoneField({ label, accept, onFile, value, hint }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    multiple: false,
    onDrop: (accepted) => onFile(accepted?.[0] || null)
  });

  return (
    <div>
      {label && <p className={labelCls}>{label}</p>}
      <div
        {...getRootProps()}
        className={[
          'border-2 border-dashed rounded-xl p-6 cursor-pointer transition flex flex-col items-center justify-center gap-2 text-center',
          isDragActive
            ? 'border-malawiGreen bg-emerald-50'
            : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-malawiGreen'
        ].join(' ')}
      >
        <input {...getInputProps()} />
        <MdCloudUpload className={`text-3xl ${isDragActive ? 'text-malawiGreen' : 'text-gray-400'}`} />
        {value ? (
          <span className="text-sm font-semibold text-malawiGreen truncate max-w-full px-2">{value.name}</span>
        ) : (
          <p className="text-sm text-gray-500">
            Drag &amp; drop a file here, or <span className="font-semibold text-malawiGreen">click to select</span>
          </p>
        )}
        {hint && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
    </div>
  );
}

DropzoneField.propTypes = {
  accept: PropTypes.object,
  hint: PropTypes.string,
  label: PropTypes.string.isRequired,
  onFile: PropTypes.func.isRequired,
  value: PropTypes.any
};

export default function StepInmateSelect({ defaultValues, onSelected }) {
  const [checking, setChecking] = useState(false);
  const [dupes, setDupes] = useState(null);
  const [creating, setCreating] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoMode, setPhotoMode] = useState('upload'); // 'upload' | 'camera'
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(photo);
    setPhotoPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [photo]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(inmateSchema),
    defaultValues: { isYoungOffender: false, gender: '', ...(defaultValues || {}) }
  });

  const watchDob = watch('dateOfBirth');
  const watchYoungOffender = watch('isYoungOffender');
  const watchAge = useMemo(() => computeAgeYears(watchDob), [watchDob]);

  useEffect(() => {
    const age = computeAgeYears(watchDob);
    const isYoung = typeof age === 'number' ? age < YOUNG_OFFENDER_AGE_YEARS : false;
    setValue('isYoungOffender', isYoung, { shouldDirty: true, shouldValidate: true });
  }, [watchDob, setValue]);

  const onCreate = async (form) => {
    try {
      setCreating(true);

      // Check for duplicates once before creating
      try {
        setChecking(true);
        const res = await checkDuplicate({
          first_name: form.firstName,
          last_name: form.lastName,
          date_of_birth: toIsoDate(form.dateOfBirth),
          national_id: form.nationalId || null
        });
        setDupes(res);

        // If duplicates found, don't create - let user review
        if (res?.has_duplicates) {
          setCreating(false);
          toast.warning('Please review the potential matches above before creating a new record.');
          return;
        }
      } catch (err) {
        console.error('Duplicate check failed:', err);
        // Continue with creation if check fails
      } finally {
        setChecking(false);
      }

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
        is_young_offender: Boolean(form.isYoungOffender),
        personal_belongings: form.personalBelongings || null,
        gender: form.gender || null
      };

      const created = await createInmate(payload);
      let inmateWithPhoto = created;

      if (photo) {
        const photoRes = await uploadDocument({
          inmateId: created.id,
          admissionId: null,
          documentType: 'inmate_photo',
          description: 'Inmate photo',
          file: photo
        });

        if (photoRes?.inmate?.photo_path) {
          inmateWithPhoto = {
            ...created,
            photo_path: photoRes.inmate.photo_path
          };
        }
      }

      toast.success(`Inmate created (${inmateWithPhoto?.prison_number || inmateWithPhoto?.id})`);
      onSelected({ inmate: inmateWithPhoto, created: true, inmateDraft: form });
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to create inmate';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Create New Inmate</h2>

        <form onSubmit={handleSubmit(onCreate)} className="space-y-8">
          <input type="hidden" {...register('isYoungOffender')} />

          {/* ── Section 1: Personal Information ── */}
          <div className="space-y-4">
            <h3 className="border-l-4 border-malawiGreen pl-3 text-sm font-bold text-gray-800 uppercase tracking-wide">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>First Name *</label>
                <input className={inputCls(!!errors.firstName)} {...register('firstName')} />
                {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className={labelCls}>Last Name *</label>
                <input className={inputCls(!!errors.lastName)} {...register('lastName')} />
                {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName.message}</p>}
              </div>
              <div>
                <label className={labelCls}>Other Names</label>
                <input className={inputCls(!!errors.otherNames)} {...register('otherNames')} />
                {errors.otherNames && <p className="mt-1 text-xs text-red-500">{errors.otherNames.message}</p>}
              </div>
              <div>
                <label className={labelCls}>Gender</label>
                <select className={inputCls(!!errors.gender)} {...register('gender')}>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                {errors.gender && <p className="mt-1 text-xs text-red-500">{errors.gender.message}</p>}
              </div>
              <div>
                <label className={labelCls}>Date of Birth *</label>
                <input type="date" className={inputCls(!!errors.dateOfBirth)} {...register('dateOfBirth')} />
                {errors.dateOfBirth && <p className="mt-1 text-xs text-red-500">{errors.dateOfBirth.message}</p>}
              </div>
              <div>
                <label className={labelCls}>National ID</label>
                <input className={inputCls(!!errors.nationalId)} {...register('nationalId')} />
                {errors.nationalId && <p className="mt-1 text-xs text-red-500">{errors.nationalId.message}</p>}
              </div>
              <div>
                <label className={labelCls}>Nationality</label>
                <input className={inputCls(!!errors.nationality)} {...register('nationality')} />
                {errors.nationality && <p className="mt-1 text-xs text-red-500">{errors.nationality.message}</p>}
              </div>
              <div>
                <label className={labelCls}>Marital Status</label>
                <select className={inputCls(!!errors.maritalStatus)} {...register('maritalStatus')}>
                  <option value="">Select marital status</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="divorced">Divorced</option>
                  <option value="widowed">Widowed</option>
                </select>
                {errors.maritalStatus && <p className="mt-1 text-xs text-red-500">{errors.maritalStatus.message}</p>}
              </div>
            </div>

            {watchDob && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-gray-700 flex items-center gap-2">
                <span>Young offender (auto):</span>
                <span className={watchYoungOffender ? 'font-semibold text-malawiRed' : 'font-semibold text-gray-800'}>
                  {watchYoungOffender ? 'Yes' : 'No'}
                </span>
                <span className="text-xs text-gray-500 ml-1">
                  (Age: {typeof watchAge === 'number' ? watchAge : '—'} · Under {YOUNG_OFFENDER_AGE_YEARS})
                </span>
              </div>
            )}
          </div>

          {/* ── Section 2: Contact & Family ── */}
          <div className="space-y-4">
            <h3 className="border-l-4 border-malawiGreen pl-3 text-sm font-bold text-gray-800 uppercase tracking-wide">
              Contact &amp; Family
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Next of Kin Name</label>
                <input className={inputCls(!!errors.nextOfKinName)} {...register('nextOfKinName')} />
                {errors.nextOfKinName && <p className="mt-1 text-xs text-red-500">{errors.nextOfKinName.message}</p>}
              </div>
              <div>
                <label className={labelCls}>Next of Kin Contact</label>
                <input className={inputCls(!!errors.nextOfKinContact)} {...register('nextOfKinContact')} />
                {errors.nextOfKinContact && <p className="mt-1 text-xs text-red-500">{errors.nextOfKinContact.message}</p>}
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Personal Belongings</label>
                <textarea
                  className={inputCls(!!errors.personalBelongings)}
                  {...register('personalBelongings')}
                  rows={3}
                />
                {errors.personalBelongings && (
                  <p className="mt-1 text-xs text-red-500">{errors.personalBelongings.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Section 3: Photo ── */}
          <div className="space-y-4">
            <h3 className="border-l-4 border-malawiGreen pl-3 text-sm font-bold text-gray-800 uppercase tracking-wide">
              Inmate Photo *
            </h3>

            {/* Mode toggle */}
            <div className="flex gap-1.5 p-1 bg-gray-100 rounded-xl max-w-xs">
              <button
                type="button"
                onClick={() => {
                  setPhotoMode('upload');
                  setIsCameraActive(false);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  photoMode === 'upload'
                    ? 'bg-white text-gray-800 shadow-sm font-semibold'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <MdCloudUpload className="text-base" />
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setPhotoMode('camera')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  photoMode === 'camera'
                    ? 'bg-white text-gray-800 shadow-sm font-semibold'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <MdCameraAlt className="text-base" />
                Take Photo
              </button>
            </div>

            {photoMode === 'upload' ? (
              <DropzoneField
                label=""
                accept={{ 'image/*': ['.png', '.jpg', '.jpeg'] }}
                value={photo}
                onFile={(f) => {
                  setPhoto(f);
                  setValue('photo', f, { shouldDirty: true, shouldValidate: true });
                }}
                hint="JPG / PNG accepted"
              />
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 bg-gray-50 flex flex-col items-center justify-center min-h-[160px]">
                {isCameraActive ? (
                  <div className="w-full max-w-md">
                    <CameraCapture
                      onCapture={(file) => {
                        setPhoto(file);
                        setValue('photo', file, { shouldDirty: true, shouldValidate: true });
                        setIsCameraActive(false);
                      }}
                      onCancel={() => setIsCameraActive(false)}
                    />
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <MdCameraAlt className="text-4xl text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-3">Use your system's camera to capture a live photo</p>
                    <button
                      type="button"
                      onClick={() => setIsCameraActive(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-malawiGold hover:bg-yellow-400 text-gray-900 font-semibold rounded-xl text-sm shadow transition"
                    >
                      <MdCameraAlt />
                      Open Camera
                    </button>
                  </div>
                )}
              </div>
            )}

            {photoPreview && (
              <div className="flex items-center gap-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-300 bg-white flex-shrink-0">
                  <img src={photoPreview} alt="Inmate Thumbnail" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{photo?.name || 'Captured Photo'}</p>
                  <p className="text-xs text-gray-500">{photo?.size ? formatBytes(photo.size) : 'Unknown size'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPhoto(null);
                    setValue('photo', null, { shouldDirty: true, shouldValidate: true });
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 transition rounded-full hover:bg-gray-100"
                  title="Remove Photo"
                >
                  <MdDelete className="text-xl" />
                </button>
              </div>
            )}

            {errors.photo && <p className="mt-1 text-xs text-red-500">{errors.photo.message}</p>}
          </div>

          {/* ── Duplicate warning ── */}
          {dupes?.has_duplicates && Array.isArray(dupes?.matches) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
              <p className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                <span>⚠️ Possible matches found</span>
                {checking && <span className="text-xs font-normal">(checking…)</span>}
              </p>
              <p className="text-sm text-yellow-900 mb-2">
                An inmate with similar details may already exist. Please review the matches below before creating a new record:
              </p>
              <ul className="list-disc ml-5 text-sm text-yellow-900 space-y-0.5">
                {dupes.matches.slice(0, 5).map((m) => (
                  <li key={m.id}>
                    {m.prison_number ? `${m.prison_number} — ` : ''}{m.first_name} {m.last_name} (DOB: {m.date_of_birth || '--'})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Submit ── */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-2 bg-malawiGreen hover:bg-green-800 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {creating ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Creating…
                </>
              ) : (
                'Create Inmate'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

StepInmateSelect.propTypes = {
  defaultValues: PropTypes.object,
  onSelected: PropTypes.func.isRequired
};
