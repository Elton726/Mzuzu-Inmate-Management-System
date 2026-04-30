import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiSearch } from 'react-icons/fi';
import { FaCheckCircle, FaClipboardList } from 'react-icons/fa';
import {
  listPendingConfirmations,
  confirmRelease
} from '../services/releaseService';
import StatsCard from '../components/StatsCard';
import SkeletonLoader from '../components/SkeletonLoader';
import ConfirmReleaseModal from '../components/ConfirmReleaseModal';
import DateBadge from '../components/DateBadge';
import Button from '../../../components/common/Button';

const getErrorMessage = (err, fallback) => (
  err?.response?.data?.message ||
  err?.response?.data?.error ||
  err?.message ||
  fallback
);

const toDateOnly = (date) => {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

const getReleaseTiming = (projectedReleaseDate) => {
  const releaseDate = toDateOnly(projectedReleaseDate);
  if (!releaseDate) {
    return {
      canConfirm: false,
      message: 'Inmate cannot be confirmed because the release date is missing.',
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (releaseDate > today) {
    return {
      canConfirm: false,
      message: 'Inmate cannot be confirmed yet because the release day has not yet reached.',
    };
  }

  if (releaseDate < today) {
    return {
      canConfirm: false,
      message: 'Inmate can only be confirmed on the exact release date.',
    };
  }

  return { canConfirm: true, message: '' };
};

const normalizeConfirmation = (release) => {
  const admission = release?.admission || {};
  const inmate = release?.inmate || admission?.inmate || {};
  const firstName = inmate.first_name || release?.first_name || '';
  const lastName = inmate.last_name || release?.last_name || '';

  return {
    raw: release,
    workflowId: release?.workflow_id || release?.id,
    key: release?.workflow_id || release?.id || release?.admission_id,
    inmate: {
      id: inmate.id || release?.inmate_id,
      first_name: firstName,
      last_name: lastName,
      prison_number: inmate.prison_number || release?.prison_number || '',
    },
    inmateName: [firstName, lastName].filter(Boolean).join(' '),
    approvedBy: release?.approved_by_name || release?.approver?.name || release?.approved_by || 'N/A',
    approvedAt: release?.approved_at,
    projectedReleaseDate: release?.projected_release_date || admission?.projected_release_date,
  };
};

/**
 * Release Confirmation Page (Gatekeeper)
 * Confirm physical exits of approved releases
 */
export default function ReleaseConfirmationPage() {
  const [loading, setLoading] = useState(false);
  const [releases, setReleases] = useState([]);
  const [stats, setStats] = useState({
    total_pending: 0,
    confirmed_today: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPage] = useState(25);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const loadReleases = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        per_page: perPage,
        page: currentPage
      };

      const data = await listPendingConfirmations(params);

      setReleases(data.data || []);
      setTotalPages(data.last_page || 1);
      setCurrentPage(data.current_page || 1);

      // Calculate stats
      const total = data.total || 0;
      const confirmedToday = data.data?.filter(r => {
        const confirmedAt = new Date(r.confirmed_at);
        const today = new Date();
        return confirmedAt.toDateString() === today.toDateString();
      }).length || 0;

      setStats({
        total_pending: total,
        confirmed_today: confirmedToday
      });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load confirmations'));
      setReleases([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, perPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, perPage]);

  useEffect(() => {
    loadReleases();
  }, [loadReleases]);

  const handleConfirmClick = (release) => {
    const row = normalizeConfirmation(release);
    const timing = getReleaseTiming(row.projectedReleaseDate);

    if (!timing.canConfirm) {
      toast.info(timing.message);
      return;
    }

    setSelectedRelease(release);
    setModalOpen(true);
  };

  const handleConfirmation = async (data) => {
    if (!selectedRelease) return;
    const release = normalizeConfirmation(selectedRelease);

    try {
      setConfirmLoading(true);
      await confirmRelease(release.workflowId, {
        notes: data.notes
      });

      toast.success('Release confirmed successfully');
      setModalOpen(false);
      setSelectedRelease(null);
      loadReleases();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to confirm release'));
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleRefresh = () => {
    loadReleases();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setCurrentPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">Gatekeeper Confirmation</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Inmates ready for release - Confirm physical exits
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={handleRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <StatsCard
          title="Pending Confirmations"
          value={stats.total_pending}
          icon={FaClipboardList}
          color="malawiGold"
        />
        <StatsCard
          title="Confirmed Today"
          value={stats.confirmed_today}
          icon={FaCheckCircle}
          color="malawiGreen"
        />
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="space-y-4">
          {/* Search Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search by inmate name or prison number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-malawiGreen dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Controls Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Page Size */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Per Page
              </label>
              <select
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-malawiGreen dark:bg-gray-700 dark:text-gray-100"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Clear Button */}
            <div className="flex items-end">
              <Button
                variant="secondary"
                onClick={handleClearFilters}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6">
            <SkeletonLoader rows={5} columns={6} />
          </div>
        ) : releases.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery ? 'No releases found matching your search.' : 'No pending confirmations.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Prison Number
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Inmate Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Approved By
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Approved At
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Release Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {releases.map((release) => {
                  const row = normalizeConfirmation(release);
                  const timing = getReleaseTiming(row.projectedReleaseDate);

                  return (
                    <tr
                      key={row.key}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                        {row.inmate.prison_number || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {row.inmateName || '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {row.approvedBy || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {row.approvedAt ? new Date(row.approvedAt).toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <DateBadge date={row.projectedReleaseDate} />
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={!row.workflowId || !timing.canConfirm}
                          title={timing.message || 'Confirm release'}
                          onClick={() => handleConfirmClick(row.raw)}
                        >
                          Confirm
                        </Button>
                        {!timing.canConfirm && (
                          <p className="mt-2 max-w-xs text-xs text-gray-600 dark:text-gray-400">
                            {timing.message}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
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

      {/* Confirm Modal */}
      <ConfirmReleaseModal
        isOpen={modalOpen}
        inmate={selectedRelease ? normalizeConfirmation(selectedRelease).inmate : null}
        approvedBy={selectedRelease ? normalizeConfirmation(selectedRelease).approvedBy : null}
        approvedAt={selectedRelease ? normalizeConfirmation(selectedRelease).approvedAt : null}
        onClose={() => {
          setModalOpen(false);
          setSelectedRelease(null);
        }}
        onConfirm={handleConfirmation}
        loading={confirmLoading}
      />
    </div>
  );
}
