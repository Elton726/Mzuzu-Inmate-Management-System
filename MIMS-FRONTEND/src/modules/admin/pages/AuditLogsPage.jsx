import React, { useState, useEffect, useCallback } from 'react';
import { MdSearch, MdFilterList, MdRefresh } from 'react-icons/md';
import apiService from '../../../services/apiService';
import { useToast } from '../../../contexts/useToast';
import { formatDateTime } from '../../../utils/helpers';

export default function AuditLogsPage() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    table_name: '',
    user_id: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const toast = useToast();

  const fetchAuditLogs = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { ...filters };
      if (page > 1) params.page = page;

      const response = await apiService.getAuditLogs(params);
      setAuditLogs(response.data || []);
      setCurrentPage(response.current_page || 1);
      setTotalPages(response.last_page || 1);
    } catch (err) {
      toast.fromError(err);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchAuditLogs(1);
  };

  const handlePageChange = (page) => {
    fetchAuditLogs(page);
  };

  const getActionColor = (action) => {
    switch (action?.toLowerCase()) {
      case 'insert': return 'text-green-600 bg-green-100';
      case 'update': return 'text-blue-600 bg-blue-100';
      case 'delete': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading && auditLogs.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-malawiGold">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-malawiRed mx-auto mb-4"></div>
          <p className="text-malawiBlack">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-malawiGold p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="modern-heading">Audit Logs</h1>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-malawiGreen text-white px-4 py-2 rounded shadow hover:opacity-90 transition flex items-center"
            >
              <MdFilterList className="mr-2" />
              Filters
            </button>
            <button
              onClick={() => fetchAuditLogs(currentPage)}
              className="bg-malawiRed text-malawiGold px-4 py-2 rounded shadow hover:opacity-90 transition flex items-center"
            >
              <MdRefresh className="mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Table Name</label>
                <input
                  type="text"
                  value={filters.table_name}
                  onChange={(e) => handleFilterChange('table_name', e.target.value)}
                  placeholder="e.g., users, inmates"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-malawiRed"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">User ID</label>
                <input
                  type="number"
                  value={filters.user_id}
                  onChange={(e) => handleFilterChange('user_id', e.target.value)}
                  placeholder="User ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-malawiRed"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="bg-malawiRed text-white px-6 py-2 rounded shadow hover:opacity-90 transition flex items-center"
                >
                  <MdSearch className="mr-2" />
                  Apply Filters
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Audit Logs Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-gray-700 font-semibold">Timestamp</th>
                  <th className="px-6 py-3 text-left text-gray-700 font-semibold">User</th>
                  <th className="px-6 py-3 text-left text-gray-700 font-semibold">Action</th>
                  <th className="px-6 py-3 text-left text-gray-700 font-semibold">Table</th>
                  <th className="px-6 py-3 text-left text-gray-700 font-semibold">Record ID</th>
                  <th className="px-6 py-3 text-left text-gray-700 font-semibold">Changes</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-6 text-center text-gray-500">
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {log.user?.name || `User ${log.user_id}`}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {log.table_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {log.record_id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {log.changes ? JSON.stringify(log.changes) : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = Math.max(1, currentPage - 2) + i;
                if (page > totalPages) return null;
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-2 border rounded-lg ${
                      page === currentPage
                        ? 'bg-malawiRed text-white border-malawiRed'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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