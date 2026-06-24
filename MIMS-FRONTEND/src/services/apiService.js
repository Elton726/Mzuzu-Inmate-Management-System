/**
 * API Service - Centralized HTTP client for MIMS backend communication
 *
 * This service provides a unified interface for all API operations including:
 * - Authentication (login, logout, profile management)
 * - User management (CRUD operations for admin users)
 * - Inmate management (admissions, inmate profiles, documents)
 * - Rate limiting and error handling
 * - Token management and request headers
 *
 * Features:
 * - Automatic JWT token attachment to authenticated requests
 * - Rate limit tracking and error handling
 * - JSON/form-data request support
 * - Centralized error parsing and normalization
 * - localStorage token persistence
 *
 * Rate Limiting:
 * - Tracks rate limit headers from responses
 * - Provides rate limit status for UI feedback
 * - Handles 429 responses with retry information
 *
 * Error Handling:
 * - Normalizes API errors with status codes and messages
 * - Includes rate limit information in error objects
 * - Safe JSON parsing with fallbacks
 */

const API_BASE_URL = 'http://localhost:8000/api';
export const SERVER_BASE_URL = 'http://localhost:8000';

/**
 * Safely parse integer from header value
 * @param {string|null} value - Header value to parse
 * @returns {number|null} Parsed integer or null if invalid
 */
const parseHeaderInt = (value) => {
  if (value == null) return null;
  const num = Number.parseInt(String(value), 10);
  return Number.isFinite(num) ? num : null;
};

/**
 * ApiService Class - Main API client
 *
 * Singleton service that handles all HTTP communication with the backend.
 * Manages authentication tokens, rate limiting, and request/response processing.
 */
class ApiService {
  constructor() {
    this.token = localStorage.getItem('authToken');
    this.lastRateLimit = new Map();
  }

