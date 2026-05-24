import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { NotificationBell } from './common/NotificationBell';
import { useNotification } from '../contexts/useNotification';
import UserAvatarWithRole from './common/UserAvatarWithRole';

export const Navigation = () => {
  const { user, isAdmin, logout } = useAuth();
  const { notifications, markAsRead, clearAll } = useNotification();
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
          <Link
            to="/profile"
            className="rounded px-3 py-2 transition hover:bg-gray-800"
            title="Open profile"
          >
            <UserAvatarWithRole user={user} showEmail={false} size="sm" tone="dark" />
          </Link>

          <div className="flex items-center space-x-4">
            {isAdmin && (
              <Link
                to="/admin/dashboard"
                className="hover:bg-gray-800 px-3 py-2 rounded transition"
              >
                Admin Dashboard
              </Link>
            )}

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
