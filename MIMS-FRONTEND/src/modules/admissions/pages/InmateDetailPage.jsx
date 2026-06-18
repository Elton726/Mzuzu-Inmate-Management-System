import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  MdAssignment,
  MdBadge,
  MdContentCopy,
  MdDescription,
  MdEventNote,
  MdHomeWork,
  MdOpenInNew,
  MdRefresh,
  MdSearch
} from 'react-icons/md';
import { getInmate } from '../services/inmateService';
import { SERVER_BASE_URL } from '../../../services/apiService';
import { formatDate } from '../../../utils/helpers';

const formatLabel = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getFullName = (inmate) => [inmate.first_name, inmate.other_names, inmate.last_name].filter(Boolean).join(' ');

const getAdmissionAllocations = (admission) => {
  const allocations = admission?.cell_allocations || admission?.cellAllocations;
  return Array.isArray(allocations) ? allocations : [];
};

const getAdmissionActivities = (admission) => {
  const activities = admission?.inmate_activities || admission?.inmateActivities;
  return Array.isArray(activities) ? activities : [];
};

function DetailItem({ label, value, highlight = false, wide = false }) {
  return (
    <div className={wide ? 'md:col-span-2' : ''}>
      <p className="text-xs font-semibold text-gray-500 uppercase">{label}</p>
      <p className={`text-base font-semibold mt-1 ${highlight ? 'text-malawiRed' : 'text-gray-800'}`}>{value || '—'}</p>
    </div>
  );
}

