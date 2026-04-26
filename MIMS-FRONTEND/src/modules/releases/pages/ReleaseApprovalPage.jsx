import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { FiRefreshCw, FiHistory, FiSearch } from 'react-icons/fi';
import { FaCalendarAlt, FaCheckCircle, FaHourglass } from 'react-icons/fa';
import {
  listEligibleReleases,
  searchReleases,
  approveRelease
} from '../services/releaseService';
import StatsCard from '../components/StatsCard';
import SkeletonLoader from '../components/SkeletonLoader';
import ApproveReleaseModal from '../components/ApproveReleaseModal';
import ReleaseStatusBadge from '../components/ReleaseStatusBadge';
import DateBadge from '../components/DateBadge';
import Button from '../../../components/common/Button';

/**
 * Release Approval Page (Station Officer / Admin)
 * View and approve inmates eligible for release
 */
export default function ReleaseApprovalPage() {
  const [loading, setLoading] = useState(false);
  const [releases, setReleases] = useState([]);
  const [stats, setStats] = useState({
    total_eligible: 0,
    eligible_this_week: 0,
    already_approved: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPage] = useState(25);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [approveLoading, setApproveLoading] = useState(false);

  const loadReleases = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        per_page: perPage,
        page: currentPage,
        status: statusFilter !== 'all' ? statusFilter : undefined
      };

      let data;
      if (searchQuery.trim().length >= 2) {
        data = await searchReleases({ q: searchQuery, ...params });
      } else {
        data = await listEligibleReleases(params);
      }

      setReleases(data.data || []);
      setTotalPages(data.last_page || 1);
      setCurrentPage(data.current_page || 1);

      // Calculate stats
      const total = data.total || 0;
      const approved = data.data?.filter(r => r.status === 'approved').length || 0;
      const thisWeek = data.data?.filter(r => {
        const today = new Date();
        const releaseDate = new Date(r.projected_release_date);
        const daysUntilRelease = Math.floor((releaseDate - today) / (1000 * 60 * 60 * 24));
        return daysUntilRelease >= 0 && daysUntilRelease <= 7;
      }).length || 0;

      setStats({
        total_eligible: total,
        eligible_this_week: thisWeek,
        already_approved: approved
      });
    } catch (err) {
      toast.error(err?.message || 'Failed to load releases');
      setReleases([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, perPage, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, perPage]);

  useEffect(() => {
    loadReleases();
  }, [loadReleases]);

  const handleApproveClick = (release) => {
    setSelectedRelease(release);
    setModalOpen(true);
  };

  const handleApproveConfirm = async (data) => {
    if (!selectedRelease) return;

    try {
      setApproveLoading(true);
      await approveRelease(selectedRelease.inmate_id, {
        notes: data.notes || ''
      });

      toast.success('Release approved successfully');
      setModalOpen(false);
      setSelectedRelease(null);
      loadReleases();
    } catch (err) {
      toast.error(err?.message || 'Failed to approve release');
    } finally {
      setApproveLoading(false);
    }
  };

  const handleRefresh = () => {
    loadReleases();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">Release Approval</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Inmates due for release in the next 30 days
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={handleRefresh}
            disabled={loading}
          >
            <FiRefreshCw className="inline mr-2" />
            Refresh
          </Button>
          <Button
            variant="secondary"
            onClick={() => {}} // Navigate to history
          >
            <FiHistory className="inline mr-2" />
            Release History
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard
          title="Total Eligible"
          value={stats.total_eligible}
          icon={FaCalendarAlt}
          color="malawiGreen"
        />
        <StatsCard
          title="This Week"
          value={stats.eligible_this_week}
          icon={FaHourglass}
          color="malawiGold"
          subtitle="Next 7 days"
        />
        <StatsCard
          title="Already Approved"
          value={stats.already_approved}
          icon={FaCheckCircle}
          color="blue"
          subtitle="Pending gatekeeper"
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

          {/* Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-malawiGreen dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="all">All</option>
                <option value="not_approved">Not Approved</option>
                <option value="approved">Approved</option>
              </select>
            </div>

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
            <SkeletonLoader rows={5} columns={5} />
          </div>
        ) : releases.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery || statusFilter !== 'all' ? 'No releases found matching your filters.' : 'No eligible inmates for release.'}
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
                    Release Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {releases.map((release) => (
                  <tr
                    key={release.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {release.inmate?.prison_number}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {release.inmate?.first_name} {release.inmate?.last_name}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <DateBadge date={release.projected_release_date} />
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <ReleaseStatusBadge status={release.status} />
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {release.status === 'not_approved' ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleApproveClick(release)}
                        >
                          Approve
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled
                        >
                          Approved
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
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

      {/* Approve Modal */}
      <ApproveReleaseModal
        isOpen={modalOpen}
        inmate={selectedRelease?.inmate}
        onClose={() => {
          setModalOpen(false);
          setSelectedRelease(null);
        }}
        onConfirm={handleApproveConfirm}
        loading={approveLoading}
      />
    </div>
  );
}
