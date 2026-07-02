import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import ConfirmationModal from './common/ConfirmationModal';
import {
  MdHome,
  MdPerson,
  MdAdd,
  MdDashboard,
  MdPeople,
  MdAssignment,
  MdHomeWork,
  MdHistory,
  MdSchedule,
  MdLocalActivity,
  MdCheckCircle,
  MdExitToApp,
  MdEditCalendar,
  MdChevronLeft,
  MdChevronRight,
  MdLogout,
  MdBarChart,
  MdGavel,
  MdSettings
} from 'react-icons/md';
import { ROLES, getRoleDisplayName, getRoleName } from '../utils/helpers';
import logo from '/cuffs.png';

const roleTone = {
  admin: 'bg-red-950/40 text-red-400 border-red-900/50',
  reception_officer: 'bg-green-950/40 text-green-400 border-green-900/50',
  station_officer: 'bg-blue-950/40 text-blue-400 border-blue-900/50',
  officer_on_duty: 'bg-amber-950/40 text-amber-400 border-amber-900/50',
  gatekeeper: 'bg-purple-950/40 text-purple-400 border-purple-900/50',
};

const avatarTone = {
  admin: 'bg-malawiRed text-white',
  reception_officer: 'bg-malawiGreen text-white',
  station_officer: 'bg-blue-600 text-white',
  officer_on_duty: 'bg-malawiGold text-malawiBlack',
  gatekeeper: 'bg-purple-700 text-white',
};

