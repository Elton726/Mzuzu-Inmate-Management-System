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
  if (error.data?.message) return error.data.message;
  if (error.message) return error.message;
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

// Role display name
export const getRoleDisplayName = (role) => {
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
