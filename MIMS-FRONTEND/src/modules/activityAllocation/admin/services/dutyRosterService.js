import apiClient from '../../../../services/apiClient';
import { getRoleName, ROLES } from '../../../../utils/helpers';

export const getRosters = (params) => apiClient.get('/admin/duty-rosters', { params });
export const assignOfficer = (data) => apiClient.post('/admin/duty-rosters', data);
export const autoAssign = () => apiClient.post('/admin/duty-rosters/auto-assign');
export const deactivateRoster = (id) => apiClient.patch(`/admin/duty-rosters/${id}/deactivate`);
export const deleteRoster = (id) => apiClient.delete(`/admin/duty-rosters/${id}`);
export const getWeeklySummary = (weekStart) =>
  apiClient.get('/admin/duty-rosters/weekly-summary', { params: { week_start: weekStart } });
export const getCurrentOfficer = () => apiClient.get('/admin/duty-rosters/current');

// Lists users that can be assigned as officer on duty (excludes users with fixed roles).
export const getAssignableOfficers = async () => {
  const res = await apiClient.get('/admin/users', { params: { per_page: 500 } });
  const users = res?.data?.data || [];

  const excluded = new Set([
    ROLES.ADMIN,
    ROLES.RECEPTION_OFFICER,
    ROLES.STATION_OFFICER,
    ROLES.GATEKEEPER,
  ]);

  return users.filter((u) => {
    if (u?.is_active === false) return false;
    const role = getRoleName(u);
    return !excluded.has(role);
  });
};
