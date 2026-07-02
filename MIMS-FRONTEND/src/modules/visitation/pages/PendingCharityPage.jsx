import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiCheck, FiClock, FiDownload, FiPhone, FiUser, FiX, FiInbox } from 'react-icons/fi';
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
  pending:  { label: 'Pending',  cls: 'bg-amber-100 text-amber-800 border border-amber-200' },
  approved: { label: 'Approved', cls: 'bg-emerald-100 text-emerald-800 border border-emerald-200' },
  rejected: { label: 'Rejected', cls: 'bg-rose-100 text-rose-800 border border-rose-200'   },
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
  const [approveModal, setApproveModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approval, setApproval] = useState({ proposed_time: '09:00', duration_minutes: 60, approval_notes: '' });

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
      await approveCharityBooking(booking.id, approval);
      toast.success(`Charity booking for ${booking.organisation_name} approved`);
      setApproveModal(false);
      setSelected(null);
      setApproval({ proposed_time: '09:00', duration_minutes: 60, approval_notes: '' });
      loadBookings();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to approve booking'));
    }
  };

  const handleReject = async (booking) => {
    try {
      await rejectCharityBooking(booking.id, { reason: rejectReason });
      toast.success(`Charity booking for ${booking.organisation_name} rejected`);
      setRejectModal(false);
      setSelected(null);
      setRejectReason('');
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
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-malawiGreen/10 to-transparent p-6 border border-malawiGreen/20 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Charity Visit Requests</h1>
          <p className="mt-1 text-sm text-gray-600">Review and action charity visit submissions from the gatekeeper</p>
        </div>
        <div className="flex gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3.5 py-1.5 text-sm font-bold tracking-wide text-amber-800 border border-amber-200 shadow-sm">
            <FiClock className="h-4 w-4" />
            {pending.length} Pending
          </span>
        </div>
      </div>

      {/* Pending requests */}
      <section>
        <h2 className="mb-4 text-lg font-bold text-gray-900 flex items-center gap-2"><FiClock className="text-amber-500" /> Pending Approval</h2>
        <div className="space-y-4">
          {loading ? (
            <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-malawiGreen"></div>
              <p className="mt-4 text-sm font-medium text-gray-500">Loading requests...</p>
            </div>
          ) : pending.length === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-white p-16 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-emerald-100">
                <FiCheck className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">All caught up!</h3>
              <p className="mt-1 text-sm text-gray-500">No pending charity visit requests require your attention.</p>
            </div>
          ) : pending.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              canApprove={canApprove}
              onApprove={() => {
                setSelected(booking);
                setApproval({
                  proposed_time: booking.proposed_time ? String(booking.proposed_time).slice(0, 5) : '09:00',
                  duration_minutes: booking.duration_minutes || 60,
                  approval_notes: '',
                });
                setApproveModal(true);
              }}
              onReject={() => { setSelected(booking); setRejectReason(''); setRejectModal(true); }}
              onDownload={() => downloadPdf(booking.download_url, `charity-booking-${booking.id}.pdf`)}
            />
          ))}
        </div>
      </section>

      {/* Resolved requests */}
      {resolved.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold text-gray-900 flex items-center gap-2"><FiCheck className="text-emerald-500" /> Recently Resolved</h2>
          <div className="space-y-4 opacity-80 hover:opacity-100 transition-opacity duration-300">
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

      {approveModal && selected && (
        <Modal title="Approve charity visit" onClose={() => { setApproveModal(false); setSelected(null); }}>
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-sm font-bold text-gray-900">{selected.organisation_name}</p>
              <p className="text-sm text-gray-600">{formatDateOnly(selected.proposed_date)} | {selected.contact_person}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">Approved start time</span>
                <input
                  type="time"
                  value={approval.proposed_time}
                  onChange={(e) => setApproval((current) => ({ ...current, proposed_time: e.target.value }))}
                  className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-malawiGreen"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">Allocated duration</span>
                <input
                  type="number"
                  min={15}
                  max={480}
                  value={approval.duration_minutes}
                  onChange={(e) => setApproval((current) => ({ ...current, duration_minutes: Number(e.target.value) }))}
                  className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-malawiGreen"
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Approval notes</span>
              <textarea
                rows={3}
                value={approval.approval_notes}
                onChange={(e) => setApproval((current) => ({ ...current, approval_notes: e.target.value }))}
                className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-malawiGreen"
              />
            </label>
            <div className="flex gap-3">
              <Button onClick={() => handleApprove(selected)}>
                <FiCheck /> Confirm Approval
              </Button>
              <Button variant="outline" onClick={() => { setApproveModal(false); setSelected(null); }}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject confirmation modal */}
      {rejectModal && selected && (
        <Modal title="Confirm rejection" onClose={() => { setRejectModal(false); setSelected(null); }}>
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to <strong className="text-red-600">reject</strong> the charity visit request
              from <strong>{selected.organisation_name}</strong>?
            </p>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Rejection reason</span>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-malawiGreen"
                placeholder="Record why the request is being rejected"
              />
            </label>
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
    ? `${formatDateOnly(booking.proposed_date)}${booking.proposed_time ? ` at ${String(booking.proposed_time).slice(0, 5)}` : ''}`
    : '-';
  const durationLabel = booking.duration_minutes ? `${booking.duration_minutes} min` : 'Duration pending';

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md hover:border-gray-300">
      <div className={`absolute left-0 top-0 h-full w-1.5 ${booking.status === 'approved' ? 'bg-emerald-500' : booking.status === 'rejected' ? 'bg-rose-500' : 'bg-amber-400'}`} />
      <div className="flex flex-wrap items-start justify-between gap-6 p-6 pl-8">
        {/* Left: details */}
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-extrabold tracking-tight text-gray-900">{booking.organisation_name}</h3>
            <StatusBadge status={booking.status} />
            <InmateCategoryBadge category={booking.inmate_category} />
          </div>

          <div className="grid gap-y-3 gap-x-8 sm:grid-cols-2 text-sm">
            {/* Contact Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-600">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-50 ring-1 ring-gray-100">
                  <FiUser className="h-3.5 w-3.5 text-gray-500" />
                </div>
                <strong className="font-semibold text-gray-800">{booking.contact_person || '—'}</strong>
              </div>
              {booking.contact_person_phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-50 ring-1 ring-gray-100">
                    <FiPhone className="h-3.5 w-3.5 text-gray-500" />
                  </div>
                  <span>+265 {booking.contact_person_phone}</span>
                </div>
              )}
            </div>

            {/* Time Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-600">
                <span className="font-medium text-gray-500 w-20">Proposed:</span>
                <span className="font-semibold text-gray-800">{proposedDt} <span className="text-gray-400 font-normal ml-1">({durationLabel})</span></span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <span className="font-medium text-gray-500 w-20">Submitted:</span>
                <span className="text-gray-800">
                  {booking.created_at ? new Date(booking.created_at).toLocaleString() : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Purpose snippet */}
          {booking.purpose && (
            <div className="mt-4 rounded-xl bg-gray-50 p-4 border border-gray-100">
              <p className="text-sm text-gray-600 italic">
                "{booking.purpose}"
              </p>
            </div>
          )}
          
          {/* Rejection / Approval Notes */}
          {booking.rejection_reason && (
            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">Rejection reason</p>
              <p className="mt-1 text-sm text-red-700">{booking.rejection_reason}</p>
            </div>
          )}
          {booking.approval_notes && (
            <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-800">Approval notes</p>
              <p className="mt-1 text-sm text-emerald-700">{booking.approval_notes}</p>
            </div>
          )}
        </div>

        {/* Right: action buttons */}
        <div className="flex flex-col items-stretch justify-start gap-2 shrink-0 sm:w-32">
          {onDownload && (
            <Button variant="outline" className="w-full justify-center" onClick={onDownload}>
              <FiDownload className="h-4 w-4 mr-2" /> PDF
            </Button>
          )}
          {canApprove && booking.status === 'pending' && (
            <>
              <Button className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500" onClick={onApprove}>
                <FiCheck className="h-4 w-4 mr-2" /> Approve
              </Button>
              <Button variant="danger" className="w-full justify-center" onClick={onReject}>
                <FiX className="h-4 w-4 mr-2" /> Reject
              </Button>
            </>
          )}
          {!canApprove && booking.status === 'pending' && (
            <div className="mt-2 text-center text-xs font-medium text-amber-600 bg-amber-50 rounded-md py-1 border border-amber-100">
              Pending Officer Approval
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
