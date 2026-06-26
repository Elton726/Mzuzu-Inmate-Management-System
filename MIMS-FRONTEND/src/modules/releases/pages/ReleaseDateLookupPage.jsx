import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { FiRefreshCw, FiSearch } from 'react-icons/fi';
import { listReleaseDateLookup } from '../services/releaseService';
import DateBadge from '../components/DateBadge';
import SkeletonLoader from '../components/SkeletonLoader';
import Button from '../../../components/common/Button';
import { formatDate } from '../../../utils/helpers';

const getErrorMessage = (err, fallback) => (
  err?.response?.data?.message ||
  err?.response?.data?.error ||
  err?.message ||
  fallback
);

const formatSentence = (record) => {
  if (record?.inmate_type !== 'convict') return 'Not sentenced';

  const years = Number(record.sentence_years || 0);
  const months = Number(record.sentence_months || 0);
  const parts = [];

  if (years > 0) parts.push(`${years} year${years === 1 ? '' : 's'}`);
  if (months > 0) parts.push(`${months} month${months === 1 ? '' : 's'}`);

  return parts.length > 0 ? parts.join(', ') : '0 months';
};

const statusConfig = {
  upcoming: {
    label: 'Upcoming',
    className: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300',
  },
  due_today: {
    label: 'Due Today',
    className: 'bg-malawiGold/20 text-yellow-800 dark:text-yellow-300',
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-malawiRed/10 dark:bg-malawiRed/20 text-malawiRed dark:text-red-400',
  },
  no_date: {
    label: 'No Date',
    className: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  },
  released: {
    label: 'Released',
    className: 'bg-malawiGreen/10 dark:bg-malawiGreen/20 text-malawiGreen dark:text-green-400',
  },
};

const getStatusConfig = (status) => statusConfig[status] || statusConfig.no_date;

export default function ReleaseDateLookupPage() {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inmateType, setInmateType] = useState('all');
  const [releaseStatus, setReleaseStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [totalRecords, setTotalRecords] = useState(0);

  const params = useMemo(() => {
    const next = {
      page: currentPage,
      per_page: perPage,
      inmate_type: inmateType !== 'all' ? inmateType : undefined,
      release_status: releaseStatus !== 'all' ? releaseStatus : undefined,
    };

    if (searchQuery.trim().length >= 2) {
      next.q = searchQuery.trim();
    }

    return next;
  }, [currentPage, inmateType, perPage, releaseStatus, searchQuery]);

  const loadReleaseDates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listReleaseDateLookup(params);

      setRecords(data.data || []);
      setTotalPages(data.last_page || 1);
      setCurrentPage(data.current_page || 1);
      setTotalRecords(data.total || 0);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load release dates'));
      setRecords([]);
      setTotalPages(1);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, inmateType, releaseStatus, perPage]);

  useEffect(() => {
    loadReleaseDates();
  }, [loadReleaseDates]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setInmateType('all');
    setReleaseStatus('all');
    setCurrentPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">Release Date Lookup</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Quickly check inmate release dates for Station Officer enquiries.
          </p>
        </div>
        <Button variant="outline" onClick={loadReleaseDates} disabled={loading}>
          <FiRefreshCw />
          Refresh
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px_180px_140px] gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by prison number, name, or case number..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-malawiGreen dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Inmate Type
            </label>
            <select
              value={inmateType}
              onChange={(event) => setInmateType(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-malawiGreen dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="all">All Types</option>
              <option value="convict">Convict</option>
              <option value="remandee">Remandee</option>
              <option value="murder_remandee">Murder Remandee</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Release Status
            </label>
            <select
              value={releaseStatus}
              onChange={(event) => setReleaseStatus(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-malawiGreen dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="all">All Statuses</option>
              <option value="upcoming">Upcoming</option>
              <option value="due_today">Due Today</option>
              <option value="overdue">Overdue</option>
              <option value="no_date">No Date</option>
              <option value="released">Released</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Per Page
            </label>
            <select
              value={perPage}
              onChange={(event) => setPerPage(Number(event.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-malawiGreen dark:bg-gray-700 dark:text-gray-100"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {totalRecords} inmate record{totalRecords === 1 ? '' : 's'} found
          </p>
          <Button variant="outline" onClick={handleClearFilters}>
            Clear Filters
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6">
            <SkeletonLoader rows={7} columns={9} />
          </div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">
            No inmate release records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Prison Number</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Inmate</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Case Number</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Sentence</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Start Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Release Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Remaining</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {records.map((record) => {
                  const status = getStatusConfig(record.release_status);

                  return (
                    <tr key={record.admission_id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                        {record.prison_number || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {record.inmate_name || '-'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Admission #{record.admission_id}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm capitalize text-gray-700 dark:text-gray-300">
                        {record.inmate_type?.replace(/_/g, ' ') || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {record.case_number || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {formatSentence(record)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {record.sentence_start_date ? formatDate(record.sentence_start_date) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-col items-start gap-1">
                          <DateBadge date={record.projected_release_date} />
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {record.projected_release_date ? formatDate(record.projected_release_date) : 'No projected date'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {record.days_remaining === null || record.release_status === 'released'
                          ? '-'
                          : `${Math.abs(record.days_remaining)} day${Math.abs(record.days_remaining) === 1 ? '' : 's'}${record.days_remaining < 0 ? ' overdue' : ''}`}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1 || loading}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages || loading}
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
