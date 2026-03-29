import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { MdHome, MdPerson, MdDashboard, MdPeople, MdLogout, MdAssignment } from 'react-icons/md';
import { getRoleName, ROLES } from '../utils/helpers';
import logo from '/government-logo.png';

/**
 * Sidebar Navigation Component
 *
 * Main navigation sidebar for authenticated users with role-based menu items.
 * Features Malawi government branding, responsive design, and logout confirmation.
 *
 * Features:
 * - Role-based navigation (admin, reception officer, regular users)
 * - Malawi government logo and branding
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
 * @param {Object} props - Component props
 * @param {Function} props.onClose - Callback to close/hide the sidebar
 */
const Sidebar = ({ onClose }) => {
  const { logout, isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const role = getRoleName(user);

  /**
   * Handle logout button click - show confirmation modal
   */
  const handleLogoutClick = () => {
    setShowConfirmation(true);
  };

  /**
   * Confirm and execute logout
   * Calls auth logout and redirects to login page
   */
  const handleConfirmLogout = async () => {
    setShowConfirmation(false);
    await logout();
    navigate('/login');
  };

  /**
   * Cancel logout - hide confirmation modal
   */
  const handleCancelLogout = () => {
    setShowConfirmation(false);
  };

  return (
    <aside className="w-64 h-screen bg-malawiBlack text-malawiGold flex flex-col shadow-lg fixed top-0 left-0 z-50 transition-transform duration-300">
      {/* Header with government logo and close button */}
      <div className="flex items-center justify-between h-24 border-b border-malawiGold px-4">
        <div className="flex items-center">
          <img src={logo} alt="Malawi Government Logo" className="h-16 w-16 rounded-full border-4 border-malawiRed" />
          <span className="ml-4 text-xl font-bold">Malawi Government</span>
        </div>
        <button
          className="bg-malawiGold text-malawiBlack rounded-full p-2 hover:bg-malawiRed hover:text-malawiGold transition"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          ✕
        </button>
      </div>

      {/* Main navigation menu */}
      <nav className="flex-1 mt-8">
        <ul className="space-y-4 px-6">
          {/* Home link for non-admin users */}
          {!isAdmin && (
            <li>
              <Link to="/" className="hover:text-malawiRed transition flex items-center">
                <MdHome className="mr-2 text-xl" /> Home
              </Link>
            </li>
          )}

          {/* Admissions link for reception officers */}
          {role === ROLES.RECEPTION_OFFICER && (
            <li>
              <Link to="/admissions" className="hover:text-malawiGold transition flex items-center">
                <MdAssignment className="mr-2 text-xl" /> Admissions
              </Link>
            </li>
          )}

          {/* Profile link for all users */}
          <li>
            <Link to="/profile" className="hover:text-malawiGreen transition flex items-center">
              <MdPerson className="mr-2 text-xl" /> Profile
            </Link>
          </li>

          {/* Admin-only navigation items */}
          {isAdmin && (
            <>
              <li>
                <Link to="/admin/dashboard" className="hover:text-malawiGold transition flex items-center">
                  <MdDashboard className="mr-2 text-xl" /> Admin Dashboard
                </Link>
              </li>
              <li>
                <Link to="/admin/users" className="hover:text-malawiRed transition flex items-center">
                  <MdPeople className="mr-2 text-xl" /> User Management
                </Link>
              </li>
            </>
          )}
        </ul>
      </nav>

      {/* Logout button at bottom */}
      <div className="mt-auto px-6 py-4 border-t border-malawiGold">
        <button onClick={handleLogoutClick} className="w-full bg-malawiRed text-malawiGold py-2 rounded hover:bg-malawiGold hover:text-malawiBlack transition font-semibold flex items-center justify-center gap-2">
          <MdLogout /> Logout
        </button>
      </div>

      {/* Logout confirmation modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-malawiGold text-malawiBlack rounded-lg shadow-lg p-6 max-w-sm mx-4">
            <h2 className="text-xl font-semibold mb-4">Confirm Logout</h2>
            <p className="text-gray-700 mb-6">Are you sure you want to log out?</p>
            <div className="flex gap-4 justify-end">
              <button
                onClick={handleCancelLogout}
                className="px-4 py-2 rounded bg-gray-400 text-white hover:bg-gray-500 transition font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                className="px-4 py-2 rounded bg-malawiRed text-malawiGold hover:bg-red-700 transition font-semibold"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
