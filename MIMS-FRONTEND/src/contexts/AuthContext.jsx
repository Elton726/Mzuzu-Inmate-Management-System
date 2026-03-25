import { useState, useEffect } from 'react';
import { AuthContext } from './AuthContextCreate';
import apiService from '../services/apiService';
import { getRoleName } from '../utils/helpers';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user from token on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      apiService.setToken(token);
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

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
      return { success: false, error: err.message, rateLimit: err.rateLimit, status: err.status, data: err.data, apiError: err };
    } finally {
      setLoading(false);
    }
  };

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

  const updateProfile = async (updates) => {
    try {
      setError(null);
      const data = await apiService.updateProfile(updates);
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message, rateLimit: err.rateLimit, status: err.status, data: err.data, apiError: err };
    }
  };

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
        setError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
