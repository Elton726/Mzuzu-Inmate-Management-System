import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch } from 'react-redux';
import { assignOfficer } from '../../store/dutyRosterSlice';
import { assignOfficerSchema } from '../../schemas/dutyRosterSchemas';
import Modal from '../../../../../components/common/Modal';
import Input from '../../../../../components/common/Input';
import Select from '../../../../../components/common/Select';
import Button from '../../../../../components/common/Button';
import { useToast } from '../../../../../contexts/useToast';
import { getAssignableOfficers } from '../../services/dutyRosterService';

export default function OfficerDutyRosterForm({ onClose, onSuccess }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const [officers, setOfficers] = useState([]);
  const [loadingOfficers, setLoadingOfficers] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(assignOfficerSchema),
  });

  const officerOptions = useMemo(
    () => officers.map((o) => ({ value: o.id, label: `${o.name} (${o.email})` })),
    [officers]
  );

  useEffect(() => {
    (async () => {
      try {
        setLoadingOfficers(true);
        const list = await getAssignableOfficers();
        setOfficers(list);
      } catch (err) {
        toast.fromError(err, { title: 'Failed to load officers' });
      } finally {
        setLoadingOfficers(false);
      }
    })();
  }, [toast]);

  const onSubmit = async (data) => {
    try {
      await dispatch(assignOfficer(data)).unwrap();
      onSuccess();
    } catch (err) {
      toast.fromError(err);
    }
  };

  return (
    <Modal title="Assign Officer to Duty" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select
          label="Officer"
          disabled={loadingOfficers}
          {...register('officer_id', { valueAsNumber: true })}
          error={errors.officer_id}
          options={officerOptions}
          hint={loadingOfficers ? 'Loading users…' : 'Admins, reception/station officers, and gatekeepers are excluded.'}
        />
        <Input
          type="date"
          label="Week Start Date"
          {...register('duty_week_start')}
          error={errors.duty_week_start}
          hint="You can pick any date in the week; the system saves the week starting Monday."
        />
        <div className="rounded border bg-gray-50 px-3 py-2 text-sm text-gray-700">
          This assignment covers the full week (all working hours).
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>Assign</Button>
        </div>
      </form>
    </Modal>
  );
}
