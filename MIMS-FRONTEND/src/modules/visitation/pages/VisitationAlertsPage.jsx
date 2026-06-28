import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiAlertTriangle, FiBell, FiRefreshCw } from 'react-icons/fi';
import Button from '../../../components/common/Button';
import {
  getVisitationAlerts,
  getVisitationNotifications,
  markVisitationNotificationRead,
} from '../services/visitationService';

const getErrorMessage = (err, fallback) =>
  err?.response?.data?.message || err?.response?.data?.error || err?.message || fallback;

const nameOf = (inmate) => [inmate?.first_name, inmate?.last_name].filter(Boolean).join(' ') || 'Group visit';

export default function VisitationAlertsPage() {
  const [alerts, setAlerts] = useState({ overdue: [], flagged: [] });
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [alertData, notificationData] = await Promise.all([
        getVisitationAlerts(),
        getVisitationNotifications(),
      ]);
      setAlerts(alertData || { overdue: [], flagged: [] });
      setNotifications(notificationData || []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load visitation alerts'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (notification) => {
    try {
      await markVisitationNotificationRead(notification.id);
      setNotifications((current) => current.map((row) => (
        row.id === notification.id ? { ...row, is_read: true } : row
      )));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update notification'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase text-amber-700">
              <FiBell /> Visitation alerts
            </div>
            <h1 className="text-3xl font-bold text-slate-950">Alerts</h1>
            <p className="mt-1 text-sm text-slate-500">Overdue sessions, flagged visits, and workflow notifications.</p>
          </div>
          <Button variant="outline" loading={loading} onClick={load}><FiRefreshCw /> Refresh</Button>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <AlertPanel title="Overdue Sessions" rows={alerts.overdue || []} empty="No overdue sessions." tone="red" />
          <AlertPanel title="Flagged Visits" rows={alerts.flagged || []} empty="No flagged visits." tone="amber" />
        </div>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold text-slate-950">Workflow Notifications</h2>
          </div>
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm font-semibold text-slate-500">No visitation notifications.</div>
          ) : notifications.map((notification) => (
            <div key={notification.id} className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-5 last:border-b-0">
              <div>
                <div className={`font-bold ${notification.is_read ? 'text-slate-600' : 'text-slate-950'}`}>{notification.title}</div>
                <div className="mt-1 text-sm text-slate-600">{notification.message}</div>
                <div className="mt-1 text-xs text-slate-400">{new Date(notification.created_at).toLocaleString()}</div>
              </div>
              {!notification.is_read && <Button variant="outline" onClick={() => markRead(notification)}>Mark read</Button>}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function AlertPanel({ title, rows, empty, tone }) {
  const toneClass = tone === 'red' ? 'text-red-700 bg-red-50 border-red-200' : 'text-amber-700 bg-amber-50 border-amber-200';

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="flex items-center gap-2 font-bold text-slate-950"><FiAlertTriangle /> {title}</h2>
      </div>
      {rows.length === 0 ? (
        <div className="p-6 text-center text-sm font-semibold text-slate-500">{empty}</div>
      ) : rows.map((session) => (
        <div key={session.id} className="border-b border-slate-100 p-5 last:border-b-0">
          <div className={`mb-2 inline-flex rounded border px-2 py-1 text-xs font-bold uppercase ${toneClass}`}>{session.status}</div>
          <div className="font-bold text-slate-950">{session.visitor?.full_name || 'Visitor'}</div>
          <div className="text-sm text-slate-600">Inmate: {nameOf(session.inmate)}</div>
          {session.expected_checkout_at && (
            <div className="text-sm text-slate-500">Expected checkout: {new Date(session.expected_checkout_at).toLocaleString()}</div>
          )}
        </div>
      ))}
    </section>
  );
}
