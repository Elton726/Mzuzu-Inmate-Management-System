import apiClient from '../../../services/apiClient';

export const listCells = async (params = {}) => {
  const res = await apiClient.get('/cells', { params });
  return res.data;
};

export const getAvailableCells = async (params = {}) => {
  const res = await apiClient.get('/cells/available', { params });
  return res.data;
};

export const createCell = async (payload) => {
  const res = await apiClient.post('/admin/cells', payload);
  return res.data;
};

export const updateCell = async (id, payload) => {
  const res = await apiClient.put(`/admin/cells/${id}`, payload);
  return res.data;
};

export const deleteCell = async (id) => {
  const res = await apiClient.delete(`/admin/cells/${id}`);
  return res.data;
};

