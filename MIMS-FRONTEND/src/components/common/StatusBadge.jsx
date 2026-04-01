import React from 'react';

export default function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
        active ? 'bg-malawiGreen text-white' : 'bg-gray-200 text-gray-700'
      }`}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

