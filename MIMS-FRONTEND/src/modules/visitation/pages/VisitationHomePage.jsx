import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { FiAlertTriangle, FiDownload, FiPackage, FiPhone, FiPlus, FiShield, FiUser, FiUserCheck, FiX, FiCalendar } from 'react-icons/fi';
import { FaFemale, FaMale, FaUsers } from 'react-icons/fa';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import { searchInmates } from '../../admissions/services/inmateService';
import {
  addVisitItem,
  cancelSession,
  checkInSession,
  checkOutSession,
  createCharityBooking,
  createVisitSession,
  denySession,
  downloadPdf,
  getTodaySchedule,
  searchVisitors,
  updateVisitItem,
} from '../services/visitationService';

function LiveCountdown({ endsAt, status, fallback, large }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt || ['completed', 'denied', 'cancelled'].includes(status)) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [endsAt, status]);

  if (!endsAt) return <span>{fallback || '-'}</span>;
  if (['completed', 'denied', 'cancelled'].includes(status)) return <span className="text-gray-500">-</span>;

  const remainingMs = Math.max(0, endsAt - now);
  if (remainingMs === 0) return <span className="text-red-600 font-bold">Time's up</span>;

  const h = Math.floor(remainingMs / 3600000);
  const m = Math.floor((remainingMs % 3600000) / 60000);
  const s = Math.floor((remainingMs % 60000) / 1000);
  
  if (large) {
    const timeString = h > 0 
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return <span>{timeString}</span>;
  }
  
  const timeString = h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
  return <span className={m < 5 && h === 0 ? "text-red-600 font-bold" : "text-gray-900 font-medium"}>{timeString}</span>;
}

const emptyRegular = { visitor_id: '', full_name: '', phone: '', inmate_id: '', relationship_type: '', relationship_notes: '' };
const emptyCharity = { organisation_name: '', contact_person: '', contact_person_phone: '', inmate_category: '', purpose: '', proposed_date: '' };
const denialReasons = ['Prohibited items found', 'Inmate refused visit', 'Visitor ID invalid', 'Security concern', 'Other'];
const charityCategories = [
  { value: 'male', label: 'Male Wing', Icon: FaMale, tone: 'blue' },
  { value: 'female', label: 'Female Wing', Icon: FaFemale, tone: 'pink' },
  { value: 'all', label: 'All Wings', Icon: FaUsers, tone: 'green' },
];

const statusClass = (status) => {
  if (['completed', 'approved'].includes(status)) return 'bg-green-100 text-green-800';
  if (['checked_in', 'in_progress', 'pending'].includes(status)) return 'bg-amber-100 text-amber-800';
  if (['flagged', 'denied', 'cancelled', 'rejected'].includes(status)) return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-700';
};

const nameOf = (inmate) => [inmate?.first_name, inmate?.last_name].filter(Boolean).join(' ') || 'Unknown inmate';
const categoryName = (category) => ({
  male: 'Male Wing',
  female: 'Female Wing',
  all: 'All Wings',
}[category] || 'Charity Visit');
const formatDateOnly = (value) => {
  if (!value) return '-';
  const [datePart] = String(value).split('T');
  const date = new Date(`${datePart}T00:00:00`);
  return Number.isNaN(date.getTime()) ? datePart : date.toLocaleDateString();
};

const getErrorMessage = (err, fallback) => err?.response?.data?.message || err?.response?.data?.error || err?.message || fallback;
const getFieldErrors = (err) => err?.response?.data?.errors || {};

