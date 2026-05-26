import React, { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDebouncedValue } from '../../../utils/useDebouncedValue';
import { visitationSessionSchema } from '../schemas/sessionSchemas';
import Modal from '../../../components/common/Modal';
import Input from '../../../components/common/Input';
import Select from '../../../components/common/Select';
import Button from '../../../components/common/Button';
import Textarea from '../../../components/common/Textarea';
import DatePicker from '../../../components/common/DatePicker';
import apiClient from '../../../services/apiClient';
import { getCurrentAdmission, getInmateDisplayName, getInmateSearchResults } from '../utils/inmateSearch';

const durationOptions = [15, 30, 45, 60, 90, 120].map((value) => ({ value: String(value), label: `${value} minutes` }));

const emptySessionDefaults = {
  inmate_id: '',
  visitor_id: '',
  admission_id: '',
  visit_date: '',
  visit_time: '',
  duration_minutes: 30,
  location: '',
  visit_purpose: '',
  notes: '',
  is_charity_visit: false,
  charity_organization: '',
  charity_purpose: ''
};

const defaultSessionValues = {};

export default function SessionFormModal({ open, onClose, onSave, defaultValues = defaultSessionValues }) {
  const formDefaults = useMemo(() => ({ ...emptySessionDefaults, ...defaultValues }), [defaultValues]);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(visitationSessionSchema),
    defaultValues: formDefaults
  });

  const selectedInmateId = watch('inmate_id');
  const isCharityVisit = watch('is_charity_visit');
  const [inmateQuery, setInmateQuery] = useState('');
  const [inmateOptions, setInmateOptions] = useState([]);
  const [visitorOptions, setVisitorOptions] = useState([]);
  const [isSearchingInmate, setIsSearchingInmate] = useState(false);
  const debouncedInmateQuery = useDebouncedValue(inmateQuery, 300);

  useEffect(() => {
    if (open) {
      reset(formDefaults);
      setInmateQuery('');
      setInmateOptions([]);
      setVisitorOptions([]);
    }
  }, [formDefaults, open, reset]);

  useEffect(() => {
    if (!debouncedInmateQuery) {
      setInmateOptions([]);
      return;
    }

    (async () => {
      setIsSearchingInmate(true);
      try {
        const response = await apiClient.get('/inmates/search', { params: { q: debouncedInmateQuery } });
        setInmateOptions(getInmateSearchResults(response.data));
      } catch {
        setInmateOptions([]);
      } finally {
        setIsSearchingInmate(false);
      }
    })();
  }, [debouncedInmateQuery]);

  useEffect(() => {
    if (!selectedInmateId) {
      setVisitorOptions([]);
      return;
    }

    (async () => {
      try {
        const response = await apiClient.get(`/inmates/${selectedInmateId}/visitors`);
        const registrations = Array.isArray(response.data?.data) ? response.data.data : response.data ?? [];
        setVisitorOptions(registrations.map((registration) => registration.visitor ?? registration).filter(Boolean));
      } catch {
        setVisitorOptions([]);
      }
    })();
  }, [selectedInmateId]);

  const selectedInmate = useMemo(() => {
    return inmateOptions.find((item) => String(item.id) === String(selectedInmateId));
  }, [inmateOptions, selectedInmateId]);

  useEffect(() => {
    const currentAdmission = getCurrentAdmission(selectedInmate);
    if (currentAdmission?.id) {
      setValue('admission_id', String(currentAdmission.id));
    } else {
      setValue('admission_id', '');
    }
  }, [selectedInmate, setValue]);

  if (!open) return null;

  return (
    <Modal title="Schedule visitation session" onClose={onClose} widthClass="max-w-3xl">
      {/* Fix: force form content above backdrop and allow pointer events */}
      <div style={{ position: 'relative', zIndex: 1, pointerEvents: 'auto' }} onMouseDown={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit(onSave)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="relative">
              <Input
                label="Search inmate"
                placeholder="Type name or inmate number"
                value={inmateQuery}
                onChange={(e) => setInmateQuery(e.target.value)}
                error={errors.inmate_id}
                autoFocus
              />
              {inmateQuery && (
                <div className="absolute z-20 w-full mt-1 rounded-lg border border-gray-200 bg-white shadow-lg max-h-52 overflow-auto dark:bg-slate-900 dark:border-slate-700">
                  {isSearchingInmate ? (
                    <div className="p-3 text-sm text-gray-500">Searching inmates...</div>
                  ) : (
                    inmateOptions.map((inmate) => (
                      <button
                        type="button"
                        key={inmate.id}
                        onClick={() => {
                          setValue('inmate_id', String(inmate.id));
                          setInmateQuery(getInmateDisplayName(inmate));
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 dark:hover:bg-slate-800 dark:focus:bg-slate-800"
                      >
                        {getInmateDisplayName(inmate)} {inmate.prison_number ? `(${inmate.prison_number})` : ''}
                      </button>
                    ))
                  )}
                  {!isSearchingInmate && inmateOptions.length === 0 && (
                    <div className="p-3 text-sm text-gray-500">No inmates found.</div>
                  )}
                </div>
              )}
            </div>
            <div>
              <Controller
                name="visitor_id"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Visitor"
                    options={visitorOptions.map((visitor) => ({
                      value: String(visitor.id),
                      label: `${visitor.first_name || ''} ${visitor.last_name || ''}`.trim() || visitor.contact_number
                    }))}
                    {...field}
                    error={errors.visitor_id}
                  />
                )}
              />
            </div>
            <div>
              <Controller
                name="admission_id"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Admission"
                    options={getCurrentAdmission(selectedInmate) ? [{ value: String(getCurrentAdmission(selectedInmate).id), label: getCurrentAdmission(selectedInmate).name || 'Current admission' }] : []}
                    {...field}
                    error={errors.admission_id}
                    hint="Current admission is auto-populated when available"
                  />
                )}
              />
            </div>
            <div>
              <DatePicker label="Visit date" {...register('visit_date')} error={errors.visit_date} />
            </div>
            <Input label="Visit time" type="time" {...register('visit_time')} error={errors.visit_time} />
            <Select label="Duration" options={durationOptions} {...register('duration_minutes', { valueAsNumber: true })} error={errors.duration_minutes} />
            <Input label="Location" {...register('location')} error={errors.location} />
            <Input label="Purpose" {...register('visit_purpose')} error={errors.visit_purpose} />
            <Textarea label="Notes" rows={4} {...register('notes')} error={errors.notes} />
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input type="checkbox" {...register('is_charity_visit')} className="rounded border-gray-300 text-malawiGreen focus:ring-malawiGreen" />
                Charity visit
              </label>
            </div>
            {isCharityVisit && (
              <>
                <Input label="Charity organization" {...register('charity_organization')} error={errors.charity_organization} />
                <Textarea label="Charity purpose" rows={3} {...register('charity_purpose')} error={errors.charity_purpose} />
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={isSubmitting}>Schedule visit</Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
