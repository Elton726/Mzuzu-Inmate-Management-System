
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/useAuth';
import LoginPage from './modules/auth/pages/LoginPage';
import HomePage from './modules/home/pages/HomePage';
import ProfilePage from './modules/user/pages/ProfilePage';
import AdminDashboard from './modules/admin/pages/AdminDashboard';
import UserManagementPage from './modules/admin/pages/UserManagementPage';
import AdmissionFormPage from './modules/admissions/pages/AdmissionFormPage';
import AdmissionShowPage from './modules/admissions/pages/AdmissionShowPage';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from 'react-toastify';

// Main App content with routing
const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

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

  return (
    <div className="flex">
      {isAuthenticated && sidebarOpen && (
        <Sidebar onClose={() => setSidebarOpen(false)} />
      )}
      <div className={isAuthenticated && sidebarOpen ? "ml-64 flex-1" : "flex-1"}>
        {isAuthenticated && !sidebarOpen && (
          <button
            className="fixed top-4 left-4 z-50 bg-malawiGold text-malawiBlack p-2 rounded shadow hover:bg-malawiRed hover:text-malawiGold transition"
            onClick={() => setSidebarOpen(true)}
          >
            ☰ Open Sidebar
          </button>
        )}
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admissions/new"
            element={
              <ProtectedRoute allowedRoles={['reception_officer']}>
                <AdmissionFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admissions/:admissionId"
            element={
              <ProtectedRoute allowedRoles={['reception_officer', 'station_officer']}>
                <AdmissionShowPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requireAdmin={true}>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <ToastProvider>
        <ToastContainer position="top-right" autoClose={7000} />
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </Router>
  );
}

export default App;