const getInitials = (user) => {
  const source = user?.name || user?.email || 'User';
  const parts = source
    .replace(/@.*/, '')
    .split(/\s+|[._-]+/)
    .filter(Boolean);

  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

export default function Sidebar({ isCollapsed = false, setIsCollapsed }) {
  const { user, isAdmin, logout, loading } = useAuth();
  const navigate = useNavigate();
  const role = getRoleName(user);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    setShowLogoutModal(false);
    await logout();
    navigate('/login');
  };

  // Show loading skeleton while auth is initializing
  if (loading) {
    return (
      <aside className={`box-border h-screen border-r-0 bg-white text-gray-700 dark:border-r-[3px] dark:border-slate-700 dark:bg-slate-900 dark:text-gray-300 fixed top-0 left-0 z-50 flex flex-col transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="flex h-16 items-center justify-center px-4">
          <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200 dark:bg-slate-800"></div>
        </div>
        <div className="flex-1 mt-8 px-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100 dark:bg-slate-800"></div>
          ))}
        </div>
      </aside>
    );
  }

  const sections = [
    {
      id: 'core',
      title: 'General',
      items: [
        {
          to: '/',
          end: true,
          icon: MdHome,
          title: 'Home',
          show: !isAdmin
        }
      ]
    },
    {
      id: 'admissions',
      title: 'Admission',
      items: [
        {
          to: '/admissions',
          end: true,
          icon: MdAssignment,
          title: 'Admissions Register',
          show: role === ROLES.RECEPTION_OFFICER
        },
        {
          to: '/admissions/new',
          icon: MdAdd,
          title: 'New Admission',
          show: role === ROLES.RECEPTION_OFFICER
        },
        {
          to: '/admissions/cells',
          icon: MdHomeWork,
          title: 'Cell Management',
          show: role === ROLES.RECEPTION_OFFICER
        },
        {
          to: '/admissions/reports',
          icon: MdBarChart,
          title: 'Reports',
          show: role === ROLES.RECEPTION_OFFICER
        }
      ]
    },
    {
      id: 'activities',
      title: 'Activities',
      items: [
        {
          to: '/officer/activities',
          icon: MdLocalActivity,
          title: 'Available Activities',
          show: role === ROLES.OFFICER_ON_DUTY
        },
        {
          to: '/officer/activity-sessions',
          icon: MdLocalActivity,
          title: 'Activity Sessions',
          show: role === ROLES.OFFICER_ON_DUTY
        },
        {
          to: '/officer/activity-reports',
          icon: MdLocalActivity,
          title: 'Activity Reports',
          show: role === ROLES.OFFICER_ON_DUTY
        }
      ]
    },
    {
      id: 'releases',
      title: 'Releases',
      items: [
        {
          to: '/releases/approval',
          icon: MdCheckCircle,
          title: 'Release Approval',
          show: role === ROLES.STATION_OFFICER
        },
        {
          to: '/releases/sentences',
          icon: MdEditCalendar,
          title: 'Sentence Lengths',
          show: role === ROLES.STATION_OFFICER
        },
        {
          to: '/releases/date-lookup',
          icon: MdSchedule,
          title: 'Release Dates',
          show: role === ROLES.STATION_OFFICER
        },
        {
          to: '/releases/confirmation',
          icon: MdExitToApp,
          title: 'Confirm Release',
          show: role === ROLES.GATEKEEPER
        },
        {
          to: '/releases/confirmed',
          icon: MdHistory,
          title: 'Confirmed Releases',
          show: role === ROLES.STATION_OFFICER
        },
        {
          to: '/releases/history',
          icon: MdHistory,
          title: 'Release History',
          show: role === ROLES.STATION_OFFICER || role === ROLES.GATEKEEPER
        }
      ]
    },
        {
          id: 'visitation',
          title: 'Visitation',
          items: [
            {
              to: '/visitation',
              end: true,
              icon: MdPerson,
              title: 'Visitation',
              show: role === ROLES.GATEKEEPER
            },
            {
              to: '/visitation/charity-pending',
              icon: MdAssignment,
              title: 'Charity Approvals',
              show: role === ROLES.GATEKEEPER || role === ROLES.STATION_OFFICER
            },
            {
              to: '/visitation/statistics',
              icon: MdBarChart,
              title: 'Visit Statistics',
              show: role === ROLES.GATEKEEPER || role === ROLES.STATION_OFFICER
            },
            {
              to: '/visitation/history',
              icon: MdHistory,
              title: 'Visit History',
              show: role === ROLES.GATEKEEPER || role === ROLES.STATION_OFFICER
            },
            {
              to: '/visitation/alerts',
              icon: MdAssignment,
              title: 'Visit Alerts',
              show: role === ROLES.GATEKEEPER || role === ROLES.STATION_OFFICER
            },
            {
              to: '/visitation/rules',
              icon: MdSettings,
              title: 'Visit Rules',
              show: role === ROLES.STATION_OFFICER
            },
            {
              to: '/visitation/flag-reviews',
              icon: MdGavel,
              title: 'Flag Reviews',
              show: role === ROLES.STATION_OFFICER
            }
          ]
        },
    {
      id: 'system',
      title: 'Administration',
      items: [
        {
          to: '/admin/dashboard',
          icon: MdDashboard,
          title: 'Admin Dashboard',
          show: isAdmin
        },
        {
          to: '/admin/users',
          icon: MdPeople,
          title: 'User Management',
          show: isAdmin
        },
        {
          to: '/admin/audit-logs',
          icon: MdHistory,
          title: 'Audit Logs',
          show: isAdmin
        },
        {
          to: '/admin/cells',
          icon: MdHomeWork,
          title: 'Cell Management',
          show: isAdmin
        },
        {
          to: '/admin/sentence-adjustment-types',
          icon: MdGavel,
          title: 'Adjustment Types',
          show: isAdmin
        },
        {
          to: '/admin/duty-rosters',
          icon: MdSchedule,
          title: 'Duty Rosters',
          show: isAdmin
        },
        {
          to: '/admin/activities',
          icon: MdLocalActivity,
          title: 'Activities',
          show: isAdmin
        }
      ]
    }
  ];

  const filteredSections = sections
    .map(section => ({
      ...section,
      items: section.items.filter(item => item.show)
    }))
    .filter(section => section.items.length > 0);

  return (
    <>
    <aside className={`box-border h-screen border-r-0 bg-white text-gray-700 dark:border-r-[3px] dark:border-slate-700 dark:bg-slate-900 dark:text-gray-300 fixed top-0 left-0 z-50 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
      {/* Header with cuffs logo */}
      <div className="flex h-16 flex-shrink-0 items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={logo}
            alt="Cuffs logo"
            className="h-10 w-10 rounded-full border border-malawiRed flex-shrink-0"
          />
          {!isCollapsed && (
            <div className="flex min-w-0 flex-col justify-center leading-tight">
              <span className="truncate text-base font-bold text-gray-950 dark:text-white">
                Mzuzu Inmate
              </span>
              <span className="truncate text-sm font-normal text-gray-600 dark:text-gray-300">
                Management System
              </span>
            </div>
          )}
        </div>

        {/* Toggle Collapse Button */}
        <button
          type="button"
          onClick={() => setIsCollapsed?.(!isCollapsed)}
          className="hidden md:flex items-center justify-center p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200 dark:text-zinc-400 dark:hover:bg-slate-800 dark:hover:text-white"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <MdChevronRight className="text-xl" /> : <MdChevronLeft className="text-xl" />}
        </button>
      </div>

      {/* Main navigation menu */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-6 scrollbar-thin">
        {filteredSections.map(section => (
          <div key={section.id} className="space-y-1.5">
            {!isCollapsed && (
              <h3 className="px-3 text-[10px] font-bold text-zinc-500 tracking-widest uppercase mb-1">
                {section.title}
              </h3>
            )}
            <ul className="space-y-1">
              {section.items.map(item => {
                const Icon = item.icon;
                return (
                  <li key={item.to} className="relative group">
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `flex items-center rounded-lg px-3 py-2.5 transition-all duration-200 ${
                          isCollapsed ? 'justify-center' : 'gap-3'
                        } ${
                          isActive
                            ? 'bg-malawiGreen/15 text-malawiGreen font-semibold border-l-4 border-malawiGreen dark:bg-malawiGreen/25 dark:text-white'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-950 dark:text-zinc-400 dark:hover:bg-slate-800/80 dark:hover:text-white'
                        }`
                      }
                    >
                      <Icon className="text-xl flex-shrink-0 transition-colors" />
                      {!isCollapsed && <span className="truncate text-sm">{item.title}</span>}
                    </NavLink>

                    {/* Collapsed Tooltip */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-white text-xs font-semibold text-gray-900 rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-x-2 group-hover:translate-x-0 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                        {item.title}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Profile Footer Section */}
      {user && (
        <div className="flex-shrink-0 p-4">
          <div className={`flex items-center ${isCollapsed ? 'justify-center flex-col' : 'justify-between'} gap-3`}>
            <NavLink
              to="/profile"
              className={`flex items-center gap-3 min-w-0 ${isCollapsed ? 'justify-center' : 'flex-1'}`}
              title="Open profile"
            >
              {/* Avatar circle */}
              <div className={`flex shrink-0 items-center justify-center rounded-full font-black shadow-sm h-10 w-10 text-sm ${avatarTone[role] || 'bg-zinc-800 text-white'}`}>
                {getInitials(user)}
              </div>

              {/* Text Info */}
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-950 truncate dark:text-white">
                    {user.name || 'Unnamed Officer'}
                  </div>
                  <div className={`mt-0.5 inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase border ${roleTone[role] || 'bg-zinc-900 text-zinc-400 border-zinc-800'}`}>
                    {getRoleDisplayName(user) || 'Staff'}
                  </div>
                </div>
              )}
            </NavLink>

            {/* Logout Button */}
            {!isCollapsed ? (
              <button
                type="button"
                onClick={handleLogoutClick}
                className="p-2 text-gray-500 hover:text-red-500 transition-colors duration-200 rounded-lg hover:bg-gray-100 flex-shrink-0 dark:text-zinc-400 dark:hover:bg-slate-800"
                title="Logout"
              >
                <MdLogout className="text-xl" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLogoutClick}
                className="w-10 h-10 mt-1 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors duration-200 rounded-lg hover:bg-gray-100 flex-shrink-0 dark:text-zinc-400 dark:hover:bg-slate-800"
                title="Logout"
              >
                <MdLogout className="text-xl" />
              </button>
            )}
          </div>
        </div>
      )}
    </aside>

    <ConfirmationModal
      open={showLogoutModal}
      title="Confirm Logout"
      message="Are you sure you want to log out?"
      cancelText="Cancel"
      confirmText="Logout"
      confirmVariant="danger"
      onCancel={() => setShowLogoutModal(false)}
      onConfirm={handleLogoutConfirm}
    />
    </>
  );
}
