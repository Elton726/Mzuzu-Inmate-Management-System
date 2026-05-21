import React from 'react';

/**
 * Release Status Badge Component
 * Shows status with appropriate color coding
 */
export default function ReleaseStatusBadge({ status }) {
  const statusConfig = {
    'not_approved': {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-800 dark:text-gray-300',
      label: 'Not Approved'
    },
    'approved': {
      bg: 'bg-blue-100 dark:bg-blue-900',
      text: 'text-blue-800 dark:text-blue-300',
      label: 'Approved'
    },
    'pending_confirmation': {
      bg: 'bg-yellow-100 dark:bg-yellow-900',
      text: 'text-yellow-800 dark:text-yellow-300',
      label: 'Pending Confirmation'
    },
    'confirmed': {
      bg: 'bg-green-100 dark:bg-green-900',
      text: 'text-green-800 dark:text-green-300',
      label: 'Confirmed'
    },
    'released': {
      bg: 'bg-malawiGreen/10 dark:bg-malawiGreen/20',
      text: 'text-malawiGreen dark:text-green-400',
      label: 'Released'
    },
    'cancelled': {
      bg: 'bg-malawiRed/10 dark:bg-malawiRed/20',
      text: 'text-malawiRed dark:text-red-400',
      label: 'Cancelled'
    }
  };

  const config = statusConfig[status] || statusConfig['not_approved'];

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}
