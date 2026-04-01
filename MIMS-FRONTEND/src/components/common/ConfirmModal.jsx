import React from 'react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmModal({
  open,
  title,
  message,
  confirmText = 'Confirm',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <Modal title={title} onClose={onCancel} widthClass="max-w-md">
      <p className="text-gray-700">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button variant={confirmVariant} onClick={onConfirm}>{confirmText}</Button>
      </div>
    </Modal>
  );
}

