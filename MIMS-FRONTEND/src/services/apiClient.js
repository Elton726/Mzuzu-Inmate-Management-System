import axios from 'axios';
import { beginApiRequest, emitApiError, endApiRequest } from '../utils/apiLoadingEvents';

const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
});

apiClient.interceptors.request.use((config) => {
  beginApiRequest();
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    endApiRequest();
    return response;
  },
  (error) => {
    endApiRequest();
    emitApiError(error);
    return Promise.reject(error);
  }
);

export default apiClient;

