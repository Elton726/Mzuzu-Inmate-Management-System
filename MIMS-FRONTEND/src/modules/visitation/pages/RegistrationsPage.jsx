import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { fetchApprovedVisitors, fetchRegistrationsByInmate, linkVisitorToInmate, deactivateRegistration } from '../store/visitorSlice';
import { useDebouncedValue } from '../../../utils/useDebouncedValue';
import VisitationTabs from '../components/VisitationTabs';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Select from '../../../components/common/Select';
import apiClient from '../../../services/apiClient';
import Modal from '../../../components/common/Modal';
import { getInmateDisplayName, getInmateSearchResults } from '../utils/inmateSearch';

export default function RegistrationsPage() {
  const dispatch = useDispatch();
  const [inmateQuery, setInmateQuery] = useState('');
  const [selectedInmate, setSelectedInmate] = useState(null);
  const [visitorId, setVisitorId] = useState('');
  const [notes, setNotes] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [confirmRegistrationId, setConfirmRegistrationId] = useState(null);

  const debouncedInmateQuery = useDebouncedValue(inmateQuery, 300);
  const { approvedVisitors, registrations, error } = useSelector((state) => state.visitor);

  useEffect(() => {
    dispatch(fetchApprovedVisitors());
  }, [dispatch]);

  useEffect(() => {
    if (debouncedInmateQuery.length < 2) {
      return;
    }
    queueMicrotask(() => setSearching(true));
    apiClient.get('/inmates/search', { params: { q: debouncedInmateQuery } })
      .then((response) => setResults(getInmateSearchResults(response.data)))
      .catch(() => setResults([]))
      .finally(() => setSearching(false));
  }, [debouncedInmateQuery]);

  useEffect(() => {
    if (selectedInmate) {
      dispatch(fetchRegistrationsByInmate(selectedInmate.id));
    }
  }, [dispatch, selectedInmate]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedInmate || !visitorId) {
      toast.error('Select an inmate and visitor first');
      return;
    }
    try {
      await dispatch(linkVisitorToInmate({ inmate_id: selectedInmate.id, visitor_id: visitorId, notes })).unwrap();
      toast.success('Visitor linked to inmate');
      setNotes('');
      setVisitorId('');
      dispatch(fetchRegistrationsByInmate(selectedInmate.id));
    } catch (err) {
      toast.error(err.message || 'Unable to link visitor');
    }
  };

  const handleDeactivate = async () => {
    if (!confirmRegistrationId) return;
    try {
      await dispatch(deactivateRegistration(confirmRegistrationId)).unwrap();
      toast.success('Registration deactivated');
      setConfirmRegistrationId(null);
      if (selectedInmate) dispatch(fetchRegistrationsByInmate(selectedInmate.id));
    } catch (err) {
      toast.error(err.message || 'Unable to deactivate registration');
    }
  };

  const registrationRows = useMemo(() => registrations || [], [registrations]);

  return (
    <div className="p-6 space-y-6">
      <VisitationTabs />
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-malawiBlack dark:text-white">Inmate visitor registrations</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">Link approved visitors to inmates and deactivate registrations when required.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-4 shadow-sm">
          <h2 className="font-semibold mb-4 text-gray-900 dark:text-white">Registration form</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                label="Search inmate"
                value={inmateQuery}
                onChange={(e) => {
                  setInmateQuery(e.target.value);
                  if (e.target.value.length < 2) {
                    setResults([]);
                  }
                }}
                placeholder="Search by name or inmate number"
              />
              {inmateQuery && (
                <div className="mt-2 overflow-auto rounded border border-gray-200 bg-white dark:bg-slate-900 dark:border-slate-700 shadow-sm">
                  {searching ? (
                    <p className="p-3 text-sm text-gray-500">Searching inmates…</p>
                  ) : results.length > 0 ? (
                    results.map((inmate) => (
                      <button
                        key={inmate.id}
                        type="button"
                        onClick={() => {
                          setSelectedInmate(inmate);
                          setInmateQuery(getInmateDisplayName(inmate));
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-slate-800"
                      >
                        {getInmateDisplayName(inmate)} {inmate.prison_number ? `(${inmate.prison_number})` : ''}
                      </button>
                    ))
                  ) : (
                    <p className="p-3 text-sm text-gray-500">No inmates found.</p>
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Visitor</label>
                <select className="w-full border rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-malawiGreen dark:bg-slate-800 dark:text-white" value={visitorId} onChange={(e) => setVisitorId(e.target.value)}>
                  <option value="">Select approved visitor</option>
                  {approvedVisitors.map((visitor) => (
                    <option key={visitor.id} value={visitor.id}>
                      {visitor.first_name} {visitor.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Input label="Selected inmate" value={selectedInmate ? getInmateDisplayName(selectedInmate) : ''} readOnly />
              </div>
            </div>
            <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <div className="flex justify-end">
              <Button type="submit">Link visitor</Button>
            </div>
          </form>
        </div>

        <div className="rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-4 shadow-sm">
          <h2 className="font-semibold mb-4 text-gray-900 dark:text-white">Registration status</h2>
          {!selectedInmate ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Select an inmate to view registrations.</p>
          ) : registrationRows.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No registrations for this inmate.</p>
          ) : (
            <div className="space-y-3">
              {registrationRows.map((registration) => (
                <div key={registration.id} className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-4">
                  <p className="font-semibold text-gray-900 dark:text-white">{registration.visitor?.first_name} {registration.visitor?.last_name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Registered {new Date(registration.registered_date || registration.created_at).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Status: {registration.is_active ? 'Active' : 'Inactive'}</p>
                  <div className="mt-2 flex gap-2">
                    {registration.is_active && (
                      <Button variant="outline" type="button" onClick={() => setConfirmRegistrationId(registration.id)}>
                        Deactivate
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {confirmRegistrationId && (
        <Modal title="Deactivate registration" onClose={() => setConfirmRegistrationId(null)}>
          <div className="space-y-4">
            <p>Are you sure you want to deactivate this registration? Visitors will no longer be able to schedule visits for this inmate.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmRegistrationId(null)}>Cancel</Button>
              <Button onClick={handleDeactivate}>Deactivate</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
