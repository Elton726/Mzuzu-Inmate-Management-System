import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { NotificationBell } from './common/NotificationBell';
import { useNotification } from '../contexts/useNotification';
import UserAvatarWithRole from './common/UserAvatarWithRole';
import { useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContextCreate';
import { MdDarkMode, MdLightMode } from 'react-icons/md';

export const Navigation = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, isAdmin, logout } = useAuth();
  const { notifications, markAsRead, clearAll } = useNotification();
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="bg-malawiBlack text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16 pr-12">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded hover:bg-zinc-800 text-malawiGold transition-all duration-200 flex items-center justify-center border border-zinc-800"
                title="Open Sidebar"
              >
                <span className="text-xl">☰</span>
              </button>
            )}
            <Link
              to="/profile"
              className="rounded px-3 py-2 transition hover:bg-gray-800"
              title="Open profile"
            >
              <UserAvatarWithRole user={user} showEmail={false} size="sm" tone="dark" />
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {isAdmin && (
              <Link
                to="/admin/dashboard"
                className="hover:bg-gray-800 px-3 py-2 rounded transition"
              >
                Admin Dashboard
              </Link>
            )}

            <button
              onClick={toggleTheme}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-white transition-colors duration-250 flex-shrink-0"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <MdDarkMode className="h-5 w-5 text-malawiGold" />
              ) : (
                <MdLightMode className="h-5 w-5 text-malawiGold" />
              )}
            </button>

            <NotificationBell
              notifications={notifications}
              onMarkAsRead={markAsRead}
              onClearAll={clearAll}
            />

            <button
              onClick={handleLogout}
              className="min-w-24 bg-red-600 hover:bg-red-700 px-4 py-2 rounded transition"
              title="Logout"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
