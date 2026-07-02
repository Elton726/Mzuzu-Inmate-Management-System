import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MdAssignment, MdCalendarToday, MdDescription, MdGavel, MdHomeWork, MdOpenInNew, MdRefresh } from 'react-icons/md';
import apiService, { SERVER_BASE_URL } from '../../../services/apiService';
import { useToast } from '../../../contexts/useToast';
import { formatDate } from '../../../utils/helpers';
import InmateAvatar from '../../../components/common/InmateAvatar';

const titleCase = (value) =>
  String(value || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const statusBadgeClass = (status) => {
  switch (status) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-800 ring-emerald-200';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800 ring-blue-200';
    case 'cancelled':
      return 'bg-red-100 text-red-800 ring-red-200';
    default:
      return 'bg-amber-100 text-amber-800 ring-amber-200';
  }
};

const empty = (value) => value || '-';
const isRemandType = (type) => type === 'remandee' || type === 'murder_remandee';
const isPastDate = (value) => {
  if (!value) return false;
  const date = new Date(`${String(value).split('T')[0]}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return !Number.isNaN(date.getTime()) && date < today;
};

const daysUntil = (dateValue) => {
  if (!dateValue) return null;
  const date = new Date(`${String(dateValue).split('T')[0]}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((date.getTime() - today.getTime()) / 86400000));
};

const isTodayDate = (dateValue) => daysUntil(dateValue) === 0 && !isPastDate(dateValue);

