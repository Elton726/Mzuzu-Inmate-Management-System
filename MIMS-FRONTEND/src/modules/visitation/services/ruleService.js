import apiClient from '../../../services/apiClient';

export const getRulesForInmate = (inmateId) => apiClient.get(`/inmates/${inmateId}/visitation-rules`);
export const createVisitationRule = (payload) => apiClient.post('/visitation-rules', payload);
export const updateVisitationRule = (ruleId, payload) => apiClient.put(`/visitation-rules/${ruleId}`, payload);
export const deleteVisitationRule = (ruleId) => apiClient.delete(`/visitation-rules/${ruleId}`);
