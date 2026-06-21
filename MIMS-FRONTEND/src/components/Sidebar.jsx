import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { MdHome, MdPerson, MdDashboard, MdPeople, MdAssignment, MdHistory, MdSchedule, MdLocalActivity, MdCheckCircle, MdExitToApp, MdEditCalendar } from 'react-icons/md';
import { ROLES } from '../utils/helpers';
import logo from '/cuffs.png';

const navLinkClass = ({ isActive }) =>
  `flex items-center rounded px-3 py-2 transition ${
    isActive
      ? 'bg-malawiGreen text-white shadow-sm'
      : 'text-malawiGold hover:bg-malawiGreen/25 hover:text-white'
  }`;


/**
 * Sidebar Navigation Component
 *
 * Main navigation sidebar for authenticated users with role-based menu items.
 * Features Inmate Management System branding, responsive design, and logout confirmation.
 *
 * Features:
 * - Role-based navigation (admin, reception officer, regular users)
 * - Cuffs logo
 * - Collapsible/closeable design
 * - Logout confirmation modal
 * - Responsive layout with fixed positioning
 *
 * Navigation Items by Role:
 * - All users: Profile
 * - Non-admin: Home
 * - Reception Officer: Admissions
 * - Admin: Admin Dashboard, User Management
 *
 */
const Sidebar = ({ onClose } = {}) => {
  const { isAdmin, getRoleName, loading } = useAuth();

  const role = getRoleName();



  // Show loading skeleton while auth is initializing
  if (loading) {
    return (
      <aside className="w-64 h-screen bg-malawiBlack text-malawiGold flex flex-col shadow-lg fixed top-0 left-0 z-50">
        <div className="flex items-center justify-center h-24 border-b border-malawiGold px-4">
          <div className="animate-pulse bg-gray-600 h-16 w-16 rounded-full"></div>
        </div>
        <div className="flex-1 mt-8 px-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-700 h-8 rounded"></div>
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-64 h-screen bg-malawiBlack text-malawiGold flex flex-col shadow-lg fixed top-0 left-0 z-50 transition-transform duration-300">

      {/* Header with cuffs logo */}
      <div className="flex items-center h-24 border-b border-malawiGold px-4 gap-3">

        <div className="flex items-center gap-3 min-w-0">
          <img
            src={logo}
            alt="Cuffs logo"
            className="h-16 w-16 rounded-full border-4 border-malawiRed flex-shrink-0"
          />
          <span className="ml-0 text-xl font-bold truncate">Inmate Management System</span>
        </div>
      </div>

      {/* Main navigation menu */}
      <nav className="flex-1 mt-8" onClick={() => onClose?.()}>
        <ul className="space-y-4 px-6">

          {/* Home link for non-admin users */}
          {!isAdmin && (
            <li>
              <NavLink to="/" end className={navLinkClass}>
                <MdHome className="mr-2 text-xl" /> Home
              </NavLink>
            </li>
          )}

          {/* Admissions link for reception officers */}
          {role === ROLES.RECEPTION_OFFICER && (
            <li>
              <NavLink to="/admissions" className={navLinkClass}>
                <MdAssignment className="mr-2 text-xl" /> Admissions
              </NavLink>
            </li>
          )}

          {/* Officer on duty - activity sessions */}
          {role === ROLES.OFFICER_ON_DUTY && (
            <>
              <li>
                <NavLink to="/officer/activities" className={navLinkClass}>
                  <MdLocalActivity className="mr-2 text-xl" /> Available Activities
                </NavLink>
              </li>
              <li>
                <NavLink to="/officer/activity-sessions" className={navLinkClass}>
                  <MdLocalActivity className="mr-2 text-xl" /> Activity Sessions
                </NavLink>
              </li>
            </>
          )}

          {/* Release Management - Station Officer & Gatekeeper */}
          {(role === ROLES.STATION_OFFICER || role === ROLES.GATEKEEPER) && (
            <>
              <li className="text-malawiRed text-sm font-semibold mt-4 mb-2">Releases</li>
              {role === ROLES.STATION_OFFICER && (
                <li>
                  <NavLink to="/releases/approval" className={navLinkClass}>
                    <MdCheckCircle className="mr-2 text-xl" /> Release Approval
                  </NavLink>
                </li>
              )}
              {role === ROLES.STATION_OFFICER && (
                <li>
                  <NavLink to="/releases/sentences" className={navLinkClass}>
                    <MdEditCalendar className="mr-2 text-xl" /> Sentence Lengths
                  </NavLink>
                </li>
              )}
              {role === ROLES.GATEKEEPER && (
                <li>
                  <NavLink to="/releases/confirmation" className={navLinkClass}>
                    <MdExitToApp className="mr-2 text-xl" /> Confirm Release
                  </NavLink>
                </li>
              )}
              {role === ROLES.STATION_OFFICER && (
                <li>
                  <NavLink to="/releases/confirmed" className={navLinkClass}>
                    <MdHistory className="mr-2 text-xl" /> Confirmed Releases
                  </NavLink>
                </li>
              )}
              {(role === ROLES.STATION_OFFICER || role === ROLES.GATEKEEPER) && (
                <li>
                  <NavLink to="/releases/history" className={navLinkClass}>
                    <MdHistory className="mr-2 text-xl" /> Release History
                  </NavLink>
                </li>
              )}
            </>
          )}

          {role === ROLES.GATEKEEPER && (
            <>
              <li className="text-malawiRed text-sm font-semibold mt-4 mb-2">Visitation</li>
              <li>
                <NavLink to="/visitation/visitors" className={navLinkClass}>
                  <MdPerson className="mr-2 text-xl" /> Visitation
                </NavLink>
              </li>
            </>
          )}

          {/* Profile link for all users */}
          <li>
            <NavLink to="/profile" className={navLinkClass}>
              <MdPerson className="mr-2 text-xl" /> Profile
            </NavLink>
          </li>

          {/* Admin-only navigation items */}
          {isAdmin && (
            <>
              <li>
                <NavLink to="/admin/dashboard" className={navLinkClass}>
                  <MdDashboard className="mr-2 text-xl" /> Admin Dashboard
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/users" className={navLinkClass}>
                  <MdPeople className="mr-2 text-xl" /> User Management
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/audit-logs" className={navLinkClass}>
                  <MdHistory className="mr-2 text-xl" /> Audit Logs
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/duty-rosters" className={navLinkClass}>
                  <MdSchedule className="mr-2 text-xl" /> Duty Rosters
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/activities" className={navLinkClass}>
                  <MdLocalActivity className="mr-2 text-xl" /> Activities
                </NavLink>
              </li>
            </>
          )}
        </ul>
      </nav>

    </aside>
  );
};

export default Sidebar;
