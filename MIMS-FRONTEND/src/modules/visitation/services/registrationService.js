import apiClient from '../../../services/apiClient';

export const linkVisitorToInmate = (payload) => apiClient.post('/inmate-visitor-registrations', payload);
export const getVisitorsForInmate = (inmateId) => apiClient.get(`/inmates/${inmateId}/visitors`);
export const deactivateRegistration = (registrationId) => apiClient.delete(`/inmate-visitor-registrations/${registrationId}`);
export const getRegistrations = (params) => apiClient.get('/inmate-visitor-registrations', { params });
