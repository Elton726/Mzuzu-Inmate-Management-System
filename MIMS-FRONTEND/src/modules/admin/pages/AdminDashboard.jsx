import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MdPeople, MdAdminPanelSettings, MdBarChart, MdPerson, MdGavel, MdSchedule, MdHomeWork } from 'react-icons/md';
import apiService from '../../../services/apiService';
import { useToast } from '../../../contexts/useToast';
import UserAvatarWithRole from '../../../components/common/UserAvatarWithRole';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
];

const getCurrentAdmission = (inmate) => inmate?.current_admission || inmate?.currentAdmission || null;

const getInmateName = (inmate) => {
  const name = [inmate?.first_name, inmate?.last_name].filter(Boolean).join(' ');
  return name || 'Unnamed inmate';
};

const formatInmateType = (type) => {
  if (!type) return 'Type unknown';
  return type.replaceAll('_', ' ');
};

const fetchAllDashboardInmates = async () => {
  const firstPage = await apiService.listInmates({
    page: 1,
    per_page: 100,
    sort_by: 'id',
    sort_order: 'desc',
    include_released: true
  });
  const firstRows = Array.isArray(firstPage?.data) ? firstPage.data : [];
  const lastPage = Number(firstPage?.last_page || 1);

  if (lastPage <= 1) return firstRows;

  const remainingPages = Array.from({ length: lastPage - 1 }, (_, index) => index + 2);
  const pageResponses = await Promise.all(
    remainingPages.map((page) =>
      apiService.listInmates({
        page,
        per_page: 100,
        sort_by: 'id',
        sort_order: 'desc',
        include_released: true
      })
    )
  );

  return pageResponses.reduce((rows, page) => {
    const pageRows = Array.isArray(page?.data) ? page.data : [];
    return rows.concat(pageRows);
  }, firstRows);
};

// eslint-disable-next-line no-unused-vars
function PopulationStatCard({ icon: Icon, title, value, tone, active, onClick }) {
  const iconColors = {
    red: 'text-malawiRed',
    green: 'text-malawiGreen',
    gold: 'text-amber-500'
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'modern-card flex min-h-48 flex-col items-center justify-center text-center transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-malawiGreen dark:hover:bg-slate-800',
        active ? 'ring-2 ring-malawiGreen' : ''
      ].join(' ')}
    >
      <Icon className={`${iconColors[tone] || iconColors.green} text-4xl mb-2`} />
      <span className="text-lg font-semibold">{title}</span>
      <span className="text-2xl mt-2">{value ?? '--'}</span>
    </button>
  );
}

