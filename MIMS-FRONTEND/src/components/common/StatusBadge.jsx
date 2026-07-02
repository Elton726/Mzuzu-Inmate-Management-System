import React from 'react';

export default function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
        active ? 'bg-malawiGreen text-white dark:bg-green-600 dark:text-white' : 'bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-gray-200'
      }`}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

