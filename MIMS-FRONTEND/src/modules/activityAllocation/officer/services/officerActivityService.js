import apiClient from '../../../../services/apiClient';

export const getAvailableActivities = (params) =>
  apiClient.get('/officer/activities/available', { params });

export const getEligibleExternalActivityInmates = (activityId, params) =>
  apiClient.get(`/officer/activities/${activityId}/eligible-inmates`, { params });

export const manualAllocateExternalActivity = (activityId, inmateIds, notes = null) =>
  apiClient.post(`/officer/activities/${activityId}/allocations/manual`, { inmate_ids: inmateIds, notes });

export const autoAllocateExternalActivity = (activityId) =>
  apiClient.post(`/officer/activities/${activityId}/allocations/auto`);
