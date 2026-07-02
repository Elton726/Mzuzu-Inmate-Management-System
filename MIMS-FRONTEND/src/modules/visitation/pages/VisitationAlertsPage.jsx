import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiAlertTriangle, FiBell, FiRefreshCw } from 'react-icons/fi';
import Button from '../../../components/common/Button';
import { useNotification } from '../../../contexts/useNotification';
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
  const { addNotification, markAsRead: globalMarkAsRead } = useNotification();
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
      
      // Sync unread notifications with global handler
      if (notificationData) {
        notificationData.forEach(n => {
          if (!n.is_read) {
            addNotification({
              id: n.id,
              title: n.title,
              message: n.message,
              type: 'info',
              module: 'visitation',
              timestamp: n.created_at,
            });
          }
        });
      }
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
      globalMarkAsRead(notification.id);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update notification'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-transparent p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/20 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-amber-700">
                <FiBell className="h-4 w-4" /> Visitation alerts
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Alerts</h1>
              <p className="mt-2 text-sm text-gray-600">Overdue sessions, flagged visits, and workflow notifications.</p>
            </div>
            <Button variant="outline" loading={loading} onClick={load}><FiRefreshCw /> Refresh</Button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <AlertPanel title="Overdue Sessions" rows={alerts.overdue || []} empty="No overdue sessions." tone="red" />
          <AlertPanel title="Flagged Visits" rows={alerts.flagged || []} empty="No flagged visits." tone="amber" />
        </div>

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
            <h2 className="text-lg font-bold tracking-tight text-gray-900">Workflow Notifications</h2>
          </div>
          {notifications.length === 0 ? (
            <div className="p-12 text-center text-sm font-semibold text-gray-500">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 ring-1 ring-gray-100">
                <FiBell className="h-6 w-6 text-gray-400" />
              </div>
              No visitation notifications.
            </div>
          ) : notifications.map((notification) => (
            <div key={notification.id} className={`flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 p-6 last:border-b-0 transition-colors hover:bg-gray-50/50 ${!notification.is_read ? 'bg-blue-50/20' : ''}`}>
              <div>
                <div className={`text-base font-bold tracking-tight ${notification.is_read ? 'text-gray-600' : 'text-gray-900'}`}>{notification.title}</div>
                <div className="mt-1.5 text-sm text-gray-500">{notification.message}</div>
                <div className="mt-2 text-xs font-medium text-gray-400">{new Date(notification.created_at).toLocaleString()}</div>
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
  const iconColor = tone === 'red' ? 'text-red-500' : 'text-amber-500';

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-5">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-gray-900"><FiAlertTriangle className={iconColor} /> {title}</h2>
      </div>
      {rows.length === 0 ? (
        <div className="p-12 text-center text-sm font-semibold text-gray-500">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 ring-1 ring-gray-100">
            <FiAlertTriangle className="h-6 w-6 text-gray-400" />
          </div>
          {empty}
        </div>
      ) : rows.map((session) => (
        <div key={session.id} className="border-b border-gray-100 p-6 last:border-b-0 transition-colors hover:bg-gray-50/50">
          <div className={`mb-3 inline-flex rounded-md border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${toneClass}`}>{session.status}</div>
          <div className="text-base font-bold text-gray-900">{session.visitor?.full_name || 'Visitor'}</div>
          <div className="mt-1.5 text-sm text-gray-500">Inmate: <strong className="text-gray-700">{nameOf(session.inmate)}</strong></div>
          {session.expected_checkout_at && (
            <div className="mt-2 text-xs font-medium text-red-600">Expected checkout: {new Date(session.expected_checkout_at).toLocaleString()}</div>
          )}
        </div>
      ))}
    </section>
  );
}
