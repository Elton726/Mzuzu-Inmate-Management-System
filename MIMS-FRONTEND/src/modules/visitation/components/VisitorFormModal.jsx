import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { visitorRegistrationSchema } from '../schemas/visitorSchemas';
import Modal from '../../../components/common/Modal';
import Input from '../../../components/common/Input';
import Select from '../../../components/common/Select';
import Button from '../../../components/common/Button';

const relationshipOptions = [
  { value: 'family', label: 'Family' },
  { value: 'friend', label: 'Friend' },
  { value: 'legal_representative', label: 'Legal Representative' },
  { value: 'social_worker', label: 'Social Worker' },
  { value: 'charity_representative', label: 'Charity Representative' },
  { value: 'other', label: 'Other' }
];

export default function VisitorFormModal({ open, onClose, onSave, initialData }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm({
    resolver: zodResolver(visitorRegistrationSchema),
    defaultValues: initialData || {
      first_name: '',
      last_name: '',
      relationship: '',
      contact_number: '',
      national_id: '',
      email: ''
    }
  });

  useEffect(() => {
    reset(initialData || {
      first_name: '',
      last_name: '',
      relationship: '',
      contact_number: '',
      national_id: '',
      email: ''
    });
  }, [initialData, reset]);

  if (!open) return null;

  return (
    <Modal title={initialData ? 'Edit Visitor' : 'Register Visitor'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSave)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="First name" {...register('first_name')} error={errors.first_name} />
          <Input label="Last name" {...register('last_name')} error={errors.last_name} />
          <Select label="Relationship" options={relationshipOptions} {...register('relationship')} error={errors.relationship} />
          <Input label="Contact number" {...register('contact_number')} error={errors.contact_number} />
          <Input label="National ID" {...register('national_id')} error={errors.national_id} />
          <Input label="Email" type="email" {...register('email')} error={errors.email} />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>{initialData ? 'Save changes' : 'Register visitor'}</Button>
        </div>
      </form>
    </Modal>
  );
}
