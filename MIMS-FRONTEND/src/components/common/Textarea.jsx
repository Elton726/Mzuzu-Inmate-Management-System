import React from 'react';
import FormField from './FormField';

const Textarea = React.forwardRef(
  ({ label, error, hint, className = '', ...props }, ref) => {
    return (
      <FormField label={label} error={error?.message || error} hint={hint}>
        <textarea
          ref={ref}
          className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-malawiGreen ${className}`}
          {...props}
        />
      </FormField>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;