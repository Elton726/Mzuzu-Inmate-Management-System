import React from 'react';

/**
 * Stats Card Component
 * Displays KPI information in a card format with icon and value
 */
export default function StatsCard({
  title,
  value,
  icon: Icon,
  color = 'malawiGreen',
  subtitle
}) {
  const colorClasses = {
    malawiGreen: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    malawiRed: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    malawiGold: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
  };

  const iconColorClasses = {
    malawiGreen: 'text-malawiGreen',
    malawiRed: 'text-malawiRed',
    malawiGold: 'text-malawiGold',
    blue: 'text-blue-600'
  };

  return (
    <div className={`p-6 rounded-lg border ${colorClasses[color]} shadow-sm hover:shadow-md transition`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={`${iconColorClasses[color]} text-3xl`}>
            <Icon />
          </div>
        )}
      </div>
    </div>
  );
}
