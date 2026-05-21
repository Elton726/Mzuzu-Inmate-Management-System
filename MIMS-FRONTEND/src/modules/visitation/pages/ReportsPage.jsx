import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import VisitationTabs from '../components/VisitationTabs';
import { fetchStatistics, fetchTodaySchedule, fetchPendingCharity } from '../store/visitationSessionSlice';
import apiClient from '../../../services/apiClient';
import { formatDateTime } from '../../../utils/helpers';

const tabs = ['statistics', 'today', 'pending'];
const tabLabels = {
  statistics: 'Statistics',
  today: 'Today’s schedule',
  pending: 'Pending charity'
};

const getInmateName = (item) => item.inmate_name || [item.first_name, item.last_name].filter(Boolean).join(' ') || item.inmate?.full_name || 'Unknown inmate';
const getVisitorName = (item) => item.visitor_name || [item.visitor?.first_name, item.visitor?.last_name].filter(Boolean).join(' ') || 'Unknown visitor';
const getPdfUrl = (sessionId) => `${apiClient.defaults.baseURL}/visitation-sessions/${sessionId}/pdf`;

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('statistics');
  const dispatch = useDispatch();
  const { statistics, todaySchedule, pendingCharity, error } = useSelector((state) => state.visitationSession);

  useEffect(() => {
    dispatch(fetchStatistics());
    dispatch(fetchTodaySchedule());
    dispatch(fetchPendingCharity());
  }, [dispatch]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  return (
    <div className="p-6 space-y-6">
      <VisitationTabs />
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-malawiBlack dark:text-white">Visitation reports</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">Review visitation trends, today’s schedule, and charity requests awaiting processing.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeTab === tab ? 'bg-malawiGreen text-white' : 'bg-white text-malawiBlack border border-gray-200 dark:bg-slate-900 dark:text-white dark:border-slate-700 hover:bg-gray-100'}`}>
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {activeTab === 'statistics' && (
        <div className="rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Visitation statistics</h2>
          {statistics.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No statistical data available yet.</p>
          ) : (
            <div className="space-y-4">
              {statistics.map((item) => (
                <div key={item.inmate_id} className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-4">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{getInmateName(item)}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{item.prison_number || 'No prison number'}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{item.unique_visitors} unique visitors</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
                      <span>Visits: {item.total_visits}</span>
                      <span>Completed: {item.completed_visits}</span>
                    </div>
                  </div>
                  <div className="mt-4 bg-gray-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div className="h-full rounded-full bg-malawiGreen" style={{ width: `${Math.min(100, item.completed_visits / Math.max(item.total_visits, 1) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'today' && (
        <div className="rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Today’s active schedule</h2>
          {todaySchedule.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No active visits scheduled for today.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-gray-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Inmate</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Visitor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {todaySchedule.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{getInmateName(item)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{getVisitorName(item)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{formatDateTime(item.visit_date_time || `${item.visit_date} ${item.visit_time}`)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{item.status?.replace('_', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'pending' && (
        <div className="rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Pending charity approvals</h2>
          {pendingCharity.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No pending charity approvals currently.</p>
          ) : (
            <div className="space-y-3">
              {pendingCharity.map((request) => (
                <div key={request.session_id || request.id} className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{request.charity_organization}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{request.inmate_name} {request.prison_number ? `(${request.prison_number})` : ''}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{request.charity_purpose}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={getPdfUrl(request.session_id || request.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded border border-malawiBlack px-4 py-2 font-semibold text-malawiBlack shadow-sm transition hover:bg-malawiBlack hover:text-malawiGold"
                      >
                        Download PDF
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