function StatusBadge({ status }) {
  return <span className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${statusClass(status)}`}>{status?.replaceAll('_', ' ')}</span>;
}

function InmateSearch({ value, onChange, error }) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);

  useEffect(() => {
    let active = true;
    if (query.trim().length < 2) {
      setTimeout(() => { if (active) setOptions([]); }, 0);
      return undefined;
    }

    const timer = setTimeout(async () => {
      try {
        const data = await searchInmates({ q: query, per_page: 8 });
        if (active) setOptions(data.data || []);
      } catch {
        if (active) setOptions([]);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">Inmate</label>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search inmate name or inmate number"
        className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-malawiGreen"
      />
      {value && <p className="mt-1 text-xs text-gray-600">Selected inmate ID: {value}</p>}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {options.length > 0 && (
        <div className="mt-2 max-h-44 overflow-auto rounded border border-gray-200 bg-white shadow">
          {options.map((inmate) => (
            <button
              key={inmate.id}
              type="button"
              onClick={() => {
                onChange(inmate.id);
                setQuery(`${nameOf(inmate)} - ${inmate.prison_number}`);
                setOptions([]);
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
            >
              <span className="font-semibold">{nameOf(inmate)}</span>
              <span className="ml-2 text-gray-500">{inmate.prison_number}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function VisitorSearch({ selected, onSelect, onClear }) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);

  useEffect(() => {
    let active = true;
    if (query.trim().length < 2) {
      setTimeout(() => { if (active) setOptions([]); }, 0);
      return undefined;
    }

    const timer = setTimeout(async () => {
      try {
        const data = await searchVisitors({ q: query, per_page: 8 });
        if (active) setOptions(data || []);
      } catch {
        if (active) setOptions([]);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  const lastVisit = selected?.sessions_max_created_at
    ? new Date(selected.sessions_max_created_at).toLocaleDateString()
    : null;

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-semibold text-gray-900">Returning visitor lookup</h4>
          <p className="text-sm text-gray-500">Search by name or phone to reuse an existing visitor profile.</p>
        </div>
        {selected && <Button variant="outline" onClick={onClear}>Use new visitor</Button>}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search existing visitor name or phone"
        className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-malawiGreen"
      />

      {options.length > 0 && (
        <div className="mt-2 max-h-52 overflow-auto rounded border border-gray-200 bg-white shadow">
          {options.map((visitor) => (
            <button
              key={visitor.id}
              type="button"
              onClick={() => {
                onSelect(visitor);
                setQuery(`${visitor.full_name}${visitor.phone ? ` - ${visitor.phone}` : ''}`);
                setOptions([]);
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
            >
              <span className="font-semibold text-gray-900">{visitor.full_name}</span>
              {visitor.phone && <span className="ml-2 text-gray-500">{visitor.phone}</span>}
              <span className="ml-2 text-xs text-gray-400">{visitor.sessions_count || 0} visits</span>
              {visitor.is_watchlisted && <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Watchlisted</span>}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className={`mt-3 rounded border px-3 py-2 text-sm ${selected.is_watchlisted ? 'border-red-200 bg-red-50 text-red-800' : 'border-green-200 bg-green-50 text-green-800'}`}>
          <div className="font-semibold">{selected.full_name} selected</div>
          <div>{selected.sessions_count || 0} previous visits{lastVisit ? ` · Last visit ${lastVisit}` : ''}</div>
          {selected.is_watchlisted && (
            <div className="mt-1 font-semibold">
              Watchlist warning: {selected.watchlist_reason || 'No reason recorded.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function VisitationHomePage() {
  const [schedule, setSchedule] = useState({ sessions: [], approved_charity: [] });
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [flow, setFlow] = useState(null);
  const [regular, setRegular] = useState(emptyRegular);
  const [charity, setCharity] = useState(emptyCharity);
  const [fieldErrors, setFieldErrors] = useState({});

  const [activeSession, setActiveSession] = useState(null);
  const [item, setItem] = useState({ item_description: '', status: 'pending', notes: '' });
  const [checkInItems, setCheckInItems] = useState([]);
  const [checkInItem, setCheckInItem] = useState({ item_description: '', status: 'approved', notes: '' });
  const [flagModal, setFlagModal] = useState({ open: false, index: null, reason: '' });
  const [activeFlagModal, setActiveFlagModal] = useState({ open: false, item: null, reason: '' });
  const [denyOpen, setDenyOpen] = useState(false);
  const [denial, setDenial] = useState({ denial_reason: 'Security concern', denial_notes: '' });
  const [pdfInfo, setPdfInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const notifiedSessionsRef = useRef(new Set());
  const scheduleRef = useRef([]);

  const loadSchedule = useCallback(async () => {
    try {
      setSchedule(await getTodaySchedule());
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load visitation schedule'));
    }
  }, []);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const allSchedule = useMemo(() => [
    ...(schedule.sessions || []).map((session) => ({
      id: session.id,
      visitor: session.visitor?.full_name,
      inmate: session.visit_type === 'charity' ? categoryName(session.charity_booking?.inmate_category || session.charityBooking?.inmate_category) : nameOf(session.inmate),
      time: session.checked_in_at || session.created_at,
      displayTime: session.checked_in_at ? new Date(session.checked_in_at).toLocaleString() : new Date(session.created_at).toLocaleString(),
      status: session.status,
      isOverdue: session.is_overdue,
      timeRemainingLabel: session.time_remaining_label || '-',
      endsAt: session.expected_checkout_at && session.checked_in_at ? new Date(session.expected_checkout_at).getTime() : null,
      type: session.visit_type,
      session,
      hasFlags: (session.items || []).some((row) => row.status === 'flagged'),
    })),
    ...(schedule.approved_charity || []).map((booking) => ({
      id: booking.id,
      visitor: booking.organisation_name,
      inmate: categoryName(booking.inmate_category),
      time: `${formatDateOnly(booking.proposed_date)} ${String(booking.proposed_time || '').slice(0, 5)}`,
      displayTime: `${formatDateOnly(booking.proposed_date)} ${String(booking.proposed_time || '').slice(0, 5)}`,
      status: 'approved',
      timeRemainingLabel: booking.time_remaining_label || 'Not checked in',
      endsAt: null,
      type: 'charity',
      booking,
    })),
  ], [schedule]);

  useEffect(() => {
    scheduleRef.current = allSchedule;
  }, [allSchedule]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      scheduleRef.current.forEach((row) => {
        if (row.endsAt && row.status === 'in_progress') {
          if (row.endsAt <= now && !notifiedSessionsRef.current.has(row.id)) {
            notifiedSessionsRef.current.add(row.id);
            toast.warning(`Time is up for ${row.visitor}'s visit!`);
          }
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const resetFlow = () => {
    setFlow(null);
    setRegular(emptyRegular);
    setCharity(emptyCharity);
    setFieldErrors({});

    setActiveSession(null);
    setCheckInItems([]);
    setCheckInItem({ item_description: '', status: 'approved', notes: '' });
    setFlagModal({ open: false, index: null, reason: '' });
    setActiveFlagModal({ open: false, item: null, reason: '' });
    setPdfInfo(null);
  };

  const addCheckInItem = () => {
    if (!checkInItem.item_description.trim()) return;
    setCheckInItems((current) => [...current, { ...checkInItem, item_description: checkInItem.item_description.trim() }]);
    setCheckInItem({ item_description: '', status: 'approved', notes: '' });
  };

  const openCheckInFlag = (index) => {
    setFlagModal({ open: true, index, reason: checkInItems[index]?.notes || '' });
  };

  const confirmCheckInFlag = () => {
    setCheckInItems((current) => current.map((row, index) => (
      index === flagModal.index ? { ...row, status: 'flagged', notes: flagModal.reason } : row
    )));
    setFlagModal({ open: false, index: null, reason: '' });
  };

  const startRegular = async () => {
    try {
      setLoading(true);
      setFieldErrors({});
      const session = await createVisitSession({ ...regular, visit_type: 'regular', items: checkInItems });
      toast.success(session.status === 'flagged' ? 'Visit checked in and flagged for review.' : 'Visitor checked in successfully.');
      resetFlow();
      loadSchedule();
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err, 'Could not register visit'));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    const session = await checkInSession(activeSession.id);
    setActiveSession(session);
    toast.success('Visitor checked in');
    loadSchedule();
  };

  const handleCheckOut = async () => {
    const session = await checkOutSession(activeSession.id);
    setActiveSession(session);
    toast.success('Visitor checked out');
    loadSchedule();
  };

  const checkOutFromTable = async (session) => {
    try {
      setLoading(true);
      await checkOutSession(session.id);
      toast.success('Visitor checked out');
      loadSchedule();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not check out visit'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = async () => {
    const session = await denySession(activeSession.id, denial);
    setActiveSession(session);
    setDenyOpen(false);
    toast.success('Session closed as denied');
    loadSchedule();
  };

  const handleCancel = async () => {
    const session = await cancelSession(activeSession.id, denial);
    setActiveSession(session);
    setDenyOpen(false);
    toast.success('Session cancelled');
    loadSchedule();
  };

  const handleAddItem = async () => {
    if (!item.item_description.trim()) return;
    const created = await addVisitItem(activeSession.id, item);
    setActiveSession((current) => ({ ...current, items: [...(current.items || []), created] }));
    setItem({ item_description: '', status: 'pending', notes: '' });
  };

  const handleItemStatus = async (visitItem, status) => {
    const updated = await updateVisitItem(visitItem.id, { status, notes: visitItem.notes });
    setActiveSession((current) => ({
      ...current,
      status: status === 'flagged' ? 'flagged' : current.status,
      items: (current.items || []).map((row) => (row.id === updated.id ? updated : row)),
    }));
  };

  const confirmActiveFlag = async () => {
    if (!activeFlagModal.item) return;
    const updated = await updateVisitItem(activeFlagModal.item.id, {
      status: 'flagged',
      notes: activeFlagModal.reason,
    });
    setActiveSession((current) => ({
      ...current,
      status: 'flagged',
      items: (current.items || []).map((row) => (row.id === updated.id ? updated : row)),
    }));
    setActiveFlagModal({ open: false, item: null, reason: '' });
    loadSchedule();
  };



  const submitCharity = async () => {
    try {
      setLoading(true);
      setFieldErrors({});
      const result = await createCharityBooking(charity);
      setPdfInfo(result);
      toast.success('Charity booking saved and PDF generated');
      loadSchedule();
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err, 'Could not create charity booking'));
    } finally {
      setLoading(false);
    }
  };

  const startApprovedCharity = async (booking) => {
    try {
      setLoading(true);
      setFieldErrors({});
      const session = await createVisitSession({ charity_booking_id: booking.id });
      setActiveSession(session);
      setFlow('activeCharity');
      toast.success('Approved charity visit session created');
      loadSchedule();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not start charity visit session'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-malawiGreen/10 to-transparent p-6 border border-malawiGreen/20 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Visitation Management</h1>
          <p className="mt-1 text-sm text-gray-600">Gatekeeper visit intake and same-day session control</p>
        </div>
        <Button onClick={() => setSelectorOpen(true)} className="shadow-sm hover:-translate-y-0.5 transition-transform"><FiPlus /> New visit</Button>
      </div>

      <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-900/5">
        <div className="border-b border-gray-100 px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-900">Today&apos;s schedule</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-4">Visitor</th>
                <th className="px-6 py-4">Inmate</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">Time left</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {allSchedule.length === 0 ? (
                <tr>
                  <td className="px-6 py-16 text-center text-gray-500" colSpan={7}>
                    <div className="flex flex-col items-center justify-center">
                      <div className="rounded-full bg-gray-50 p-4 ring-1 ring-gray-100 mb-4">
                        <FiCalendar className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-sm font-medium text-gray-900">No visits scheduled</h3>
                      <p className="mt-1 text-sm text-gray-500">There are no visits or approved charity bookings for today.</p>
                    </div>
                  </td>
                </tr>
              ) : allSchedule.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors duration-150">
                  <td className="px-6 py-4 font-semibold text-gray-900">{row.visitor}</td>
                  <td className="px-6 py-4 text-gray-700">{row.inmate}</td>
                  <td className="px-6 py-4 capitalize text-gray-600 font-medium">{row.type}</td>
                  <td className="px-6 py-4 text-gray-600">{row.displayTime || '-'}</td>
                  <td className="px-6 py-4 text-gray-800 font-medium">
                    <LiveCountdown endsAt={row.endsAt} status={row.status} fallback={row.timeRemainingLabel} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={row.status} />
                      {row.isOverdue && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800 border border-red-200">
                          <FiAlertTriangle className="w-3.5 h-3.5" /> Overdue
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {row.booking ? (
                      <Button loading={loading} onClick={() => startApprovedCharity(row.booking)}>Start visit</Button>
                    ) : row.session && row.status === 'in_progress' && !row.hasFlags ? (
                      <Button loading={loading} onClick={() => checkOutFromTable(row.session)}>Check out</Button>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectorOpen && <Modal title="Start new visit" onClose={() => setSelectorOpen(false)}>
        <div className="grid gap-4 md:grid-cols-2">
          <button type="button" onClick={() => { resetFlow(); setFlow('regular'); setSelectorOpen(false); }} className="rounded-lg border border-gray-200 p-5 text-left hover:border-malawiGreen hover:bg-green-50">
            <FiUserCheck className="mb-3 text-2xl text-malawiGreen" />
            <div className="font-semibold text-gray-900">Regular visit</div>
            <div className="text-sm text-gray-600">Same-day visitor registration and check-in.</div>
          </button>
          <button type="button" onClick={() => { resetFlow(); setFlow('charity'); setSelectorOpen(false); }} className="rounded-lg border border-gray-200 p-5 text-left hover:border-malawiGreen hover:bg-green-50">
            <FiShield className="mb-3 text-2xl text-malawiGreen" />
            <div className="font-semibold text-gray-900">Charity booking</div>
            <div className="text-sm text-gray-600">Future slot request with regional office PDF.</div>
          </button>
        </div>
      </Modal>}

      {flow === 'regular' && <Modal title="Regular visit" widthClass="max-w-4xl" onClose={resetFlow}>
        <div className="space-y-5">
          <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Check in captures the visitor, inmate, and inspection items. Flagged items store the visit as flagged and prevent checkout.
          </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Full name" value={regular.full_name} error={fieldErrors.full_name?.[0]} onChange={(v) => setRegular({ ...regular, full_name: v })} />
              <Field label="Phone" value={regular.phone} error={fieldErrors.phone?.[0]} onChange={(v) => setRegular({ ...regular, phone: v })} />
            </div>
            <VisitorSearch
              selected={regular.visitor}
              onSelect={(visitor) => setRegular({
                ...regular,
                visitor,
                visitor_id: visitor.id,
                full_name: visitor.full_name || regular.full_name,
                phone: visitor.phone || '',
              })}
              onClear={() => setRegular({ ...regular, visitor: null, visitor_id: '', full_name: '', phone: '' })}
            />
            <InmateSearch value={regular.inmate_id} error={fieldErrors.inmate_id?.[0] || fieldErrors.slot?.[0]} onChange={(id) => setRegular({ ...regular, inmate_id: id })} />
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Relationship to inmate</label>
                <select
                  value={regular.relationship_type}
                  onChange={(e) => setRegular({ ...regular, relationship_type: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-malawiGreen"
                >
                  <option value="">Select relationship</option>
                  <option value="parent">Parent</option>
                  <option value="spouse">Spouse</option>
                  <option value="sibling">Sibling</option>
                  <option value="child">Child</option>
                  <option value="relative">Other relative</option>
                  <option value="legal_representative">Legal representative</option>
                  <option value="friend">Friend</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <Field
                label="Relationship notes"
                value={regular.relationship_notes}
                error={fieldErrors.relationship_notes?.[0]}
                onChange={(v) => setRegular({ ...regular, relationship_notes: v })}
              />
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-900"><FiPackage /> Items brought for inmate</h4>
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <input
                  value={checkInItem.item_description}
                  onChange={(e) => setCheckInItem({ ...checkInItem, item_description: e.target.value })}
                  placeholder="e.g. food parcel, blanket, toiletries"
                  className="rounded border border-gray-300 px-3 py-2"
                />
                <Button onClick={addCheckInItem}>Add item</Button>
              </div>
              <div className="mt-4 divide-y divide-gray-100">
                {checkInItems.length === 0 ? (
                  <p className="text-sm text-gray-500">No items added.</p>
                ) : checkInItems.map((row, index) => (
                  <div key={`${row.item_description}-${index}`} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{row.item_description}</p>
                      <StatusBadge status={row.status} />
                      {row.notes && <p className="mt-1 text-sm text-red-700">{row.notes}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setCheckInItems((current) => current.map((itemRow, itemIndex) => itemIndex === index ? { ...itemRow, status: 'approved', notes: '' } : itemRow))}>Approve</Button>
                      <Button variant="danger" onClick={() => openCheckInFlag(index)}>Flag</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Button loading={loading} onClick={startRegular}>Check in</Button>
        </div>
      </Modal>}

      {flow === 'activeCharity' && activeSession && <Modal title="Approved charity visit" widthClass="max-w-4xl" onClose={resetFlow}>
        <ActiveSession
          session={activeSession}
          item={item}
          setItem={setItem}
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
          onAddItem={handleAddItem}
          onItemStatus={handleItemStatus}
          onFlagItem={(row) => setActiveFlagModal({ open: true, item: row, reason: row.notes || '' })}
          onDeny={() => setDenyOpen(true)}
        />
      </Modal>}

      {flow === 'charity' && <Modal title="Charity booking" widthClass="max-w-4xl" onClose={resetFlow}>
        <div className="space-y-5">
          {/* Organisation & contact block */}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Organisation name" value={charity.organisation_name} error={fieldErrors.organisation_name?.[0]} onChange={(v) => setCharity({ ...charity, organisation_name: v })} />
          </div>

          {/* Contact person — compact two-field row */}
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                <FiUser className="text-malawiGreen" /> Contact Person Full Name
              </label>
              <input
                type="text"
                value={charity.contact_person}
                onChange={(e) => setCharity({ ...charity, contact_person: e.target.value })}
                placeholder="e.g. Jane Banda"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-malawiGreen"
              />
              {fieldErrors.contact_person?.[0] && <p className="mt-1 text-sm text-red-600">{fieldErrors.contact_person[0]}</p>}
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                <FiPhone className="text-malawiGreen" /> Contact Phone / WhatsApp
              </label>
              <div className="flex items-center rounded-lg border border-gray-300 bg-white focus-within:ring-2 focus-within:ring-malawiGreen overflow-hidden">
                <span className="border-r border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500 select-none whitespace-nowrap">🇲🇼 +265</span>
                <input
                  type="tel"
                  value={charity.contact_person_phone}
                  onChange={(e) => setCharity({ ...charity, contact_person_phone: e.target.value })}
                  placeholder="999 123 456"
                  className="flex-1 px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              {fieldErrors.contact_person_phone?.[0] && <p className="mt-1 text-sm text-red-600">{fieldErrors.contact_person_phone[0]}</p>}
            </div>
          </div>

          {/* Inmate category selector — compact chips */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Inmates to visit</label>
            <div className="grid gap-3 md:grid-cols-3">
              {charityCategories.map(
                // eslint-disable-next-line no-unused-vars
                ({ value, label, Icon, tone }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCharity({ ...charity, inmate_category: value })}
                  className={`flex min-h-14 items-center gap-3 rounded-lg border-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                    charity.inmate_category === value
                      ? tone === 'blue'
                        ? 'border-blue-500 bg-blue-50 text-blue-800'
                        : tone === 'pink'
                          ? 'border-pink-500 bg-pink-50 text-pink-800'
                          : 'border-green-500 bg-green-50 text-green-800'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{label}</span>
                  {charity.inmate_category === value && <span className="ml-auto text-xs">Selected</span>}
                </button>
              ))}
            </div>
            <div className="hidden">
              {['male', 'female'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCharity({ ...charity, inmate_category: cat })}
                  className={`flex flex-1 items-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                    charity.inmate_category === cat
                      ? cat === 'male'
                        ? 'border-blue-500 bg-blue-50 text-blue-800'
                        : 'border-pink-500 bg-pink-50 text-pink-800'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <span>{cat === 'male' ? '👨' : '👩'}</span>
                  <span className="capitalize">{cat} Wing</span>
                  {charity.inmate_category === cat && <span className="ml-auto text-xs">✓</span>}
                </button>
              ))}
            </div>
            {fieldErrors.inmate_category?.[0] && <p className="mt-1 text-sm text-red-600">{fieldErrors.inmate_category[0]}</p>}
          </div>

          <TextArea label="Purpose of visit" value={charity.purpose} error={fieldErrors.purpose?.[0]} onChange={(v) => setCharity({ ...charity, purpose: v })} />
          <div className="grid gap-4 md:grid-cols-1">
            <Field type="date" label="Proposed date" value={charity.proposed_date} error={fieldErrors.proposed_date?.[0]} onChange={(v) => setCharity({ ...charity, proposed_date: v })} />
          </div>
          <div className="flex flex-wrap gap-3">
            {pdfInfo ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-green-900 text-sm">✅ Request sent to station officer for approval.</p>
                  <p className="text-xs text-green-700 mt-0.5">PDF generated successfully.</p>
                </div>
                <Button onClick={() => downloadPdf(pdfInfo.download_url, `charity-booking-${pdfInfo.data.id}.pdf`)}><FiDownload /> Download PDF</Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
                <p className="text-xs text-amber-700">Generates a PDF &amp; sends to station officer for approval.</p>
                <Button loading={loading} onClick={submitCharity}><FiDownload /> Generate PDF &amp; Submit</Button>
              </div>
            )}
          </div>
        </div>
      </Modal>}

      {flagModal.open && <Modal title="Flag inspection item" onClose={() => setFlagModal({ open: false, index: null, reason: '' })}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Provide the reason this item should block checkout and mark the visit as flagged.
          </p>
          <TextArea
            label="Flag reason"
            value={flagModal.reason}
            onChange={(reason) => setFlagModal((current) => ({ ...current, reason }))}
          />
          <div className="flex gap-3">
            <Button variant="danger" onClick={confirmCheckInFlag}>Save flag</Button>
            <Button variant="outline" onClick={() => setFlagModal({ open: false, index: null, reason: '' })}>Cancel</Button>
          </div>
        </div>
      </Modal>}

      {activeFlagModal.open && <Modal title="Flag inspection item" onClose={() => setActiveFlagModal({ open: false, item: null, reason: '' })}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Provide the reason this item should mark the active visit as flagged.
          </p>
          <TextArea
            label="Flag reason"
            value={activeFlagModal.reason}
            onChange={(reason) => setActiveFlagModal((current) => ({ ...current, reason }))}
          />
          <div className="flex gap-3">
            <Button variant="danger" onClick={confirmActiveFlag}>Save flag</Button>
            <Button variant="outline" onClick={() => setActiveFlagModal({ open: false, item: null, reason: '' })}>Cancel</Button>
          </div>
        </div>
      </Modal>}

      {denyOpen && <Modal title="Deny or cancel session" onClose={() => setDenyOpen(false)}>
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-gray-700">Reason</label>
          <select value={denial.denial_reason} onChange={(e) => setDenial({ ...denial, denial_reason: e.target.value })} className="w-full rounded border border-gray-300 px-3 py-2">
            {denialReasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
          </select>
          <TextArea label="Notes" value={denial.denial_notes} onChange={(v) => setDenial({ ...denial, denial_notes: v })} />
          <div className="flex flex-wrap gap-3">
            <Button variant="danger" onClick={handleDeny}>Confirm denial</Button>
            <Button variant="outline" onClick={handleCancel}>Cancel session</Button>
          </div>
        </div>
      </Modal>}
    </div>
  );
}

function Field({ label, value, onChange, error, type = 'text', onBlur }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-malawiGreen" />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function TextArea({ label, value, onChange, error }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-malawiGreen" />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function ActiveSession({ session, item, setItem, onCheckIn, onCheckOut, onAddItem, onItemStatus, onFlagItem, onDeny }) {
  const [now, setNow] = useState(() => Date.now());
  const charityBooking = session.charity_booking || session.charityBooking;
  const isCharity = session.visit_type === 'charity';
  const hasFlags = session.status === 'flagged' || (session.items || []).some((row) => row.status === 'flagged');
  const endsAt = session.expected_checkout_at ? new Date(session.expected_checkout_at).getTime() : null;
  const remainingMs = endsAt ? Math.max(0, endsAt - now) : null;

  useEffect(() => {
    if (!session.checked_in_at || ['completed', 'denied', 'cancelled'].includes(session.status)) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [session.checked_in_at, session.status]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-1 text-xs font-bold tracking-wider text-gray-400 uppercase">Active Session</div>
            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{session.visitor?.full_name}</h3>
            <p className="mt-1 text-base font-medium text-gray-700">
              Visiting: <span className="text-gray-900">{isCharity ? `${categoryName(charityBooking?.inmate_category)} charity group` : nameOf(session.inmate)}</span>
            </p>
            <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5 bg-gray-100/80 px-2.5 py-1 rounded-md"><FiUserCheck className="text-gray-400" /> {session.checked_in_at ? new Date(session.checked_in_at).toLocaleTimeString() : 'Pending Check-in'}</span>
              {isCharity && charityBooking && (
                <span className="flex items-center gap-1.5 bg-gray-100/80 px-2.5 py-1 rounded-md">⏳ {charityBooking.duration_minutes} min requested</span>
              )}
            </div>
          </div>
          <StatusBadge status={session.status} />
        </div>
      </div>
      {session.checked_in_at && !['completed', 'denied', 'cancelled'].includes(session.status) && (
        <div className={`relative overflow-hidden rounded-xl border p-5 shadow-sm transition-colors duration-300 ${remainingMs === 0 ? 'border-red-200 bg-red-50/80 text-red-900 shadow-red-100' : 'border-emerald-200 bg-emerald-50/80 text-emerald-900 shadow-emerald-100'}`}>
          {remainingMs > 0 && <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-400/20 blur-2xl"></div>}
          <div className="text-sm font-bold tracking-wide uppercase opacity-80">{isCharity ? 'Charity' : 'Regular'} Visit Countdown</div>
          {endsAt ? (
            <div className="mt-2 text-4xl font-extrabold tabular-nums tracking-tight">
              <LiveCountdown endsAt={endsAt} status={session.status} large />
            </div>
          ) : (
            <p className="mt-2 text-sm opacity-90">Countdown starts when the visitor is checked in.</p>
          )}
          {remainingMs === 0 && <p className="mt-2 text-sm font-bold flex items-center gap-1.5"><FiAlertTriangle /> Allocated visit duration has ended.</p>}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        {!session.checked_in_at && !isCharity && <Button onClick={onCheckIn}><FiUserCheck /> Check in</Button>}
        <Button onClick={onCheckOut} disabled={session.status === 'completed' || hasFlags}>Check out</Button>
        {!isCharity && <Button variant="danger" onClick={onDeny}><FiX /> Deny / Cancel</Button>}
      </div>
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h4 className="mb-4 flex items-center gap-2 font-bold text-gray-900 text-lg"><FiPackage className="text-malawiGreen" /> Inspect items</h4>
        <div className="grid gap-3 md:grid-cols-[1fr_160px_auto]">
          <input value={item.item_description} onChange={(e) => setItem({ ...item, item_description: e.target.value })} placeholder="Item description" className="rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-malawiGreen focus:ring-1 focus:ring-malawiGreen outline-none transition-all" />
          <select value={item.status} onChange={(e) => setItem({ ...item, status: e.target.value })} className="rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-malawiGreen focus:ring-1 focus:ring-malawiGreen outline-none transition-all">
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
          </select>
          <Button onClick={onAddItem} className="shadow-sm">Add item</Button>
        </div>
        <div className="mt-4 divide-y divide-gray-100">
          {(session.items || []).map((row) => (
            <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium text-gray-900">{row.item_description}</p>
                <StatusBadge status={row.status} />
              </div>
              <div className="flex gap-2">
                {row.status !== 'approved' && <Button variant="outline" onClick={() => onItemStatus(row, 'approved')}>Approve</Button>}
                <Button variant="danger" onClick={() => onFlagItem(row)}>Flag</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {isCharity && !session.checked_in_at && (
        <div className="mt-4 flex justify-end">
          <Button onClick={onCheckIn}><FiUserCheck /> Check in</Button>
        </div>
      )}
    </div>
  );
}