export default function InmateDetailPage() {
  const { inmateId } = useParams();
  const [loading, setLoading] = useState(true);
  const [inmate, setInmate] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [documentQuery, setDocumentQuery] = useState('');
  const [expandedAdmissionIds, setExpandedAdmissionIds] = useState(() => new Set());

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
  const admissions = Array.isArray(inmate.admissions) ? inmate.admissions : [];
  const admission = inmate.current_admission || inmate.currentAdmission || null;
  const hasActiveAdmission = Boolean(admission?.id);
  const fullName = getFullName(inmate);
  const admissionsCount = inmate.admissions_count ?? inmate.admissionsCount ?? admissions.length;
  const activeAllocations = getAdmissionAllocations(admission);
  const activeActivities = getAdmissionActivities(admission);
  const filteredDocs = docs.filter((doc) => {
    const query = documentQuery.trim().toLowerCase();
    if (!query) return true;
    return [doc.document_type, doc.description, doc.file_name]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });
  const tabs = [
    { key: 'overview', label: 'Overview', icon: MdBadge },
    { key: 'admission', label: 'Admission', icon: MdAssignment },
    { key: 'documents', label: `Documents (${docs.length})`, icon: MdDescription },
    { key: 'history', label: `History (${admissions.length})`, icon: MdEventNote }
  ];

  const copyPrisonNumber = async () => {
    if (!inmate.prison_number) return;
    try {
      await navigator.clipboard.writeText(inmate.prison_number);
      toast.success('Prison number copied');
    } catch {
      toast.error('Could not copy prison number');
    }
  };

  const toggleAdmission = (admissionId) => {
    setExpandedAdmissionIds((prev) => {
      const next = new Set(prev);
      if (next.has(admissionId)) next.delete(admissionId);
      else next.add(admissionId);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="p-5 md:p-6 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
            <div className="flex flex-col sm:flex-row gap-4">
              {inmate.photo_path ? (
                <img
                  src={`${SERVER_BASE_URL}/storage/${inmate.photo_path}`}
                  alt={`${inmate.first_name} ${inmate.last_name}`}
                  className="w-28 h-36 object-cover rounded border border-gray-300 bg-gray-100"
                  onError={(e) => {
                    console.error('Photo loading error:', { src: e.target.src, inmate });
                    e.target.replaceWith(
                      Object.assign(document.createElement('div'), {
                        className: 'w-28 h-36 rounded border border-gray-300 bg-gray-100 flex items-center justify-center text-xs text-gray-600',
                        textContent: 'Photo unavailable'
                      })
                    );
                  }}
                />
              ) : (
                <div className="w-28 h-36 rounded border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center shrink-0">
                  <p className="text-xs text-gray-500 text-center px-2">No photo</p>
                </div>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2 text-xs font-semibold mb-3">
                  <span className="rounded bg-gray-100 px-2 py-1 text-gray-700">{formatLabel(inmate.status || 'active')}</span>
                  {hasActiveAdmission && <span className="rounded bg-malawiGold px-2 py-1 text-malawiBlack">Active admission</span>}
                  {inmate.is_young_offender && <span className="rounded bg-red-50 px-2 py-1 text-malawiRed">Young offender</span>}
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{fullName || 'Name not recorded'}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-gray-600">
                  <span className="font-semibold text-gray-800">{inmate.prison_number || 'No prison number'}</span>
                  {inmate.prison_number && (
                    <button
                      type="button"
                      onClick={copyPrisonNumber}
                      className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                      title="Copy prison number"
                    >
                      <MdContentCopy className="h-4 w-4" />
                    </button>
                  )}
                  <span>National ID {inmate.national_id || '—'}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition"
                onClick={load}
              >
                <MdRefresh className="h-4 w-4" />
                Refresh
              </button>
              {hasActiveAdmission ? (
                <Link
                  to={`/admissions/${admission.id}`}
                  className="inline-flex items-center gap-2 rounded bg-malawiGold px-3 py-2 text-sm font-semibold text-malawiBlack hover:bg-malawiRed hover:text-malawiGold transition"
                >
                  <MdOpenInNew className="h-4 w-4" />
                  Active admission
                </Link>
              ) : (
                <Link
                  to={`/admissions/new?inmateId=${inmate.id}`}
                  className="inline-flex items-center gap-2 rounded bg-malawiGold px-3 py-2 text-sm font-semibold text-malawiBlack hover:bg-malawiRed hover:text-malawiGold transition"
                >
                  <MdAssignment className="h-4 w-4" />
                  Start admission
                </Link>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 border-t border-gray-200">
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-gray-500 uppercase">Admissions</p>
              <p className="text-2xl font-bold text-gray-900">{admissionsCount}</p>
            </div>
            <div className="px-5 py-4 border-l border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase">Documents</p>
              <p className="text-2xl font-bold text-gray-900">{docs.length}</p>
            </div>
            <div className="px-5 py-4 border-t md:border-t-0 md:border-l border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase">Cell</p>
              <p className="text-lg font-bold text-gray-900">{activeAllocations[0]?.cell?.cell_number || '—'}</p>
            </div>
            <div className="px-5 py-4 border-t md:border-t-0 border-l border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase">Inmate type</p>
              <p className="text-lg font-bold text-gray-900">{formatLabel(admission?.inmate_type)}</p>
            </div>
          </div>
        </div>

        <div className="sticky top-16 z-20 mt-5 bg-gray-50/95 py-2">
          <div className="flex gap-2 overflow-x-auto border-b border-gray-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    'inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition',
                    active ? 'border-malawiRed text-malawiRed' : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  ].join(' ')}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 lg:col-span-2">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Identity & personal details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailItem label="Prison number" value={inmate.prison_number} />
            <DetailItem label="Status" value={formatLabel(inmate.status)} />
            <DetailItem label="First name" value={inmate.first_name} />
            <DetailItem label="Last name" value={inmate.last_name} />
            <DetailItem label="Other names" value={inmate.other_names} />
            <DetailItem label="Gender" value={formatLabel(inmate.gender)} />
            <DetailItem label="Date of birth" value={inmate.date_of_birth ? formatDate(inmate.date_of_birth) : '—'} />
            <DetailItem label="Young offender" value={inmate.is_young_offender ? 'Yes' : 'No'} highlight={inmate.is_young_offender} />
            <DetailItem label="Place of birth" value={inmate.place_of_birth} />
            <DetailItem label="Nationality" value={inmate.nationality} />
            <DetailItem label="National ID" value={inmate.national_id} />
            <DetailItem label="Marital status" value={formatLabel(inmate.marital_status)} />
            <DetailItem label="Created" value={inmate.created_at ? formatDate(inmate.created_at) : '—'} />
            <DetailItem label="Last updated" value={inmate.updated_at ? formatDate(inmate.updated_at) : '—'} />
          </div>
        </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Record summary</h2>
              <div className="space-y-4">
                <DetailItem label="Admissions" value={String(admissionsCount)} />
                <DetailItem label="Documents" value={String(docs.length)} />
                <DetailItem label="Last release date" value={inmate.last_release_date ? formatDate(inmate.last_release_date) : '—'} />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 lg:col-span-3">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Next of kin & belongings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailItem label="Next of kin name" value={inmate.next_of_kin_name} />
            <DetailItem label="Next of kin contact" value={inmate.next_of_kin_contact} />
            <div className="md:col-span-2">
              <p className="text-sm font-semibold text-gray-600 uppercase">Personal belongings</p>
              <p className="mt-1 whitespace-pre-wrap rounded border border-gray-200 bg-gray-50 p-3 text-gray-800">
                {inmate.personal_belongings || '—'}
              </p>
            </div>
          </div>
        </div>
          </div>
        )}

        {activeTab === 'admission' && (
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Current admission</h2>
              {!admission?.id ? (
                <p className="text-gray-700">—</p>
              ) : (
                <div className="space-y-4">
                  <DetailItem label="Admission" value={`#${admission.id}`} />
                  <DetailItem label="Inmate type" value={formatLabel(admission.inmate_type)} />
                  <DetailItem label="Admission date" value={admission.admission_date ? formatDate(admission.admission_date) : '—'} />
                  <DetailItem label="Case number" value={admission.case_number} />
                  <DetailItem label="Court" value={admission.court_name} />
                  {admission.inmate_type === 'convict' ? (
                    <DetailItem label="Sentence" value={`${admission.sentence_years ?? 0} years ${admission.sentence_months ?? 0} months`} />
                  ) : (
                    <>
                      <DetailItem label="Next court" value={admission.remand_next_court_date ? formatDate(admission.remand_next_court_date) : '—'} />
                      <DetailItem label="Remand duration" value={admission.remand_duration_days ? `${admission.remand_duration_days} days` : '—'} />
                    </>
                  )}
                  <Link to={`/admissions/${admission.id}`} className="inline-flex items-center gap-2 text-malawiRed font-semibold hover:underline">
                    <MdOpenInNew className="h-4 w-4" />
                    View admission
                  </Link>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Cell allocation</h2>
          {activeAllocations.length === 0 ? (
            <p className="text-gray-700">—</p>
          ) : (
            <div className="border rounded divide-y">
              {activeAllocations.map((allocation) => (
                <div key={allocation.id} className="px-4 py-3">
                  <div className="font-semibold text-gray-800">
                    Block {allocation.cell?.block ?? '—'} · Cell {allocation.cell?.cell_number ?? '—'}
                  </div>
                  <div className="text-sm text-gray-600">
                    Security: <span className="font-semibold">{formatLabel(allocation.cell?.security_classification)}</span> · 
                    Occupancy: <span className="font-semibold">{allocation.cell?.current_occupancy ?? '—'}/{allocation.cell?.capacity ?? '—'}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Allocated: <span className="font-semibold">{(allocation.allocated_date || allocation.allocation_date) ? formatDate(allocation.allocated_date || allocation.allocation_date) : '—'}</span>
                    {allocation.deallocated_date && <> · Deallocated: <span className="font-semibold">{formatDate(allocation.deallocated_date)}</span></>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Activities</h2>
          {activeActivities.length === 0 ? (
            <p className="text-gray-700">—</p>
          ) : (
            <div className="border rounded divide-y">
              {activeActivities.map((item) => (
                <div key={item.id} className="px-4 py-3">
                  <div className="font-semibold text-gray-800">{item.activity?.name || 'Activity'}</div>
                  <div className="text-sm text-gray-600">
                    Type: <span className="font-semibold">{formatLabel(item.activity?.activity_type)}</span> · 
                    Assigned: <span className="font-semibold">{item.assigned_date ? formatDate(item.assigned_date) : '—'}</span>
                  </div>
                  {item.end_date && (
                    <div className="text-sm text-gray-600">
                      Ended: <span className="font-semibold">{formatDate(item.end_date)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="mt-5 bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Documents</h2>
              <label className="relative w-full md:w-80">
                <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={documentQuery}
                  onChange={(event) => setDocumentQuery(event.target.value)}
                  className="w-full rounded border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-malawiGold"
                  placeholder="Search documents"
                />
              </label>
            </div>
        {filteredDocs.length === 0 ? (
          <p className="text-gray-700">—</p>
        ) : (
          <div className="border rounded divide-y">
            {filteredDocs.map((d) => (
              <div key={d.id} className="px-4 py-3 flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-gray-800">{formatLabel(d.document_type)}</div>
                  <div className="text-sm text-gray-600">{d.description || '—'}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {d.created_at ? formatDate(d.created_at) : 'Date not recorded'}
                  </div>
                </div>
                {d.file_path && (
                  <a
                    href={`${SERVER_BASE_URL}/storage/${d.file_path}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-malawiRed hover:underline"
                  >
                    <MdOpenInNew className="h-4 w-4" />
                    Open
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="mt-5 bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Admissions history</h2>
        {admissions.length > 0 ? (
          <div className="border rounded divide-y">
            {admissions.map((adm) => {
              const isNotAdmitted = !adm.admission_date || adm.status === 'pending';
              const expanded = expandedAdmissionIds.has(adm.id);
              return (
                <div
                  key={adm.id}
                  className={[
                    'px-4 py-3 transition',
                    isNotAdmitted ? 'outline outline-2 outline-malawiGreen outline-offset-[-2px] bg-green-50' : ''
                  ].join(' ')}
                >
                  <button
                    type="button"
                    onClick={() => toggleAdmission(adm.id)}
                    className="w-full flex items-start justify-between gap-4 text-left hover:bg-gray-50 -m-2 p-2 rounded transition"
                  >
                  <div className="text-left flex-1">
                    <div className="font-semibold text-gray-800">Admission #{adm.id}</div>
                    <div className="text-sm text-gray-600">
                      Type: <span className="font-semibold">{formatLabel(adm.admission_type)}</span> · 
                      Inmate type: <span className="font-semibold">{formatLabel(adm.inmate_type)}</span> · 
                      Date: <span className="font-semibold">{adm.admission_date ? formatDate(adm.admission_date) : '—'}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Case: <span className="font-semibold">{adm.case_number || '—'}</span>
                      {adm.released_at && (
                        <> · Released: <span className="font-semibold">{formatDate(adm.released_at)}</span></>
                      )}
                    </div>
                    {adm.court_name && (
                      <div className="text-sm text-gray-600">
                        Court: <span className="font-semibold">{adm.court_name}</span>
                      </div>
                    )}
                  </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {isNotAdmitted && (
                        <span className="inline-flex items-center text-xs font-semibold px-2 py-1 rounded bg-malawiGreen text-white">
                          Not admitted yet
                        </span>
                      )}
                      <span className="text-sm font-semibold text-malawiRed">{expanded ? 'Hide' : 'Details'}</span>
                    </div>
                  </button>
                  {expanded && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 rounded border border-gray-200 bg-gray-50 p-3">
                      <DetailItem label="Offence" value={adm.offence_description} />
                      <DetailItem label="Next court" value={adm.remand_next_court_date ? formatDate(adm.remand_next_court_date) : '—'} />
                      <DetailItem label="Release date" value={adm.projected_release_date ? formatDate(adm.projected_release_date) : '—'} />
                      <Link to={`/admissions/${adm.id}`} className="inline-flex items-center gap-2 text-malawiRed font-semibold hover:underline">
                        <MdOpenInNew className="h-4 w-4" />
                        Open admission
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-700">No admission history.</p>
        )}
          </div>
        )}
      </div>
    </div>
  );
}
