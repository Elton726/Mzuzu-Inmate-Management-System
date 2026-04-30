import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiEdit2, FiRefreshCw, FiSearch } from 'react-icons/fi';
import { listSentenceInmates, updateSentenceLength } from '../services/releaseService';
import SkeletonLoader from '../components/SkeletonLoader';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import { formatDate } from '../../../utils/helpers';

const getCurrentAdmission = (inmate) => inmate?.current_admission || inmate?.currentAdmission || null;

const formatSentence = (admission) => {
  if (!admission || admission.inmate_type !== 'convict') return 'Not sentenced';

  const years = Number(admission.sentence_years || 0);
  const months = Number(admission.sentence_months || 0);
  const parts = [];

  if (years > 0) parts.push(`${years} year${years === 1 ? '' : 's'}`);
  if (months > 0) parts.push(`${months} month${months === 1 ? '' : 's'}`);

  return parts.length > 0 ? parts.join(', ') : '0 months';
};

const isEditableAdmission = (admission) => {
  return Boolean(
    admission?.id &&
    admission?.inmate_type === 'convict' &&
    admission?.sentence_start_date &&
    !admission?.released_at
  );
};

export default function SentenceLengthPage() {
  const [loading, setLoading] = useState(false);
  const [inmates, setInmates] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [selectedInmate, setSelectedInmate] = useState(null);
  const [sentenceYears, setSentenceYears] = useState('');
  const [sentenceMonths, setSentenceMonths] = useState('0');
  const [saving, setSaving] = useState(false);

  const loadInmates = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        per_page: perPage,
        sort_by: 'id',
        sort_order: 'desc',
      };

      if (searchQuery.trim().length >= 2) {
        params.q = searchQuery.trim();
      }

      const data = await listSentenceInmates(params);
      const rows = Array.isArray(data.data) ? data.data : [];

      setInmates(rows);
      setTotalPages(data.last_page || 1);
      setCurrentPage(data.current_page || 1);
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to load inmates');
      setInmates([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, perPage, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, perPage]);

  useEffect(() => {
    loadInmates();
  }, [loadInmates]);

  const selectedAdmission = useMemo(() => getCurrentAdmission(selectedInmate), [selectedInmate]);

  const handleOpenEdit = (inmate) => {
    const admission = getCurrentAdmission(inmate);

    setSelectedInmate(inmate);
    setSentenceYears(String(admission?.sentence_years ?? 0));
    setSentenceMonths(String(admission?.sentence_months ?? 0));
  };

  const handleCloseEdit = () => {
    if (saving) return;
    setSelectedInmate(null);
    setSentenceYears('');
    setSentenceMonths('0');
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!selectedAdmission?.id) return;

    const years = Number(sentenceYears);
    const months = Number(sentenceMonths || 0);

    if (!Number.isInteger(years) || years < 0 || !Number.isInteger(months) || months < 0 || months > 11) {
      toast.error('Enter sentence years as 0 or more and months from 0 to 11.');
      return;
    }

    try {
      setSaving(true);
      const response = await updateSentenceLength(selectedAdmission.id, {
        sentence_years: years,
        sentence_months: months,
      });

      toast.success(response?.message || 'Sentence length updated successfully');
      setSelectedInmate(null);
      setSentenceYears('');
      setSentenceMonths('0');
      loadInmates();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update sentence length');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">Sentence Lengths</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Review current inmates and update sentence lengths for active convicted admissions.
          </p>
        </div>
        <Button variant="outline" onClick={loadInmates} disabled={loading}>
          <FiRefreshCw />
          Refresh
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-4">
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
                placeholder="Search by prison number, name, or national ID..."
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
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6">
            <SkeletonLoader rows={6} columns={7} />
          </div>
        ) : inmates.length === 0 ? (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">
            No inmates found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Prison Number</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Inmate</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Admission</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Sentence</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Start Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Release Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {inmates.map((inmate) => {
                  const admission = getCurrentAdmission(inmate);
                  const editable = isEditableAdmission(admission);

                  return (
                    <tr key={inmate.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                        {inmate.prison_number || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {inmate.first_name} {inmate.last_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {inmate.status || 'active'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {admission?.id ? (
                          <div>
                            <p className="font-semibold">#{admission.id}</p>
                            <p className="text-xs">{admission.inmate_type?.replace(/_/g, ' ')}</p>
                          </div>
                        ) : (
                          'No current admission'
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                        {formatSentence(admission)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {admission?.sentence_start_date ? formatDate(admission.sentence_start_date) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {admission?.projected_release_date ? formatDate(admission.projected_release_date) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={!editable}
                            onClick={() => handleOpenEdit(inmate)}
                            title={editable ? 'Change sentence length' : 'Only active convicted admissions can be edited'}
                          >
                            <FiEdit2 />
                            Change
                          </Button>
                          {admission?.id && (
                            <Link
                              to={`/adjustments/${admission.id}`}
                              className="inline-flex items-center justify-center px-3 py-2 rounded shadow-sm text-sm font-semibold border border-malawiBlack text-malawiBlack hover:bg-malawiBlack hover:text-malawiGold transition"
                            >
                              Adjustments
                            </Link>
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

      {selectedInmate && (
        <Modal title="Change Sentence Length" onClose={handleCloseEdit} widthClass="max-w-md">
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <p className="font-semibold text-gray-900">
                {selectedInmate.first_name} {selectedInmate.last_name}
              </p>
              <p className="text-sm text-gray-600">
                {selectedInmate.prison_number || 'No prison number'} - Admission #{selectedAdmission?.id}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Years
                </label>
                <input
                  type="number"
                  min="0"
                  value={sentenceYears}
                  onChange={(event) => setSentenceYears(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-malawiGreen"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Months
                </label>
                <input
                  type="number"
                  min="0"
                  max="11"
                  value={sentenceMonths}
                  onChange={(event) => setSentenceMonths(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-malawiGreen"
                  required
                />
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              Current projected release date: {selectedAdmission?.projected_release_date ? formatDate(selectedAdmission.projected_release_date) : '-'}
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleCloseEdit} disabled={saving}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={saving}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
