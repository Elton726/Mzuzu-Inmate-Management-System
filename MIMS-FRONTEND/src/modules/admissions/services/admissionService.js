import apiClient from '../../../services/apiClient';

export const createAdmission = async (payload) => {
  const res = await apiClient.post('/admissions', payload);
  return res.data;
};

export const getAdmission = async (id) => {
  const res = await apiClient.get(`/admissions/${id}`);
  return res.data;
};

