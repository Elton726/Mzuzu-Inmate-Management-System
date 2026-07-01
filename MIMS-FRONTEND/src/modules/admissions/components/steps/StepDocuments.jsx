import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDropzone } from 'react-dropzone';
import FormField from '../../../../components/common/FormField';
import { documentsSchema } from '../../schemas/admissionSchemas';
import CameraCapture from '../CameraCapture';
import { MdCameraAlt, MdCloudUpload } from 'react-icons/md';

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

export default function StepDocuments({ defaultValues, onBack, onNext }) {
  const initialWarrant = defaultValues?.warrant || null;
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(documentsSchema),
    defaultValues: defaultValues || { warrant: null, warrantDescription: '' }
  });

  const [warrant, setWarrant] = useState(initialWarrant);
  const [warrantMode, setWarrantMode] = useState('upload');
  const [cameraActive, setCameraActive] = useState(false);

  const accept = useMemo(
    () => ({ 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] }),
    []
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Documents</h2>

      <form onSubmit={handleSubmit(onNext)} className="space-y-4">
        <div className="space-y-3">
          <p className="block text-sm font-semibold text-gray-700">Warrant document (optional)</p>
          <div className="flex gap-1.5 p-1 bg-gray-100 rounded-xl max-w-xs">
            <button
              type="button"
              onClick={() => {
                setWarrantMode('upload');
                setCameraActive(false);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-lg transition-all ${
                warrantMode === 'upload'
                  ? 'bg-white text-gray-800 shadow-sm font-semibold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <MdCloudUpload className="text-base" />
              Upload File
            </button>
            <button
              type="button"
              onClick={() => setWarrantMode('camera')}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-lg transition-all ${
                warrantMode === 'camera'
                  ? 'bg-white text-gray-800 shadow-sm font-semibold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <MdCameraAlt className="text-base" />
              Take Photo
            </button>
          </div>

          {warrantMode === 'upload' ? (
            <DropzoneField
              label=""
              accept={accept}
              value={warrant}
              onFile={(f) => {
                setWarrant(f);
                setValue('warrant', f, { shouldDirty: true });
              }}
              hint="PDF/JPG/PNG"
            />
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 bg-gray-50 flex flex-col items-center justify-center min-h-[160px]">
              {cameraActive ? (
                <div className="w-full max-w-md">
                  <CameraCapture
                    onCapture={(file) => {
                      setWarrant(file);
                      setValue('warrant', file, { shouldDirty: true });
                      setCameraActive(false);
                    }}
                    onCancel={() => setCameraActive(false)}
                  />
                </div>
              ) : (
                <div className="text-center py-6">
                  <MdCameraAlt className="text-4xl text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-3">Capture the warrant with your system camera</p>
                  <button
                    type="button"
                    onClick={() => setCameraActive(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-malawiGold hover:bg-yellow-400 text-gray-900 font-semibold rounded-xl text-sm shadow transition"
                  >
                    <MdCameraAlt />
                    Open Camera
                  </button>
                </div>
              )}
            </div>
          )}

          {warrant && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
              Selected: {warrant.name || 'Captured warrant image'}
            </div>
          )}
        </div>

        <FormField label="Warrant description" error={errors.warrantDescription?.message}>
          <input className="w-full border rounded px-3 py-2" {...register('warrantDescription')} />
        </FormField>

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
            className="bg-malawiGreen text-white px-5 py-2 rounded hover:opacity-90 transition"
          >
            Submit admission
          </button>
        </div>
      </form>
    </div>
  );
}

StepDocuments.propTypes = {
  defaultValues: PropTypes.object,
  onBack: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired
};
