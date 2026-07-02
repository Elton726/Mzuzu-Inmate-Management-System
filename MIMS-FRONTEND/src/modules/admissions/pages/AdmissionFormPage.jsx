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
import { MdAssignment } from 'react-icons/md';

const toIso = (val) => (val ? new Date(val).toISOString().slice(0, 10) : null);
const getAdmissionsCount = (inmate) => {
  const n = inmate?.admissions_count ?? inmate?.admissionsCount;
  return Number.isFinite(Number(n)) ? Number(n) : 0;
};

const isRemandeeOrMurderRemandee = (inmate) => {
  if (!inmate) return false;
  const activeAdmission = inmate.current_admission || inmate.currentAdmission;
  if (activeAdmission) {
    const type = activeAdmission.inmate_type || activeAdmission.inmateType;
    if (type === 'remandee' || type === 'murder_remandee') {
      return true;
    }
  }
  const admissions = inmate.admissions || [];
  if (admissions.length > 0) {
    const type = admissions[0].inmate_type || admissions[0].inmateType;
    if (type === 'remandee' || type === 'murder_remandee') {
      return true;
    }
  }
  return false;
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
    activity_id: admission.activityId ? Number(admission.activityId) : null
  };

  if (admission.inmateType === 'convict') {
    payload.sentence_years = admission.sentenceYears != null && admission.sentenceYears !== '' ? Number(admission.sentenceYears) : 0;
    payload.sentence_months = admission.sentenceMonths != null && admission.sentenceMonths !== '' ? Number(admission.sentenceMonths) : 0;
    payload.sentence_days = admission.sentenceDays != null && admission.sentenceDays !== '' ? Number(admission.sentenceDays) : 0;
    payload.sentence_start_date = toIso(admission.sentenceStartDate);
    payload.committal_warrant_id = warrantDocId || null;
    payload.remand_warrant_id = null;
    payload.remand_next_court_date = null;
  } else {
    payload.remand_next_court_date = toIso(admission.remandNextCourtDate);
    payload.remand_next_court_time = admission.remandNextCourtTime || null;
    payload.remand_duration_days = admission.remandDurationDays ? Number(admission.remandDurationDays) : null;
    payload.remand_warrant_id = warrantDocId || null;
    payload.committal_warrant_id = null;
    payload.sentence_years = null;
    payload.sentence_months = null;
    payload.sentence_days = null;
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
        const isRemand = isRemandeeOrMurderRemandee(inmate);

        if (activeAdmission?.id && !isRemand) {
          toast.error('This inmate already has an active admission. Finish it before creating a new one.');
          navigate(`/admissions/${activeAdmission.id}`);
          return;
        }
        if (!activeAdmission?.id && admissionsCount > 0 && !isRemand) {
          toast.error('This inmate already has a completed admission and cannot be admitted again through this flow.');
          navigate(`/inmates/${inmate.id}`);
          return;
        }
        setSelectedInmate(inmate);
        if (isRemand) {
          setAdmissionDraft((prev) => ({
            ...prev,
            inmateType: 'convict'
          }));
        }
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
    const isRemand = isRemandeeOrMurderRemandee(inmate);

    if (activeAdmission?.id && !isRemand) {
      toast.error('This inmate already has an active admission. Finish it before creating a new one.');
      navigate(`/admissions/${activeAdmission.id}`);
      return;
    }

    if (!activeAdmission?.id && admissionsCount > 0 && !isRemand) {
      toast.error('This inmate already has a completed admission and cannot be admitted again through this flow.');
      navigate(`/inmates/${inmate.id}`);
      return;
    }

    setSelectedInmate(inmate);
    if (draft) setInmateDraft(draft);
    if (photo) setPhotoFromInmate(photo);
    if (isRemand) {
      setAdmissionDraft((prev) => ({
        ...prev,
        inmateType: 'convict'
      }));
    }
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
    const isRemand = isRemandeeOrMurderRemandee(selectedInmate);

    if (activeAdmission?.id && !isRemand) {
      toast.error('This inmate already has an active admission. Finish it before creating a new one.');
      navigate(`/admissions/${activeAdmission.id}`);
      return;
    }
    if (admissionsCount > 0 && !isRemand) {
      toast.error('This inmate already has a completed admission and cannot be admitted again through this flow.');
      navigate(`/inmates/${selectedInmate.id}`);
      return;
    }
    if (!admissionDraft) {
      toast.error('Complete admission details first.');
      setCurrent(1);
      return;
    }
    if (!docs?.warrant) {
      toast.error('Upload or capture the warrant document before submitting the admission.');
      setCurrent(2);
      return;
    }

    try {
      setSubmitting(true);
      setDocumentsDraft(docs);

      const photoToUpload = photoFromInmate || docs?.photo;

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
          toast.error('Warrant upload failed. Admission cannot be submitted without a valid warrant.');
          addNotification({ title: 'Warrant upload failed', message: `Warrant upload failed for ${selectedInmate.first_name} ${selectedInmate.last_name}`, type: 'error', duration: 0 });
          return;
        }
      }

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
      {/* Submitting overlay */}
      {submitting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center gap-4">
            {/* Spinner */}
            <div className="relative w-14 h-14">
              <div className="absolute inset-0 rounded-full border-4 border-[#00843D]/20" />
              <div className="absolute inset-0 rounded-full border-4 border-t-[#00843D] border-r-[#FFD700] border-b-transparent border-l-transparent animate-spin" />
            </div>
            <p className="text-base font-semibold text-gray-700 tracking-wide">Processing admission…</p>
            <p className="text-xs text-gray-400">Please wait, do not close this page</p>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00843D] to-[#006830] flex items-center justify-center shadow-lg shadow-[#00843D]/30 flex-shrink-0">
            <MdAssignment className="text-white text-2xl" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">New Admission</h1>
            <p className="text-sm text-gray-500 mt-0.5">Create inmate → upload documents → create admission.</p>
          </div>
        </div>

        {/* Inmate badge */}
        <div className="flex-shrink-0">
          {selectedInmate?.prison_number ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00843D]/10 border border-[#00843D]/30 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#00843D] animate-pulse" />
              <span className="text-xs font-semibold text-[#00843D]">
                {selectedInmate.first_name} {selectedInmate.last_name}
              </span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs font-mono font-bold text-gray-700">{selectedInmate.prison_number}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200">
              <span className="w-2 h-2 rounded-full bg-gray-300" />
              <span className="text-xs text-gray-400 font-medium">No inmate selected</span>
            </div>
          )}
        </div>
      </div>

      {/* Stepper card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5 mb-6">
        <AdmissionStepper steps={steps} current={current} />
      </div>

      {/* Step content */}
      <div className="mt-6">
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
          <StepDocuments
            defaultValues={documentsDraft}
            onBack={() => setCurrent(1)}
            onNext={onSubmitAll}
          />
        )}
      </div>
    </div>
  );
}
