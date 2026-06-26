import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiCheckCircle, FiCircle, FiRotateCcw } from 'react-icons/fi';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import {
  clearChecklistItem,
  completeClearanceChecklist,
  getClearanceChecklistByAdmission,
  startClearanceChecklist,
  unclearChecklistItem
} from '../services/releaseService';

const getErrorMessage = (err, fallback) => (
  err?.response?.data?.error ||
  err?.response?.data?.message ||
  err?.message ||
  fallback
);

export default function ClearanceChecklistModal({
  isOpen,
  release,
  onClose,
  onUpdated
}) {
  const [loading, setLoading] = useState(false);
  const [savingItemId, setSavingItemId] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [checklist, setChecklist] = useState(null);
  const [notes, setNotes] = useState({});

  const admissionId = release?.admissionId;

  const loadChecklist = async () => {
    if (!admissionId) return;

    try {
      setLoading(true);
      const response = await getClearanceChecklistByAdmission(admissionId);
      setChecklist(response.data);
      setNotes(Object.fromEntries((response.data?.items || []).map((item) => [item.id, item.verification_notes || ''])));
    } catch (err) {
      if (err?.response?.status === 404) {
        setChecklist(null);
        setNotes({});
        return;
      }
      toast.error(getErrorMessage(err, 'Failed to load clearance checklist'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadChecklist();
    }
  }, [isOpen, admissionId]);

  if (!isOpen || !release) return null;

  const handleStart = async () => {
    try {
      setLoading(true);
      const response = await startClearanceChecklist(admissionId);
      setChecklist(response.data);
      toast.success('Clearance checklist started');
      onUpdated?.(admissionId, response.data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to start clearance checklist'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleItem = async (item) => {
    try {
      setSavingItemId(item.id);
      if (item.is_cleared) {
        await unclearChecklistItem(item.id);
        toast.success('Checklist item reverted');
      } else {
        await clearChecklistItem(item.id, {
          verification_notes: notes[item.id] || ''
        });
        toast.success('Checklist item cleared');
      }

      await loadChecklist();
      onUpdated?.(admissionId);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update checklist item'));
    } finally {
      setSavingItemId(null);
    }
  };

  const handleComplete = async () => {
    if (!checklist?.checklist_id) return;

    try {
      setCompleting(true);
      const response = await completeClearanceChecklist(checklist.checklist_id);
      setChecklist(response.data);
      toast.success('Clearance checklist completed');
      onUpdated?.(admissionId, response.data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to complete checklist'));
    } finally {
      setCompleting(false);
    }
  };

  const allItemsCleared = checklist?.items?.length > 0 && checklist.items.every((item) => item.is_cleared);

  return (
    <Modal title="Pre-Release Clearance" onClose={onClose} widthClass="max-w-3xl">
      <div className="space-y-5">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="font-semibold text-gray-900">{release.inmateName || '-'}</p>
          <p className="text-sm text-gray-600">
            {release.inmate?.prison_number || '-'} - Admission #{release.admissionId}
          </p>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-600">Loading clearance checklist...</div>
        ) : !checklist ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Start the mandatory pre-release clearance checklist before approving this release.
            </p>
            <Button variant="primary" onClick={handleStart} disabled={!admissionId}>
              Start Checklist
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded border border-gray-200 p-3">
                <p className="text-xs text-gray-500">Cleared</p>
                <p className="text-lg font-bold text-gray-900">{checklist.cleared_items}/{checklist.total_items}</p>
              </div>
              <div className="rounded border border-gray-200 p-3">
                <p className="text-xs text-gray-500">Pending</p>
                <p className="text-lg font-bold text-gray-900">{checklist.pending_items}</p>
              </div>
              <div className="rounded border border-gray-200 p-3">
                <p className="text-xs text-gray-500">Status</p>
                <p className="text-lg font-bold text-gray-900">{checklist.all_cleared ? 'Complete' : 'In Progress'}</p>
              </div>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {checklist.items.map((item) => (
                <div key={item.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {item.is_cleared ? (
                          <FiCheckCircle className="text-malawiGreen" />
                        ) : (
                          <FiCircle className="text-gray-400" />
                        )}
                        <p className="font-semibold text-gray-900">{item.label}</p>
                      </div>
                      {item.cleared_by && (
                        <p className="mt-1 text-xs text-gray-500">
                          Cleared by {item.cleared_by}{item.cleared_at ? ` on ${new Date(item.cleared_at).toLocaleString()}` : ''}
                        </p>
                      )}
                    </div>
                    <Button
                      variant={item.is_cleared ? 'outline' : 'primary'}
                      onClick={() => handleToggleItem(item)}
                      loading={savingItemId === item.id}
                    >
                      {item.is_cleared ? (
                        <>
                          <FiRotateCcw />
                          Revert
                        </>
                      ) : 'Mark Cleared'}
                    </Button>
                  </div>
                  {!item.is_cleared && (
                    <textarea
                      value={notes[item.id] || ''}
                      onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                      placeholder="Verification notes..."
                      rows="2"
                      className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-malawiGreen"
                    />
                  )}
                  {item.is_cleared && item.verification_notes && (
                    <p className="mt-3 text-sm text-gray-700">{item.verification_notes}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
              <Button variant="outline" onClick={onClose} disabled={completing}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={handleComplete}
                loading={completing}
                disabled={!allItemsCleared || checklist.all_cleared}
              >
                Complete Checklist
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
