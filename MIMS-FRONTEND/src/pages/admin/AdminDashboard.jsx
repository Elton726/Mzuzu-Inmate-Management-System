import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MdPeople, MdAdminPanelSettings, MdBarChart } from 'react-icons/md';
import Toast from '../../components/Toast';
import apiService from '../../services/apiService';
import { getRoleDisplayName } from '../../utils/helpers';

export default function AdminDashboard() {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const data = await apiService.getUserStatistics();
      setStatistics(data ?? {});
      setError('');
    } catch (err) {
      setError('Failed to load statistics');
      setShowToast(true);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-malawiGold">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-malawiRed mx-auto mb-4"></div>
          <p className="text-malawiBlack">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const recent = Array.isArray(statistics?.recent_users) ? statistics.recent_users : [];

  return (
    <div className="min-h-screen bg-malawiGold p-8">
      {showToast && <Toast message={error} onClose={() => setShowToast(false)} />}

      <div className="max-w-7xl mx-auto">
        <h1 className="modern-heading text-center mb-8">Administrator Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div className="modern-card flex flex-col items-center">
            <MdPeople className="text-malawiRed text-5xl mb-2" />
            <span className="text-xl font-semibold">Total Users</span>
            <span className="text-3xl mt-2">{statistics?.total_users ?? '--'}</span>
          </div>

          <div className="modern-card flex flex-col items-center">
            <MdAdminPanelSettings className="text-malawiGreen text-5xl mb-2" />
            <span className="text-xl font-semibold">Active Admins</span>
            <span className="text-3xl mt-2">{statistics?.active_admins ?? '--'}</span>
          </div>

          <div className="modern-card flex flex-col items-center">
            <MdBarChart className="text-malawiGold text-5xl mb-2" />
            <span className="text-xl font-semibold">Other Stats</span>
            <span className="text-3xl mt-2">{statistics?.other_stats ?? '--'}</span>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Recent Activity</h2>
          <div className="space-x-3">
            <button
              onClick={fetchStatistics}
              className="bg-malawiGreen text-white px-4 py-2 rounded shadow hover:opacity-90 transition"
            >
              Refresh
            </button>
            <Link to="/admin/users" className="bg-malawiRed text-malawiGold px-4 py-2 rounded shadow hover:opacity-90 transition">
              Manage Users
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-gray-700 font-semibold">Name</th>
                  <th className="px-6 py-3 text-left text-gray-700 font-semibold">Email</th>
                  <th className="px-6 py-3 text-left text-gray-700 font-semibold">Role</th>
                  <th className="px-6 py-3 text-left text-gray-700 font-semibold">Added</th>
                  <th className="px-6 py-3 text-left text-gray-700 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-center text-gray-500">No recent users</td>
                  </tr>
                ) : (
                  recent.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-semibold text-gray-800">{user.name}</td>
                      <td className="px-6 py-4 text-gray-600">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">
                          {getRoleDisplayName(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '--'}
                      </td>
                      <td className="px-6 py-4">
                        <Link to="/admin/users" className="text-blue-600 hover:text-blue-800 font-semibold text-sm">Edit</Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
