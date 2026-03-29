import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { searchInmates, listInmates } from '../services/inmateService';
import { formatDate } from '../../../utils/helpers';

const getAdmissionsCount = (inmate) => {
  const n = inmate?.admissions_count ?? inmate?.admissionsCount;
  return typeof n === 'number' ? n : null;
};

const getCurrentAdmission = (inmate) => inmate?.current_admission || inmate?.currentAdmission || null;

export default function AdmissionsIndexPage() {
  const [loading, setLoading] = useState(false);
  const [inmates, setInmates] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState('desc');
  const [perPage, setPerPage] = useState(25);

  const loadInmates = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        per_page: perPage,
        page: currentPage,
        sort_by: sortBy,
        sort_order: sortOrder
      };

      // If there's a search query, use search endpoint; otherwise use index
      let data;
      if (searchQuery.trim().length >= 2) {
        data = await searchInmates({ q: searchQuery, ...params });
      } else {
        data = await listInmates(params);
      }

      const inmates = data.data || [];
      setInmates(Array.isArray(inmates) ? inmates : []);
      setTotalPages(data.last_page || 1);
      setCurrentPage(data.current_page || 1);
    } catch (err) {
      toast.error(err?.message || 'Failed to load inmates');
    } finally {
      setLoading(false);
    }
  }, [currentPage, sortBy, sortOrder, perPage, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, sortOrder, perPage]);

  useEffect(() => {
    loadInmates();
  }, [loadInmates]);

  const filteredInmates = useMemo(() => {
    return inmates.map((inmate) => ({
      ...inmate,
      neverAdmitted: getAdmissionsCount(inmate) === 0 && !getCurrentAdmission(inmate)?.id
    }));
  }, [inmates]);

  const unadmittedCount = useMemo(
    () => filteredInmates.filter((i) => i.neverAdmitted).length,
    [filteredInmates]
  );

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Admissions</h1>
          <p className="text-gray-600">Manage inmate admissions and view admission history</p>
        </div>
        <Link
          to="/admissions/new"
          className="bg-malawiGold text-malawiBlack px-4 py-2 rounded hover:bg-malawiRed hover:text-malawiGold transition font-semibold"
        >
          + New admission
        </Link>
      </div>

      {unadmittedCount > 0 && (
        <div className="mb-6 p-4 rounded bg-green-50 border border-malawiGreen">
          <p className="text-green-900 font-semibold">
            {unadmittedCount} inmate{unadmittedCount !== 1 ? 's' : ''} not yet admitted
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by prison number, name, or national ID..."
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-malawiGold"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-malawiGold"
              >
                <option value="id">ID (newest first)</option>
                <option value="prison_number">Prison number</option>
                <option value="first_name">First name</option>
                <option value="last_name">Last name</option>
                <option value="date_of_birth">Date of birth</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-malawiGold"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Per page</label>
              <select
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value))}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-malawiGold"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 border rounded overflow-hidden">
          {loading ? (
            <div className="px-4 py-8 text-center text-gray-500">Loading inmates…</div>
          ) : filteredInmates.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">No inmates found.</div>
          ) : (
            <div className="divide-y">
              {filteredInmates.map((inmate) => (
                <div
                  key={inmate.id}
                  className={[
                    'px-4 py-4 transition flex items-start justify-between gap-4',
                    inmate.neverAdmitted
                      ? 'outline outline-2 outline-malawiGreen outline-offset-[-2px] bg-green-50'
                      : 'hover:bg-gray-50'
                  ].join(' ')}
                >
                  <div className="text-left flex-1">
                    <div className="font-semibold text-gray-800">
                      {inmate.prison_number ? `${inmate.prison_number} — ` : ''}
                      {inmate.first_name} {inmate.last_name}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      DOB: {inmate.date_of_birth ? formatDate(inmate.date_of_birth) : '—'} · 
                      National ID: {inmate.national_id || '—'} · 
                      Admissions: {getAdmissionsCount(inmate) ?? 0}
                    </div>
                    {getCurrentAdmission(inmate)?.id && (
                      <div className="text-sm text-gray-700 mt-1">
                        Current admission: <span className="font-semibold">#{getCurrentAdmission(inmate).id}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    {inmate.neverAdmitted && (
                      <span className="inline-flex items-center text-xs font-semibold px-2 py-1 rounded bg-malawiGreen text-white">
                        Not admitted yet
                      </span>
                    )}
                    <Link
                      to={`/inmates/${inmate.id}`}
                      className="text-sm font-semibold text-malawiRed hover:underline"
                    >
                      View profile
                    </Link>
                    <Link
                      to={`/admissions/new?inmateId=${inmate.id}`}
                      className="text-sm font-semibold text-malawiGold hover:underline"
                    >
                      Start admission
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className="px-4 py-2 border rounded text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || loading}
                className="px-4 py-2 border rounded text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
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
