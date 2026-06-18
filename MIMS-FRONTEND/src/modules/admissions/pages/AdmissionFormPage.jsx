import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdmissionStepper from '../components/AdmissionStepper';
import StepInmateSelect from '../components/steps/StepInmateSelect';
import StepAdmissionDetails from '../components/steps/StepAdmissionDetails';
import StepDocuments from '../components/steps/StepDocuments';
import { toast } from 'react-toastify';
import { uploadDocument } from '../services/documentService';
import { createAdmission } from '../services/admissionService';
import { getInmate } from '../services/inmateService';
import { useNotification } from '../../../contexts/useNotification';

const toIso = (val) => (val ? new Date(val).toISOString().slice(0, 10) : null);
const getAdmissionsCount = (inmate) => {
  const n = inmate?.admissions_count ?? inmate?.admissionsCount;
  return Number.isFinite(Number(n)) ? Number(n) : 0;
};

const buildAdmissionPayload = ({ inmateId, admission, warrantDocId }) => {
  const payload = {
    inmate_id: inmateId,
    admission_date: toIso(admission.admissionDate),
    admission_type: admission.admissionType,
    inmate_type: admission.inmateType,
    case_number: admission.caseNumber,
    court_name: admission.courtName || null,
    offence_description: admission.offenceDescription || null,
    cell_id: admission.cellId ? Number(admission.cellId) : null,
    activity_id: admission.activityId ? Number(admission.activityId) : null
  };

  if (admission.inmateType === 'convict') {
    payload.sentence_years = admission.sentenceYears != null && admission.sentenceYears !== '' ? Number(admission.sentenceYears) : null;
    payload.sentence_months = admission.sentenceMonths != null && admission.sentenceMonths !== '' ? Number(admission.sentenceMonths) : null;
    payload.sentence_start_date = toIso(admission.sentenceStartDate);
    payload.committal_warrant_id = warrantDocId || null;
    payload.remand_warrant_id = null;
    payload.remand_next_court_date = null;
  } else {
    payload.remand_next_court_date = toIso(admission.remandNextCourtDate);
    payload.remand_duration_days = admission.remandDurationDays ? Number(admission.remandDurationDays) : null;
    payload.remand_warrant_id = warrantDocId || null;
    payload.committal_warrant_id = null;
    payload.sentence_years = null;
    payload.sentence_months = null;
    payload.sentence_start_date = null;
  }

  return payload;
};

