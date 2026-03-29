import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getInmate } from '../services/inmateService';
import { formatDate } from '../../../utils/helpers';

export default function InmateDetailPage() {
  const { inmateId } = useParams();
  const [loading, setLoading] = useState(true);
  const [inmate, setInmate] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getInmate(inmateId);
      setInmate(data);
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to load inmate');
    } finally {
      setLoading(false);
    }
  }, [inmateId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading inmate…</p>
        </div>
      </div>
    );
  }

  if (!inmate?.id) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Inmate not found</h1>
        <Link className="text-malawiRed font-semibold hover:underline" to="/admissions/new">Back to admissions</Link>
      </div>
    );
  }

  const docs = Array.isArray(inmate.documents) ? inmate.documents : [];
  const admission = inmate.current_admission || inmate.currentAdmission || null;
  const hasActiveAdmission = Boolean(admission?.id);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Inmate Profile</h1>
          <p className="text-gray-600">
            {inmate.prison_number ? `${inmate.prison_number} — ` : ''}{inmate.first_name} {inmate.last_name}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="bg-malawiGreen text-white px-4 py-2 rounded hover:opacity-90 transition"
            onClick={load}
          >
            Refresh
          </button>
          {hasActiveAdmission ? (
            <Link
              to={`/admissions/${admission.id}`}
              className="bg-malawiGold text-malawiBlack px-4 py-2 rounded hover:bg-malawiRed hover:text-malawiGold transition"
            >
              View active admission
            </Link>
          ) : (
            <Link
              to={`/admissions/new?inmateId=${inmate.id}`}
              className="bg-malawiGold text-malawiBlack px-4 py-2 rounded hover:bg-malawiRed hover:text-malawiGold transition"
            >
              Start admission
            </Link>
          )}
          <Link
            to="/admissions/new"
            className="bg-malawiBlack text-malawiGold px-4 py-2 rounded hover:opacity-90 transition"
          >
            New admission
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Personal details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase">Date of birth</p>
              <p className="text-lg font-semibold text-gray-800 mt-1">{inmate.date_of_birth ? formatDate(inmate.date_of_birth) : '—'}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase">Young offender</p>
              <p className={`text-lg font-semibold mt-1 ${inmate.is_young_offender ? 'text-malawiRed' : 'text-gray-800'}`}>
                {inmate.is_young_offender ? 'Yes' : 'No'}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase">National ID</p>
              <p className="text-lg font-semibold text-gray-800 mt-1">{inmate.national_id || '—'}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase">Nationality</p>
              <p className="text-lg font-semibold text-gray-800 mt-1">{inmate.nationality || '—'}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm font-semibold text-gray-600 uppercase">Next of kin</p>
              <p className="text-gray-800 mt-1">
                <span className="font-semibold">{inmate.next_of_kin_name || '—'}</span>
                <span className="text-gray-600"> · {inmate.next_of_kin_contact || '—'}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Current admission</h2>
          {!admission?.id ? (
            <p className="text-gray-700">—</p>
          ) : (
            <div className="space-y-2">
              <div className="text-gray-800">
                Admission: <span className="font-semibold">#{admission.id}</span>
              </div>
              <div className="text-gray-800">
                Inmate type: <span className="font-semibold">{admission.inmate_type}</span>
              </div>
              <div className="text-gray-800">
                Admission date: <span className="font-semibold">{admission.admission_date ? formatDate(admission.admission_date) : '—'}</span>
              </div>
              <Link to={`/admissions/${admission.id}`} className="text-malawiRed font-semibold hover:underline">
                View admission
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Documents</h2>
        {docs.length === 0 ? (
          <p className="text-gray-700">—</p>
        ) : (
          <div className="border rounded divide-y">
            {docs.map((d) => (
              <div key={d.id} className="px-4 py-3">
                <div className="font-semibold text-gray-800">{d.document_type}</div>
                <div className="text-sm text-gray-600">{d.description || '—'}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Admissions history</h2>
        {inmate.admissions && Array.isArray(inmate.admissions) && inmate.admissions.length > 0 ? (
          <div className="border rounded divide-y">
            {inmate.admissions.map((adm) => {
              const isNotAdmitted = !adm.admission_date || adm.status === 'pending';
              return (
                <Link
                  key={adm.id}
                  to={`/admissions/${adm.id}`}
                  className={[
                    'px-4 py-3 transition flex items-start justify-between gap-4 hover:bg-gray-50',
                    isNotAdmitted ? 'outline outline-2 outline-malawiGreen outline-offset-[-2px] bg-green-50' : ''
                  ].join(' ')}
                >
                  <div className="text-left flex-1">
                    <div className="font-semibold text-gray-800">Admission #{adm.id}</div>
                    <div className="text-sm text-gray-600">
                      Inmate type: <span className="font-semibold">{adm.inmate_type || '—'}</span> · 
                      Date: <span className="font-semibold">{adm.admission_date ? formatDate(adm.admission_date) : '—'}</span>
                    </div>
                  </div>
                  {isNotAdmitted && (
                    <span className="inline-flex items-center shrink-0 text-xs font-semibold px-2 py-1 rounded bg-malawiGreen text-white">
                      Not admitted yet
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-700">No admission history.</p>
        )}
      </div>
    </div>
  );
}
