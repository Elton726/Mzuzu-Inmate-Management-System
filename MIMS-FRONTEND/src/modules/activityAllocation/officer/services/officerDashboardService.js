import apiClient from '../../../../services/apiClient';

export const getDashboardMetrics = () => apiClient.get('/officer/dashboard/metrics');
