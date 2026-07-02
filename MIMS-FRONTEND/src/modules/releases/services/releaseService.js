import apiClient from '../../../services/apiClient';

/**
 * Release Service
 * Handles all API calls related to release workflows
 */

// Release Approval endpoints
export const listEligibleReleases = async (params) => {
  const res = await apiClient.get('/releases/eligible', { params });
  return res.data;
};

// Release Confirmation endpoints
export const listPendingConfirmations = async (params) => {
  const res = await apiClient.get('/releases/pending-confirmations', { params });
  return res.data;
};

export const confirmRelease = async (workflowId, payload) => {
  const res = await apiClient.put(`/releases/${workflowId}/confirm`, payload);
  return res.data;
};

export const listConfirmedReleases = async (params) => {
  const res = await apiClient.get('/releases/confirmed', { params });
  return res.data;
};

export const listReleaseDateLookup = async (params) => {
  const res = await apiClient.get('/releases/date-lookup', { params });
  return res.data;
};

export const approveRelease = async (admissionId, payload) => {
  const res = await apiClient.post('/releases/approve', {
    admission_id: admissionId,
    ...payload
  });
  return res.data;
};

export const cancelRelease = async (workflowId, payload) => {
  const res = await apiClient.delete(`/releases/${workflowId}`, { data: payload });
  return res.data;
};

// Pre-release clearance checklist endpoints
export const getClearanceChecklistByAdmission = async (admissionId) => {
  const res = await apiClient.get(`/releases/clearance-checklist/admission/${admissionId}`);
  return res.data;
};

export const startClearanceChecklist = async (admissionId) => {
  const res = await apiClient.post('/releases/clearance-checklist', {
    admission_id: admissionId
  });
  return res.data;
};

export const clearChecklistItem = async (checklistItemId, payload) => {
  const res = await apiClient.post('/releases/clearance-checklist/clear-item', {
    checklist_item_id: checklistItemId,
    verification_notes: payload?.verification_notes || undefined
  });
  return res.data;
};

export const unclearChecklistItem = async (checklistItemId) => {
  const res = await apiClient.post('/releases/clearance-checklist/unclear-item', {
    checklist_item_id: checklistItemId
  });
  return res.data;
};

export const completeClearanceChecklist = async (checklistId) => {
  const res = await apiClient.put(`/releases/clearance-checklist/${checklistId}/complete`);
  return res.data;
};

/**
 * Bulk-complete the clearance checklist in a single request.
 * items: Array of { id: number, notes: string|null }
 */
export const bulkCompleteClearanceChecklist = async (checklistId, items) => {
  const res = await apiClient.put(`/releases/clearance-checklist/${checklistId}/bulk-complete`, { items });
  return res.data;
};

// Sentence Adjustment endpoints
export const listAdjustments = async (admissionId, params) => {
  const res = await apiClient.get(`/admissions/${admissionId}/adjustments`, { params });
  return res.data;
};

export const createAdjustment = async (admissionId, payload) => {
  const res = await apiClient.post(`/admissions/${admissionId}/adjustments`, {
    admission_id: admissionId,
    adjustment_type: payload.adjustment_type,
    adjustment_days: payload.days,
    effective_date: payload.effective_date,
    reason: payload.reason
  });
  return res.data;
};

export const deleteAdjustment = async (adjustmentId) => {
  const res = await apiClient.delete(`/adjustments/${adjustmentId}`);
  return res.data;
};

export const listSentenceInmates = async (params) => {
  const endpoint = params?.q && params.q.trim().length >= 2 ? '/inmates/search' : '/inmates';
  const res = await apiClient.get(endpoint, { params });
  return res.data;
};

export const updateSentenceLength = async (admissionId, payload) => {
  const res = await apiClient.put(`/admissions/${admissionId}/sentence-length`, {
    sentence_years: payload.sentence_years,
    sentence_months: payload.sentence_months
  });
  return res.data;
};

// Release History endpoints
export const listReleaseHistory = async (params) => {
  const res = await apiClient.get('/releases/history', { params });
  return res.data;
};

export const exportReleaseHistory = async (format = 'csv', params) => {
  const res = await apiClient.get('/releases/history/export', {
    params: { ...params, format },
    responseType: 'blob'
  });
  return res.data;
};
