import React from 'react';
import FormField from './FormField';

export default function Input({ label, error, hint, className = '', ...props }) {
  return (
    <FormField label={label} error={error?.message || error} hint={hint}>
      <input
        className={`w-full border rounded px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-malawiGreen dark:text-white dark:bg-slate-800 ${className}`}
        {...props}
      />
    </FormField>
  );
}

