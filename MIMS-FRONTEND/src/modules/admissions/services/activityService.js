import apiClient from '../../../services/apiClient';

export const listActivities = async () => {
  const res = await apiClient.get('/activities');
  return res.data;
};

