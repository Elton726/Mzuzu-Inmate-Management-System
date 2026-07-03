import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MdHome } from 'react-icons/md';
import { getAdmission } from '../modules/admissions/services/admissionService';
import { getInmate } from '../modules/admissions/services/inmateService';
import { getActivity as getAdminActivity } from '../modules/activityAllocation/admin/services/activityService';
import { getSession } from '../modules/activityAllocation/officer/services/officerSessionService';

const dynamicLabelCache = new Map();

const hiddenSegments = new Set(['officer']);

const routeLabelMap = {
  '/': 'Dashboard',
  '/profile': 'Profile',
  '/admissions': 'Admissions Register',
  '/admissions/new': 'Create Admission',
  '/admissions/cells': 'Cell Management',
  '/admissions/reports': 'Admissions Reports',
  '/inmates': 'Inmates',
  '/releases': 'Releases',
  '/releases/approval': 'Release Approval',
  '/releases/confirmation': 'Release Confirmation',
  '/releases/sentences': 'Sentence Lengths',
  '/releases/date-lookup': 'Release Date Lookup',
  '/releases/history': 'Release History',
  '/releases/confirmed': 'Confirmed Releases',
  '/adjustments': 'Sentence Adjustments',
  '/admin': 'Admin',
  '/admin/dashboard': 'Admin Dashboard',
  '/admin/users': 'User Management',
  '/admin/audit-logs': 'Audit Logs',
  '/admin/cells': 'Cell Management',
  '/admin/duty-rosters': 'Duty Rosters',
  '/admin/activities': 'Activities',
  '/admin/activities/new': 'Create Activity',
  '/admin/sentence-adjustment-types': 'Sentence Adjustment Types',
  '/visitation': 'Visitation',
  '/visitation/charity-pending': 'Charity Approvals',
  '/visitation/statistics': 'Visitation Statistics',
  '/visitation/history': 'Visitation History',
  '/visitation/rules': 'Visitation Rules',
  '/visitation/flag-reviews': 'Flag Reviews',
  '/visitation/alerts': 'Visitation Alerts',
  '/officer': 'Officer',
  '/officer/activities': 'Available Activities',
  '/officer/activities/new': 'Create Activity',
  '/officer/activity-sessions': 'Activity Sessions',
  '/officer/activity-sessions/new': 'Create Session',
  '/officer/activity-reports': 'Activity Reports',
  '/officer/internal-activities': 'Internal Activities',
};

const segmentLabelMap = {
  admissions: 'Admissions Register',
  inmates: 'Inmate Profile',
  releases: 'Releases',
  adjustments: 'Sentence Adjustments',
  admin: 'Admin',
  visitation: 'Visitation',
  activities: 'Activities',
  allocations: 'Allocations',
  'auto-assign': 'Auto Assignment',
  'internal-activities': 'Internal Activities',
  'activity-sessions': 'Activity Sessions',
  'activity-reports': 'Activity Reports',
  dashboard: 'Dashboard',
  users: 'User Management',
  'audit-logs': 'Audit Logs',
  cells: 'Cell Management',
  'duty-rosters': 'Duty Rosters',
  'sentence-adjustment-types': 'Sentence Adjustment Types',
  approval: 'Release Approval',
  confirmation: 'Release Confirmation',
  sentences: 'Sentence Lengths',
  'date-lookup': 'Release Date Lookup',
  history: 'History',
  confirmed: 'Confirmed Releases',
  'charity-pending': 'Charity Approvals',
  statistics: 'Statistics',
  rules: 'Rules',
  'flag-reviews': 'Flag Reviews',
  alerts: 'Alerts',
  profile: 'Profile',
};

const titleCaseFromPathSegment = (segment) =>
  segment
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const fullName = (record) =>
  [record?.first_name, record?.other_names, record?.last_name].filter(Boolean).join(' ');

const unwrapData = (response) => response?.data?.data || response?.data || response;

const sessionLabel = (session, id) => {
  const data = unwrapData(session);
  return (
    data?.name ||
    data?.session_name ||
    data?.title ||
    data?.activity?.name ||
    (data?.session_time ? `${data.session_time} Session` : '') ||
    `Session ${id}`
  );
};

const activityLabel = (activity, id) => {
  const data = unwrapData(activity);
  return data?.name || data?.title || `Activity ${id}`;
};

const admissionLabel = (admission, id) => {
  const data = unwrapData(admission);
  const inmateName = fullName(data?.inmate);
  return inmateName ? `${inmateName} Admission` : `Admission ${id}`;
};

const inmateLabel = (inmate, id) => {
  const data = unwrapData(inmate);
  return fullName(data) || data?.name || `Inmate ${id}`;
};

const getFallbackDynamicLabel = (segment, index, segments) => {
  const previous = segments[index - 1];

  if (previous === 'activity-sessions') return `Session ${segment}`;
  if (previous === 'activities' || previous === 'internal-activities') return `Activity ${segment}`;
  if (previous === 'admissions') return `Admission ${segment}`;
  if (previous === 'inmates') return `Inmate ${segment}`;
  if (previous === 'adjustments') return `Admission ${segment}`;
  return `Record ${segment}`;
};

const getPathLabel = (path, segment, index, segments) => {
  if (routeLabelMap[path]) return routeLabelMap[path];

  if (segment === 'edit') {
    const previous = segments[index - 2];
    if (previous === 'activity-sessions') return 'Session Editor';
    if (previous === 'activities') return 'Activity Editor';
    return 'Editor';
  }

  if (/^\d+$/.test(segment)) return getFallbackDynamicLabel(segment, index, segments);

  return segmentLabelMap[segment] || titleCaseFromPathSegment(segment);
};

