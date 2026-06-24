import apiClient from '../../../services/apiClient';

export const listCells = async (params = {}) => {
  const res = await apiClient.get('/cells', { params });
  return res.data;
};

export const getAvailableCells = async (params = {}) => {
  const res = await apiClient.get('/cells/available', { params });
  return res.data;
};

