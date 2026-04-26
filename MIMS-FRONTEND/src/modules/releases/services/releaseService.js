import apiClient from '../../../services/apiClient';

/**
 * Release Service
 * Handles all API calls related to release workflows
 */

// Release Approval endpoints
export const listEligibleReleases = async (params) => {
  const res = await apiClient.get('/releases/eligible', { params });
  return res.data;
};

export const searchReleases = async (params) => {
  const res = await apiClient.get('/releases/search', { params });
  return res.data;
};

export const approveRelease = async (inmateId, payload) => {
  const res = await apiClient.post(`/releases/${inmateId}/approve`, payload);
  return res.data;
};

// Release Confirmation endpoints
export const listPendingConfirmations = async (params) => {
  const res = await apiClient.get('/releases/pending-confirmations', { params });
  return res.data;
};

export const confirmRelease = async (inmateId, payload) => {
  const res = await apiClient.post(`/releases/${inmateId}/confirm`, payload);
  return res.data;
};

// Sentence Adjustment endpoints
export const listAdjustments = async (admissionId, params) => {
  const res = await apiClient.get(`/admissions/${admissionId}/adjustments`, { params });
  return res.data;
};

export const createAdjustment = async (admissionId, payload) => {
  const res = await apiClient.post(`/admissions/${admissionId}/adjustments`, payload);
  return res.data;
};

export const deleteAdjustment = async (adjustmentId) => {
  const res = await apiClient.delete(`/adjustments/${adjustmentId}`);
  return res.data;
};

// Release History endpoints
export const listReleaseHistory = async (params) => {
  const res = await apiClient.get('/releases/history', { params });
  return res.data;
};

export const exportReleaseHistory = async (format = 'csv', params) => {
  const res = await apiClient.get(`/releases/history/export`, {
    params: { ...params, format },
    responseType: 'blob'
  });
  return res.data;
};
