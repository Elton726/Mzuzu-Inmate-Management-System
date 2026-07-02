import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiCheckCircle, FiCircle } from 'react-icons/fi';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import {
  bulkCompleteClearanceChecklist,
  getClearanceChecklistByAdmission,
  startClearanceChecklist,
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
  const [loading, setLoading]       = useState(false);
  const [completing, setCompleting] = useState(false);
  const [checklist, setChecklist]   = useState(null);

  // Local checkbox state: { [itemId]: boolean }
  const [checked, setChecked] = useState({});
  // Local notes state: { [itemId]: string }
  const [notes, setNotes]     = useState({});

  const admissionId = release?.admissionId;

  const loadChecklist = async () => {
    if (!admissionId) return;
    try {
      setLoading(true);
      const response = await getClearanceChecklistByAdmission(admissionId);
      const data = response.data;
      setChecklist(data);

      // Seed local state from server: already-cleared items start checked
      const initChecked = {};
      const initNotes   = {};
      (data?.items || []).forEach((item) => {
        initChecked[item.id] = item.is_cleared;
        initNotes[item.id]   = item.verification_notes || '';
      });
      setChecked(initChecked);
      setNotes(initNotes);
    } catch (err) {
      if (err?.response?.status === 404) {
        setChecklist(null);
        setChecked({});
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, admissionId]);

  if (!isOpen || !release) return null;

  const handleStart = async () => {
    try {
      setLoading(true);
      const response = await startClearanceChecklist(admissionId);
      const data = response.data;
      setChecklist(data);

      const initChecked = {};
      const initNotes   = {};
      (data?.items || []).forEach((item) => {
        initChecked[item.id] = false;
        initNotes[item.id]   = '';
      });
      setChecked(initChecked);
      setNotes(initNotes);

      toast.success('Clearance checklist started');
      onUpdated?.(admissionId, data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to start clearance checklist'));
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (itemId) => {
    // Already-cleared (persisted) items cannot be unchecked via this UI
    const item = checklist?.items?.find((i) => i.id === itemId);
    if (item?.is_cleared) return;
    setChecked((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleComplete = async () => {
    if (!checklist?.checklist_id) return;

    // Build the items array for the bulk request
    const selectedItems = checklist.items
      .filter((item) => checked[item.id])
      .map((item) => ({ id: item.id, notes: notes[item.id] || null }));

    // Ensure every item is selected
    if (selectedItems.length < checklist.items.length) {
      toast.error('Please check all items before completing the checklist.');
      return;
    }

    try {
      setCompleting(true);
      const response = await bulkCompleteClearanceChecklist(checklist.checklist_id, selectedItems);
      setChecklist(response.data);
      toast.success('Clearance checklist completed successfully');
      onUpdated?.(admissionId, response.data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to complete checklist'));
    } finally {
      setCompleting(false);
    }
  };

  const allChecked = checklist?.items?.length > 0 &&
    checklist.items.every((item) => checked[item.id]);

  const localClearedCount = checklist?.items
    ? checklist.items.filter((item) => checked[item.id]).length
    : 0;

  return (
    <Modal title="Pre-Release Clearance" onClose={onClose} widthClass="max-w-3xl">
      <div className="space-y-5">
        {/* Inmate info */}
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
            {/* Summary stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded border border-gray-200 p-3">
                <p className="text-xs text-gray-500">Checked</p>
                <p className="text-lg font-bold text-gray-900">
                  {localClearedCount}/{checklist.total_items}
                </p>
              </div>
              <div className="rounded border border-gray-200 p-3">
                <p className="text-xs text-gray-500">Remaining</p>
                <p className="text-lg font-bold text-gray-900">
                  {checklist.total_items - localClearedCount}
                </p>
              </div>
              <div className="rounded border border-gray-200 p-3">
                <p className="text-xs text-gray-500">Status</p>
                <p className="text-lg font-bold text-gray-900">
                  {checklist.all_cleared ? 'Completed' : allChecked ? 'Ready to Submit' : 'In Progress'}
                </p>
              </div>
            </div>

            {checklist.all_cleared && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800">
                ✅ This checklist has been completed and submitted.
              </div>
            )}

            {/* Checklist items */}
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {checklist.items.map((item) => {
                const isChecked  = !!checked[item.id];
                const isPersisted = item.is_cleared; // already saved to DB

                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border p-4 transition-colors ${
                      isChecked
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox toggle */}
                      <button
                        type="button"
                        onClick={() => toggleItem(item.id)}
                        disabled={checklist.all_cleared || isPersisted}
                        className={`mt-0.5 flex-shrink-0 focus:outline-none ${
                          checklist.all_cleared || isPersisted ? 'cursor-default' : 'cursor-pointer'
                        }`}
                        aria-label={`Toggle ${item.label}`}
                      >
                        {isChecked ? (
                          <FiCheckCircle className="text-green-600 text-xl" />
                        ) : (
                          <FiCircle className="text-gray-400 text-xl" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold ${isChecked ? 'text-green-800' : 'text-gray-900'}`}>
                          {item.label}
                        </p>

                        {/* Show cleared-by info if already persisted */}
                        {isPersisted && item.cleared_by && (
                          <p className="mt-0.5 text-xs text-gray-500">
                            Cleared by {item.cleared_by}
                            {item.cleared_at ? ` on ${new Date(item.cleared_at).toLocaleString()}` : ''}
                          </p>
                        )}

                        {/* Notes: show textarea when checked & not yet persisted, plain text when persisted */}
                        {isChecked && !isPersisted && !checklist.all_cleared && (
                          <textarea
                            value={notes[item.id] || ''}
                            onChange={(e) =>
                              setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                            }
                            placeholder="Verification notes (optional)..."
                            rows={2}
                            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-malawiGreen"
                          />
                        )}

                        {isPersisted && item.verification_notes && (
                          <p className="mt-2 text-sm text-gray-700 italic">{item.verification_notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
              <Button variant="outline" onClick={onClose} disabled={completing}>
                Close
              </Button>
              {!checklist.all_cleared && (
                <Button
                  variant="primary"
                  onClick={handleComplete}
                  loading={completing}
                  disabled={!allChecked || completing}
                >
                  {completing ? 'Submitting...' : 'Complete Checklist'}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