const getCrumbTarget = (segments, index) => {
  const segment = segments[index];
  const previous = segments[index - 1];
  const currentPath = `/${segments.slice(0, index + 1).join('/')}`;
  const parentPath = `/${segments.slice(0, index).join('/')}`;

  if (segment === 'internal-activities') return '/officer/activities';

  if (/^\d+$/.test(segment) && (previous === 'activities' || previous === 'internal-activities')) {
    return previous === 'internal-activities' ? '/officer/activities' : parentPath;
  }

  if (segment === 'edit') return parentPath;

  return currentPath;
};

const buildBreadcrumbs = (pathname, dynamicLabels = {}) => {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';
  if (cleanPath === '/') return [];

  const segments = cleanPath.split('/').filter(Boolean);

  return segments
    .map((segment, index) => {
      const path = `/${segments.slice(0, index + 1).join('/')}`;
      const to = getCrumbTarget(segments, index);

      return {
        path,
        segment,
        label: dynamicLabels[path] || getPathLabel(path, segment, index, segments),
        to,
      };
    })
    .filter((crumb) => !hiddenSegments.has(crumb.segment));
};

const getDynamicResolvers = (pathname) => {
  const segments = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  const resolvers = [];

  segments.forEach((segment, index) => {
    if (!/^\d+$/.test(segment)) return;

    const previous = segments[index - 1];
    const basePath = `/${segments.slice(0, index + 1).join('/')}`;

    if (previous === 'activity-sessions') {
      resolvers.push({
        path: basePath,
        fallback: `Session ${segment}`,
        resolve: () => getSession(segment).then((response) => sessionLabel(response, segment)),
      });
    }

    if (previous === 'activities' && segments[index - 2] === 'admin') {
      resolvers.push({
        path: basePath,
        fallback: `Activity ${segment}`,
        resolve: () => getAdminActivity(segment).then((response) => activityLabel(response, segment)),
      });
    }

    if (previous === 'admissions') {
      resolvers.push({
        path: basePath,
        fallback: `Admission ${segment}`,
        resolve: () => getAdmission(segment).then((response) => admissionLabel(response, segment)),
      });
    }

    if (previous === 'inmates') {
      resolvers.push({
        path: basePath,
        fallback: `Inmate ${segment}`,
        resolve: () => getInmate(segment).then((response) => inmateLabel(response, segment)),
      });
    }

    if (previous === 'adjustments') {
      resolvers.push({
        path: basePath,
        fallback: `Admission ${segment}`,
        resolve: () => getAdmission(segment).then((response) => admissionLabel(response, segment)),
      });
    }
  });

  return resolvers;
};

export const Breadcrumb = () => {
  const location = useLocation();
  const [resolvedLabels, setResolvedLabels] = useState({ pathname: '', labels: {} });

  const pathname = location.pathname;
  const cachedLabels = useMemo(() => {
    const labels = {};
    getDynamicResolvers(pathname).forEach((resolver) => {
      if (dynamicLabelCache.has(resolver.path)) {
        labels[resolver.path] = dynamicLabelCache.get(resolver.path);
      }
    });
    return labels;
  }, [pathname]);
  const dynamicLabels = useMemo(
    () => ({
      ...cachedLabels,
      ...(resolvedLabels.pathname === pathname ? resolvedLabels.labels : {}),
    }),
    [cachedLabels, pathname, resolvedLabels]
  );
  const breadcrumbs = useMemo(
    () => buildBreadcrumbs(pathname, dynamicLabels),
    [pathname, dynamicLabels]
  );

  useEffect(() => {
    let active = true;
    const resolvers = getDynamicResolvers(pathname);
    const pendingResolvers = resolvers.filter((resolver) => !dynamicLabelCache.has(resolver.path));

    if (pendingResolvers.length === 0) return undefined;

    Promise.all(
      pendingResolvers.map((resolver) =>
        resolver
          .resolve()
          .then((label) => ({ path: resolver.path, label: label || resolver.fallback }))
          .catch(() => ({ path: resolver.path, label: resolver.fallback }))
      )
    ).then((labels) => {
      if (!active) return;

      labels.forEach(({ path, label }) => dynamicLabelCache.set(path, label));

      setResolvedLabels({
        pathname,
        labels: Object.fromEntries(labels.map(({ path, label }) => [path, label])),
      });
    });

    return () => {
      active = false;
    };
  }, [pathname]);

  return (
    <nav aria-label="Breadcrumb" className="min-w-0 text-left text-sm font-semibold">
      <ol className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <li className="flex items-center">
          <Link
            to="/"
            className="inline-flex items-center text-slate-500 transition hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300"
            aria-label="Dashboard"
            title="Dashboard"
          >
            <MdHome className="text-lg" aria-hidden="true" />
          </Link>
        </li>

        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <li key={crumb.path} className="flex min-w-0 items-center gap-2">
              <span className="text-slate-400 dark:text-slate-500">/</span>
              {isLast ? (
                <span
                  className="max-w-[65vw] truncate text-emerald-700 dark:text-emerald-300 sm:max-w-xs lg:max-w-md"
                  aria-current="page"
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.to}
                  className="max-w-[55vw] truncate text-slate-500 transition hover:text-emerald-800 hover:underline dark:text-slate-300 dark:hover:text-emerald-300 sm:max-w-xs"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
