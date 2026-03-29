import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { getRoleName } from '../utils/helpers';

/**
 * ProtectedRoute Component - Route protection with role-based access control
 *
 * This component wraps routes that require authentication and/or specific user roles.
 * It handles loading states, authentication checks, and role-based authorization.
 *
 * Access Control Logic:
 * 1. Show loading spinner during authentication verification
 * 2. Redirect to /login if user is not authenticated
 * 3. Check admin requirement if requireAdmin is true
 * 4. Check role whitelist if allowedRoles is provided
 * 5. Render children only if all checks pass
 *
 * Role Hierarchy:
 * - admin: Full system access
 * - reception_officer: Inmate admissions and basic inmate management
 * - station_officer: Inmate viewing and some management functions
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Components to render if access granted
 * @param {boolean} [props.requireAdmin=false] - Require admin role for access
 * @param {string[]} [props.allowedRoles=null] - Array of allowed role names
 * @returns {React.ReactNode} Protected content or redirect component
 */
export const ProtectedRoute = ({ children, requireAdmin = false, allowedRoles = null }) => {
  const { isAuthenticated, isAdmin, loading, user } = useAuth();

  // Show loading state during authentication check
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check admin requirement
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Check role-based access if roles are specified
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const role = getRoleName(user);
    if (!allowedRoles.includes(role)) {
      return <Navigate to="/" replace />;
    }
  }

  // All checks passed - render protected content
  return children;
};

export default ProtectedRoute;
