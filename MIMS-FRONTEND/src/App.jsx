
/**
 * Main Application Component - MIMS (Mzuzu Inmate Management System)
 *
 * This component serves as the root of the application, managing:
 * - Client-side routing with React Router
 * - Authentication state and protected routes
 * - Global layout with sidebar navigation
 * - Toast notifications
 * - Role-based access control
 *
 * Architecture:
 * - Uses BrowserRouter for clean URLs
 * - Context providers wrap the entire app for global state
 * - Protected routes enforce authentication and role permissions
 * - Modular structure with feature-based routing
 *
 * Route Structure:
 * - Public: /login
 * - Protected (all users): /, /profile
 * - Reception Officer: /admissions/*
 * - Station Officer: /inmates/:id, /admissions/:id
 * - Admin: /admin/*
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/useAuth';
import LoginPage from './modules/auth/pages/LoginPage';
import HomePage from './modules/home/pages/HomePage';
import ProfilePage from './modules/user/pages/ProfilePage';
import AdminDashboard from './modules/admin/pages/AdminDashboard';
import UserManagementPage from './modules/admin/pages/UserManagementPage';
import AuditLogsPage from './modules/admin/pages/AuditLogsPage';
import DutyRosterPage from './modules/activityAllocation/admin/pages/DutyRosterPage';
import ActivityListPage from './modules/activityAllocation/admin/pages/ActivityListPage';
import ActivityFormPage from './modules/activityAllocation/admin/pages/ActivityFormPage';
import OfficerAvailableActivitiesPage from './modules/activityAllocation/officer/pages/OfficerAvailableActivitiesPage';
import OfficerExternalActivityAllocationPage from './modules/activityAllocation/officer/pages/OfficerExternalActivityAllocationPage';
import OfficerSessionsPage from './modules/activityAllocation/officer/pages/OfficerSessionsPage';
import OfficerSessionFormPage from './modules/activityAllocation/officer/pages/OfficerSessionFormPage';
import OfficerSessionDetailPage from './modules/activityAllocation/officer/pages/OfficerSessionDetailPage';
import AdmissionFormPage from './modules/admissions/pages/AdmissionFormPage';
import AdmissionShowPage from './modules/admissions/pages/AdmissionShowPage';
import AdmissionsIndexPage from './modules/admissions/pages/AdmissionsIndexPage';
import InmateDetailPage from './modules/admissions/pages/InmateDetailPage';
import ReleaseApprovalPage from './modules/releases/pages/ReleaseApprovalPage';
import ReleaseConfirmationPage from './modules/releases/pages/ReleaseConfirmationPage';
import SentenceAdjustmentPage from './modules/releases/pages/SentenceAdjustmentPage';
import ReleaseHistoryPage from './modules/releases/pages/ReleaseHistoryPage';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from 'react-toastify';

/**
 * AppContent Component - Handles authenticated user interface
 *
 * Manages the main application layout including:
 * - Loading state during authentication checks
 * - Sidebar navigation toggle
 * - Route rendering based on authentication status
 */
const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  // Show loading spinner during authentication verification
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
      {/* Sidebar - only shown for authenticated users when open */}
      {isAuthenticated && sidebarOpen && (
        <Sidebar onClose={() => setSidebarOpen(false)} />
      )}

      {/* Main content area - adjusts margin based on sidebar state */}
      <div className={isAuthenticated && sidebarOpen ? "ml-64 flex-1" : "flex-1"}>
        {/* Sidebar toggle button - shown when sidebar is closed */}
        {isAuthenticated && !sidebarOpen && (
          <button
            className="fixed top-4 left-4 z-50 bg-malawiGold text-malawiBlack p-2 rounded shadow hover:bg-malawiRed hover:text-malawiGold transition"
            onClick={() => setSidebarOpen(true)}
          >
            ☰ Open Sidebar
          </button>
        )}

        {/* Application Routes */}
        <Routes>
          {/* Public route - accessible without authentication */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes - require authentication */}
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

          {/* Reception Officer routes - inmate admissions management */}
          <Route
            path="/admissions"
            element={
              <ProtectedRoute allowedRoles={['reception_officer']}>
                <AdmissionsIndexPage />
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
              <ProtectedRoute allowedRoles={['reception_officer']}>
                <AdmissionShowPage />
              </ProtectedRoute>
            }
          />

          {/* Inmate detail routes - admissions module stays with reception officers */}
          <Route
            path="/inmates/:inmateId"
            element={
              <ProtectedRoute allowedRoles={['reception_officer']}>
                <InmateDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Release Management routes - Station Officer & Gatekeeper */}
          <Route
            path="/releases/approval"
            element={
              <ProtectedRoute allowedRoles={['station_officer', 'admin']}>
                <ReleaseApprovalPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/releases/confirmation"
            element={
              <ProtectedRoute allowedRoles={['gatekeeper', 'admin']}>
                <ReleaseConfirmationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/adjustments/:admissionId"
            element={
              <ProtectedRoute allowedRoles={['station_officer', 'admin']}>
                <SentenceAdjustmentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/releases/history"
            element={
              <ProtectedRoute allowedRoles={['station_officer', 'gatekeeper', 'admin']}>
                <ReleaseHistoryPage />
              </ProtectedRoute>
            }
          />

          {/* Admin routes - system administration */}
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
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute requireAdmin={true}>
                <AuditLogsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/duty-rosters"
            element={
              <ProtectedRoute requireAdmin={true}>
                <DutyRosterPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/activities"
            element={
              <ProtectedRoute requireAdmin={true}>
                <ActivityListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/activities/new"
            element={
              <ProtectedRoute requireAdmin={true}>
                <ActivityFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/activities/:id/edit"
            element={
              <ProtectedRoute requireAdmin={true}>
                <ActivityFormPage />
              </ProtectedRoute>
            }
          />

          {/* Officer on duty routes - Activity sessions & attendance */}
          <Route
            path="/officer/activities"
            element={
              <ProtectedRoute allowedRoles={['officer_on_duty']}>
                <OfficerAvailableActivitiesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer/activities/:activityId/allocations"
            element={
              <ProtectedRoute allowedRoles={['officer_on_duty']}>
                <OfficerExternalActivityAllocationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer/activity-sessions"
            element={
              <ProtectedRoute allowedRoles={['officer_on_duty']}>
                <OfficerSessionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer/activity-sessions/new"
            element={
              <ProtectedRoute allowedRoles={['officer_on_duty']}>
                <OfficerSessionFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer/activity-sessions/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['officer_on_duty']}>
                <OfficerSessionFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer/activity-sessions/:id"
            element={
              <ProtectedRoute allowedRoles={['officer_on_duty']}>
                <OfficerSessionDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all route - redirects to home for authenticated users, login for others */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
};

/**
 * Main App Function - Root component with provider setup
 *
 * Provider Hierarchy (outer to inner):
 * 1. Router - Client-side routing
 * 2. ToastProvider - Global toast notification state
 * 3. AuthProvider - Authentication state and user management
 * 4. AppContent - Main application UI with routes
 *
 * The ToastContainer is configured with:
 * - Position: top-right
 * - Auto-close: 7 seconds
 * - Custom styling via ToastContext
 */
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
