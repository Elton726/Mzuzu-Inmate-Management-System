import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { getRoleDisplayName } from '../utils/helpers';

export const Navigation = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="font-bold text-xl">
            MIMS System
          </Link>

          <div className="flex items-center space-x-4">
            {isAdmin && (
              <Link
                to="/admin/dashboard"
                className="hover:bg-blue-700 px-3 py-2 rounded transition"
              >
                Admin Dashboard
              </Link>
            )}

            <Link
              to="/profile"
              className="hover:bg-blue-700 px-3 py-2 rounded transition"
            >
              {user.name}
            </Link>

            <span className="text-blue-100 text-sm">
              {getRoleDisplayName(user.role)}
            </span>

            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded transition"
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
