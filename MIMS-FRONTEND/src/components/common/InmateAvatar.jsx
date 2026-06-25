import React, { useMemo, useState } from 'react';
import { SERVER_BASE_URL } from '../../services/apiService';

const sizeClasses = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-36 w-28 text-sm',
  xl: 'h-40 w-32 text-base',
};

const getInitials = (firstName, lastName, fullName) => {
  const parts = [firstName, lastName]
    .filter(Boolean)
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0 && fullName) {
    return fullName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?';
  }

  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

export default function InmateAvatar({
  inmate,
  photoPath,
  firstName,
  lastName,
  fullName,
  size = 'md',
  className = '',
}) {
  const [hasError, setHasError] = useState(false);

  const photo = useMemo(() => {
    return photoPath || inmate?.photo_path || inmate?.photoPath || null;
  }, [photoPath, inmate]);

  const name = useMemo(() => {
    if (fullName) return fullName;
    return [firstName, lastName]
      .filter(Boolean)
      .join(' ') || inmate?.first_name || inmate?.last_name || inmate?.fullName || '';
  }, [fullName, firstName, inmate, lastName]);

  const initials = getInitials(firstName || inmate?.first_name, lastName || inmate?.last_name, name);
  const src = photo && !hasError ? `${SERVER_BASE_URL}/storage/${photo}` : null;
  const sizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div className={`relative overflow-hidden rounded-xl bg-malawiBlack text-white flex items-center justify-center ${sizeClass} ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name ? `${name} photo` : 'Inmate photo'}
          className="h-full w-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <span className="font-extrabold">{initials}</span>
      )}
    </div>
  );
}
