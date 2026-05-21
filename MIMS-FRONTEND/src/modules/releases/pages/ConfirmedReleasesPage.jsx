import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiSearch } from 'react-icons/fi';
import { listConfirmedReleases } from '../services/releaseService';
import SkeletonLoader from '../components/SkeletonLoader';
import Button from '../../../components/common/Button';

const normalizeRelease = (release) => {
  const inmate = release?.inmate || release?.admission?.inmate || {};
  const firstName = inmate.first_name || release?.first_name || '';
  const lastName = inmate.last_name || release?.last_name || '';

  return {
    key: release?.workflow_id || release?.id,
    inmateName: [firstName, lastName].filter(Boolean).join(' '),
    prisonNumber: inmate.prison_number || release?.prison_number || '',
    approvedBy: release?.approved_by_name || release?.approver?.name || release?.approved_by || 'N/A',
    approvedAt: release?.approved_at || release?.approvedAt || 'N/A',
    confirmedBy: release?.confirmed_by_name || release?.confirmer?.name || release?.confirmed_by || 'N/A',
    confirmedAt: release?.confirmed_at || release?.confirmedAt || 'N/A',
  };
};

export default function ConfirmedReleasesPage() {
  const [loading, setLoading] = useState(false);
  const [releases, setReleases] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const loadReleases = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        per_page: perPage,
        page: currentPage,
        q: searchQuery.trim().length >= 2 ? searchQuery : undefined,
      };

      const data = await listConfirmedReleases(params);

      setReleases(data.data || []);
      setTotalPages(data.last_page || 1);
      setCurrentPage(data.current_page || 1);
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.message || 'Failed to load confirmed releases');
      setReleases([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, perPage, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, perPage]);

  useEffect(() => {
    loadReleases();
  }, [loadReleases]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setCurrentPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">Confirmed Releases</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Release profiles that are confirmed and available only through the release management interface.
          </p>
        </div>
        <Button variant="secondary" onClick={loadReleases} disabled={loading}>
          Refresh
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <div className="flex items-end">
            <Button variant="secondary" onClick={handleClearFilters} className="w-full">
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6">
            <SkeletonLoader rows={5} columns={6} />
          </div>
        ) : releases.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery ? 'No confirmed releases found matching your search.' : 'No confirmed releases available.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Inmate Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Prison Number</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Approved By</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Approved At</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Confirmed By</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Confirmed At</th>
                </tr>
              </thead>
              <tbody>
                {releases.map((release) => {
                  const record = normalizeRelease(release);
                  return (
                    <tr key={record.key} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="px-6 py-4 text-sm text-gray-800 dark:text-gray-100">{record.inmateName}</td>
                      <td className="px-6 py-4 text-sm text-gray-800 dark:text-gray-100">{record.prisonNumber}</td>
                      <td className="px-6 py-4 text-sm text-gray-800 dark:text-gray-100">{record.approvedBy}</td>
                      <td className="px-6 py-4 text-sm text-gray-800 dark:text-gray-100">{record.approvedAt ? new Date(record.approvedAt).toLocaleString() : '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-800 dark:text-gray-100">{record.confirmedBy}</td>
                      <td className="px-6 py-4 text-sm text-gray-800 dark:text-gray-100">{record.confirmedAt ? new Date(record.confirmedAt).toLocaleString() : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {releases.length > 0 && (
        <div className="flex justify-between items-center py-4 px-2 text-sm text-gray-600 dark:text-gray-400">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" disabled={currentPage <= 1} onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}>
              Previous
            </Button>
            <Button variant="secondary" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
