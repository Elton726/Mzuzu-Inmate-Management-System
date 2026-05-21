import apiClient from '../../../services/apiClient';

export const fetchSessions = (params) => apiClient.get('/visitation-sessions', { params });
export const fetchSessionById = (id) => apiClient.get(`/visitation-sessions/${id}`);
export const scheduleSession = (payload) => apiClient.post('/visitation-sessions', payload);
export const checkInSession = (id) => apiClient.put(`/visitation-sessions/${id}/check-in`);
export const checkOutSession = (id) => apiClient.put(`/visitation-sessions/${id}/check-out`);
export const cancelSession = (id) => apiClient.put(`/visitation-sessions/${id}/cancel`);
export const denySession = (id, payload) => apiClient.post(`/visitation-sessions/${id}/deny`, payload);
export const downloadSessionPdf = (id) => apiClient.get(`/visitation-sessions/${id}/pdf`, { responseType: 'blob' });

export const addSessionItem = (sessionId, payload) => apiClient.post(`/visitation-sessions/${sessionId}/items`, payload);
export const toggleItemApproval = (sessionId, itemId, payload) => apiClient.put(`/visitation-sessions/${sessionId}/items/${itemId}/inspect`, payload);
