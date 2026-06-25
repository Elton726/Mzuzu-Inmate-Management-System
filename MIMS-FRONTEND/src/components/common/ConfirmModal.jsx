import React from 'react';
import ConfirmationModal from './ConfirmationModal';

export default function ConfirmModal({
  open,
  title,
  message,
  confirmText = 'Confirm',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
}) {
  return (
    <ConfirmationModal
      open={open}
      title={title}
      message={message}
      confirmText={confirmText}
      confirmVariant={confirmVariant}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

