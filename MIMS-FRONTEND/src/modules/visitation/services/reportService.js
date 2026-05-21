import apiClient from '../../../services/apiClient';

export const fetchVisitationStatistics = () => apiClient.get('/reports/visitation-statistics');
export const fetchTodaySchedule = () => apiClient.get('/reports/today-schedule');
export const fetchPendingCharity = () => apiClient.get('/reports/pending-charity');
