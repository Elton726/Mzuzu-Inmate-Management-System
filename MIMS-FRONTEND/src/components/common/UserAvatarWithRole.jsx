import React from 'react';
import { getRoleDisplayName, getRoleName } from '../../utils/helpers';

const roleTone = {
  admin: 'bg-red-100 text-red-800 border-red-200',
  reception_officer: 'bg-green-100 text-green-800 border-green-200',
  station_officer: 'bg-blue-100 text-blue-800 border-blue-200',
  officer_on_duty: 'bg-amber-100 text-amber-900 border-amber-200',
  gatekeeper: 'bg-purple-100 text-purple-800 border-purple-200',
};

const avatarTone = {
  admin: 'bg-malawiRed text-white',
  reception_officer: 'bg-malawiGreen text-white',
  station_officer: 'bg-blue-600 text-white',
  officer_on_duty: 'bg-malawiGold text-malawiBlack',
  gatekeeper: 'bg-purple-700 text-white',
};

const getInitials = (user) => {
  const source = user?.name || user?.email || 'User';
  const parts = source
    .replace(/@.*/, '')
    .split(/\s+|[._-]+/)
    .filter(Boolean);

  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

export default function UserAvatarWithRole({
  user,
  showEmail = true,
  size = 'md',
  tone = 'light',
  className = '',
}) {
  const roleName = getRoleName(user);
  const roleLabel = getRoleDisplayName(user) || 'No Role';
  const sizeClass = size === 'sm' ? 'h-9 w-9 text-sm' : 'h-11 w-11 text-base';
  const badgeClass = roleTone[roleName] || 'bg-gray-100 text-gray-700 border-gray-200';
  const avatarClass = avatarTone[roleName] || 'bg-gray-700 text-white';
  const nameClass = tone === 'dark' ? 'text-white' : 'text-gray-900 dark:text-white';
  const emailClass = tone === 'dark' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-300';

  return (
    <div className={`flex min-w-0 items-center gap-3 ${className}`}>
      <div className={`flex shrink-0 items-center justify-center rounded-full font-black shadow-sm ${sizeClass} ${avatarClass}`}>
        {getInitials(user)}
      </div>
      <div className="min-w-0">
        <div className={`truncate font-semibold ${nameClass}`}>
          {user?.name || 'Unnamed User'}
        </div>
        {showEmail && (
          <div className={`truncate text-sm ${emailClass}`}>
            {user?.email || 'No email'}
          </div>
        )}
        <span className={`mt-1 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}>
          {roleLabel}
        </span>
      </div>
    </div>
  );
}
