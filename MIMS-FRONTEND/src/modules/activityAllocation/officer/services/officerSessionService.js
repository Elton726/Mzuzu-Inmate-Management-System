import apiClient from '../../../../services/apiClient';

export const getSessions = (params) => apiClient.get('/officer/activity-sessions', { params });
export const getSession = (id) => apiClient.get(`/officer/activity-sessions/${id}`);
export const createSession = (data) => apiClient.post('/officer/activity-sessions', data);
export const getOrCreateDailySession = (data) => apiClient.post('/officer/activity-sessions/daily', data);
export const getOrCreateExternalOnceSession = (data) => apiClient.post('/officer/activity-sessions/external-once', data);
export const updateSession = (id, data) => apiClient.put(`/officer/activity-sessions/${id}`, data);
export const deleteSession = (id) => apiClient.delete(`/officer/activity-sessions/${id}`);

export const getAttendanceReport = (sessionId) =>
  apiClient.get(`/officer/activity-sessions/${sessionId}/attendance/report`);

export const getAttendanceSummary = (sessionId) =>
  apiClient.get(`/officer/activity-sessions/${sessionId}/attendance/summary`);

export const recordBulkAttendance = (sessionId, attendances) =>
  apiClient.post(`/officer/activity-sessions/${sessionId}/attendance`, { attendances });
