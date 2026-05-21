import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import VisitationTabs from '../components/VisitationTabs';
import SessionFormModal from '../components/SessionFormModal';
import { fetchPendingCharity, scheduleSession } from '../store/visitationSessionSlice';
import Button from '../../../components/common/Button';
import apiClient from '../../../services/apiClient';
import { formatDateTime } from '../../../utils/helpers';

const charityDefaults = {
  is_charity_visit: true,
  visit_purpose: 'Charity visit'
};

const getPdfUrl = (sessionId) => `${apiClient.defaults.baseURL}/visitation-sessions/${sessionId}/pdf`;

export default function CharityPage() {
  const dispatch = useDispatch();
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const { pendingCharity, error } = useSelector((state) => state.visitationSession);
  const requests = useMemo(() => pendingCharity || [], [pendingCharity]);

  useEffect(() => {
    dispatch(fetchPendingCharity());
  }, [dispatch]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const handleCharitySessionCreated = async (values) => {
    try {
      const session = await dispatch(scheduleSession({ ...values, is_charity_visit: true })).unwrap();
      toast.success('Charity visit scheduled and PDF generated');
      setShowScheduleModal(false);
      dispatch(fetchPendingCharity());
      if (session?.id) {
        window.open(getPdfUrl(session.id), '_blank');
      }
    } catch (err) {
      toast.error(err.message || 'Unable to schedule charity visit');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <VisitationTabs />
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-malawiBlack dark:text-white">Charity visits</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">Schedule charity visits using the same inmate, visitor, and admission checks as regular sessions.</p>
        </div>
        <Button onClick={() => setShowScheduleModal(true)}>Schedule charity visit</Button>
      </div>

      <div className="rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Pending charity approvals</h2>
        {requests.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No pending charity approvals currently.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div key={request.session_id || request.id} className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{request.charity_organization}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{request.inmate_name} {request.prison_number ? `(${request.prison_number})` : ''}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{formatDateTime([request.visit_date, request.visit_time].filter(Boolean).join(' '))}</p>
                  </div>
                  <a
                    href={getPdfUrl(request.session_id || request.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded border border-malawiBlack px-4 py-2 font-semibold text-malawiBlack shadow-sm transition hover:bg-malawiBlack hover:text-malawiGold"
                  >
                    Download PDF
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SessionFormModal
        open={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onSave={handleCharitySessionCreated}
        defaultValues={charityDefaults}
      />
    </div>
  );
}
