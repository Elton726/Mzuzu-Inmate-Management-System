import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiCheck, FiClock, FiDownload, FiPhone, FiUser, FiX } from 'react-icons/fi';
import { FaFemale, FaMale, FaUsers } from 'react-icons/fa';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import { useAuth } from '../../../contexts/useAuth';
import { getRoleName, ROLES } from '../../../utils/helpers';
import {
  approveCharityBooking,
  downloadPdf,
  getPendingCharity,
  rejectCharityBooking,
} from '../services/visitationService';

const getErrorMessage = (err, fallback) =>
  err?.response?.data?.message || err?.response?.data?.error || err?.message || fallback;
const formatDateOnly = (value) => {
  if (!value) return '-';
  const [datePart] = String(value).split('T');
  const date = new Date(`${datePart}T00:00:00`);
  return Number.isNaN(date.getTime()) ? datePart : date.toLocaleDateString();
};

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  cls: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Approved', cls: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-800'   },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, cls: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}>
      {status === 'pending'  && <FiClock  className="h-3 w-3" />}
      {status === 'approved' && <FiCheck  className="h-3 w-3" />}
      {status === 'rejected' && <FiX      className="h-3 w-3" />}
      {cfg.label}
    </span>
  );
}

function CategoryBadge({ category }) {
  if (!category) return <span className="text-sm text-gray-400">—</span>;
  const isMale = category === 'male';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${isMale ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'}`}>
      {isMale ? '👨' : '👩'} {isMale ? 'Male' : 'Female'} wing
    </span>
  );
}

function InmateCategoryBadge({ category }) {
  if (!category) return <span className="text-sm text-gray-400">-</span>;
  const config = {
    male: { label: 'Male wing', Icon: FaMale, cls: 'bg-blue-100 text-blue-800' },
    female: { label: 'Female wing', Icon: FaFemale, cls: 'bg-pink-100 text-pink-800' },
    all: { label: 'All wings', Icon: FaUsers, cls: 'bg-green-100 text-green-800' },
  }[category] || { label: category, Icon: FaUsers, cls: 'bg-gray-100 text-gray-700' };
  const Icon = config.Icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.cls}`}>
      <Icon className="h-3 w-3" /> {config.label}
    </span>
  );
}

export default function PendingCharityPage() {
  const { user } = useAuth();
  const role = getRoleName(user);
  const canApprove = role === ROLES.STATION_OFFICER;

  const [bookings, setBookings]       = useState([]);
  const [loading, setLoading]         = useState(false);
  const [selected, setSelected]       = useState(null);
  const [rejectModal, setRejectModal] = useState(false);

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      setBookings(await getPendingCharity());
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load charity bookings'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  const handleApprove = async (booking) => {
    try {
      await approveCharityBooking(booking.id);
      toast.success(`Charity booking for ${booking.organisation_name} approved`);
      loadBookings();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to approve booking'));
    }
  };

  const handleReject = async (booking) => {
    try {
      await rejectCharityBooking(booking.id);
      toast.success(`Charity booking for ${booking.organisation_name} rejected`);
      setRejectModal(false);
      setSelected(null);
      loadBookings();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to reject booking'));
    }
  };

  const pending  = bookings.filter((b) => b.status === 'pending');
  const resolved = bookings.filter((b) => b.status !== 'pending');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Charity Visit Requests</h1>
          <p className="text-gray-500">Review and action charity visit submissions from the gatekeeper</p>
        </div>
        <div className="flex gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
            <FiClock className="h-4 w-4" />
            {pending.length} pending
          </span>
        </div>
      </div>

      {/* Pending requests */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">Pending Approval</h2>
        <div className="space-y-3">
          {loading ? (
            <div className="rounded-lg bg-white p-8 text-center text-gray-400 shadow">Loading requests…</div>
          ) : pending.length === 0 ? (
            <div className="rounded-lg bg-white p-8 text-center text-gray-400 shadow">
              <FiCheck className="mx-auto mb-2 h-8 w-8 text-green-400" />
              No pending charity visit requests.
            </div>
          ) : pending.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              canApprove={canApprove}
              onApprove={() => handleApprove(booking)}
              onReject={() => { setSelected(booking); setRejectModal(true); }}
              onDownload={() => downloadPdf(booking.download_url, `charity-booking-${booking.id}.pdf`)}
            />
          ))}
        </div>
      </section>

      {/* Resolved requests */}
      {resolved.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-800">Recently Resolved</h2>
          <div className="space-y-3">
            {resolved.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                canApprove={false}
                onDownload={booking.download_url ? () => downloadPdf(booking.download_url, `charity-booking-${booking.id}.pdf`) : null}
              />
            ))}
          </div>
        </section>
      )}

      {/* Reject confirmation modal */}
      {rejectModal && selected && (
        <Modal title="Confirm rejection" onClose={() => { setRejectModal(false); setSelected(null); }}>
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to <strong className="text-red-600">reject</strong> the charity visit request
              from <strong>{selected.organisation_name}</strong>?
            </p>
            <p className="text-sm text-gray-500">This action cannot be undone.</p>
            <div className="flex gap-3">
              <Button variant="danger" onClick={() => handleReject(selected)}>
                <FiX /> Confirm Rejection
              </Button>
              <Button variant="outline" onClick={() => { setRejectModal(false); setSelected(null); }}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function BookingCard({ booking, canApprove, onApprove, onReject, onDownload }) {
  const proposedDt = booking.proposed_date
    ? `${formatDateOnly(booking.proposed_date)} at ${String(booking.proposed_time || '').slice(0, 5)}`
    : '-';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-4">
        {/* Left: details */}
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-base font-bold text-gray-900">{booking.organisation_name}</h3>
            <StatusBadge status={booking.status} />
            <InmateCategoryBadge category={booking.inmate_category} />
          </div>

          {/* Contact person */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1.5">
              <FiUser className="h-4 w-4 text-gray-400" />
              <strong className="text-gray-700">{booking.contact_person || '—'}</strong>
            </span>
            {booking.contact_person_phone && (
              <span className="flex items-center gap-1.5">
                <FiPhone className="h-4 w-4 text-gray-400" />
                +265 {booking.contact_person_phone}
              </span>
            )}
          </div>

          {/* Visit time & submitted */}
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="font-medium text-gray-500">Proposed: </span>
              <span className="text-gray-800">{proposedDt} · {booking.duration_minutes} min</span>
            </div>
            <div>
              <span className="font-medium text-gray-500">Submitted: </span>
              <span className="text-gray-800">
                {booking.created_at ? new Date(booking.created_at).toLocaleString() : '—'}
              </span>
            </div>
          </div>

          {/* Purpose snippet */}
          {booking.purpose && (
            <p className="max-w-prose text-sm text-gray-600 line-clamp-2 italic">
              "{booking.purpose}"
            </p>
          )}
        </div>

        {/* Right: action buttons */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {onDownload && (
            <Button variant="outline" onClick={onDownload}>
              <FiDownload className="h-4 w-4" /> PDF
            </Button>
          )}
          {canApprove && booking.status === 'pending' && (
            <>
              <Button onClick={onApprove}>
                <FiCheck className="h-4 w-4" /> Approve
              </Button>
              <Button variant="danger" onClick={onReject}>
                <FiX className="h-4 w-4" /> Reject
              </Button>
            </>
          )}
          {!canApprove && booking.status === 'pending' && (
            <span className="text-xs text-gray-400">Station officer only</span>
          )}
        </div>
      </div>
    </div>
  );
}
