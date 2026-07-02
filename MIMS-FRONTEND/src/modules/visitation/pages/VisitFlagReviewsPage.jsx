import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiAlertTriangle, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import { getFlagReviews, resolveFlagReview } from '../services/visitationService';

const getErrorMessage = (err, fallback) =>
  err?.response?.data?.message || err?.response?.data?.error || err?.message || fallback;

const nameOf = (inmate) => [inmate?.first_name, inmate?.last_name].filter(Boolean).join(' ') || 'Group visit';

export default function VisitFlagReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(null);
  const [resolution, setResolution] = useState({ resolution: 'approved', notes: '' });

  const loadReviews = async () => {
    try {
      setLoading(true);
      setReviews(await getFlagReviews());
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load flag reviews'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const submitResolution = async () => {
    try {
      await resolveFlagReview(active.id, resolution);
      toast.success('Flag review resolved');
      setActive(null);
      setResolution({ resolution: 'approved', notes: '' });
      loadReviews();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to resolve flag review'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-500/10 to-transparent p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/20 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-red-700">
                <FiAlertTriangle className="h-4 w-4" /> Security review
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Flagged Item Reviews</h1>
              <p className="mt-2 text-sm text-gray-600">Resolve items that are blocking visitation checkout.</p>
            </div>
            <Button variant="outline" loading={loading} onClick={loadReviews}><FiRefreshCw /> Refresh</Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {reviews.length === 0 ? (
            <div className="p-16 text-center text-sm font-semibold text-gray-500">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 ring-1 ring-gray-100">
                <FiCheckCircle className="h-8 w-8 text-emerald-400" />
              </div>
              {loading ? 'Loading reviews...' : 'No pending flagged item reviews.'}
            </div>
          ) : reviews.map((review) => (
            <div key={review.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 p-6 last:border-b-0 transition-colors hover:bg-gray-50/50">
              <div>
                <div className="text-lg font-bold text-gray-900 tracking-tight">{review.item?.item_description || 'Flagged item'}</div>
                <div className="mt-1.5 text-sm text-gray-500">
                  Visitor: <strong className="text-gray-700">{review.session?.visitor?.full_name || '-'}</strong> · Inmate: <strong className="text-gray-700">{nameOf(review.session?.inmate)}</strong>
                </div>
                {review.item?.notes && <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 border border-red-100"><FiAlertTriangle className="h-3.5 w-3.5" /> {review.item.notes}</div>}
              </div>
              <Button onClick={() => setActive(review)}><FiCheckCircle /> Resolve</Button>
            </div>
          ))}
        </div>
      </div>

      {active && (
        <Modal title="Resolve flagged item" onClose={() => setActive(null)}>
          <div className="space-y-4">
            <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="font-bold text-slate-900">{active.item?.item_description}</div>
              <div className="text-slate-600">{active.item?.notes || 'No reason recorded.'}</div>
            </div>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Resolution</span>
              <select
                value={resolution.resolution}
                onChange={(e) => setResolution((current) => ({ ...current, resolution: e.target.value }))}
                className="w-full rounded border border-slate-300 px-3 py-2"
              >
                <option value="approved">Approve item</option>
                <option value="confiscated">Confiscated</option>
                <option value="denied">Visit denied</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Notes</span>
              <textarea
                rows={3}
                value={resolution.notes}
                onChange={(e) => setResolution((current) => ({ ...current, notes: e.target.value }))}
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
            </label>
            <Button onClick={submitResolution}>Save resolution</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
