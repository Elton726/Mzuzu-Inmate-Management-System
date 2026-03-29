import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { MdHome, MdPerson, MdDashboard, MdPeople, MdLogout, MdAssignment } from 'react-icons/md';
import { getRoleName, ROLES } from '../utils/helpers';
import logo from '/government-logo.png';

const Sidebar = ({ onClose }) => {
  const { logout, isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const role = getRoleName(user);

  const handleLogoutClick = () => {
    setShowConfirmation(true);
  };

  const handleConfirmLogout = async () => {
    setShowConfirmation(false);
    await logout();
    navigate('/login');
  };

  const handleCancelLogout = () => {
    setShowConfirmation(false);
  };

  return (
    <aside className="w-64 h-screen bg-malawiBlack text-malawiGold flex flex-col shadow-lg fixed top-0 left-0 z-50 transition-transform duration-300">
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
      <nav className="flex-1 mt-8">
        <ul className="space-y-4 px-6">
          {!isAdmin && (
            <li>
              <Link to="/" className="hover:text-malawiRed transition flex items-center">
                <MdHome className="mr-2 text-xl" /> Home
              </Link>
            </li>
          )}
          {role === ROLES.RECEPTION_OFFICER && (
            <li>
              <Link to="/admissions/new" className="hover:text-malawiGold transition flex items-center">
                <MdAssignment className="mr-2 text-xl" /> Admissions
              </Link>
            </li>
          )}
          <li>
            <Link to="/profile" className="hover:text-malawiGreen transition flex items-center">
              <MdPerson className="mr-2 text-xl" /> Profile
            </Link>
          </li>
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
      <div className="mt-auto px-6 py-4 border-t border-malawiGold">
        <button onClick={handleLogoutClick} className="w-full bg-malawiRed text-malawiGold py-2 rounded hover:bg-malawiGold hover:text-malawiBlack transition font-semibold flex items-center justify-center gap-2">
          <MdLogout /> Logout
        </button>
      </div>

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
