import apiClient from '../../../services/apiClient';

export const listVisitors = (params) => apiClient.get('/visitors', { params });
export const createVisitor = (payload) => apiClient.post('/visitors', payload);
export const approveVisitor = (visitorId) => apiClient.put(`/visitors/${visitorId}/approve`);
export const getVisitor = (visitorId) => apiClient.get(`/visitors/${visitorId}`);
export const updateVisitor = (visitorId, payload) => apiClient.put(`/visitors/${visitorId}`, payload);
export const deleteVisitor = (visitorId) => apiClient.delete(`/visitors/${visitorId}`);
export const listApprovedVisitors = () => apiClient.get('/visitors', { params: { is_approved: true, per_page: 100 } });
