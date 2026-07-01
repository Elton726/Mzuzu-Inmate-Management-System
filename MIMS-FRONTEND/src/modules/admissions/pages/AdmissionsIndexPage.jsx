import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useDebouncedValue } from '../../../utils/useDebouncedValue';
import { searchInmates, listInmates } from '../services/inmateService';
import { formatDate } from '../../../utils/helpers';
import CommonInmateAvatar from '../../../components/common/InmateAvatar';
import {
  MdSearch,
  MdSort,
  MdAdd,
  MdPerson,
  MdBadge,
  MdFingerprint,
  MdCake,
  MdOpenInNew,
  MdPlayArrow,
  MdChevronLeft,
  MdChevronRight,
  MdWarning,
  MdFilterList,
  MdGavel,
  MdSchedule,
} from 'react-icons/md';

/* ─── helpers ───────────────────────────────────────────────────────── */

const getAdmissionsCount = (inmate) => {
  const n = inmate?.admissions_count ?? inmate?.admissionsCount;
  return typeof n === 'number' ? n : null;
};

const getCurrentAdmission = (inmate) =>
  inmate?.current_admission || inmate?.currentAdmission || null;

const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;
  const datePart = String(dateStr).split(/[T ]/)[0];
  const parts = datePart.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(dateStr);
};

const calculateDaysTillCourtDate = (dateStr) => {
  if (!dateStr) return null;
  const courtDate = parseLocalDate(dateStr);
  if (!courtDate) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  courtDate.setHours(0, 0, 0, 0);
  
  const timeDiff = courtDate - today;
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  
  return daysDiff;
};

/* ─── sub-components ────────────────────────────────────────────────── */

const SkeletonRow = () => (
  <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 last:border-0 animate-pulse">
    <div className="w-10 h-10 rounded-xl bg-gray-200 shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3.5 bg-gray-200 rounded w-48" />
      <div className="h-3 bg-gray-100 rounded w-72" />
    </div>
    <div className="flex gap-2">
      <div className="h-7 w-20 bg-gray-100 rounded-lg" />
      <div className="h-7 w-24 bg-gray-100 rounded-lg" />
    </div>
  </div>
);

const StatusBadge = ({ admitted }) =>
  admitted ? (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-malawiGreen border border-green-200">
      <span className="w-1.5 h-1.5 rounded-full bg-malawiGreen inline-block" />
      Admitted
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" />
      Not admitted
    </span>
  );

/* ─── main component ────────────────────────────────────────────────── */

const InmateTypeBadge = ({ type }) => {
  const labels = {
    convict: 'Convict',
    remandee: 'General remandee',
    murder_remandee: 'Murder remandee',
  };

  if (!type || !labels[type]) return null;

  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
      {labels[type]}
    </span>
  );
};