const buildLocalDateTime = (dateValue, timeValue) => {
  if (!dateValue || !timeValue) return null;
  const datePart = String(dateValue).split(/[T ]/)[0];
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = String(timeValue).split(':').map(Number);
  if ([year, month, day, hours, minutes].some((part) => !Number.isFinite(part))) return null;
  const date = new Date(year, month - 1, day, hours, minutes);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatRemainingMinutes = (minutesTotal) => {
  const hours = Math.floor(minutesTotal / 60);
  const minutes = minutesTotal % 60;
  const parts = [];
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
  return `${parts.join(' ')} remaining`;
};

const formatRemandDuration = (admission) => {
  const duration = admission?.remand_duration_days ?? admission?.remandDurationDays;
  const nextCourtDate = admission?.remand_next_court_date || admission?.remandNextCourtDate;
  const nextCourtTime = admission?.remand_next_court_time || admission?.remandNextCourtTime;

  if (Number(duration) > 0) return `${Number(duration)} day${Number(duration) === 1 ? '' : 's'}`;

  if (nextCourtDate && isTodayDate(nextCourtDate) && nextCourtTime) {
    const courtDateTime = buildLocalDateTime(nextCourtDate, nextCourtTime);
    if (courtDateTime) {
      const minutesRemaining = Math.ceil((courtDateTime.getTime() - Date.now()) / 60000);
      return minutesRemaining > 0 ? formatRemainingMinutes(minutesRemaining) : 'Court time has passed';
    }
  }

  if (duration === 0 || duration === '0') return '0 days (same day)';
  return '-';
};

const hasCourtDateTimeReached = (admission) => {
  const courtDate = admission?.remand_next_court_date || admission?.remandNextCourtDate;
  const courtTime = admission?.remand_next_court_time || admission?.remandNextCourtTime;
  const courtDateTime = buildLocalDateTime(courtDate, courtTime);

  if (courtDateTime) return Date.now() >= courtDateTime.getTime();
  return isPastDate(courtDate);
};

const cellLabel = (cell) => {
  if (!cell?.cell_number) return '-';
  return String(cell.cell_number).startsWith(`${cell.block}-`)
    ? cell.cell_number
    : `${cell.block}-${cell.cell_number}`;
};

// eslint-disable-next-line no-unused-vars
function StatTile({ icon: Icon, label, value, helper }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-gray-100 p-2 text-gray-700">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
          <p className="mt-1 text-lg font-bold text-gray-900">{value}</p>
          {helper && <p className="mt-1 text-xs text-gray-500">{helper}</p>}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="border-b border-gray-100 py-3 last:border-b-0">
      <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

export default function AdmissionShowPage() {
  const { admissionId } = useParams();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [admission, setAdmission] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setAdmission(await apiService.getAdmission(admissionId));
    } catch (err) {
      toast.fromError(err);
    } finally {
      setLoading(false);
    }
  }, [admissionId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const inmate = admission?.inmate || {};
  const allocations = useMemo(() => {
    if (!admission) return [];
    return Array.isArray(admission.cell_allocations)
      ? admission.cell_allocations
      : (Array.isArray(admission.cellAllocations) ? admission.cellAllocations : []);
  }, [admission]);
  const participatedSessions = useMemo(() => {
    if (!admission) return [];
    const rows = Array.isArray(admission.session_attendances)
      ? admission.session_attendances
      : (Array.isArray(admission.sessionAttendances) ? admission.sessionAttendances : []);

    return rows.filter((row) => ['present', 'late'].includes(row.attendance_status));
  }, [admission]);
  const documents = Array.isArray(admission?.documents) ? admission.documents : [];
  const currentCell = allocations[0]?.cell;
  const canAdmitAsConvict = isRemandType(admission?.inmate_type) && hasCourtDateTimeReached(admission) && inmate?.id;

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-gray-300 border-b-malawiGreen" />
          <p className="text-sm font-semibold text-gray-600">Loading admission...</p>
        </div>
      </div>
    );
  }

  if (!admission?.id) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Admission not found</h1>
        <Link className="font-semibold text-malawiRed hover:underline" to="/admissions/new">Back to admissions</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="grid gap-6 p-5 lg:grid-cols-[auto_1fr_auto]">
          <InmateAvatar inmate={inmate} size="lg" className="rounded-lg border border-gray-200" />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-950 md:text-3xl">Admission #{admission.id}</h1>
              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ring-1 ${statusBadgeClass(admission.status)}`}>
                {titleCase(admission.status || (admission.is_current ? 'in_progress' : 'completed'))}
              </span>
            </div>
            <p className="mt-2 text-lg font-semibold text-gray-800">
              {inmate.first_name} {inmate.last_name}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-600">
              <span>{empty(inmate.prison_number)}</span>
              <span className="text-gray-300">|</span>
              <span>{titleCase(admission.inmate_type)}</span>
              <span className="text-gray-300">|</span>
              <span>{admission.case_number}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-start gap-2 lg:justify-end">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded bg-malawiGreen px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              onClick={load}
            >
              <MdRefresh className="h-4 w-4" />
              Refresh
            </button>
            {inmate?.id && (
              <Link
                className="inline-flex items-center gap-2 rounded border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
                to={`/inmates/${inmate.id}`}
              >
                <MdOpenInNew className="h-4 w-4" />
                Inmate profile
              </Link>
            )}
            {canAdmitAsConvict && (
              <Link
                className="inline-flex items-center gap-2 rounded bg-malawiGold px-4 py-2 text-sm font-bold text-malawiBlack shadow-sm transition hover:opacity-90"
                to={`/admissions/new?inmateId=${inmate.id}`}
              >
                <MdGavel className="h-4 w-4" />
                Admit as Convict
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={MdCalendarToday} label="Admission Date" value={formatDate(admission.admission_date)} helper={titleCase(admission.admission_type)} />
        <StatTile icon={MdHomeWork} label="Cell" value={cellLabel(currentCell)} helper={currentCell ? titleCase(currentCell.security_classification) : 'Automatic allocation pending'} />
        <StatTile icon={MdGavel} label="Court" value={empty(admission.court_name)} helper="Case jurisdiction" />
        <StatTile icon={MdAssignment} label="Activities" value={participatedSessions.length} helper={admission.inmate_type === 'convict' ? 'Sessions attended' : 'Not required for remand'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-950">Admission Details</h2>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold uppercase text-gray-700">
              {titleCase(admission.inmate_type)}
            </span>
          </div>

          <div className="grid gap-x-8 md:grid-cols-2">
            <DetailRow label="Case number" value={empty(admission.case_number)} />
            <DetailRow label="Admitted by" value={empty(admission.admitted_by?.name || admission.admittedBy?.name)} />
            <DetailRow label="Court" value={empty(admission.court_name)} />
            <DetailRow label="Young offender" value={typeof inmate.is_young_offender === 'boolean' ? (inmate.is_young_offender ? 'Yes' : 'No') : '-'} />
            <div className="md:col-span-2">
              <DetailRow label="Offence" value={empty(admission.offence_description)} />
            </div>
          </div>

          {admission.inmate_type === 'convict' ? (
            <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-4">
              <h3 className="mb-3 text-sm font-bold uppercase text-blue-900">Sentence</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <DetailRow label="Sentence length" value={`${admission.sentence_years ?? 0} year(s), ${admission.sentence_months ?? 0} month(s)`} />
                <DetailRow label="Start date" value={admission.sentence_start_date ? formatDate(admission.sentence_start_date) : '-'} />
                <DetailRow label="Projected release" value={admission.projected_release_date ? formatDate(admission.projected_release_date) : '-'} />
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-lg border border-amber-100 bg-amber-50 p-4">
              <h3 className="mb-3 text-sm font-bold uppercase text-amber-900">Remand</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <DetailRow label="Next court date" value={admission.remand_next_court_date ? formatDate(admission.remand_next_court_date) : '-'} />
                <DetailRow label="Remand duration" value={formatRemandDuration(admission)} />
              </div>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-950">Allocation</h2>
          {allocations.length === 0 ? (
            <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">No cell allocation has been recorded.</p>
          ) : (
            <div className="space-y-3">
              {allocations.map((allocation) => (
                <div key={allocation.id} className="rounded-lg border border-gray-200 p-4">
                  <p className="text-sm font-bold text-gray-950">
                    Block {allocation.cell?.block ?? '-'} | Cell {allocation.cell?.cell_number ?? '-'}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    {titleCase(allocation.cell?.security_classification)} security
                  </p>
                  <p className="mt-2 text-xs font-semibold uppercase text-gray-500">
                    Assigned {allocation.allocated_date ? formatDate(allocation.allocated_date) : '-'}
                  </p>
                </div>
              ))}
            </div>
          )}

          {admission.inmate_type === 'convict' && (
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-bold uppercase text-gray-700">Participated Activities</h3>
              {participatedSessions.length === 0 ? (
                <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">No completed activity participation recorded for this admission.</p>
              ) : (
                <div className="space-y-3">
                  {participatedSessions.map((item) => {
                    const session = item.session || {};
                    const activity = session.activity || {};
                    const description = session.notes || activity.category?.description || `${activity.name || 'Activity'} session`;
                    return (
                      <div key={item.id} className="rounded-lg border border-gray-200 p-4">
                        <p className="font-bold text-gray-950">{activity.name || '-'}</p>
                        <p className="mt-1 text-sm text-gray-600">{description}</p>
                        <div className="mt-3 rounded bg-gray-50 p-3 text-sm text-gray-700">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${statusBadgeClass(session.status)}`}>
                            {titleCase(session.status)}
                          </span>
                          <p className="mt-2">{session.session_date ? formatDate(session.session_date) : '-'} | {session.session_time || '-'}</p>
                          <p className="mt-1 text-xs font-semibold uppercase text-gray-500">Attendance: {titleCase(item.attendance_status)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <MdDescription className="h-5 w-5 text-gray-700" />
          <h2 className="text-lg font-bold text-gray-950">Documents</h2>
        </div>
        {documents.length === 0 ? (
          <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">No documents linked to this admission.</p>
        ) : (
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {documents.map((document) => {
              const filePath = document.file_path || document.filePath || document.path || null;
              const fileUrl = filePath ? `${SERVER_BASE_URL}/storage/${filePath}` : null;
              return (
                <div key={document.id} className="grid gap-3 px-4 py-3 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p className="font-bold text-gray-950">{titleCase(document.document_type)}</p>
                    <p className="text-sm text-gray-600">{empty(document.description)}</p>
                  </div>
                  {fileUrl ? (
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded bg-malawiGold px-3 py-2 text-sm font-bold text-malawiBlack transition hover:opacity-90"
                    >
                      <MdOpenInNew className="h-4 w-4" />
                      View
                    </a>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600">No file link</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
