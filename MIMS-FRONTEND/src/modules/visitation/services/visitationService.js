import apiClient from '../../../services/apiClient';

export const getTodaySchedule = async () => {
  const res = await apiClient.get('/visitation/today-schedule');
  return res.data.data;
};

export const checkVisitSlot = async (payload) => {
  const res = await apiClient.post('/visitation/slot-check', payload);
  return res.data;
};

export const createVisitSession = async (payload) => {
  const res = await apiClient.post('/visitation/sessions', payload);
  return res.data.data;
};

export const checkInSession = async (id) => {
  const res = await apiClient.put(`/visitation/sessions/${id}/check-in`);
  return res.data.data;
};

export const checkOutSession = async (id) => {
  const res = await apiClient.put(`/visitation/sessions/${id}/check-out`);
  return res.data.data;
};

export const denySession = async (id, payload) => {
  const res = await apiClient.post(`/visitation/sessions/${id}/deny`, payload);
  return res.data.data;
};

export const cancelSession = async (id, payload) => {
  const res = await apiClient.put(`/visitation/sessions/${id}/cancel`, payload);
  return res.data.data;
};

export const addVisitItem = async (sessionId, payload) => {
  const res = await apiClient.post(`/visitation/sessions/${sessionId}/items`, payload);
  return res.data.data;
};

export const updateVisitItem = async (itemId, payload) => {
  const res = await apiClient.put(`/visitation/items/${itemId}`, payload);
  return res.data.data;
};

export const createCharityBooking = async (payload) => {
  const res = await apiClient.post('/visitation/charity-bookings', payload);
  return res.data.data;
};

export const getPendingCharity = async () => {
  const res = await apiClient.get('/visitation/pending-charity');
  return res.data.data;
};

export const approveCharityBooking = async (id) => {
  const res = await apiClient.put(`/visitation/charity-bookings/${id}/approve`);
  return res.data.data;
};

export const rejectCharityBooking = async (id, payload = {}) => {
  const res = await apiClient.put(`/visitation/charity-bookings/${id}/reject`, payload);
  return res.data.data;
};

export const getVisitStatistics = async (params = {}) => {
  const res = await apiClient.get('/visitation/statistics', { params });
  return res.data.data;
};

export const getVisitHistory = async (params = {}) => {
  const res = await apiClient.get('/visitation/history', { params });
  return res.data.data;
};

export const downloadPdf = async (url, filename = 'charity-booking.pdf') => {
  const res = await apiClient.get(url, { responseType: 'blob' });
  const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(blobUrl);
};
