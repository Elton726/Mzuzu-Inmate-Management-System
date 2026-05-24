import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MdPeople, MdAdminPanelSettings, MdBarChart, MdPerson, MdGavel, MdSchedule } from 'react-icons/md';
import apiService from '../../../services/apiService';
import { useToast } from '../../../contexts/useToast';
import UserAvatarWithRole from '../../../components/common/UserAvatarWithRole';

export default function AdminDashboard() {
  const [statistics, setStatistics] = useState(null);
  const [populationStats, setPopulationStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchStatistics = useCallback(async () => {
    try {
      setLoading(true);
      const [userStats, popStats] = await Promise.all([
        apiService.getUserStatistics(),
        apiService.getPopulationStatistics()
      ]);
      setStatistics(userStats ?? {});
      setPopulationStats(popStats ?? {});
    } catch (err) {
      toast.fromError(err);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

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

        <h2 className="text-2xl font-semibold mb-6">Prison Population Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
          <div className="modern-card flex flex-col items-center">
            <MdPeople className="text-malawiRed text-4xl mb-2" />
            <span className="text-lg font-semibold">Total Inmates</span>
            <span className="text-2xl mt-2">{populationStats?.total_inmates ?? '--'}</span>
          </div>

          <div className="modern-card flex flex-col items-center">
            <MdPerson className="text-malawiGreen text-4xl mb-2" />
            <span className="text-lg font-semibold">Active Inmates</span>
            <span className="text-2xl mt-2">{populationStats?.active_inmates ?? '--'}</span>
          </div>

          <div className="modern-card flex flex-col items-center">
            <MdGavel className="text-malawiGold text-4xl mb-2" />
            <span className="text-lg font-semibold">Convicts</span>
            <span className="text-2xl mt-2">{populationStats?.convict_count ?? '--'}</span>
          </div>

          <div className="modern-card flex flex-col items-center">
            <MdSchedule className="text-malawiRed text-4xl mb-2" />
            <span className="text-lg font-semibold">Remandees</span>
            <span className="text-2xl mt-2">{populationStats?.remandee_count ?? '--'}</span>
          </div>

          <div className="modern-card flex flex-col items-center">
            <MdPerson className="text-malawiGreen text-4xl mb-2" />
            <span className="text-lg font-semibold">Murder Remandees</span>
            <span className="text-2xl mt-2">{populationStats?.murder_remandee_count ?? '--'}</span>
          </div>

          <div className="modern-card flex flex-col items-center">
            <MdBarChart className="text-malawiGold text-4xl mb-2" />
            <span className="text-lg font-semibold">Released</span>
            <span className="text-2xl mt-2">{populationStats?.released_inmates ?? '--'}</span>
          </div>

          <div className="modern-card flex flex-col items-center">
            <MdBarChart className="text-malawiRed text-4xl mb-2" />
            <span className="text-lg font-semibold">Deceased</span>
            <span className="text-2xl mt-2">{populationStats?.deceased_inmates ?? '--'}</span>
          </div>

          <div className="modern-card flex flex-col items-center">
            <MdBarChart className="text-malawiGreen text-4xl mb-2" />
            <span className="text-lg font-semibold">Transferred</span>
            <span className="text-2xl mt-2">{populationStats?.transferred_inmates ?? '--'}</span>
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
            <Link to="/admin/audit-logs" className="bg-malawiGreen text-white px-4 py-2 rounded shadow hover:opacity-90 transition">
              View Audit Logs
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-gray-700 font-semibold">User</th>
                  <th className="px-6 py-3 text-left text-gray-700 font-semibold">Added</th>
                  <th className="px-6 py-3 text-left text-gray-700 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-6 text-center text-gray-500">No recent users</td>
                  </tr>
                ) : (
                  recent.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <UserAvatarWithRole user={user} />
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
