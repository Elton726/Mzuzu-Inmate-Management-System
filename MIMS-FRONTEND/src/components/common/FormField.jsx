import React from 'react';
import PropTypes from 'prop-types';

export default function FormField({ label, error, children, hint }) {
  return (
    <div>
      {label && <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>}
      {children}
      {hint && !error && <p className="text-sm text-gray-500 mt-1">{hint}</p>}
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}

FormField.propTypes = {
  label: PropTypes.string,
  error: PropTypes.string,
  hint: PropTypes.string,
  children: PropTypes.node.isRequired
};

