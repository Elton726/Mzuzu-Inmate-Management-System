import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { FiRefreshCw, FiSearch } from 'react-icons/fi';
import { FaCalendarAlt, FaCheckCircle, FaClipboardCheck, FaHistory, FaHourglass } from 'react-icons/fa';
import {
  getClearanceChecklistByAdmission,
  listEligibleReleases,
  approveRelease
} from '../services/releaseService';
import StatsCard from '../components/StatsCard';
import SkeletonLoader from '../components/SkeletonLoader';
import ApproveReleaseModal from '../components/ApproveReleaseModal';
import ReleaseStatusBadge from '../components/ReleaseStatusBadge';
import DateBadge from '../components/DateBadge';
import Button from '../../../components/common/Button';
import ClearanceChecklistModal from '../components/ClearanceChecklistModal';

const normalizeRelease = (release) => {
  const admission = release?.admission || {};
  const inmate = release?.inmate || admission?.inmate || {};
  const firstName = inmate.first_name || inmate.firstName || release?.first_name || release?.firstName || '';
  const lastName = inmate.last_name || inmate.lastName || release?.last_name || release?.lastName || '';
  const projectedReleaseDate = (
    release?.projected_release_date ||
    release?.projectedReleaseDate ||
    release?.release_date ||
    release?.releaseDate ||
    admission?.projected_release_date ||
    admission?.projectedReleaseDate
  );

  return {
    raw: release,
    key: release?.workflow_id || release?.id || release?.admission_id || admission?.id || release?.inmate_id,
    admissionId: release?.admission_id || admission?.id,
    inmate: {
      id: inmate.id || release?.inmate_id,
      first_name: firstName,
      last_name: lastName,
      prison_number: inmate.prison_number || inmate.prisonNumber || release?.prison_number || release?.prisonNumber || '',
      projected_release_date: projectedReleaseDate,
    },
    inmateName: release?.inmate_name || release?.inmateName || [firstName, lastName].filter(Boolean).join(' '),
    projectedReleaseDate,
    status: release?.status || release?.workflow_status || release?.workflowStatus || 'not_approved',
  };
};

