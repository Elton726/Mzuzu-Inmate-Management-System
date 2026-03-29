import apiClient from '../../../services/apiClient';

export const getAvailableCells = async (params = {}) => {
  const res = await apiClient.get('/cells/available', { params });
  return res.data;
};

