import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDropzone } from 'react-dropzone';
import FormField from '../../../../components/common/FormField';
import { inmateSchema } from '../../schemas/admissionSchemas';
import { checkDuplicate, createInmate } from '../../services/inmateService';
import { toast } from 'react-toastify';

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

function DropzoneField({ label, accept, onFile, value, hint }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    multiple: false,
    onDrop: (accepted) => onFile(accepted?.[0] || null)
  });

  return (
    <div>
      <p className="block text-sm font-semibold text-gray-700 mb-1">{label}</p>
      <div
        {...getRootProps()}
        className={[
          'border-2 border-dashed rounded-lg p-4 cursor-pointer transition',
          isDragActive ? 'border-malawiRed bg-malawiGold/20' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
        ].join(' ')}
      >
        <input {...getInputProps()} />
        <p className="text-sm text-gray-700">
          {value ? (
            <span className="font-semibold">{value.name}</span>
          ) : (
            'Drag & drop a file here, or click to select'
          )}
        </p>
        {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
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

  // search removed: creation flow now always starts with fresh inmate creation

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
      toast.success(`Inmate created (${created?.prison_number || created?.id})`);
      onSelected({ inmate: created, created: true, inmateDraft: form, photo });
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to create inmate';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Select-existing functionality removed: creation flow starts with the form below */}

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
            <FormField label="Gender" error={errors.gender?.message}>
              <select className="w-full border rounded px-3 py-2" {...register('gender')}>
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
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
            <FormField label="Marital status" error={errors.maritalStatus?.message}>
              <select className="w-full border rounded px-3 py-2" {...register('maritalStatus')}>
                <option value="">Select marital status</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </select>
            </FormField>
            <FormField label="Next of kin name" error={errors.nextOfKinName?.message}>
              <input className="w-full border rounded px-3 py-2" {...register('nextOfKinName')} />
            </FormField>
            <FormField label="Next of kin contact" error={errors.nextOfKinContact?.message}>
              <input className="w-full border rounded px-3 py-2" {...register('nextOfKinContact')} />
            </FormField>
            <FormField label="Personal belongings" error={errors.personalBelongings?.message}>
              <textarea className="w-full border rounded px-3 py-2" {...register('personalBelongings')} rows={3} />
            </FormField>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">Inmate photo *</label>
            
            {/* Tabs for select method */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg max-w-xs">
              <button
                type="button"
                onClick={() => {
                  setPhotoMode('upload');
                  setIsCameraActive(false);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${
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
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${
                  photoMode === 'camera'
                    ? 'bg-white text-gray-800 shadow-sm font-semibold'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <MdCameraAlt className="text-base" />
                Take Photo
              </button>
            </div>

            {/* Photo Mode Viewports */}
            {photoMode === 'upload' ? (
              <DropzoneField
                label=""
                accept={{ 'image/*': ['.png', '.jpg', '.jpeg'] }}
                value={photo}
                onFile={(f) => {
                  setPhoto(f);
                  setValue('photo', f, { shouldDirty: true, shouldValidate: true });
                }}
                hint="JPG/PNG"
              />
            ) : (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex flex-col items-center justify-center min-h-[160px]">
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
                      className="px-4 py-2 bg-malawiGold hover:bg-opacity-90 text-gray-900 font-semibold rounded text-sm shadow transition"
                    >
                      Open Camera
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Interactive Preview & Details */}
            {photoPreview && (
              <div className="flex items-center gap-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="relative w-16 h-16 rounded overflow-hidden border border-gray-300 bg-white flex-shrink-0">
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

            {errors.photo && <p className="text-sm text-red-600">{errors.photo.message}</p>}
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
