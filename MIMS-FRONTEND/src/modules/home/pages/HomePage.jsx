import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/useAuth';
import { getRoleDisplayName, getRoleName, ROLES } from '../../../utils/helpers';
import OfficerAvailableActivitiesPage from '../../activityAllocation/officer/pages/OfficerAvailableActivitiesPage';
import AdmissionsDashboardPage from '../../admissions/pages/AdmissionsDashboardPage';

export const HomePage = () => {
  const { user, isAdmin } = useAuth();
  const role = getRoleName(user);

  // Redirect admins to dashboard
  if (isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (role === ROLES.OFFICER_ON_DUTY) {
    return <OfficerAvailableActivitiesPage />;
  }

  if (role === ROLES.RECEPTION_OFFICER) {
    return <AdmissionsDashboardPage />;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-4xl font-bold text-gray-800 mb-2">
        Welcome, {user?.name}!
      </h1>
      <p className="text-gray-600 mb-8">User dashboard and information</p>

      {/* User Info Card */}
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Your Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-gray-600 text-sm font-semibold uppercase">Name</p>
            <p className="text-xl font-semibold text-gray-800 mt-1">{user?.name}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm font-semibold uppercase">Email</p>
            <p className="text-xl font-semibold text-gray-800 mt-1">{user?.email}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm font-semibold uppercase">Role</p>
            <p className="text-xl font-semibold text-blue-600 mt-1">
              {getRoleDisplayName(user)}
            </p>
          </div>
          <div>
            <p className="text-gray-600 text-sm font-semibold uppercase">Member Since</p>
            <p className="text-xl font-semibold text-gray-800 mt-1">
              {new Date(user?.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
