import React from 'react';
import Input from '../../../../../components/common/Input';
import Textarea from '../../../../../components/common/Textarea';
import Checkbox from '../../../../../components/common/Checkbox';

export default function ExternalActivityForm({ form }) {
  const { register, formState: { errors } } = form;

  return (
    <div className="grid grid-cols-1 gap-4">
      <Input label="Location" {...register('location')} error={errors.location} />
      <Input label="External Partner" {...register('external_partner')} error={errors.external_partner} />
      <Checkbox label="Requires Transport" {...register('requires_transport')} />
      <Textarea label="Transport Details" rows={3} {...register('transport_details')} error={errors.transport_details} />
      <Textarea label="Safety Requirements" rows={3} {...register('safety_requirements')} error={errors.safety_requirements} />
      <Textarea label="Supervisor Requirements" rows={3} {...register('supervisor_requirements')} error={errors.supervisor_requirements} />
    </div>
  );
}
