import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { autoAssign, clearError, deactivateRoster, deleteRoster, fetchRosters } from '../store/dutyRosterSlice';
import OfficerDutyRosterList from '../components/OfficerDutyRoster/OfficerDutyRosterList';
import AutoAssignModal from '../components/OfficerDutyRoster/AutoAssignModal';
import OfficerDutyRosterForm from '../components/OfficerDutyRoster/OfficerDutyRosterForm';
import WeeklySummaryCard from '../components/OfficerDutyRoster/WeeklySummaryCard';
import Button from '../../../../components/common/Button';
import Spinner from '../../../../components/common/Spinner';
import ConfirmModal from '../../../../components/common/ConfirmModal';
import { useToast } from '../../../../contexts/useToast';

export default function DutyRosterPage() {
  const dispatch = useDispatch();
  const toast = useToast();
  const { rosters, loading, error } = useSelector((state) => state.dutyRoster);
  const [showForm, setShowForm] = useState(false);
  const [showAutoAssign, setShowAutoAssign] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [pendingDeactivateId, setPendingDeactivateId] = useState(null);

  useEffect(() => {
    dispatch(fetchRosters({ per_page: 20 }));
  }, [dispatch]);

  useEffect(() => {
    if (error) toast.push({ title: 'Duty rosters', message: error, variant: 'error' });
    return () => dispatch(clearError());
  }, [error, toast, dispatch]);

  const handleAutoAssign = async () => {
    try {
      await dispatch(autoAssign()).unwrap();
      await dispatch(fetchRosters({ per_page: 20 })).unwrap();
      setShowAutoAssign(false);
      toast.push({ title: 'Auto-assign', message: 'Auto-assignment completed.', variant: 'success' });
    } catch (err) {
      toast.fromError(err, { title: 'Auto-assign failed' });
    }
  };

  const handleDeactivate = async () => {
    try {
      if (!pendingDeactivateId) return;
      await dispatch(deactivateRoster(pendingDeactivateId)).unwrap();
      setPendingDeactivateId(null);
      toast.push({ title: 'Duty roster', message: 'Deactivated successfully.', variant: 'success' });
    } catch (err) {
      toast.fromError(err);
    }
  };

  const handleDelete = async () => {
    try {
      if (!pendingDeleteId) return;
      await dispatch(deleteRoster(pendingDeleteId)).unwrap();
      setPendingDeleteId(null);
      toast.push({ title: 'Duty roster', message: 'Deleted successfully.', variant: 'success' });
    } catch (err) {
      toast.fromError(err);
    }
  };

  return (
    <div className="min-h-screen bg-malawiGold p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Officer Duty Rosters</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAutoAssign(true)}>
              Auto-Assign Next Week
            </Button>
            <Button onClick={() => setShowForm(true)}>Assign Officer</Button>
          </div>
        </div>

        <WeeklySummaryCard />

        {loading ? (
          <Spinner label="Loading rosters..." />
        ) : (
          <OfficerDutyRosterList
            rosters={rosters}
            onDeactivate={(id) => setPendingDeactivateId(id)}
            onDelete={(id) => setPendingDeleteId(id)}
          />
        )}

        {showForm && (
          <OfficerDutyRosterForm
            onClose={() => setShowForm(false)}
            onSuccess={() => {
              setShowForm(false);
              dispatch(fetchRosters({ per_page: 20 }));
            }}
          />
        )}

        {showAutoAssign && (
          <AutoAssignModal onClose={() => setShowAutoAssign(false)} onConfirm={handleAutoAssign} />
        )}

        <ConfirmModal
          open={!!pendingDeactivateId}
          title="Deactivate Duty Roster"
          message="Deactivate this duty roster?"
          confirmText="Deactivate"
          confirmVariant="outline"
          onConfirm={handleDeactivate}
          onCancel={() => setPendingDeactivateId(null)}
        />

        <ConfirmModal
          open={!!pendingDeleteId}
          title="Delete Duty Roster"
          message="Delete this duty roster? This action cannot be undone."
          confirmText="Delete"
          confirmVariant="danger"
          onConfirm={handleDelete}
          onCancel={() => setPendingDeleteId(null)}
        />
      </div>
    </div>
  );
}
