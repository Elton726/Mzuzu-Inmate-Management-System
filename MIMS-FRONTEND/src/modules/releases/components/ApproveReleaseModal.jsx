import React from 'react';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import Textarea from '../../../components/common/Textarea';
import { useForm } from 'react-hook-form';

/**
 * Approve Release Modal Component
 * Opens when approving a release, displays inmate details and reason textarea
 */
export default function ApproveReleaseModal({
  isOpen,
  inmate,
  onClose,
  onConfirm,
  loading = false
}) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { notes: '' }
  });

  const onSubmit = (data) => {
    onConfirm(data);
    reset();
  };

  React.useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  if (!inmate) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Approve Release">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Inmate Details */}
        <div className="space-y-3 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Inmate Name</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{inmate.first_name} {inmate.last_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Prison Number</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{inmate.prison_number}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Projected Release Date</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {new Date(inmate.projected_release_date).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Notes Textarea */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Reason for Approval (Optional)
          </label>
          <textarea
            {...register('notes')}
            placeholder="Enter any additional notes..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-malawiGreen dark:bg-gray-700 dark:text-gray-100"
            rows="4"
          />
          {errors.notes && (
            <p className="text-red-600 text-sm mt-1">{errors.notes.message}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            loading={loading}
          >
            Confirm Approval
          </Button>
        </div>
      </form>
    </Modal>
  );
}
