import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { NotificationBell } from './common/NotificationBell';
import { useNotification } from '../contexts/useNotification';
import { useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContextCreate';
import { getRoleDisplayName, getRoleName, ROLES } from '../utils/helpers';
import { getModuleFromPathname } from '../utils/helpers';
import { useDebouncedValue } from '../utils/useDebouncedValue';
import { searchInmates } from '../modules/admissions/services/inmateService';
import { listCells } from '../modules/admissions/services/cellService';
import {
  MdAdd,
  MdDarkMode,
  MdArrowForward,
  MdLightMode,
  MdOutlineArticle,
  MdSearch,
  MdVisibility,
  MdHome,
  MdDashboard,
  MdPeople,
  MdHistory,
  MdSchedule,
  MdLocalActivity,
  MdCheckCircle,
  MdEditCalendar,
  MdExitToApp,
  MdPerson,
  MdHomeWork,
  MdGavel,
} from 'react-icons/md';

const getPageTitle = (pathname, role) => {
  if (pathname === '/' && role === ROLES.OFFICER_ON_DUTY) return { title: '', icon: null };
  if (pathname === '/') return { title: 'Home', icon: MdHome };
  if (pathname.startsWith('/admissions/new')) return { title: 'New Admission', icon: MdAdd };
  if (pathname.startsWith('/admissions/cells')) return { title: 'Cell Management', icon: MdHomeWork };
  if (pathname.startsWith('/admissions/')) return { title: 'Admission Details', icon: MdOutlineArticle };
  if (pathname.startsWith('/admissions')) return { title: 'Admissions Register', icon: MdOutlineArticle };
  if (pathname.startsWith('/inmates/')) return { title: 'Inmate Profile', icon: MdPerson };
  if (pathname.startsWith('/admin/dashboard')) return { title: 'Admin Dashboard', icon: MdDashboard };
  if (pathname.startsWith('/admin/users')) return { title: 'User Management', icon: MdPeople };
  if (pathname.startsWith('/admin/audit-logs')) return { title: 'Audit Logs', icon: MdHistory };
  if (pathname.startsWith('/admin/cells')) return { title: 'Cell Management', icon: MdHomeWork };
  if (pathname.startsWith('/admin/sentence-adjustment-types')) return { title: 'Sentence Adjustment Types', icon: MdGavel };
  if (pathname.startsWith('/admin/duty-rosters')) return { title: 'Duty Rosters', icon: MdSchedule };
  if (pathname.startsWith('/admin/activities')) return { title: 'Activities', icon: MdLocalActivity };
  if (pathname.startsWith('/releases/approval')) return { title: 'Release Approval', icon: MdCheckCircle };
  if (pathname.startsWith('/releases/sentences')) return { title: 'Sentence Lengths', icon: MdEditCalendar };
  if (pathname.startsWith('/releases/confirmation')) return { title: 'Confirm Release', icon: MdExitToApp };
  if (pathname.startsWith('/releases/confirmed')) return { title: 'Confirmed Releases', icon: MdHistory };
  if (pathname.startsWith('/releases/history')) return { title: 'Release History', icon: MdHistory };
  if (pathname.startsWith('/visitation/visitors')) return { title: 'Visitation', icon: MdPerson };
  if (pathname.startsWith('/visitation/visitors')) return { title: 'Visitation', icon: MdPerson };
  if (pathname.startsWith('/visitation')) return { title: 'Visitation', icon: MdLocalActivity };
  if (pathname.startsWith('/officer')) return { title: 'Officer Dashboard', icon: MdDashboard };
  if (pathname.startsWith('/profile')) return { title: 'Profile', icon: MdPerson };
  return { title: role === ROLES.RECEPTION_OFFICER ? 'Home' : 'MIMS', icon: MdHome };
};

const getTimeOfDayGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const getHeaderCopy = (pathname, user, role) => {
  const roleLabel = getRoleDisplayName(user) || 'Officer';
  const greeting = getTimeOfDayGreeting();

  if (pathname === '/' && role === ROLES.RECEPTION_OFFICER) {
    return {
      title: `${greeting}, ${roleLabel}`,
      subtitle: "Here's what's happening with admissions today.",
    };
  }

  if (pathname === '/' && role === ROLES.OFFICER_ON_DUTY) {
    return {
      title: `${greeting} officer`,
      subtitle: '',
    };
  }

  if (pathname.startsWith('/admissions')) {
    return {
      title: pathname.startsWith('/admissions/new') ? 'Create a new admission' : 'Admissions workspace',
      subtitle: 'Search, review, and continue admission work from the system records.',
    };
  }

  return {
    title: `${greeting}, ${roleLabel}`,
    subtitle: user?.name ? `Signed in as ${user.name}.` : 'Welcome back.',
  };
};

const getCurrentAdmission = (inmate) => inmate?.current_admission || inmate?.currentAdmission || null;

const getFullName = (inmate) =>
  [inmate?.first_name, inmate?.last_name].filter(Boolean).join(' ') || 'Unnamed inmate';

const formatInmateType = (type) => {
  const labels = {
    convict: 'Convict',
    remandee: 'General Remandee',
    murder_remandee: 'Murder Remandee',
  };

  return labels[type] || 'No active admission';
};

const normalizeCells = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const getCellSearchText = (cell) => [
  cell?.cell_number,
  cell?.block,
  cell?.gender,
  cell?.security_classification,
  cell?.status,
  `block ${cell?.block || ''}`,
  `cell ${cell?.cell_number || ''}`,
].filter(Boolean).join(' ').toLowerCase();

const getCellLabel = (cell) => `Block ${cell?.block || '-'} | Cell ${cell?.cell_number || '-'}`;

export const Navigation = () => {
  const { user, isAdmin } = useAuth();
  const { notifications, markAsRead, clearAll } = useNotification();
  const { theme, toggleTheme } = useContext(ThemeContext);
  const location = useLocation();
  const role = getRoleName(user);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const [searchInput, setSearchInput] = useState('');
  const [inmateResults, setInmateResults] = useState([]);
  const [cellResults, setCellResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchPending, setSearchPending] = useState(false);
  const debouncedSearchQuery = useDebouncedValue(searchInput, 250);
  const canSearchSystem = Boolean(user);

  const pageTitle = useMemo(() => getPageTitle(location.pathname, role), [location.pathname, role]);
  const headerCopy = useMemo(
    () => getHeaderCopy(location.pathname, user, role),
    [location.pathname, user, role]
  );
  const isAdmissionsModule = location.pathname.startsWith('/admissions');
  const isCellPage = location.pathname.startsWith('/admissions/cells') || location.pathname.startsWith('/admin/cells');
  const showPageTitle = Boolean(pageTitle.title && pageTitle.icon);
  const isOfficerHome = location.pathname === '/' && role === ROLES.OFFICER_ON_DUTY;

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
  }, [searchOpen]);

  useEffect(() => {
    const query = debouncedSearchQuery.trim();
    if (!canSearchSystem || query.length < 2) return undefined;

    let active = true;

    const inmateSearch = searchInmates({
      q: query,
      per_page: 6,
      page: 1,
      sort_by: 'id',
      sort_order: 'desc',
    });

    const cellSearch = isCellPage
      ? listCells().then((data) =>
          normalizeCells(data)
            .filter((cell) => getCellSearchText(cell).includes(query.toLowerCase()))
            .slice(0, 8)
        )
      : Promise.resolve([]);

    Promise.allSettled([inmateSearch, cellSearch])
      .then(([inmateResponse, cellResponse]) => {
        if (!active) return;

        const nextInmates = inmateResponse.status === 'fulfilled'
          ? (Array.isArray(inmateResponse.value?.data) ? inmateResponse.value.data : [])
          : [];
        const nextCells = cellResponse.status === 'fulfilled' ? cellResponse.value : [];

        setInmateResults(nextInmates);
        setCellResults(nextCells);

        const errors = [];
        if (inmateResponse.status === 'rejected') errors.push(inmateResponse.reason?.message || 'Inmate search failed');
        if (cellResponse.status === 'rejected') errors.push(cellResponse.reason?.message || 'Cell search failed');
        setSearchError(errors.join(' · '));
      })
      .finally(() => {
        if (active) setSearchPending(false);
      });

    return () => {
      active = false;
    };
  }, [canSearchSystem, debouncedSearchQuery, isCellPage]);

  const handleSearch = (event) => {
    event.preventDefault();
    if (searchInput.trim().length >= 2) setSearchOpen(true);
  };

  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchInput(value);
    setSearchError('');

    if (value.trim().length < 2) {
      setInmateResults([]);
      setCellResults([]);
      setSearchOpen(false);
      setSearchPending(false);
    } else {
      setSearchPending(true);
      setSearchOpen(true);
    }
  };

  if (!user) return null;

  return (
    <header className="border-b border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="min-w-0">
                {showPageTitle && (
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
                    <pageTitle.icon className="text-lg" />
                    <span>{pageTitle.title}</span>
                  </div>
                )}
                <h1 className={`mt-2 truncate font-bold text-gray-950 ${isOfficerHome ? 'text-xl' : 'text-2xl'}`}>
                  {headerCopy.title}
                </h1>
                {headerCopy.subtitle && (
                  <p className="mt-1 text-sm text-gray-500">{headerCopy.subtitle}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-3 xl:flex-1">
            <div className="flex flex-wrap items-center justify-end gap-3">
              {isAdmissionsModule && role === ROLES.RECEPTION_OFFICER && (
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    to="/admissions"
                    className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 text-sm font-bold leading-tight text-gray-800 shadow-sm transition hover:bg-gray-50"
                  >
                    <MdOutlineArticle className="shrink-0 text-lg" />
                    <span className="min-w-0">Open Admissions Register</span>
                  </Link>
                </div>
              )}

              {isAdmin && (
                <Link
                  to="/admin/dashboard"
                  className="inline-flex h-10 items-center justify-center rounded-md border border-gray-300 bg-white px-4 text-sm font-bold text-gray-800 shadow-sm transition hover:bg-gray-50"
                >
                  Admin Dashboard
                </Link>
              )}

              <div className="flex items-center justify-end gap-3">
                {canSearchSystem && (
                  <div ref={searchRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setSearchOpen((open) => !open)}
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-sm transition ${
                        searchOpen
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                      aria-label={isCellPage ? 'Search cells and inmates' : 'Search inmates'}
                      title={isCellPage ? 'Search cells and inmates' : 'Search inmates'}
                    >
                      <MdSearch className="h-5 w-5" />
                    </button>

                    {searchOpen && (
                      <div className="absolute right-0 top-12 z-50 w-[min(92vw,440px)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
                        <form onSubmit={handleSearch} className="border-b border-gray-100 p-3">
                          <div className="relative">
                            <MdSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xl text-gray-400" />
                            <input
                              ref={searchInputRef}
                              name="search"
                              type="search"
                              value={searchInput}
                              onChange={handleSearchChange}
                              placeholder={isCellPage ? 'Search cells, blocks, inmates...' : 'Search inmate, inmate number, National ID'}
                              className="h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                            />
                          </div>
                        </form>

                        <div className="border-b border-gray-100 px-4 py-2 text-xs font-bold uppercase text-gray-500">
                          {isCellPage ? 'Page and system results' : 'Inmate results'}
                        </div>
                        {searchInput.trim().length < 2 ? (
                          <div className="px-4 py-4 text-sm text-gray-500">
                            Type at least 2 characters to search system records.
                          </div>
                        ) : searchPending ? (
                          <div className="px-4 py-4 text-sm text-gray-500">Searching system records...</div>
                        ) : searchError && inmateResults.length === 0 && cellResults.length === 0 ? (
                          <div className="px-4 py-4 text-sm text-red-600">{searchError}</div>
                        ) : inmateResults.length === 0 && cellResults.length === 0 ? (
                          <div className="px-4 py-4 text-sm text-gray-500">
                            No matching {isCellPage ? 'cells or inmates' : 'inmates'} found.
                          </div>
                        ) : (
                          <div className="max-h-96 overflow-y-auto">
                            {isCellPage && cellResults.length > 0 && (
                              <div>
                                <div className="bg-gray-50 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-gray-500">
                                  Cells
                                </div>
                                {cellResults.map((cell) => (
                                  <div key={cell.id} className="border-b border-gray-100 px-4 py-3">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                      <div className="min-w-0">
                                        <div className="truncate text-sm font-bold text-gray-950">
                                          {getCellLabel(cell)}
                                        </div>
                                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                                          <span>{cell.gender ? `${cell.gender} cells` : 'Gender unassigned'}</span>
                                          <span>{cell.security_classification || 'No security level'}</span>
                                          <span>{cell.status || 'No status'}</span>
                                          <span>{cell.current_occupancy ?? 0}/{cell.capacity ?? 0} occupied</span>
                                        </div>
                                      </div>
                                      <Link
                                        to={location.pathname.startsWith('/admin') ? '/admin/cells' : '/admissions/cells'}
                                        onClick={() => setSearchOpen(false)}
                                        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-blue-700 px-2.5 text-xs font-bold text-white hover:bg-blue-800"
                                      >
                                        Open Cells
                                        <MdArrowForward />
                                      </Link>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {inmateResults.length > 0 && (
                              <div className="bg-gray-50 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-gray-500">
                                Inmates
                              </div>
                            )}
                            {inmateResults.map((inmate) => {
                              const admission = getCurrentAdmission(inmate);
                              return (
                                <div key={inmate.id} className="border-b border-gray-100 px-4 py-3 last:border-b-0">
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-bold text-gray-950">
                                        {getFullName(inmate)}
                                      </div>
                                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                                        <span>{inmate.prison_number || 'No prison number'}</span>
                                        {inmate.national_id && <span>National ID {inmate.national_id}</span>}
                                        <span>{formatInmateType(admission?.inmate_type)}</span>
                                      </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                      <Link
                                        to={`/inmates/${inmate.id}`}
                                        onClick={() => setSearchOpen(false)}
                                        className="inline-flex h-8 items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                                      >
                                        <MdVisibility />
                                        View
                                      </Link>
                                      {admission?.id ? (
                                        <Link
                                          to={`/admissions/${admission.id}`}
                                          onClick={() => setSearchOpen(false)}
                                          className="inline-flex h-8 items-center gap-1 rounded-md bg-blue-700 px-2.5 text-xs font-bold text-white hover:bg-blue-800"
                                        >
                                          Admission
                                          <MdArrowForward />
                                        </Link>
                                      ) : (
                                        <Link
                                          to={`/admissions/new?inmateId=${inmate.id}`}
                                          onClick={() => setSearchOpen(false)}
                                          className="inline-flex h-8 items-center gap-1 rounded-md bg-blue-700 px-2.5 text-xs font-bold text-white hover:bg-blue-800"
                                        >
                                          Admit
                                          <MdArrowForward />
                                        </Link>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={toggleTheme}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50"
                  aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                  title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {theme === 'dark' ? (
                    <MdDarkMode className="h-5 w-5 text-blue-700" />
                  ) : (
                    <MdLightMode className="h-5 w-5 text-blue-700" />
                  )}
                </button>

                <NotificationBell
                  notifications={notifications.filter(n => n.module === getModuleFromPathname(location.pathname) || n.module === 'global')}
                  onMarkAsRead={markAsRead}
                  onClearAll={clearAll}
                  buttonClassName="!text-gray-700 hover:!bg-gray-100"
                />

                <Link to="/profile" className="flex items-center gap-3 rounded-md px-2 py-1.5 transition hover:bg-gray-50 dark:hover:bg-slate-800">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-600 dark:bg-slate-700 dark:text-slate-200">
                    {(user?.name || user?.email || 'R').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="hidden text-left sm:block">
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Online
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navigation;
