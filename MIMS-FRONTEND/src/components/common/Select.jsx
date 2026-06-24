import React from 'react';
import FormField from './FormField';

const Select = React.forwardRef(
  ({ label, error, hint, options = [], className = '', ...props }, ref) => {
    return (
      <FormField label={label} error={error?.message || error} hint={hint}>
        <select
          ref={ref}
          className={`w-full border rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-malawiGreen ${className}`}
          {...props}
        >
          <option value="">Select...</option>

          {options.map((o) => (
            <option key={String(o.value)} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </FormField>
    );
  }
);

Select.displayName = 'Select';

export default Select;