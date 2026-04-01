import React from 'react';

export default function Checkbox({ label, className = '', ...props }) {
  return (
    <label className={`inline-flex items-center gap-2 ${className}`}>
      <input type="checkbox" className="h-4 w-4 accent-malawiGreen" {...props} />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

