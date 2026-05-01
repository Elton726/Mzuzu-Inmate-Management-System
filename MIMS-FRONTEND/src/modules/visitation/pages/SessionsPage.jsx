import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { fetchSessions, scheduleSession, checkInSession, checkOutSession, cancelSession, denySession, fetchTodaySchedule } from '../store/visitationSessionSlice';
import VisitationTabs from '../components/VisitationTabs';
import SessionFormModal from '../components/SessionFormModal';
import DenySessionModal from '../components/DenySessionModal';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Select from '../../../components/common/Select';
import apiClient from '../../../services/apiClient';
import { useDebouncedValue } from '../../../utils/useDebouncedValue';
import { formatDateTime } from '../../../utils/helpers';
import { getInmateDisplayName } from '../utils/inmateSearch';

const statusOptions = [
  { value: '', label: 'All sessions' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No show' }
];

const getVisitorDisplayName = (visitor) => [visitor?.first_name, visitor?.last_name].filter(Boolean).join(' ').trim() || 'Unknown visitor';

const getSessionInmateName = (session) => session.inmate_name || session.inmate?.full_name || getInmateDisplayName(session.inmate);

const getSessionVisitorName = (session) => session.visitor_name || getVisitorDisplayName(session.visitor);

const getSessionDateTime = (session) => session.visit_date_time || [session.visit_date, session.visit_time].filter(Boolean).join(' ');

const getPdfUrl = (sessionId) => `${apiClient.defaults.baseURL}/visitation-sessions/${sessionId}/pdf`;

export default function SessionsPage() {
  const dispatch = useDispatch();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [denyTarget, setDenyTarget] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);

  const debouncedSearch = useDebouncedValue(search, 300);
  const { sessions, todaySchedule, loading, error } = useSelector((state) => state.visitationSession);

  const sessionFilters = useMemo(() => ({
    search: debouncedSearch || undefined,
    status: status || undefined,
    start_date: dateFrom || undefined,
    end_date: dateTo || undefined
  }), [dateFrom, dateTo, debouncedSearch, status]);

  useEffect(() => {
    dispatch(fetchSessions(sessionFilters));
  }, [dispatch, sessionFilters]);

  useEffect(() => {
    dispatch(fetchTodaySchedule());
  }, [dispatch]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const sessionRows = useMemo(() => sessions || [], [sessions]);

  const handleSessionCreated = async (values) => {
    try {
      await dispatch(scheduleSession(values)).unwrap();
      toast.success('Session scheduled successfully');
      setShowScheduleModal(false);
      dispatch(fetchSessions(sessionFilters));
    } catch (err) {
      toast.error(err.message || 'Unable to schedule session');
    }
  };

  const handleCheckIn = async (session) => {
    try {
      await dispatch(checkInSession(session.id)).unwrap();
      toast.success('Checked in successfully');
      dispatch(fetchSessions(sessionFilters));
    } catch (err) {
      toast.error(err.message || 'Unable to check in');
    }
  };

  const handleCheckOut = async (session) => {
    try {
      await dispatch(checkOutSession(session.id)).unwrap();
      toast.success('Checked out successfully');
      dispatch(fetchSessions(sessionFilters));
    } catch (err) {
      toast.error(err.message || 'Unable to check out');
    }
  };

  const handleCancel = async (session) => {
    try {
      await dispatch(cancelSession(session.id)).unwrap();
      toast.success('Session cancelled');
      dispatch(fetchSessions(sessionFilters));
    } catch (err) {
      toast.error(err.message || 'Unable to cancel session');
    }
  };

  const handleDeny = async ({ reason }) => {
    if (!denyTarget) return;
    try {
      await dispatch(denySession({ sessionId: denyTarget.id, reason })).unwrap();
      toast.success('Visit denied');
      setDenyTarget(null);
      dispatch(fetchSessions(sessionFilters));
    } catch (err) {
      toast.error(err.message || 'Unable to deny visit');
    }
  };

  const loadSessionDetails = async (session) => {
    try {
      const response = await apiClient.get(`/visitation-sessions/${session.id}`);
      setSessionDetails(response.data ?? response);
      setSelectedSession(session);
    } catch (err) {
      toast.error(err.message || 'Unable to load session details');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <VisitationTabs />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-malawiBlack dark:text-white">Visitation sessions</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">Manage scheduled visits, check-in/out operations and denial workflows.</p>
        </div>
        <Button onClick={() => setShowScheduleModal(true)}>Schedule session</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Search" placeholder="Search by inmate or visitor" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={statusOptions} />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input label="From" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              <Input label="To" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Today’s quick schedule</h2>
          {todaySchedule.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No active schedule for today.</p>
          ) : (
            <div className="space-y-3">
              {todaySchedule.map((session) => (
                <div key={session.id} className="rounded-lg border border-gray-200 dark:border-slate-700 p-3 bg-gray-50 dark:bg-slate-800">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{getSessionInmateName(session)}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{getSessionVisitorName(session)}</p>
                    </div>
                    <span className="text-xs uppercase text-gray-500 dark:text-gray-400">{session.status?.replace('_', ' ')}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{formatDateTime(getSessionDateTime(session))}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Inmate</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Visitor</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">When</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {loading ? (
              <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">Loading sessions...</td></tr>
            ) : sessionRows.length === 0 ? (
              <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500 dark:text-gray-300">No sessions available.</td></tr>
            ) : sessionRows.map((session) => (
              <tr key={session.id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{getSessionInmateName(session)}</td>
                <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{getSessionVisitorName(session)}</td>
                <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{formatDateTime(getSessionDateTime(session))}</td>
                <td className="px-4 py-4 text-sm">
                  <span className="inline-flex rounded-full bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 dark:bg-slate-700 dark:text-gray-200">{session.status?.replace('_', ' ')}</span>
                </td>
                <td className="px-4 py-4 text-right text-sm space-x-2">
                  <Button variant="outline" size="sm" onClick={() => loadSessionDetails(session)}>Details</Button>
                  {session.status === 'scheduled' && <Button variant="primary" size="sm" onClick={() => handleCheckIn(session)}>Check-in</Button>}
                  {session.status === 'in_progress' && <Button variant="primary" size="sm" onClick={() => handleCheckOut(session)}>Check-out</Button>}
                  {['scheduled', 'in_progress'].includes(session.status) && <Button variant="outline" size="sm" onClick={() => handleCancel(session)}>Cancel</Button>}
                  {session.status === 'scheduled' && <Button variant="danger" size="sm" onClick={() => setDenyTarget(session)}>Deny</Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SessionFormModal open={showScheduleModal} onClose={() => setShowScheduleModal(false)} onSave={handleSessionCreated} />
      <DenySessionModal open={Boolean(denyTarget)} onClose={() => setDenyTarget(null)} onSave={handleDeny} />

      {selectedSession && sessionDetails && (
        <div className="rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Session details</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Inmate</p>
              <p className="font-semibold text-gray-900 dark:text-white">{getSessionInmateName(sessionDetails)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Visitor</p>
              <p className="font-semibold text-gray-900 dark:text-white">{getSessionVisitorName(sessionDetails)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-semibold text-gray-900 dark:text-white">{sessionDetails.status?.replace('_', ' ')}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Schedule</p>
              <p className="font-semibold text-gray-900 dark:text-white">{formatDateTime(getSessionDateTime(sessionDetails))}</p>
            </div>
          </div>
          {sessionDetails.is_charity_visit && (
            <div className="mt-4 rounded-lg bg-gray-50 dark:bg-slate-800 p-4 border border-gray-200 dark:border-slate-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Charity details</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">Organization: {sessionDetails.charity_organization}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">Purpose: {sessionDetails.charity_purpose}</p>
              <a href={getPdfUrl(sessionDetails.id)} target="_blank" rel="noreferrer" className="inline-flex mt-3 rounded bg-malawiGreen px-3 py-2 text-sm font-semibold text-white hover:bg-opacity-90">Download PDF</a>
            </div>
          )}
          {Array.isArray(sessionDetails.items) && sessionDetails.items.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Items brought</h3>
              <div className="grid gap-3">
                {sessionDetails.items.map((item) => (
                  <div key={item.id} className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-3">
                    <p className="font-semibold text-gray-900 dark:text-white">{item.description}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Category: {item.category}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Quantity: {item.quantity}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Inspection: {item.is_approved ? 'Approved' : 'Pending'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