  /**
   * Set authentication token for API requests
   * @param {string} token - JWT token from login response
   */
  setToken(token) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  /**
   * Clear authentication token
   * Removes token from memory and localStorage
   */
  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  /**
   * Get standard JSON request headers
   * @returns {Object} Headers object with content-type and authorization
   */
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` })
    };
  }

  /**
   * Get headers for form-data requests (no content-type)
   * @returns {Object} Headers object with authorization only
   */
  getFormHeaders() {
    return {
      'Accept': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` })
    };
  }

  /**
   * Get current rate limit status for an endpoint
   * @param {string} key - Rate limit key (e.g., 'auth_login')
   * @returns {Object|null} Rate limit info or null if not tracked
   */
  getRateLimitStatus(key) {
    return this.lastRateLimit.get(key) ?? null;
  }

  /**
   * Update rate limit information from response headers
   * @param {string} key - Rate limit key to update
   * @param {Response} response - Fetch API response object
   */
  updateRateLimitFromResponse(key, response) {
    if (!key) return;
    const limit = parseHeaderInt(response.headers.get('X-RateLimit-Limit'));
    const remaining = parseHeaderInt(response.headers.get('X-RateLimit-Remaining'));
    const resetAt = parseHeaderInt(response.headers.get('X-RateLimit-Reset'));
    const retryAfter = parseHeaderInt(response.headers.get('Retry-After'));
    this.lastRateLimit.set(key, { limit, remaining, resetAt, retryAfter });
  }

  /**
   * Safely parse JSON response body
   * @param {Response} response - Fetch API response object
   * @returns {Object|null} Parsed JSON or null if parsing fails
   */
  async safeParseJson(response) {
    if (response.status === 204) return null;
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Make authenticated JSON API request
   * @param {string} rateLimitKey - Key for rate limit tracking
   * @param {string} path - API endpoint path
   * @param {Object} options - Fetch options (method, body, etc.)
   * @returns {Promise<Object>} API response data
   */
  async request(rateLimitKey, path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {})
      }
    });

    this.updateRateLimitFromResponse(rateLimitKey, response);
    return this.handleResponse(response);
  }

  /**
   * Make authenticated form-data API request
   * @param {string} rateLimitKey - Key for rate limit tracking
   * @param {string} path - API endpoint path
   * @param {FormData} formData - Form data to send
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} API response data
   */
  async requestForm(rateLimitKey, path, formData, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || 'POST',
      ...options,
      body: formData,
      headers: {
        ...this.getFormHeaders(),
        ...(options.headers || {})
      }
    });

    this.updateRateLimitFromResponse(rateLimitKey, response);
    return this.handleResponse(response);
  }

  /**
   * Handle API response and errors
   * @param {Response} response - Fetch API response object
   * @returns {Promise<Object>} Response data or throws error
   */
  async handleResponse(response) {
    const data = await this.safeParseJson(response);

    if (!response.ok) {
      const serverMessage = data?.message;
      const error = new Error(serverMessage || 'API Error');
      error.status = response.status;
      error.data = data ?? {};

      // Extract rate limit information
      const limit = parseHeaderInt(response.headers.get('X-RateLimit-Limit'));
      const remaining = parseHeaderInt(response.headers.get('X-RateLimit-Remaining'));
      const resetAt = parseHeaderInt(response.headers.get('X-RateLimit-Reset'));
      const retryAfterHeader = parseHeaderInt(response.headers.get('Retry-After'));
      const retryAfterBody = parseHeaderInt(data?.retry_after);
      const retryAfter = retryAfterBody ?? retryAfterHeader;
      error.rateLimit = { limit, remaining, resetAt, retryAfter };

      if (response.status === 429 && retryAfter != null) {
        error.message = `${serverMessage || 'Rate limit exceeded'}. Retry in ${retryAfter}s.`;
      }
      throw error;
    }

    return data ?? {};
  }

  // ============ AUTH ENDPOINTS ============

  /**
   * Authenticate user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Login response with token and user data
   */
  async login(email, password) {
    return this.request('auth_login', '/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  /**
   * Logout current user
   * @returns {Promise<Object>} Logout response
   */
  async logout() {
    return this.request(null, '/logout', { method: 'POST' });
  }

  /**
   * Register new user (admin only)
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Registration response
   */
  async registerUser(userData) {
    return this.request('auth_register', '/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  // ============ USER ENDPOINTS ============

  /**
   * Get current user profile
   * @returns {Promise<Object>} User profile data
   */
  async getProfile() {
    return this.request('user_profile', '/user/profile', { method: 'GET' });
  }

  /**
   * Get user by ID
   * @param {number} userId - User ID
   * @returns {Promise<Object>} User data
   */
  async getUserById(userId) {
    return this.request('user_profile', `/user/${userId}`, { method: 'GET' });
  }

  /**
   * Update current user profile
   * @param {Object} updates - Profile update data
   * @returns {Promise<Object>} Updated user data
   */
  async updateProfile(updates) {
    return this.request('user_profile', '/user/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  /**
   * Change user password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @param {string} passwordConfirmation - Password confirmation
   * @returns {Promise<Object>} Password change response
   */
  async changePassword(currentPassword, newPassword, passwordConfirmation) {
    return this.request('user_change_password', '/user/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: passwordConfirmation
      })
    });
  }

  // ============ ADMIN ENDPOINTS ============

  /**
   * List users with optional filtering
   * @param {Object} params - Query parameters (pagination, search, etc.)
   * @returns {Promise<Object>} Users list with pagination
   */
  async listUsers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request('admin_ops', `/admin/users?${queryString}`, { method: 'GET' });
  }

  /**
   * Get user statistics
   * @returns {Promise<Object>} User statistics data
   */
  async getUserStatistics() {
    return this.request('admin_ops', '/admin/users/statistics', { method: 'GET' });
  }

  /**
   * Create new user
   * @param {Object} userData - User creation data
   * @returns {Promise<Object>} Created user data
   */
  async createUser(userData) {
    return this.request('admin_ops', '/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  /**
   * Get user by ID (admin)
   * @param {number} userId - User ID
   * @returns {Promise<Object>} User data
   */
  async getUser(userId) {
    return this.request('admin_ops', `/admin/users/${userId}`, { method: 'GET' });
  }

  /**
   * Update user (admin)
   * @param {number} userId - User ID
   * @param {Object} userData - User update data
   * @returns {Promise<Object>} Updated user data
   */
  async updateUser(userId, userData) {
    return this.request('admin_ops', `/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  }

  /**
   * Delete user (admin)
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Deletion response
   */
  async deleteUser(userId) {
    return this.request('admin_ops', `/admin/users/${userId}`, { method: 'DELETE' });
  }

  /**
   * Bulk delete users
   * @param {number[]} userIds - Array of user IDs to delete
   * @returns {Promise<Object>} Bulk operation response
   */
  async bulkDeleteUsers(userIds) {
    return this.request('admin_ops', '/admin/users/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ user_ids: userIds })
    });
  }

  /**
   * Bulk update user roles
   * @param {number[]} userIds - Array of user IDs
   * @param {string} role - New role for users
   * @returns {Promise<Object>} Bulk operation response
   */
  async bulkUpdateRoles(userIds, role) {
    return this.request('admin_ops', '/admin/users/bulk-update-role', {
      method: 'POST',
      body: JSON.stringify({ user_ids: userIds, role })
    });
  }

  // ============ ADMISSIONS ENDPOINTS ============

  /**
   * Check for duplicate inmates
   * @param {Object} payload - Inmate data to check for duplicates
   * @returns {Promise<Object>} Duplicate check results
   */
  async checkInmateDuplicate(payload) {
    return this.request('admissions_ops', '/inmates/check-duplicate', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Search inmates by query
   * @param {string} query - Search query string
   * @returns {Promise<Object>} Search results
   */
  async searchInmates(query) {
    const queryString = new URLSearchParams({ q: query }).toString();
    return this.request('admissions_ops', `/inmates/search?${queryString}`, { method: 'GET' });
  }

  /**
   * List inmates with optional pagination and sorting.
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Paginated inmate list
   */
  async listInmates(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request('admissions_ops', `/inmates${queryString ? `?${queryString}` : ''}`, { method: 'GET' });
  }

  /**
   * Get inmate by ID
   * @param {number} inmateId - Inmate ID
   * @returns {Promise<Object>} Inmate data
   */
  async getInmate(inmateId) {
    return this.request('admissions_ops', `/inmates/${inmateId}`, { method: 'GET' });
  }

  /**
   * Create new inmate
   * @param {Object} payload - Inmate creation data
   * @returns {Promise<Object>} Created inmate data
   */
  async createInmate(payload) {
    return this.request('admissions_ops', '/inmates', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Update inmate (disabled)
   * @throws {Error} Always throws error as inmate editing is disabled
   */
  async updateInmate() {
    throw new Error('Inmate profile editing is disabled.');
  }

  /**
   * Get available cells
   * @param {Object} params - Query parameters for cell filtering
   * @returns {Promise<Object>} Available cells list
   */
  async getAvailableCells(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request('admissions_ops', `/cells/available${queryString ? `?${queryString}` : ''}`, { method: 'GET' });
  }

  /**
   * List available activities
   * @returns {Promise<Object>} Activities list
   */
  async listActivities() {
    return this.request('admissions_ops', '/activities', { method: 'GET' });
  }

  /**
   * Create new admission
   * @param {Object} payload - Admission creation data
   * @returns {Promise<Object>} Created admission data
   */
  async createAdmission(payload) {
    return this.request('admissions_ops', '/admissions', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Get admission by ID
   * @param {number} admissionId - Admission ID
   * @returns {Promise<Object>} Admission data
   */
  async getAdmission(admissionId) {
    return this.request('admissions_ops', `/admissions/${admissionId}`, { method: 'GET' });
  }

  /**
   * Upload document for inmate/admission
   * @param {Object} params - Upload parameters
   * @param {number} params.inmateId - Inmate ID
   * @param {number|null} params.admissionId - Admission ID (optional)
   * @param {string} params.documentType - Type of document
   * @param {string|null} params.description - Document description
   * @param {File} params.file - File to upload
   * @returns {Promise<Object>} Upload response
   */
  async uploadDocument({ inmateId, admissionId = null, documentType, description = null, file }) {
    const formData = new FormData();
    formData.append('inmate_id', String(inmateId));
    if (admissionId != null) formData.append('admission_id', String(admissionId));
    formData.append('document_type', documentType);
    if (description) formData.append('description', description);
    formData.append('file', file);

    return this.requestForm('admissions_ops', '/documents', formData, { method: 'POST' });
  }

  // ============ STATISTICS ENDPOINTS ============

  /**
   * Get population statistics
   * @returns {Promise<Object>} Population statistics data
   */
  async getPopulationStatistics() {
    return this.request('general', '/statistics/population', { method: 'GET' });
  }

  // ============ AUDIT LOGS ENDPOINTS ============

  /**
   * Get audit logs
   * @param {Object} params - Query parameters
   * @param {string} params.table_name - Filter by table name
   * @param {number} params.user_id - Filter by user ID
   * @returns {Promise<Object>} Paginated audit logs
   */
  async getAuditLogs(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request('admin_ops', `/audit-logs?${queryString}`, { method: 'GET' });
  }
}

export default new ApiService();
