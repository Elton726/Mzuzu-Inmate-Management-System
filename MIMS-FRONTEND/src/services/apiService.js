const API_BASE_URL = 'http://localhost:8000/api';

const parseHeaderInt = (value) => {
  if (value == null) return null;
  const num = Number.parseInt(String(value), 10);
  return Number.isFinite(num) ? num : null;
};

class ApiService {
  constructor() {
    this.token = localStorage.getItem('authToken');
    this.lastRateLimit = new Map();
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` })
    };
  }

  getFormHeaders() {
    return {
      'Accept': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` })
    };
  }

  getRateLimitStatus(key) {
    return this.lastRateLimit.get(key) ?? null;
  }

  updateRateLimitFromResponse(key, response) {
    if (!key) return;
    const limit = parseHeaderInt(response.headers.get('X-RateLimit-Limit'));
    const remaining = parseHeaderInt(response.headers.get('X-RateLimit-Remaining'));
    const resetAt = parseHeaderInt(response.headers.get('X-RateLimit-Reset'));
    const retryAfter = parseHeaderInt(response.headers.get('Retry-After'));
    this.lastRateLimit.set(key, { limit, remaining, resetAt, retryAfter });
  }

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

  async handleResponse(response) {
    const data = await this.safeParseJson(response);
    
    if (!response.ok) {
      const serverMessage = data?.message;
      const error = new Error(serverMessage || 'API Error');
      error.status = response.status;
      error.data = data ?? {};

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

  // Auth endpoints
  async login(email, password) {
    return this.request('auth_login', '/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async logout() {
    return this.request(null, '/logout', { method: 'POST' });
  }

  // User endpoints
  async getProfile() {
    return this.request('user_profile', '/user/profile', { method: 'GET' });
  }

  async getUserById(userId) {
    return this.request('user_profile', `/user/${userId}`, { method: 'GET' });
  }

  async updateProfile(updates) {
    return this.request('user_profile', '/user/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

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

  // Admin endpoints
  async listUsers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request('admin_ops', `/admin/users?${queryString}`, { method: 'GET' });
  }

  async getUserStatistics() {
    return this.request('admin_ops', '/admin/users/statistics', { method: 'GET' });
  }

  async createUser(userData) {
    return this.request('admin_ops', '/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async getUser(userId) {
    return this.request('admin_ops', `/admin/users/${userId}`, { method: 'GET' });
  }

  async updateUser(userId, userData) {
    return this.request('admin_ops', `/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  }

  async deleteUser(userId) {
    return this.request('admin_ops', `/admin/users/${userId}`, { method: 'DELETE' });
  }

  async bulkDeleteUsers(userIds) {
    return this.request('admin_ops', '/admin/users/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ user_ids: userIds })
    });
  }

  async bulkUpdateRoles(userIds, role) {
    return this.request('admin_ops', '/admin/users/bulk-update-role', {
      method: 'POST',
      body: JSON.stringify({ user_ids: userIds, role })
    });
  }

  async registerUser(userData) {
    return this.request('auth_register', '/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  // Admissions module endpoints
  async checkInmateDuplicate(payload) {
    return this.request('admissions_ops', '/inmates/check-duplicate', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async searchInmates(query) {
    const queryString = new URLSearchParams({ q: query }).toString();
    return this.request('admissions_ops', `/inmates/search?${queryString}`, { method: 'GET' });
  }

  async getInmate(inmateId) {
    return this.request('admissions_ops', `/inmates/${inmateId}`, { method: 'GET' });
  }

  async createInmate(payload) {
    return this.request('admissions_ops', '/inmates', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateInmate() {
    throw new Error('Inmate profile editing is disabled.');
  }

  async getAvailableCells(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request('admissions_ops', `/cells/available${queryString ? `?${queryString}` : ''}`, { method: 'GET' });
  }

  async listActivities() {
    return this.request('admissions_ops', '/activities', { method: 'GET' });
  }

  async createAdmission(payload) {
    return this.request('admissions_ops', '/admissions', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async getAdmission(admissionId) {
    return this.request('admissions_ops', `/admissions/${admissionId}`, { method: 'GET' });
  }

  async uploadDocument({ inmateId, admissionId = null, documentType, description = null, file }) {
    const formData = new FormData();
    formData.append('inmate_id', String(inmateId));
    if (admissionId != null) formData.append('admission_id', String(admissionId));
    formData.append('document_type', documentType);
    if (description) formData.append('description', description);
    formData.append('file', file);

    return this.requestForm('admissions_ops', '/documents', formData, { method: 'POST' });
  }
}

export default new ApiService();
