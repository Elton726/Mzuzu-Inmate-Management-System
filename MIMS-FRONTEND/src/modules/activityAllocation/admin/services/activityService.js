import apiClient from '../../../../services/apiClient';

export const getActivities = (params) => apiClient.get('/admin/activities', { params });
export const getActivity = (id) => apiClient.get(`/admin/activities/${id}`);
export const getCategories = () => apiClient.get('/admin/activities/categories');
export const getPredefined = () => apiClient.get('/admin/activities/predefined');
export const createInternalActivity = (data) => apiClient.post('/admin/activities/internal', data);
export const createExternalActivity = (activityData, externalData) =>
  apiClient.post('/admin/activities/external', { ...activityData, ...externalData });
export const updateActivity = (id, data) => apiClient.put(`/admin/activities/${id}`, data);
export const updateExternalDetails = (id, data) => apiClient.put(`/admin/activities/${id}/external`, data);
export const activateActivity = (id) => apiClient.patch(`/admin/activities/${id}/activate`);
export const deactivateActivity = (id) => apiClient.patch(`/admin/activities/${id}/deactivate`);
export const deleteActivity = (id) => apiClient.delete(`/admin/activities/${id}`);

