import React from 'react';
import FormField from './FormField';

const Input = React.forwardRef(
  ({ label, error, hint, className = '', ...props }, ref) => {
    return (
      <FormField label={label} error={error?.message || error} hint={hint}>
        <input
          ref={ref}
          className={`w-full border rounded px-3 py-2 text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-malawiGreen dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100 dark:placeholder:text-gray-500 ${className}`}
          {...props}
        />
      </FormField>
    );
  }
);

Input.displayName = 'Input';

export default Input;
