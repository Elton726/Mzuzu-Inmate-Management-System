// Password validation
export const validatePassword = (password) => {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*()_+\-={}[\];:'"\\|,.<>/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return errors;
};

// Email validation
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Format date
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Format datetime
export const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Get error message from API response
export const getErrorMessage = (error) => {
  if (typeof error === 'string') return error;
  const retryAfter = error?.rateLimit?.retryAfter ?? error?.data?.retry_after;
  const baseMessage = error?.data?.message || error?.message;
  if (error?.status === 429 && typeof retryAfter === 'number' && retryAfter > 0) {
    const msg = baseMessage || 'Rate limit exceeded';
    if (/retry in\s+\d+s/i.test(msg)) return msg;
    return `${msg}. Retry in ${retryAfter}s.`;
  }
  if (baseMessage) return baseMessage;
  return 'An unexpected error occurred';
};

// Get field errors from validation response
export const getFieldErrors = (error) => {
  if (error.data?.errors) {
    const fieldErrors = {};
    Object.keys(error.data.errors).forEach(field => {
      fieldErrors[field] = error.data.errors[field][0];
    });
    return fieldErrors;
  }
  return {};
};

// Normalize role values coming from backend (string or relationship object)
export const getRoleName = (userOrRole) => {
  if (!userOrRole) return null;
  if (typeof userOrRole === 'string') return userOrRole;

  if (typeof userOrRole === 'object') {
    if ('role_name' in userOrRole && typeof userOrRole.role_name === 'string') return userOrRole.role_name;

    if ('role' in userOrRole) {
      const r = userOrRole.role;
      if (typeof r === 'string') return r;
      if (r && typeof r === 'object' && typeof r.name === 'string') return r.name;
    }

    if (!('email' in userOrRole) && typeof userOrRole.name === 'string') return userOrRole.name;
  }

  return null;
};

// Role display name
export const getRoleDisplayName = (userOrRole) => {
  const role = getRoleName(userOrRole);
  const roleMap = {
    admin: 'Administrator',
    reception_officer: 'Reception Officer',
    station_officer: 'Station Officer',
    officer_on_duty: 'Officer on Duty',
    gatekeeper: 'Gatekeeper'
  };
  return roleMap[role] || role;
};

export const ROLES = {
  ADMIN: 'admin',
  RECEPTION_OFFICER: 'reception_officer',
  STATION_OFFICER: 'station_officer',
  OFFICER_ON_DUTY: 'officer_on_duty',
  GATEKEEPER: 'gatekeeper'
};

export const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrator' },
  { value: 'reception_officer', label: 'Reception Officer' },
  { value: 'station_officer', label: 'Station Officer' },
  { value: 'officer_on_duty', label: 'Officer on Duty' },
  { value: 'gatekeeper', label: 'Gatekeeper' }
];
