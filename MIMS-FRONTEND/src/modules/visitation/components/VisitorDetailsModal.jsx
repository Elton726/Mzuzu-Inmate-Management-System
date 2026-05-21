import React from 'react';
import Modal from '../../../components/common/Modal';
import { formatDate } from '../../../utils/helpers';
import { getInmateDisplayName } from '../utils/inmateSearch';

export default function VisitorDetailsModal({ open, onClose, visitor }) {
  if (!open || !visitor) return null;

  return (
    <Modal title="Visitor details" onClose={onClose} widthClass="max-w-2xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="font-semibold text-gray-900 dark:text-white">{visitor.first_name} {visitor.last_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Relationship</p>
            <p className="font-semibold text-gray-900 dark:text-white">{visitor.relationship?.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Contact</p>
            <p className="font-semibold text-gray-900 dark:text-white">{visitor.contact_number}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-semibold text-gray-900 dark:text-white">{visitor.email || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">National ID</p>
            <p className="font-semibold text-gray-900 dark:text-white">{visitor.national_id || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Approved</p>
            <p className="font-semibold text-gray-900 dark:text-white">{visitor.is_approved ? 'Yes' : 'No'}</p>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Linked inmates</h3>
          {!visitor.registrations?.length ? (
            <p className="text-sm text-gray-500">This visitor has not been registered to an inmate yet.</p>
          ) : (
            <div className="space-y-3">
              {visitor.registrations.map((reg) => (
                <div key={reg.id} className="rounded-lg bg-white dark:bg-slate-800 p-3 border border-gray-200 dark:border-slate-700">
                  <p className="font-semibold text-gray-900 dark:text-white">{getInmateDisplayName(reg.inmate)}</p>
                  <p className="text-sm text-gray-500">Registered {formatDate(reg.registered_date || reg.created_at)}</p>
                  <p className="text-sm text-gray-500">Status: {reg.is_active ? 'Active' : 'Inactive'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
