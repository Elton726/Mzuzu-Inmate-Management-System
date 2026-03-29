import apiClient from '../../../services/apiClient';

export const uploadDocument = async ({ inmateId, admissionId = null, documentType, description = null, file }) => {
  const formData = new FormData();
  formData.append('inmate_id', String(inmateId));
  if (admissionId != null) formData.append('admission_id', String(admissionId));
  formData.append('document_type', documentType);
  if (description) formData.append('description', description);
  formData.append('file', file);

  const res = await apiClient.post('/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

