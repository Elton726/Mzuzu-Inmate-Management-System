import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import apiService, { SERVER_BASE_URL } from '../../../services/apiService';
import { useToast } from '../../../contexts/useToast';
import { formatDate } from '../../../utils/helpers';

export default function AdmissionShowPage() {
  const { admissionId } = useParams();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [admission, setAdmission] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getAdmission(admissionId);
      setAdmission(data);
    } catch (err) {
      toast.fromError(err);
    } finally {
      setLoading(false);
    }
  }, [admissionId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admission…</p>
        </div>
      </div>
    );
  }

  if (!admission?.id) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Admission not found</h1>
        <Link className="text-malawiRed font-semibold hover:underline" to="/admissions/new">Back to admissions</Link>
      </div>
    );
  }

  const inmate = admission.inmate || {};
  const allocations = Array.isArray(admission.cell_allocations) ? admission.cell_allocations : (Array.isArray(admission.cellAllocations) ? admission.cellAllocations : []);
  const activities = Array.isArray(admission.inmate_activities) ? admission.inmate_activities : (Array.isArray(admission.inmateActivities) ? admission.inmateActivities : []);
  const documents = Array.isArray(admission.documents) ? admission.documents : [];

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          {inmate.photo_path ? (
            <div className="shrink-0">
              <img
                src={`${SERVER_BASE_URL}/storage/${inmate.photo_path}`}
                alt={`${inmate.first_name} ${inmate.last_name}`}
                className="w-32 h-40 object-cover rounded border border-gray-300"
                onError={(e) => {
                  console.error('Photo loading error:', { src: e.target.src, inmate });
                  e.target.replaceWith(
                    Object.assign(document.createElement('div'), {
                      className: 'w-32 h-40 rounded border border-gray-300 bg-gray-200 flex items-center justify-center text-xs text-gray-600',
                      textContent: 'Photo unavailable'
                    })
                  );
                }}
              />
            </div>
          ) : (
            <div className="w-32 h-40 rounded border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center shrink-0">
              <p className="text-xs text-gray-500 text-center px-2">No photo</p>
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Admission #{admission.id}</h1>
            <p className="text-gray-600">
              {inmate.prison_number ? `${inmate.prison_number} — ` : ''}{inmate.first_name} {inmate.last_name}
            </p>
            {typeof inmate.is_young_offender === 'boolean' && (
              <p className="text-sm text-gray-600 mt-1">
                Young offender: <span className={`font-semibold ${inmate.is_young_offender ? 'text-malawiRed' : 'text-gray-800'}`}>{inmate.is_young_offender ? 'Yes' : 'No'}</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="bg-malawiGreen text-white px-4 py-2 rounded hover:opacity-90 transition"
            onClick={load}
          >
            Refresh
          </button>
          {inmate?.id && (
            <Link
              className="bg-malawiGold text-malawiBlack px-4 py-2 rounded hover:bg-malawiRed hover:text-malawiGold transition"
              to={`/inmates/${inmate.id}`}
            >
              View inmate profile
            </Link>
          )}
          <Link
            className="bg-malawiBlack text-malawiGold px-4 py-2 rounded hover:opacity-90 transition"
            to="/admissions/new"
          >
            New admission
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Admission details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase">Admission date</p>
              <p className="text-lg font-semibold text-gray-800 mt-1">{formatDate(admission.admission_date)}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase">Type</p>
              <p className="text-lg font-semibold text-gray-800 mt-1">{admission.admission_type}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase">Inmate type</p>
              <p className="text-lg font-semibold text-gray-800 mt-1">{admission.inmate_type}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase">Case number</p>
              <p className="text-lg font-semibold text-gray-800 mt-1">{admission.case_number || '—'}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm font-semibold text-gray-600 uppercase">Court</p>
              <p className="text-lg font-semibold text-gray-800 mt-1">{admission.court_name || '—'}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm font-semibold text-gray-600 uppercase">Offence</p>
              <p className="text-lg font-semibold text-gray-800 mt-1">{admission.offence_description || '—'}</p>
            </div>
          </div>

          {(admission.inmate_type === 'convict') && (
            <div className="mt-6 border-t pt-4">
              <h3 className="font-semibold text-gray-800 mb-3">Sentence</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-600 uppercase">Years</p>
                  <p className="text-lg font-semibold text-gray-800 mt-1">{admission.sentence_years ?? '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600 uppercase">Months</p>
                  <p className="text-lg font-semibold text-gray-800 mt-1">{admission.sentence_months ?? '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600 uppercase">Start date</p>
                  <p className="text-lg font-semibold text-gray-800 mt-1">{admission.sentence_start_date ? formatDate(admission.sentence_start_date) : '—'}</p>
                </div>
              </div>
            </div>
          )}

          {(admission.inmate_type !== 'convict') && (
            <div className="mt-6 border-t pt-4">
              <h3 className="font-semibold text-gray-800 mb-2">Remand</h3>
              <p className="text-gray-800">
                Next court date: <span className="font-semibold">{admission.remand_next_court_date ? formatDate(admission.remand_next_court_date) : '—'}</span>
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Allocation & activities</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase">Cell allocations</p>
              {allocations.length === 0 ? (
                <p className="text-gray-700 mt-1">—</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {allocations.map((a) => (
                    <li key={a.id} className="border rounded p-3">
                      <div className="font-semibold text-gray-800">
                        Block {a.cell?.block ?? a.cell?.block_name ?? '—'} · Cell {a.cell?.cell_number ?? '—'}
                      </div>
                      <div className="text-sm text-gray-600">
                        Assigned: {a.allocation_date ? formatDate(a.allocation_date) : '—'}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {admission.inmate_type === 'convict' && (
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase">Activities</p>
                {activities.length === 0 ? (
                  <p className="text-gray-700 mt-1">—</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {activities.map((ia) => (
                      <li key={ia.id} className="border rounded p-3">
                        <div className="font-semibold text-gray-800">{ia.activity?.name || '—'}</div>
                        <div className="text-sm text-gray-600">
                          Assigned: {ia.assigned_date ? formatDate(ia.assigned_date) : '—'}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Documents</h2>
        {documents.length === 0 ? (
          <p className="text-gray-700">—</p>
        ) : (
          <div className="border rounded divide-y">
            {documents.map((d) => (
              <div key={d.id} className="px-4 py-3">
                <div className="font-semibold text-gray-800">{d.document_type}</div>
                <div className="text-sm text-gray-600">{d.description || '—'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
