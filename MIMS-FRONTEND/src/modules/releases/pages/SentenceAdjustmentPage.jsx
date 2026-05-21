import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiTrash2, FiChevronLeft } from 'react-icons/fi';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  listAdjustments,
  createAdjustment,
  deleteAdjustment
} from '../services/releaseService';
import SkeletonLoader from '../components/SkeletonLoader';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';

const getErrorMessage = (err, fallback) => (
  err?.response?.data?.message ||
  err?.response?.data?.error ||
  err?.message ||
  fallback
);

const getAdjustmentDays = (adjustment) => adjustment?.adjustment_days ?? adjustment?.days ?? 0;
const getAdjustmentCreator = (adjustment) => adjustment?.approver?.name || adjustment?.created_by || 'System';

/**
 * Validation schema for sentence adjustments
 */
const adjustmentSchema = z.object({
  adjustment_type: z.string().min(1, 'Adjustment type is required'),
  days: z.coerce.number().min(1, 'Days must be at least 1'),
  effective_date: z.string().min(1, 'Effective date is required'),
  reason: z.string().optional()
});

/**
 * Sentence Adjustment Page (Station Officer)
 * Apply sentence adjustments (remissions, pardons) for a specific inmate
 */
export default function SentenceAdjustmentPage() {
  const { admissionId } = useParams();
  const [loading, setLoading] = useState(false);
  const [adjustments, setAdjustments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      adjustment_type: 'remission',
      days: '',
      effective_date: new Date().toISOString().split('T')[0],
      reason: ''
    }
  });

  const loadAdjustments = useCallback(async () => {
    if (!admissionId) return;

    try {
      setLoading(true);
      const data = await listAdjustments(admissionId, {
        page: currentPage,
        per_page: 10
      });

      setAdjustments(data.data || []);
      setTotalPages(data.last_page || 1);
      setCurrentPage(data.current_page || 1);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load adjustments'));
    } finally {
      setLoading(false);
    }
  }, [admissionId, currentPage]);

  useEffect(() => {
    loadAdjustments();
  }, [loadAdjustments]);

  const onSubmit = async (data) => {
    if (!admissionId) return;

    try {
      setSubmitLoading(true);
      const response = await createAdjustment(admissionId, data);
      const newReleaseDate = response.new_projected_release_date || response.new_release_date;

      toast.success(
        `${data.days} days ${data.adjustment_type} applied${newReleaseDate ? `. New release date: ${newReleaseDate}` : ''}`
      );

      reset({
        adjustment_type: 'remission',
        days: '',
        effective_date: new Date().toISOString().split('T')[0],
        reason: ''
      });

      loadAdjustments();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to apply adjustment'));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteClick = (adjustment) => {
    setSelectedAdjustment(adjustment);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAdjustment) return;

    try {
      setDeleteLoading(true);
      await deleteAdjustment(selectedAdjustment.id);
      toast.success('Adjustment deleted successfully');
      setDeleteModalOpen(false);
      setSelectedAdjustment(null);
      loadAdjustments();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete adjustment'));
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Page Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => window.history.back()}
        >
          <FiChevronLeft className="inline mr-2" />
          Back
        </Button>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
          Sentence Adjustments
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form - Left Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 sticky top-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Add Adjustment
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Adjustment Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Adjustment Type
                </label>
                <select
                  {...register('adjustment_type')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-malawiGreen dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="remission">Remission</option>
                  <option value="pardon">Pardon</option>
                  <option value="reduction">Reduction</option>
                </select>
                {errors.adjustment_type && (
                  <p className="text-red-600 text-sm mt-1">{errors.adjustment_type.message}</p>
                )}
              </div>

              {/* Days */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Days
                </label>
                <input
                  type="number"
                  {...register('days', { valueAsNumber: true })}
                  placeholder="Enter number of days"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-malawiGreen dark:bg-gray-700 dark:text-gray-100"
                />
                {errors.days && (
                  <p className="text-red-600 text-sm mt-1">{errors.days.message}</p>
                )}
              </div>

              {/* Effective Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Effective Date
                </label>
                <input
                  type="date"
                  {...register('effective_date')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-malawiGreen dark:bg-gray-700 dark:text-gray-100"
                />
                {errors.effective_date && (
                  <p className="text-red-600 text-sm mt-1">{errors.effective_date.message}</p>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Reason (Optional)
                </label>
                <textarea
                  {...register('reason')}
                  placeholder="Enter reason for adjustment..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-malawiGreen dark:bg-gray-700 dark:text-gray-100"
                  rows="3"
                />
                {errors.reason && (
                  <p className="text-red-600 text-sm mt-1">{errors.reason.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                variant="primary"
                type="submit"
                loading={submitLoading}
                className="w-full"
              >
                Apply Adjustment
              </Button>
            </form>
          </div>
        </div>

        {/* History - Right Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Adjustment History
              </h2>
            </div>

            {loading ? (
              <div className="p-6">
                <SkeletonLoader rows={4} columns={5} />
              </div>
            ) : adjustments.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  No adjustments have been applied yet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Days
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Effective Date
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Reason
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Created By
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {adjustments.map((adjustment) => (
                      <tr
                        key={adjustment.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                      >
                        <td className="px-6 py-4 text-sm">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300">
                            {adjustment.adjustment_type?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {getAdjustmentDays(adjustment)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {adjustment.effective_date ? new Date(adjustment.effective_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {adjustment.reason || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {getAdjustmentCreator(adjustment)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => handleDeleteClick(adjustment)}
                            className="text-malawiRed hover:text-malawiRed/70 transition"
                            title="Delete adjustment"
                          >
                            <FiTrash2 />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {deleteModalOpen && (
        <Modal
          onClose={() => {
            setDeleteModalOpen(false);
            setSelectedAdjustment(null);
          }}
          title="Delete Adjustment"
        >
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Are you sure you want to delete this adjustment? This action cannot be undone.
            </p>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
              <p className="text-sm text-red-800 dark:text-red-300">
                {getAdjustmentDays(selectedAdjustment)} days {selectedAdjustment?.adjustment_type?.replace(/_/g, ' ')}
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setSelectedAdjustment(null);
                }}
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleDeleteConfirm}
                loading={deleteLoading}
              >
                Delete Adjustment
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
