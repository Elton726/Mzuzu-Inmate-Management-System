
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
 * - Uses HashRouter so browser refreshes preserve app state across static hosts
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
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { useAuth } from './contexts/useAuth';
import { ROLES } from './utils/helpers';
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
import InternalActivityAutoAssignPage from './modules/activityAllocation/officer/pages/InternalActivityAutoAssignPage';
import ActivityReportsPage from './modules/activityAllocation/officer/pages/ActivityReportsPage';
import AdmissionFormPage from './modules/admissions/pages/AdmissionFormPage';
import AdmissionShowPage from './modules/admissions/pages/AdmissionShowPage';
import AdmissionsIndexPage from './modules/admissions/pages/AdmissionsIndexPage';
import AdmissionsReportPage from './modules/admissions/pages/AdmissionsReportPage';
import CellManagementPage from './modules/admissions/pages/CellManagementPage';
import InmateDetailPage from './modules/admissions/pages/InmateDetailPage';
import ReleaseApprovalPage from './modules/releases/pages/ReleaseApprovalPage';
import ReleaseConfirmationPage from './modules/releases/pages/ReleaseConfirmationPage';
import ConfirmedReleasesPage from './modules/releases/pages/ConfirmedReleasesPage';
import SentenceAdjustmentPage from './modules/releases/pages/SentenceAdjustmentPage';
import SentenceAdjustmentTypesPage from './modules/releases/pages/SentenceAdjustmentTypesPage';
import SentenceLengthPage from './modules/releases/pages/SentenceLengthPage';
import ReleaseHistoryPage from './modules/releases/pages/ReleaseHistoryPage';
import ReleaseDateLookupPage from './modules/releases/pages/ReleaseDateLookupPage';
import VisitationHomePage from './modules/visitation/pages/VisitationHomePage';
import PendingCharityPage from './modules/visitation/pages/PendingCharityPage';
import VisitationStatisticsPage from './modules/visitation/pages/VisitationStatisticsPage';
import VisitationHistoryPage from './modules/visitation/pages/VisitationHistoryPage';
import VisitationRulesPage from './modules/visitation/pages/VisitationRulesPage';
import VisitFlagReviewsPage from './modules/visitation/pages/VisitFlagReviewsPage';
import VisitationAlertsPage from './modules/visitation/pages/VisitationAlertsPage';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import { Navigation } from './components/Navigation';
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

  const contentMarginClass = isAuthenticated ? 'ml-64' : 'ml-0';

  return (
    <div className="flex">
      {/* Sidebar - always shown for authenticated users */}
      {isAuthenticated && <Sidebar />}

      {/* Main content area - adjusts margin based on sidebar state */}
      <div className={`${contentMarginClass} flex-1 min-w-0 transition-all duration-300`}>

        {/* Top Navigation Bar - shows for authenticated users */}
        {isAuthenticated && <Navigation />}




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
          <Route
            path="/admissions/cells"
            element={
              <ProtectedRoute allowedRoles={['reception_officer']}>
                <CellManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admissions/reports"
            element={
              <ProtectedRoute allowedRoles={['reception_officer']}>
                <AdmissionsReportPage />
              </ProtectedRoute>
            }
          />

          {/* Inmate detail routes - admissions module stays with reception officers */}
          <Route
            path="/inmates/:inmateId"
            element={
              <ProtectedRoute allowedRoles={['reception_officer', 'station_officer']}>
                <InmateDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Release Management routes - Station Officer & Gatekeeper */}
          <Route
            path="/releases/approval"
            element={
              <ProtectedRoute allowedRoles={['station_officer']}>
                <ReleaseApprovalPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/releases/confirmation"
            element={
              <ProtectedRoute allowedRoles={['gatekeeper']}>
                <ReleaseConfirmationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/adjustments/:admissionId"
            element={
              <ProtectedRoute allowedRoles={['station_officer']}>
                <SentenceAdjustmentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/releases/sentences"
            element={
              <ProtectedRoute allowedRoles={['station_officer']}>
                <SentenceLengthPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/releases/date-lookup"
            element={
              <ProtectedRoute allowedRoles={['station_officer']}>
                <ReleaseDateLookupPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/releases"
            element={
              <ProtectedRoute allowedRoles={['station_officer', 'gatekeeper']}>
                <ReleaseModuleHomeRedirect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/releases/history"
            element={
              <ProtectedRoute allowedRoles={['station_officer', 'gatekeeper']}>
                <ReleaseHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/releases/confirmed"
            element={
              <ProtectedRoute allowedRoles={['station_officer']}>
                <ConfirmedReleasesPage />
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
            path="/admin/cells"
            element={
              <ProtectedRoute requireAdmin={true}>
                <CellManagementPage adminMode />
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
            path="/admin/sentence-adjustment-types"
            element={
              <ProtectedRoute requireAdmin={true}>
                <SentenceAdjustmentTypesPage />
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

          {/* Visitation module routes - gatekeeper only */}
          <Route
            path="/visitation"
            element={
              <ProtectedRoute allowedRoles={['gatekeeper']}>
                <VisitationHomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/visitation/charity-pending"
            element={
              <ProtectedRoute allowedRoles={['gatekeeper', 'station_officer']}>
                <PendingCharityPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/visitation/statistics"
            element={
              <ProtectedRoute allowedRoles={['gatekeeper', 'station_officer']}>
                <VisitationStatisticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/visitation/history"
            element={
              <ProtectedRoute allowedRoles={['gatekeeper', 'station_officer']}>
                <VisitationHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/visitation/rules"
            element={
              <ProtectedRoute allowedRoles={['station_officer']}>
                <VisitationRulesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/visitation/flag-reviews"
            element={
              <ProtectedRoute allowedRoles={['station_officer']}>
                <VisitFlagReviewsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/visitation/alerts"
            element={
              <ProtectedRoute allowedRoles={['gatekeeper', 'station_officer']}>
                <VisitationAlertsPage />
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
            path="/officer/internal-activities/:activityId/auto-assign"
            element={
              <ProtectedRoute allowedRoles={['officer_on_duty']}>
                <InternalActivityAutoAssignPage />
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

          <Route
            path="/officer/activity-reports"
            element={
              <ProtectedRoute allowedRoles={['officer_on_duty']}>
                <ActivityReportsPage />
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
const ReleaseModuleHomeRedirect = () => {
  const { getRoleName } = useAuth();
  const role = getRoleName();

  if (role === ROLES.STATION_OFFICER) {
    return <Navigate to="/releases/approval" replace />;
  }

  if (role === ROLES.GATEKEEPER) {
    return <Navigate to="/releases/confirmation" replace />;
  }

  return <Navigate to="/" replace />;
};

function App() {
  return (
    <Router>
      <ThemeProvider>
        <NotificationProvider>
          <ToastProvider>
            <ToastContainer position="top-right" autoClose={7000} />
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </ToastProvider>
        </NotificationProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
