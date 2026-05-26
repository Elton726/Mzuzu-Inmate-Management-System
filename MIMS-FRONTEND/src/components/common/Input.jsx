import React from 'react';
import FormField from './FormField';

const Input = React.forwardRef(
  ({ label, error, hint, className = '', ...props }, ref) => {
    return (
      <FormField label={label} error={error?.message || error} hint={hint}>
        <input
          ref={ref}
          className={`w-full border rounded px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-malawiGreen dark:text-white dark:bg-slate-800 ${className}`}
          {...props}
        />
      </FormField>
    );
  }
);

Input.displayName = 'Input';

export default Input;
