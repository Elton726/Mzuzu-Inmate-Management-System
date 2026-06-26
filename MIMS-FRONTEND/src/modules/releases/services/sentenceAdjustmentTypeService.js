import apiClient from '../../../services/apiClient';

export const listSentenceAdjustmentTypes = async (params = {}) => {
  const res = await apiClient.get('/admin/sentence-adjustment-types', { params });
  return res.data;
};

export const createSentenceAdjustmentType = async (payload) => {
  const res = await apiClient.post('/admin/sentence-adjustment-types', payload);
  return res.data;
};

export const updateSentenceAdjustmentType = async (id, payload) => {
  const res = await apiClient.put(`/admin/sentence-adjustment-types/${id}`, payload);
  return res.data;
};

export const deleteSentenceAdjustmentType = async (id) => {
  const res = await apiClient.delete(`/admin/sentence-adjustment-types/${id}`);
  return res.data;
};

export const listAvailableSentenceAdjustmentTypes = async () => {
  const res = await apiClient.get('/sentence-adjustment-types/available');
  return res.data;
};
