import React from 'react';
import Modal from '../../../../../components/common/Modal';
import Button from '../../../../../components/common/Button';

export default function AutoAssignModal({ onClose, onConfirm }) {
  return (
    <Modal title="Auto-Assign Next Week" onClose={onClose} widthClass="max-w-md">
      <p className="text-sm text-gray-600 mb-4">
        This will assign one eligible officer for the entire next week (all working hours).
      </p>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onConfirm()}>Auto-Assign</Button>
      </div>
    </Modal>
  );
}