function InmateDetailsPanel({ title, inmates, loading }) {
  return (
    <section className="bg-white dark:bg-slate-900 rounded-lg shadow border border-green-700 dark:border-slate-700 overflow-hidden mb-8">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-700">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {loading ? 'Loading inmate names...' : `${inmates.length} record${inmates.length === 1 ? '' : 's'} shown`}
        </p>
      </div>

      {loading ? (
        <div className="p-6 text-gray-600 dark:text-gray-300">Loading inmates...</div>
      ) : inmates.length === 0 ? (
        <div className="p-6 text-gray-600 dark:text-gray-300">No inmate names found for this section.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-slate-700">
          {inmates.map((inmate) => {
            const admission = getCurrentAdmission(inmate);
            return (
              <div key={inmate.id} className="p-4">
                <p className="font-semibold text-gray-900 dark:text-white">{getInmateName(inmate)}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {inmate.prison_number || 'No prison number'} - {inmate.status || 'No status'}
                </p>
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400 mt-2">
                  {formatInmateType(admission?.inmate_type)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function InmateMonthlyLineGraph({ data }) {
  const width = 720;
  const height = 260;
  const padding = { top: 24, right: 24, bottom: 48, left: 48 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(1, ...data.map((item) => item.count));

  const points = data.map((item, index) => {
    const x = padding.left + (innerWidth / Math.max(1, data.length - 1)) * index;
    const y = padding.top + innerHeight - (item.count / maxValue) * innerHeight;
    return { ...item, x, y };
  });

  const linePoints = points.map((point) => `${point.x},${point.y}`).join(' ');
  const yTicks = [maxValue, Math.round(maxValue / 2), 0];

  return (
    <section className="bg-white dark:bg-slate-900 rounded-lg shadow border border-green-700 dark:border-slate-700 p-5">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Monthly Inmate Trend</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">Admissions counted from January to December.</p>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[680px] w-full h-auto" role="img" aria-label="Monthly inmate line graph">
          <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + innerHeight} stroke="#94a3b8" strokeWidth="1" />
          <line x1={padding.left} y1={padding.top + innerHeight} x2={padding.left + innerWidth} y2={padding.top + innerHeight} stroke="#94a3b8" strokeWidth="1" />

          {yTicks.map((tick) => {
            const y = padding.top + innerHeight - (tick / maxValue) * innerHeight;
            return (
              <g key={tick}>
                <line x1={padding.left} y1={y} x2={padding.left + innerWidth} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                <text x={padding.left - 12} y={y + 4} textAnchor="end" className="fill-gray-500 dark:fill-gray-300 text-xs">
                  {tick}
                </text>
              </g>
            );
          })}

          <polyline points={linePoints} fill="none" stroke="#00843D" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

          {points.map((point) => (
            <g key={point.month}>
              <circle cx={point.x} cy={point.y} r="5" fill="#D71920" stroke="#ffffff" strokeWidth="2" />
              <text x={point.x} y={padding.top + innerHeight + 26} textAnchor="middle" className="fill-gray-700 dark:fill-gray-200 text-xs font-semibold">
                {point.month}
              </text>
              <text x={point.x} y={point.y - 12} textAnchor="middle" className="fill-gray-900 dark:fill-white text-xs font-bold">
                {point.count}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}

export default function AdminDashboard() {
  const [statistics, setStatistics] = useState(null);
  const [populationStats, setPopulationStats] = useState(null);
  const [inmates, setInmates] = useState([]);
  const [selectedPopulationKey, setSelectedPopulationKey] = useState('total');
  const [loading, setLoading] = useState(true);
  const [inmateListLoading, setInmateListLoading] = useState(true);
  const toast = useToast();

  const fetchStatistics = useCallback(async () => {
    try {
      setLoading(true);
      setInmateListLoading(true);
      const [userStats, popStats, inmateRows] = await Promise.all([
        apiService.getUserStatistics(),
        apiService.getPopulationStatistics(),
        fetchAllDashboardInmates()
      ]);
      setStatistics(userStats ?? {});
      setPopulationStats(popStats ?? {});
      setInmates(inmateRows);
    } catch (err) {
      toast.fromError(err);
      console.error(err);
    } finally {
      setLoading(false);
      setInmateListLoading(false);
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
  const populationCards = [
    {
      key: 'total',
      title: 'Total Inmates',
      value: populationStats?.total_inmates,
      icon: MdPeople,
      tone: 'red',
      filter: () => true
    },
    {
      key: 'active',
      title: 'Active Inmates',
      value: populationStats?.active_inmates,
      icon: MdPerson,
      tone: 'green',
      filter: (inmate) => inmate.status === 'active'
    },
    {
      key: 'convict',
      title: 'Convicts',
      value: populationStats?.convict_count,
      icon: MdGavel,
      tone: 'gold',
      filter: (inmate) => getCurrentAdmission(inmate)?.inmate_type === 'convict'
    },
    {
      key: 'remandee',
      title: 'Remandees',
      value: populationStats?.remandee_count,
      icon: MdSchedule,
      tone: 'red',
      filter: (inmate) => getCurrentAdmission(inmate)?.inmate_type === 'remandee'
    },
    {
      key: 'murder_remandee',
      title: 'Murder Remandees',
      value: populationStats?.murder_remandee_count,
      icon: MdPerson,
      tone: 'green',
      filter: (inmate) => getCurrentAdmission(inmate)?.inmate_type === 'murder_remandee'
    },
    {
      key: 'released',
      title: 'Released',
      value: populationStats?.released_inmates,
      icon: MdBarChart,
      tone: 'gold',
      filter: (inmate) => inmate.status === 'released'
    },
    {
      key: 'deceased',
      title: 'Deceased',
      value: populationStats?.deceased_inmates,
      icon: MdBarChart,
      tone: 'red',
      filter: (inmate) => inmate.status === 'deceased'
    },
    {
      key: 'transferred',
      title: 'Transferred',
      value: populationStats?.transferred_inmates,
      icon: MdBarChart,
      tone: 'green',
      filter: (inmate) => inmate.status === 'transferred'
    }
  ];
  const selectedPopulationCard = populationCards.find((card) => card.key === selectedPopulationKey) || populationCards[0];
  const selectedInmates = inmates.filter(selectedPopulationCard.filter);
  const monthlyData = MONTHS.map((month, index) => ({
    month,
    count: inmates.filter((inmate) => {
      const admissionDate = getCurrentAdmission(inmate)?.admission_date;
      if (!admissionDate) return false;
      const parsed = new Date(admissionDate);
      return !Number.isNaN(parsed.getTime()) && parsed.getMonth() === index;
    }).length
  }));

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

        <div className="mb-8">
          <Link
            to="/admin/cells"
            className="inline-flex items-center gap-2 rounded bg-malawiBlack px-4 py-2 font-semibold text-malawiGold shadow transition hover:opacity-90"
          >
            <MdHomeWork className="text-xl" />
            Manage Cells
          </Link>
        </div>

        <h2 className="text-2xl font-semibold mb-6">Prison Population Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
          {populationCards.map((card) => (
            <PopulationStatCard
              key={card.key}
              icon={card.icon}
              title={card.title}
              value={card.value}
              tone={card.tone}
              active={selectedPopulationKey === card.key}
              onClick={() => setSelectedPopulationKey(card.key)}
            />
          ))}
        </div>

        <InmateDetailsPanel
          title={`${selectedPopulationCard.title} Names`}
          inmates={selectedInmates}
          loading={inmateListLoading}
        />

        <InmateMonthlyLineGraph data={monthlyData} />

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
            <Link to="/admin/cells" className="bg-malawiBlack text-malawiGold px-4 py-2 rounded shadow hover:opacity-90 transition">
              Manage Cells
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
