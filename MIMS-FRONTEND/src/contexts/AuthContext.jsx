/**
 * Authentication Context Provider
 *
 * Manages global authentication state for the MIMS application including:
 * - User authentication status and profile data
 * - Login/logout functionality with API integration
 * - Token management in localStorage
 * - Role-based permissions (admin, reception_officer, station_officer)
 * - Error handling and loading states
 *
 * State Management:
 * - user: Current authenticated user object or null
 * - loading: Boolean indicating auth operations in progress
 * - error: Current authentication error message or null
 * - isAuthenticated: Computed boolean for auth status
 * - isAdmin: Computed boolean for admin role check
 *
 * Token Persistence:
 * - Automatically loads token from localStorage on app start
 * - Sets token in API service for authenticated requests
 * - Clears token on logout or auth failures
 */

import { useState, useEffect } from 'react';
import { AuthContext } from './AuthContextCreate';
import apiService from '../services/apiService';
import { getRoleName } from '../utils/helpers';

/**
 * AuthProvider Component
 *
 * Provides authentication context to the entire application.
 * Handles token persistence, user state management, and auth operations.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Initialize authentication on component mount
   * Checks for existing token in localStorage and fetches user profile
   */
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      apiService.setToken(token);
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setError('Your session has expired. Please log in again.');
    };

    window.addEventListener('mims:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('mims:unauthorized', handleUnauthorized);
  }, []);

  /**
   * Fetch current user profile from API
   * Called on app initialization if token exists, or manually to refresh user data
   */
  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      const data = await apiService.getProfile();
      setUser(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch user:', err);
      apiService.clearToken();
      setUser(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Authenticate user with email and password
   *
   * @param {string} email - User email address
   * @param {string} password - User password
   * @returns {Promise<Object>} Result object with success status and user data or error details
   */
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.login(email, password);
      apiService.setToken(data.token);
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      setError(err.message);
      return {
        success: false,
        error: err.message,
        rateLimit: err.rateLimit,
        status: err.status,
        data: err.data,
        apiError: err
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout current user
   * Calls API logout endpoint and clears local authentication state
   */
  const logout = async () => {
    try {
      setLoading(true);
      await apiService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      apiService.clearToken();
      setUser(null);
      setError(null);
      setLoading(false);
    }
  };

  /**
   * Update current user profile
   *
   * @param {Object} updates - Profile update data
   * @returns {Promise<Object>} Result object with success status and updated user data or error details
   */
  const updateProfile = async (updates) => {
    try {
      setError(null);
      const data = await apiService.updateProfile(updates);
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      setError(err.message);
      return {
        success: false,
        error: err.message,
        rateLimit: err.rateLimit,
        status: err.status,
        data: err.data,
        apiError: err
      };
    }
  };

// Computed authentication state
  const isAdmin = getRoleName(user) === 'admin';
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAuthenticated,
        isAdmin,
        login,
        logout,
        updateProfile,
        fetchCurrentUser,
        setError,
        getRoleName: () => getRoleName(user)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
