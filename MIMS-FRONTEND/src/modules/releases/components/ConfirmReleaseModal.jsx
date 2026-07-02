import React from 'react';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import { useForm } from 'react-hook-form';

/**
 * Confirm Release Modal Component
 * Opens when confirming a release, displays inmate and approver details
 */
export default function ConfirmReleaseModal({
  isOpen,
  inmate,
  approvedBy,
  approvedAt,
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
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Release">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Inmate Details */}
        <div className="space-y-3 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Inmate Name</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {inmate.first_name} {inmate.last_name}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Inmate number</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{inmate.prison_number}</p>
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">Approved By</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{approvedBy}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Approved At</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {approvedAt ? new Date(approvedAt).toLocaleString() : '-'}
            </p>
          </div>
        </div>

        {/* Confirmation Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Confirmation Notes
          </label>
          <textarea
            {...register('notes', {
              required: 'Confirmation notes are required'
            })}
            placeholder="E.g., Released at 14:30, ID verified..."
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
            Confirm Release
          </Button>
        </div>
      </form>
    </Modal>
  );
}
