import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '../../../components/common/Modal';
import Textarea from '../../../components/common/Textarea';
import Button from '../../../components/common/Button';

const denySchema = z.object({
  reason: z.string().trim().min(5, 'Please provide a valid denial reason')
});

export default function DenySessionModal({ open, onClose, onSave }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({ resolver: zodResolver(denySchema) });

  if (!open) return null;

  return (
    <Modal title="Deny visitation" onClose={onClose}>
      <form onSubmit={handleSubmit(onSave)} className="space-y-4">
        <Textarea label="Denial reason" rows={4} {...register('reason')} error={errors.reason} />
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>Submit denial</Button>
        </div>
      </form>
    </Modal>
  );
}
