import apiClient from '../../../services/apiClient';

export const checkDuplicate = async (payload) => {
  const res = await apiClient.post('/inmates/check-duplicate', payload);
  return res.data;
};

export const searchInmates = async (params) => {
  const res = await apiClient.get('/inmates/search', { params });
  return res.data;
};

export const getInmate = async (id) => {
  const res = await apiClient.get(`/inmates/${id}`);
  return res.data;
};

export const createInmate = async (payload) => {
  const res = await apiClient.post('/inmates', payload);
  return res.data;
};

