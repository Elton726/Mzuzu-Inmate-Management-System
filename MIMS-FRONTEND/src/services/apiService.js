const API_BASE_URL = 'http://localhost:8000/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('authToken');
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

  async handleResponse(response) {
    const data = await response.json();
    
    if (!response.ok) {
      const error = new Error(data.message || 'API Error');
      error.status = response.status;
      error.data = data;
      throw error;
    }
    
    return data;
  }

  // Auth endpoints
  async login(email, password) {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password })
    });
    return this.handleResponse(response);
  }

  async logout() {
    const response = await fetch(`${API_BASE_URL}/logout`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  // User endpoints
  async getProfile() {
    const response = await fetch(`${API_BASE_URL}/user/profile`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async getUserById(userId) {
    const response = await fetch(`${API_BASE_URL}/user/${userId}`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async updateProfile(updates) {
    const response = await fetch(`${API_BASE_URL}/user/profile`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates)
    });
    return this.handleResponse(response);
  }

  async changePassword(currentPassword, newPassword, passwordConfirmation) {
    const response = await fetch(`${API_BASE_URL}/user/change-password`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: passwordConfirmation
      })
    });
    return this.handleResponse(response);
  }

  // Admin endpoints
  async listUsers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/admin/users?${queryString}`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async getUserStatistics() {
    const response = await fetch(`${API_BASE_URL}/admin/users/statistics`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async createUser(userData) {
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(userData)
    });
    return this.handleResponse(response);
  }

  async getUser(userId) {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async updateUser(userId, userData) {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(userData)
    });
    return this.handleResponse(response);
  }

  async deleteUser(userId) {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    
    if (!response.ok) {
      const data = await response.json();
      const error = new Error(data.message || 'Delete failed');
      error.status = response.status;
      error.data = data;
      throw error;
    }
    
    return response.status === 204 ? { message: 'User deleted successfully' } : response.json();
  }

  async bulkDeleteUsers(userIds) {
    const response = await fetch(`${API_BASE_URL}/admin/users/bulk-delete`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ user_ids: userIds })
    });
    return this.handleResponse(response);
  }

  async bulkUpdateRoles(userIds, role) {
    const response = await fetch(`${API_BASE_URL}/admin/users/bulk-update-role`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ user_ids: userIds, role })
    });
    return this.handleResponse(response);
  }

  async registerUser(userData) {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(userData)
    });
    return this.handleResponse(response);
  }
}

export default new ApiService();