/**
 * Release Approval Page (Station Officer)
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [statusFilter, setStatusFilter] = useState('all');
  const [clearanceByAdmission, setClearanceByAdmission] = useState({});

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [approveLoading, setApproveLoading] = useState(false);
  const [clearanceModalOpen, setClearanceModalOpen] = useState(false);
  const [selectedClearanceRelease, setSelectedClearanceRelease] = useState(null);

  const loadReleases = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        per_page: perPage,
        page: currentPage,
      };

      if (searchQuery.trim().length >= 2) {
        params.q = searchQuery;
      }

      const data = await listEligibleReleases(params);

      const rows = Array.isArray(data) ? data : (data.data || []);
      setReleases(rows);
      setTotalPages(data.last_page || 1);
      setCurrentPage(data.current_page || 1);

      const normalizedRows = rows.map(normalizeRelease);
      const clearancePairs = await Promise.all(normalizedRows
        .filter((release) => release.admissionId)
        .map(async (release) => {
          try {
            const response = await getClearanceChecklistByAdmission(release.admissionId);
            return [release.admissionId, response.data];
          } catch (err) {
            if (err?.response?.status === 404) {
              return [release.admissionId, null];
            }
            throw err;
          }
        }));

      setClearanceByAdmission(Object.fromEntries(clearancePairs));

      // Calculate stats
      const total = data.total || rows.length;
      const thisWeek = rows.filter(r => {
        const normalizedRelease = normalizeRelease(r);
        const today = new Date();
        const releaseDate = new Date(normalizedRelease.projectedReleaseDate);
        if (Number.isNaN(releaseDate.getTime())) return false;
        const daysUntilRelease = Math.floor((releaseDate - today) / (1000 * 60 * 60 * 24));
        return daysUntilRelease >= 0 && daysUntilRelease <= 7;
      }).length || 0;

      setStats({
        total_eligible: total,
        eligible_this_week: thisWeek,
        already_approved: 0
      });
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to load releases');
      setReleases([]);
      setClearanceByAdmission({});
    } finally {
      setLoading(false);
    }
  }, [currentPage, perPage, searchQuery]);

  const displayReleases = useMemo(() => {
    return releases
      .map(normalizeRelease)
      .filter((release) => statusFilter === 'all' || release.status === statusFilter);
  }, [releases, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, perPage]);

  useEffect(() => {
    loadReleases();
  }, [loadReleases]);

  const handleApproveClick = (release) => {
    setSelectedRelease(release);
    setModalOpen(true);
  };

  const handleClearanceClick = (release) => {
    setSelectedClearanceRelease(release);
    setClearanceModalOpen(true);
  };

  const refreshClearanceForAdmission = async (admissionId, knownStatus = undefined) => {
    if (!admissionId) return;

    if (knownStatus !== undefined) {
      setClearanceByAdmission((current) => ({ ...current, [admissionId]: knownStatus }));
      return;
    }

    try {
      const response = await getClearanceChecklistByAdmission(admissionId);
      setClearanceByAdmission((current) => ({ ...current, [admissionId]: response.data }));
    } catch (err) {
      if (err?.response?.status === 404) {
        setClearanceByAdmission((current) => ({ ...current, [admissionId]: null }));
        return;
      }
      toast.error(err?.response?.data?.error || err?.response?.data?.message || 'Failed to refresh clearance status');
    }
  };

  const handleApproveConfirm = async (data) => {
    if (!selectedRelease) return;
    const release = normalizeRelease(selectedRelease);

    try {
      setApproveLoading(true);
      await approveRelease(release.admissionId, {
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
            <FaHistory className="inline mr-2" />
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
                placeholder="Search by inmate name or inmate number..."
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
        ) : displayReleases.length === 0 ? (
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
                    Clearance
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {displayReleases.map((release) => {
                  const clearance = clearanceByAdmission[release.admissionId];
                  const clearanceComplete = clearance?.all_cleared === true;
                  const clearanceStarted = clearance !== null && clearance !== undefined;

                  return (
                    <tr
                      key={release.key}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {release.inmate.prison_number || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {release.inmateName || '-'}
                        </p>
                        {release.admissionId && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Admission #{release.admissionId}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <DateBadge date={release.projectedReleaseDate} />
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <ReleaseStatusBadge status={release.status} />
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        clearanceComplete
                          ? 'bg-malawiGreen/10 text-malawiGreen dark:text-green-400'
                          : clearanceStarted
                            ? 'bg-malawiGold/10 text-yellow-700 dark:text-yellow-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {clearanceComplete
                          ? 'Complete'
                          : clearanceStarted
                            ? `${clearance.cleared_items}/${clearance.total_items} cleared`
                            : 'Not Started'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!release.admissionId}
                          onClick={() => handleClearanceClick(release)}
                        >
                          <FaClipboardCheck />
                          Checklist
                        </Button>
                      {release.status === 'not_approved' ? (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={!release.admissionId || !clearanceComplete}
                          title={clearanceComplete ? 'Approve release' : 'Complete pre-release clearance first'}
                          onClick={() => handleApproveClick(release.raw)}
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
                      </div>
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

      {/* Approve Modal */}
      <ApproveReleaseModal
        isOpen={modalOpen}
        inmate={selectedRelease ? normalizeRelease(selectedRelease).inmate : null}
        onClose={() => {
          setModalOpen(false);
          setSelectedRelease(null);
        }}
        onConfirm={handleApproveConfirm}
        loading={approveLoading}
      />

      <ClearanceChecklistModal
        isOpen={clearanceModalOpen}
        release={selectedClearanceRelease}
        onClose={() => {
          setClearanceModalOpen(false);
          setSelectedClearanceRelease(null);
        }}
        onUpdated={refreshClearanceForAdmission}
      />
    </div>
  );
}
