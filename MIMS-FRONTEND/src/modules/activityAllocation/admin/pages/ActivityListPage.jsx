import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearError, deleteActivity, fetchActivities, toggleActivityStatus } from '../store/activitySlice';
import ActivityFilters from '../components/ActivityManagement/ActivityFilters';
import ActivityList from '../components/ActivityManagement/ActivityList';
import Button from '../../../../components/common/Button';
import Spinner from '../../../../components/common/Spinner';
import ConfirmationModal from '../../../../components/common/ConfirmationModal';
import { useToast } from '../../../../contexts/useToast';

export default function ActivityListPage() {
  const dispatch = useDispatch();
  const toast = useToast();
  const { activities, loading, error } = useSelector((state) => state.activity);
  const [filters, setFilters] = useState({});
  const [selectedActivity, setSelectedActivity] = useState(null);

  useEffect(() => {
    dispatch(fetchActivities(filters));
  }, [dispatch, filters]);

  useEffect(() => {
    if (error) toast.push({ title: 'Activities', message: error, variant: 'error' });
    return () => dispatch(clearError());
  }, [error, toast, dispatch]);

  const handleToggle = async (id, isActive) => {
    try {
      await dispatch(toggleActivityStatus({ id, isActive: !isActive })).unwrap();
    } catch (err) {
      toast.fromError(err);
    }
  };

  const confirmDelete = async () => {
    const selectedActivityId = selectedActivity?.id;
    setSelectedActivity(null);

    try {
      if (!selectedActivityId) return;
      await dispatch(deleteActivity(selectedActivityId)).unwrap();
      toast.push({ title: 'Activity', message: 'Deleted successfully.', variant: 'success' });
    } catch (err) {
      toast.fromError(err);
    }
  };

  return (
    <div className="min-h-screen bg-malawiGold p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Activities</h1>
          <Link to="/admin/activities/new">
            <Button>Create Activity</Button>
          </Link>
        </div>

        <ActivityFilters filters={filters} onFilterChange={setFilters} />

        {loading ? (
          <Spinner label="Loading activities..." />
        ) : (
          <ActivityList
            activities={activities}
            onToggle={handleToggle}
            onDelete={(activity) => setSelectedActivity(activity)}
          />
        )}

        <ConfirmationModal
          open={!!selectedActivity}
          title="Delete Activity"
          message={`Are you sure you want to permanently delete the activity: ${selectedActivity?.name || 'this activity'}? This action cannot be undone.`}
          confirmText="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setSelectedActivity(null)}
        />
      </div>
    </div>
  );
}
