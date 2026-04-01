import React from 'react';
import FormField from './FormField';

export default function Textarea({ label, error, hint, className = '', ...props }) {
  return (
    <FormField label={label} error={error?.message || error} hint={hint}>
      <textarea
        className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-malawiGreen ${className}`}
        {...props}
      />
    </FormField>
  );
}