export default function AdmissionFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const steps = useMemo(
    () => ([
      { key: 'inmate', label: 'Inmate' },
      { key: 'admission', label: 'Admission' },
      { key: 'documents', label: 'Documents' }
    ]),
    []
  );

  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [selectedInmate, setSelectedInmate] = useState(null);
  const [inmateDraft, setInmateDraft] = useState(null);
  const [photoFromInmate, setPhotoFromInmate] = useState(null);
  const [admissionDraft, setAdmissionDraft] = useState(null);
  const [documentsDraft, setDocumentsDraft] = useState(null);
  const { addNotification } = useNotification();

  useEffect(() => {
    const inmateId = searchParams.get('inmateId');
    if (!inmateId) return;
    if (selectedInmate?.id) return;

    const loadInmate = async () => {
      try {
        const inmate = await getInmate(inmateId);
        const activeAdmission = inmate?.current_admission || inmate?.currentAdmission || null;
        const admissionsCount = inmate?.admissions_count ?? inmate?.admissionsCount ?? 0;
        if (activeAdmission?.id) {
          toast.error('This inmate already has an active admission. Finish it before creating a new one.');
          navigate(`/admissions/${activeAdmission.id}`);
          return;
        }

        // If inmate has previous (completed) admissions, disallow creating a new admission
        if (!activeAdmission?.id && admissionsCount > 0) {
          toast.error('This inmate already has a completed admission and cannot be admitted again through this flow.');
          navigate(`/inmates/${inmate.id}`);
          return;
        }
        setSelectedInmate(inmate);
        setCurrent(1);
        toast.success('Inmate loaded for admission');
        addNotification({ title: 'Inmate loaded', message: `Inmate ${inmate.first_name} ${inmate.last_name} loaded for admission`, type: 'info', duration: 5000, action: { label: 'Open inmate', url: `/inmates/${inmate.id}` } });
      } catch (err) {
        toast.error(err?.response?.data?.message || err.message || 'Failed to load inmate');
      }
    };

    loadInmate();
  }, [searchParams, selectedInmate, navigate, addNotification]);

  const onInmateSelected = ({ inmate, inmateDraft: draft, photo }) => {
    const activeAdmission = inmate?.current_admission || inmate?.currentAdmission || null;
    const admissionsCount = inmate?.admissions_count ?? inmate?.admissionsCount ?? 0;

    if (activeAdmission?.id) {
      toast.error('This inmate already has an active admission. Finish it before creating a new one.');
      navigate(`/admissions/${activeAdmission.id}`);
      return;
    }

    if (!activeAdmission?.id && admissionsCount > 0) {
      toast.error('This inmate already has a completed admission and cannot be admitted again through this flow.');
      navigate(`/inmates/${inmate.id}`);
      return;
    }

    setSelectedInmate(inmate);
    if (draft) setInmateDraft(draft);
    if (photo) setPhotoFromInmate(photo);
    toast.success('Inmate selected');
    addNotification({ title: 'Inmate selected', message: `Selected ${inmate.first_name} ${inmate.last_name} for admission`, type: 'info', duration: 4000, action: { label: 'Open inmate', url: `/inmates/${inmate.id}` } });
    setCurrent(1);
  };

  const onAdmissionNext = (data) => {
    setAdmissionDraft(data);
    setCurrent(2);
  };

  const onSubmitAll = async (docs) => {
    if (!selectedInmate?.id) {
      toast.error('Select or create an inmate first.');
      setCurrent(0);
      return;
    }
    const activeAdmission = selectedInmate?.current_admission || selectedInmate?.currentAdmission || null;
    const admissionsCount = getAdmissionsCount(selectedInmate);
    if (activeAdmission?.id) {
      toast.error('This inmate already has an active admission. Finish it before creating a new one.');
      navigate(`/admissions/${activeAdmission.id}`);
      return;
    }
    if (admissionsCount > 0) {
      toast.error('This inmate already has a completed admission and cannot be admitted again through this flow.');
      navigate(`/inmates/${selectedInmate.id}`);
      return;
    }
    if (!admissionDraft) {
      toast.error('Complete admission details first.');
      setCurrent(1);
      return;
    }

    try {
      setSubmitting(true);
      setDocumentsDraft(docs);

      // Determine which photo to use (from inmate creation step or documents step)
      const photoToUpload = photoFromInmate || docs?.photo;

      // Upload optional photo
      if (photoToUpload) {
        try {
          const photoRes = await uploadDocument({
            inmateId: selectedInmate.id,
            admissionId: null,
            documentType: 'inmate_photo',
            description: 'Inmate photo',
            file: photoToUpload
          });
          console.log('Photo uploaded successfully:', {
            document: photoRes,
            file_name: photoRes?.file_name,
            file_path: photoRes?.file_path,
            inmate_photo_path: photoRes?.inmate?.photo_path
          });
          if (photoRes?.inmate?.photo_path) {
            toast.success(`✓ Photo uploaded: ${photoRes.file_name}`);
            addNotification({ title: 'Photo uploaded', message: `Photo saved for ${selectedInmate.first_name} ${selectedInmate.last_name}`, type: 'success', action: { label: 'Open inmate', url: `/inmates/${selectedInmate.id}` } });
          } else {
            toast.success('Photo uploaded');
            addNotification({ title: 'Photo uploaded', message: `Photo uploaded for ${selectedInmate.first_name}`, type: 'success', action: { label: 'Open inmate', url: `/inmates/${selectedInmate.id}` } });
          }
        } catch (photoErr) {
          console.error('Photo upload failed:', photoErr);
          toast.warning('Photo upload failed, continuing with admission');
          addNotification({ title: 'Photo upload failed', message: `Photo upload failed for ${selectedInmate.first_name} ${selectedInmate.last_name}`, type: 'error', duration: 0 });
        }
      }

      // Upload optional warrant (committal/remand)
      let warrantDocId = null;
      if (docs?.warrant) {
        try {
          const warrantType = admissionDraft.inmateType === 'convict' ? 'committal_warrant' : 'remand_warrant';
          const warrantRes = await uploadDocument({
            inmateId: selectedInmate.id,
            admissionId: null,
            documentType: warrantType,
            description: docs.warrantDescription || null,
            file: docs.warrant
          });
          warrantDocId = warrantRes?.id || null;
          console.log('Warrant uploaded successfully:', warrantRes);
          toast.success('Warrant uploaded');
          addNotification({ title: 'Warrant uploaded', message: `Warrant uploaded for ${selectedInmate.first_name} ${selectedInmate.last_name}`, type: 'success', action: { label: 'Open inmate', url: `/inmates/${selectedInmate.id}` } });
        } catch (warrantErr) {
          console.error('Warrant upload failed:', warrantErr);
          toast.warning('Warrant upload failed, continuing with admission');
          addNotification({ title: 'Warrant upload failed', message: `Warrant upload failed for ${selectedInmate.first_name} ${selectedInmate.last_name}`, type: 'error', duration: 0 });
        }
      }

      // Create admission and link warrant doc id
      const payload = buildAdmissionPayload({
        inmateId: selectedInmate.id,
        admission: admissionDraft,
        warrantDocId
      });
      const createdAdmission = await createAdmission(payload);

      toast.success('Inmate admitted successfully');
      addNotification({ title: 'Admission created', message: `Admission ${createdAdmission.id} created for ${selectedInmate.first_name} ${selectedInmate.last_name}`, type: 'success', action: { label: 'Open admission', url: `/admissions/${createdAdmission.id}` } });
      navigate(`/admissions/${createdAdmission.id}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Admission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Inmate Admission</h1>
          <p className="text-gray-600">Create inmate → upload documents → create admission.</p>
        </div>
        <div className="text-sm text-gray-600">
          {selectedInmate?.prison_number ? (
            <span>
              Selected inmate: <span className="font-semibold text-gray-800">{selectedInmate.prison_number}</span>
            </span>
          ) : (
            <span>No inmate selected</span>
          )}
        </div>
      </div>

      <div className="mb-6">
        <AdmissionStepper steps={steps} current={current} />
      </div>

      {current === 0 && (
        <StepInmateSelect
          defaultValues={inmateDraft}
          onSelected={onInmateSelected}
        />
      )}

      {current === 1 && (
        <StepAdmissionDetails
          defaultValues={admissionDraft}
          selectedInmate={selectedInmate}
          onBack={() => setCurrent(0)}
          onNext={onAdmissionNext}
        />
      )}

      {current === 2 && (
        <div className={submitting ? 'opacity-70 pointer-events-none' : ''}>
          <StepDocuments
            defaultValues={documentsDraft}
            onBack={() => setCurrent(1)}
            onNext={onSubmitAll}
          />
          {submitting && (
            <p className="mt-3 text-sm text-gray-600">Submitting…</p>
          )}
        </div>
      )}
    </div>
  );
}
