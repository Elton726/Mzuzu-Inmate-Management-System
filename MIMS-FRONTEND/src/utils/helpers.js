/**
 * Utility Functions for MIMS Frontend
 *
 * This module contains various utility functions for:
 * - Input validation (password, email)
 * - Date/time formatting
 * - Error handling and normalization
 * - Role management and display
 * - API response processing
 */

/**
 * Validate password strength
 *
 * Checks password against security requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character
 *
 * @param {string} password - Password to validate
 * @returns {string[]} Array of validation error messages (empty if valid)
 */
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

/**
 * Validate email format
 *
 * Uses basic regex pattern for email validation
 *
 * @param {string} email - Email address to validate
 * @returns {boolean} True if email format is valid
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Format date string for display
 *
 * Converts ISO date string to localized date format (MM/DD/YYYY)
 *
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format datetime string for display
 *
 * Converts ISO datetime string to localized format with time
 *
 * @param {string} dateString - ISO datetime string
 * @returns {string} Formatted datetime string
 */
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

/**
 * Extract user-friendly error message from API error
 *
 * Handles different error formats and rate limiting messages
 *
 * @param {Error|Object|string} error - Error object from API call
 * @returns {string} User-friendly error message
 */
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

/**
 * Extract field-specific validation errors from API response
 *
 * Converts Laravel-style validation errors to field-error mapping
 *
 * @param {Error|Object} error - Error object from API validation failure
 * @returns {Object} Object mapping field names to error messages
 */
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

/**
 * Map of role_id to role name
 * Based on backend roles table:
 * id: 1 = admin, 2 = reception_officer, 3 = station_officer, 4 = officer_on_duty, 5 = gatekeeper
 */
const ROLE_ID_MAP = {
  1: 'admin',
  2: 'reception_officer',
  3: 'station_officer',
  4: 'officer_on_duty',
  5: 'gatekeeper'
};

/**
 * Extract role name from user object or role data
 *
 * Handles different formats of role data from backend:
 * - String role name
 * - User object with role relationship
 * - Role object with name property
 * - Numeric role_id (e.g., role_id: 3 returns 'station_officer')
 *
 * @param {Object|string} userOrRole - User object, role object, or role string
 * @returns {string|null} Normalized role name or null if not found
 */
export const getRoleName = (userOrRole) => {
  if (!userOrRole) return null;
  if (typeof userOrRole === 'string') return userOrRole;

  if (typeof userOrRole === 'object') {
    // Check for role_name property (e.g., { role_name: 'admin' })
    if ('role_name' in userOrRole && typeof userOrRole.role_name === 'string') return userOrRole.role_name;

    // Check for role relationship object (e.g., { role: { name: 'admin' } })
    if ('role' in userOrRole) {
      const r = userOrRole.role;
      if (typeof r === 'string') return r;
      if (r && typeof r === 'object' && typeof r.name === 'string') return r.name;
    }

// Check for numeric role_id (e.g., { role_id: 3 } returns 'station_officer')
    if ('role_id' in userOrRole) {
      const roleId = userOrRole.role_id;
      // Handle both number and string representations of role_id
      if (typeof roleId === 'number') {
        return ROLE_ID_MAP[roleId] || null;
      }
      if (typeof roleId === 'string' && /^\d+$/.test(roleId)) {
        return ROLE_ID_MAP[parseInt(roleId, 10)] || null;
      }
    }

    // Check for standalone role object with id (e.g., { id: 1 } in role lookup)
    if (!('email' in userOrRole) && typeof userOrRole.name === 'string') return userOrRole.name;
  }

  return null;
};

/**
 * Get human-readable role display name
 *
 * Converts role slugs to proper display names for UI
 *
 * @param {Object|string} userOrRole - User object, role object, or role string
 * @returns {string} Display name for the role
 */
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

/**
 * Role Constants
 *
 * Centralized role definitions for consistency across the application
 */
export const ROLES = {
  ADMIN: 'admin',
  RECEPTION_OFFICER: 'reception_officer',
  STATION_OFFICER: 'station_officer',
  OFFICER_ON_DUTY: 'officer_on_duty',
  GATEKEEPER: 'gatekeeper'
};

/**
 * Role Options for Select Components
 *
 * Pre-formatted options array for role selection dropdowns
 */
export const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrator' },
  { value: 'reception_officer', label: 'Reception Officer' },
  { value: 'station_officer', label: 'Station Officer' },
  { value: 'officer_on_duty', label: 'Officer on Duty' },
  { value: 'gatekeeper', label: 'Gatekeeper' }
];

/**
 * Calculate projected release date with remission
 *
 * Calculates sentence end date and applies 1/3 remission on total days
 * Matches the backend SentenceCalculationService logic
 *
 * @param {string} sentenceStartDate - ISO date string for sentence start
 * @param {number} years - Sentence years
 * @param {number} months - Sentence months (optional, default 0)
 * @returns {string} ISO date string for projected release date
 */
export const calculateProjectedReleaseDate = (sentenceStartDate, years, months = 0) => {
  const startDate = new Date(sentenceStartDate);
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + years);
  endDate.setMonth(endDate.getMonth() + months);

  // Calculate total days
  const totalDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));

  // Apply 1/3 remission
  const remissionDays = Math.floor(totalDays / 3);
  const releaseDate = new Date(endDate);
  releaseDate.setDate(releaseDate.getDate() - remissionDays);

  return releaseDate.toISOString().slice(0, 10);
};