const CourtDateMetaItem = ({ daysTillCourt }) => {
  let textColor = 'text-gray-500';
  let statusText = '';

  if (daysTillCourt < 0) {
    textColor = 'text-red-600';
    statusText = `${Math.abs(daysTillCourt)} day${Math.abs(daysTillCourt) !== 1 ? 's' : ''} overdue`;
  } else if (daysTillCourt === 0) {
    textColor = 'text-red-600';
    statusText = 'Court date today';
  } else if (daysTillCourt <= 7) {
    textColor = 'text-orange-600';
    statusText = `${daysTillCourt} day${daysTillCourt !== 1 ? 's' : ''} till court`;
  } else if (daysTillCourt <= 30) {
    textColor = 'text-amber-600';
    statusText = `${daysTillCourt} day${daysTillCourt !== 1 ? 's' : ''} till court`;
  } else {
    textColor = 'text-gray-500';
    statusText = `${daysTillCourt} day${daysTillCourt !== 1 ? 's' : ''} till court`;
  }

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${textColor}`}>
      <MdSchedule className="text-xs" />
      {statusText}
    </span>
  );
};

const InmateRow = ({ inmate }) => {
  const admission = getCurrentAdmission(inmate);
  const isAdmitted = !!admission?.id;
  const count = getAdmissionsCount(inmate) ?? 0;
  const inmateType = admission?.inmate_type || admission?.inmateType;
  const isRemandee = inmateType === 'remandee' || inmateType === 'murder_remandee';
  
  // Calculate days till next court date for remandees
  const nextCourtDate = admission?.remand_next_court_date || admission?.remandNextCourtDate;
  const daysTillCourt = isRemandee && isAdmitted ? calculateDaysTillCourtDate(nextCourtDate) : null;

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 transition-colors duration-150
        ${inmate.neverAdmitted ? 'bg-yellow-50/60' : 'hover:bg-gray-50/70'}`}
    >
      <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
        <CommonInmateAvatar inmate={inmate} size="md" className="rounded-xl shadow-sm border border-gray-200 shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-gray-900 text-sm">
              {inmate.first_name} {inmate.last_name}
            </span>
            <StatusBadge admitted={isAdmitted} />
            <InmateTypeBadge type={admission?.inmate_type} />
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
            {inmate.prison_number && (
              <MetaItem icon={<MdBadge />} text={inmate.prison_number} />
            )}
            {inmate.national_id && (
              <MetaItem icon={<MdFingerprint />} text={inmate.national_id} />
            )}
            {inmate.date_of_birth && (
              <MetaItem icon={<MdCake />} text={formatDate(inmate.date_of_birth)} />
            )}
            <MetaItem
              icon={<MdBadge />}
              text={`${count} admission${count !== 1 ? 's' : ''}`}
            />
            
            {/* Days till court date for remandees */}
            {isRemandee && (
              daysTillCourt !== null ? (
                <CourtDateMetaItem daysTillCourt={daysTillCourt} />
              ) : (
                <MetaItem icon={<MdSchedule />} text="Days till next court date: -" />
              )
            )}
          </div>

          {admission?.id && (
            <p className="text-xs text-gray-400 mt-1">
              Current admission: <span className="font-semibold text-gray-600">#{admission.id}</span>
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 pl-14 sm:pl-0">
        <Link
          to={`/inmates/${inmate.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg
            border border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition"
        >
          <MdOpenInNew className="text-base" />
          View
        </Link>
        {!isAdmitted ? (
          <Link
            to={`/admissions/new?inmateId=${inmate.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg
              bg-malawiGreen text-white hover:bg-green-800 transition shadow-sm"
          >
            <MdPlayArrow className="text-base" />
            Admit
          </Link>
        ) : (
          admission?.inmate_type === 'remandee' ||
          admission?.inmate_type === 'murder_remandee' ||
          admission?.inmateType === 'remandee' ||
          admission?.inmateType === 'murder_remandee'
        ) ? (
          (() => {
            const nextCourtDate = admission.remand_next_court_date || admission.remandNextCourtDate;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Parse court date as local date to prevent timezone shift
            const courtDate = parseLocalDate(nextCourtDate);
            if (courtDate) {
              courtDate.setHours(0, 0, 0, 0);
            }
            const courtReached = courtDate ? today >= courtDate : false;

            return courtReached ? (
              <Link
                to={`/admissions/new?inmateId=${inmate.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg
                  bg-malawiGold text-gray-900 hover:bg-yellow-400 transition shadow-sm"
              >
                <MdPlayArrow className="text-base" />
                Admit Convict
              </Link>
            ) : (
              <button
                disabled
                title={nextCourtDate ? `Next court date (${formatDate(nextCourtDate)}) has not been reached yet` : 'No court date specified'}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg
                  bg-yellow-50 border border-yellow-200 text-gray-400 cursor-not-allowed opacity-60"
              >
                <MdPlayArrow className="text-base" />
                Admit Convict
              </button>
            );
          })()
        ) : null}
      </div>
    </div>
  );
};

export default function AdmissionsIndexPage() {
  const [searchParams] = useSearchParams();
  const urlSearchQuery = searchParams.get('search') || searchParams.get('q') || '';
  const [loading, setLoading] = useState(false);
  const [inmates, setInmates] = useState([]);
  const [searchInput, setSearchInput] = useState(urlSearchQuery);
  const debouncedSearchQuery = useDebouncedValue(searchInput, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState('desc');
  const [perPage, setPerPage] = useState(25);
  const [activeCategory, setActiveCategory] = useState('convicts');

  const loadInmates = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        per_page: perPage,
        page: currentPage,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      let data;
      if (debouncedSearchQuery.trim().length >= 2) {
        data = await searchInmates({ q: debouncedSearchQuery, ...params });
      } else {
        data = await listInmates(params);
      }

      const list = data.data || [];
      setInmates(Array.isArray(list) ? list : []);
      setTotalPages(data.last_page || 1);
      setCurrentPage(data.current_page || 1);
    } catch (err) {
      toast.error(err?.message || 'Failed to load inmates');
    } finally {
      setLoading(false);
    }
  }, [currentPage, sortBy, sortOrder, perPage, debouncedSearchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, sortBy, sortOrder, perPage]);

  useEffect(() => {
    setSearchInput(urlSearchQuery);
    setCurrentPage(1);
  }, [urlSearchQuery]);

  useEffect(() => {
    loadInmates();
  }, [loadInmates]);

  const filteredInmates = useMemo(
    () =>
      inmates.map((inmate) => ({
        ...inmate,
        neverAdmitted:
          getAdmissionsCount(inmate) === 0 && !getCurrentAdmission(inmate)?.id,
      })),
    [inmates]
  );

  const unadmittedCount = useMemo(
    () => filteredInmates.filter((i) => i.neverAdmitted).length,
    [filteredInmates]
  );

  const inmateGroups = useMemo(
    () => [
      {
        key: 'convicts',
        title: 'Convicts',
        description: 'Sentenced inmates currently admitted.',
        icon: MdGavel,
        tone: 'text-malawiGreen',
        inmates: filteredInmates.filter((inmate) => {
          const adm = getCurrentAdmission(inmate);
          const type = adm?.inmate_type || adm?.inmateType;
          return type === 'convict';
        }),
      },
      {
        key: 'general_remandees',
        title: 'General Remandees',
        description: 'Remand inmates awaiting court outcomes.',
        icon: MdSchedule,
        tone: 'text-amber-600',
        inmates: filteredInmates.filter((inmate) => {
          const adm = getCurrentAdmission(inmate);
          const type = adm?.inmate_type || adm?.inmateType;
          return type === 'remandee';
        }),
      },
      {
        key: 'murder_remandees',
        title: 'Murder Remandees',
        description: 'Remand inmates registered under murder cases.',
        icon: MdPerson,
        tone: 'text-malawiRed',
        inmates: filteredInmates.filter((inmate) => {
          const adm = getCurrentAdmission(inmate);
          const type = adm?.inmate_type || adm?.inmateType;
          return type === 'murder_remandee';
        }),
      },
      {
        key: 'not_admitted_yet',
        title: 'Not admitted yet',
        description: 'Inmates registered but not yet admitted.',
        icon: MdWarning,
        tone: 'text-yellow-700',
        inmates: filteredInmates.filter((inmate) => inmate.neverAdmitted),
      },
    ],
    [filteredInmates]
  );

  const activeGroup = useMemo(
    () => inmateGroups.find((group) => group.key === activeCategory) || inmateGroups[0],
    [activeCategory, inmateGroups]
  );
  const ActiveCategoryIcon = activeGroup.icon;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-6">

      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MdPerson className="text-malawiGreen text-3xl" />
            Inmate Register
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage admissions and view inmate records
          </p>
        </div>

        <Link
          to="/admissions/new"
          className="inline-flex items-center gap-2 bg-malawiGreen hover:bg-green-800 text-white
            font-semibold text-sm px-4 py-2.5 rounded-xl shadow transition-all duration-200 shrink-0"
        >
          <MdAdd className="text-lg" />
          New Admission
        </Link>
      </div>

      {/* ── Alert: unadmitted inmates ─────────────────────────────── */}
      {unadmittedCount > 0 && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-3.5 shadow-sm">
          <MdWarning className="text-yellow-500 text-xl shrink-0" />
          <p className="text-sm font-semibold text-yellow-800">
            {unadmittedCount} inmate{unadmittedCount !== 1 ? 's' : ''} registered but not yet admitted
          </p>
        </div>
      )}

      {/* ── Toolbar ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
        {/* Search */}
        <div className="relative">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by prison number, name, or national ID…"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm
              focus:outline-none focus:ring-2 focus:ring-malawiGreen focus:border-malawiGreen
              placeholder-gray-400 transition"
          />
        </div>

        {/* Filters row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SelectField
            label="Sort by"
            icon={<MdSort />}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="id">ID (newest first)</option>
            <option value="prison_number">Prison number</option>
            <option value="first_name">First name</option>
            <option value="last_name">Last name</option>
            <option value="date_of_birth">Date of birth</option>
          </SelectField>

          <SelectField
            label="Order"
            icon={<MdFilterList />}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </SelectField>

          <SelectField
            label="Per page"
            icon={<MdFilterList />}
            value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value))}
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </SelectField>
        </div>
      </div>

      {/* ── Results Table ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Table header */}
        <div className="hidden sm:grid grid-cols-[1fr_auto] px-5 py-3 bg-gray-50 border-b border-gray-100">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Inmate
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Actions
          </span>
        </div>

        {/* Body */}
        {loading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : filteredInmates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <MdPerson className="text-5xl opacity-30" />
            <p className="text-sm font-medium">No inmates found</p>
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="text-xs text-malawiGreen underline underline-offset-2"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto border-b border-gray-200 bg-white">
              <div className="flex min-w-max gap-1 px-4 py-3" role="tablist" aria-label="Inmate register categories">
                {inmateGroups.map((group) => {
                  const Icon = group.icon;
                  const selected = group.key === activeGroup.key;

                  return (
                    <button
                      key={group.key}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setActiveCategory(group.key)}
                      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition
                        ${selected
                          ? 'bg-malawiGreen text-white shadow-sm'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                    >
                      <Icon className={`text-lg ${selected ? 'text-white' : group.tone}`} />
                      <span>{group.title}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs
                          ${selected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}
                      >
                        {group.inmates.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <section>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-4 bg-gray-50 border-b border-gray-100">
                <div className="flex items-start gap-3">
                  <ActiveCategoryIcon className={`${activeGroup.tone} text-2xl mt-0.5 shrink-0`} />
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">{activeGroup.title}</h2>
                    <p className="text-xs text-gray-500">{activeGroup.description}</p>
                  </div>
                </div>
                <span className="inline-flex self-start sm:self-center items-center rounded-full bg-white border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700">
                  {activeGroup.inmates.length} record{activeGroup.inmates.length === 1 ? '' : 's'}
                </span>
              </div>

              {activeGroup.inmates.length === 0 ? (
                <div className="px-5 py-16 text-center text-sm text-gray-400">
                  No {activeGroup.title.toLowerCase()} found.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {activeGroup.inmates.map((inmate) => (
                    <InmateRow key={inmate.id} inmate={inmate} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* ── Pagination ────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 bg-white rounded-2xl shadow-sm border border-gray-200 px-5 py-3">
          <span className="text-sm text-gray-500">
            Page <span className="font-semibold text-gray-800">{currentPage}</span> of{' '}
            <span className="font-semibold text-gray-800">{totalPages}</span>
          </span>

          <div className="flex gap-2">
            <PaginationBtn
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              icon={<MdChevronLeft className="text-xl" />}
              label="Previous"
            />
            <PaginationBtn
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || loading}
              icon={<MdChevronRight className="text-xl" />}
              label="Next"
              iconRight
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── micro-components ──────────────────────────────────────────────── */

const MetaItem = ({ icon, text }) => (
  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
    <span className="text-gray-400">{icon}</span>
    {text}
  </span>
);

const SelectField = ({ label, icon, value, onChange, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
    <div className="relative flex items-center">
      <span className="absolute left-2.5 text-gray-400 text-base pointer-events-none">{icon}</span>
      <select
        value={value}
        onChange={onChange}
        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white
          focus:outline-none focus:ring-2 focus:ring-malawiGreen focus:border-malawiGreen transition"
      >
        {children}
      </select>
    </div>
  </div>
);

const PaginationBtn = ({ onClick, disabled, icon, label, iconRight }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300
      text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40
      disabled:cursor-not-allowed transition"
  >
    {!iconRight && icon}
    {label}
    {iconRight && icon}
  </button>
);
