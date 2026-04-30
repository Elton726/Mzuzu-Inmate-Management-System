import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiSearch, FiDownload } from 'react-icons/fi';
import { listReleaseHistory, exportReleaseHistory } from '../services/releaseService';
import SkeletonLoader from '../components/SkeletonLoader';
import Button from '../../../components/common/Button';

const normalizeHistoryRecord = (release) => {
  const inmate = release?.inmate || release?.admission?.inmate || {};
  const firstName = inmate.first_name || inmate.firstName || release?.first_name || release?.firstName || '';
  const lastName = inmate.last_name || inmate.lastName || release?.last_name || release?.lastName || '';

  return {
    key: release?.workflow_id || release?.id || release?.admission_id,
    inmateName: release?.inmate_name || release?.inmateName || [firstName, lastName].filter(Boolean).join(' '),
    prisonNumber: inmate.prison_number || inmate.prisonNumber || release?.prison_number || release?.prisonNumber || '',
    approvedBy: release?.approved_by_name || release?.approver?.name || release?.approvedByName || release?.approved_by || '-',
    approvedAt: release?.approved_at || release?.approvedAt,
    confirmedBy: release?.confirmed_by_name || release?.confirmer?.name || release?.confirmedByName || release?.confirmed_by || '-',
    confirmedAt: release?.confirmed_at || release?.confirmedAt,
    status: release?.status || 'approved',
  };
};

/**
 * Release History Page (Station Officer / Gatekeeper)
 * Audit trail of all release workflows
 */
export default function ReleaseHistoryPage() {
  const [loading, setLoading] = useState(false);
  const [releases, setReleases] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [exportLoading, setExportLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        per_page: perPage,
        page: currentPage,
        status: statusFilter !== 'all' ? statusFilter : undefined
      };

      if (searchQuery.trim().length >= 2) {
        params.q = searchQuery;
      }

      const data = await listReleaseHistory(params);
      setReleases(data.data || []);
      setTotalPages(data.last_page || 1);
      setCurrentPage(data.current_page || 1);
    } catch (err) {
      toast.error(err?.message || 'Failed to load release history');
      setReleases([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, perPage, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, perPage]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleExport = async (format) => {
    try {
      setExportLoading(true);
      const params = {
        status: statusFilter !== 'all' ? statusFilter : undefined
      };

      if (searchQuery.trim().length >= 2) {
        params.q = searchQuery;
      }

      const blob = await exportReleaseHistory(format, params);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `release-history-${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success(`History exported as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error(err?.message || 'Failed to export history');
    } finally {
      setExportLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      'pending_approval': 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300',
      'approved': 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300',
      'confirmed': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300',
      'released': 'bg-malawiGreen/10 dark:bg-malawiGreen/20 text-malawiGreen dark:text-green-400',
      'cancelled': 'bg-malawiRed/10 dark:bg-malawiRed/20 text-malawiRed dark:text-red-400'
    };
    return colors[status] || colors['pending_approval'];
  };

  const getStatusLabel = (status) => {
    const labels = {
      'pending_approval': 'Pending Approval',
      'approved': 'Approved',
      'confirmed': 'Confirmed',
      'released': 'Released',
      'cancelled': 'Cancelled'
    };
    return labels[status] || status;
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">Release History</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Complete audit trail of all release workflows
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleExport('csv')}
            disabled={exportLoading || releases.length === 0}
          >
            <FiDownload className="inline mr-2" />
            CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleExport('pdf')}
            disabled={exportLoading || releases.length === 0}
          >
            <FiDownload className="inline mr-2" />
            PDF
          </Button>
        </div>
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
                <option value="all">All Statuses</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="confirmed">Confirmed</option>
                <option value="released">Released</option>
                <option value="cancelled">Cancelled</option>
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
            <SkeletonLoader rows={5} columns={7} />
          </div>
        ) : releases.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery || statusFilter !== 'all'
                ? 'No release records found matching your filters.'
                : 'No release history records yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Inmate Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Prison Number
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Approved By
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Approved At
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Confirmed By
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Confirmed At
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {releases.map((release) => {
                  const record = normalizeHistoryRecord(release);

                  return (
                    <tr
                      key={record.key}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      <td className="px-6 py-4 text-sm">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {record.inmateName || '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {record.prisonNumber || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {record.approvedBy || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {record.approvedAt ? new Date(record.approvedAt).toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {record.confirmedBy || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {record.confirmedAt ? new Date(record.confirmedAt).toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(record.status)}`}>
                          {getStatusLabel(record.status)}
                        </span>
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
    </div>
  );
}
