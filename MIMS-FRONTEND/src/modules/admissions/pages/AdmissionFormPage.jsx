import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdmissionStepper from '../components/AdmissionStepper';
import StepInmateSelect from '../components/steps/StepInmateSelect';
import StepAdmissionDetails from '../components/steps/StepAdmissionDetails';
import StepDocuments from '../components/steps/StepDocuments';
import { toast } from 'react-toastify';
import { uploadDocument } from '../services/documentService';
import { createAdmission } from '../services/admissionService';

const toIso = (val) => (val ? new Date(val).toISOString().slice(0, 10) : null);

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
  const [admissionDraft, setAdmissionDraft] = useState(null);
  const [documentsDraft, setDocumentsDraft] = useState(null);

  const onInmateSelected = ({ inmate, inmateDraft: draft }) => {
    setSelectedInmate(inmate);
    if (draft) setInmateDraft(draft);
    toast.success('Inmate selected');
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
    if (!admissionDraft) {
      toast.error('Complete admission details first.');
      setCurrent(1);
      return;
    }

    try {
      setSubmitting(true);
      setDocumentsDraft(docs);

      // Upload optional photo
      if (docs?.photo) {
        await uploadDocument({
          inmateId: selectedInmate.id,
          admissionId: null,
          documentType: 'inmate_photo',
          description: 'Inmate photo',
          file: docs.photo
        });
      }

      // Upload optional warrant (committal/remand)
      let warrantDocId = null;
      if (docs?.warrant) {
        const warrantType = admissionDraft.inmateType === 'convict' ? 'committal_warrant' : 'remand_warrant';
        const warrantRes = await uploadDocument({
          inmateId: selectedInmate.id,
          admissionId: null,
          documentType: warrantType,
          description: docs.warrantDescription || null,
          file: docs.warrant
        });
        warrantDocId = warrantRes?.id || null;
      }

      // Create admission and link warrant doc id
      const payload = buildAdmissionPayload({
        inmateId: selectedInmate.id,
        admission: admissionDraft,
        warrantDocId
      });
      const createdAdmission = await createAdmission(payload);

      toast.success('Inmate admitted successfully');
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

