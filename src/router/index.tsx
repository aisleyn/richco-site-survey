import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RequireRole } from '../components/auth/RequireRole'
import { AppShell } from '../components/layout/AppShell'

// Pages (lazy loaded later if needed)
import LoginPage from '../pages/LoginPage'
import StaffDashboard from '../pages/staff/StaffDashboard'
import ProjectsPage from '../pages/staff/ProjectsPage'
import ProjectDetailPage from '../pages/staff/ProjectDetailPage'
import SurveyFormPage from '../pages/staff/SurveyFormPage'
import SurveyDetailPage from '../pages/staff/SurveyDetailPage'
import FlipbookViewPage from '../pages/staff/FlipbookViewPage'
import ClientSubmissionsPage from '../pages/staff/ClientSubmissionsPage'
import MapPage from '../pages/staff/MapPage'
import SurveysPage from '../pages/staff/SurveysPage'
import ReportsPage from '../pages/staff/ReportsPage'
import SettingsPage from '../pages/staff/SettingsPage'
import VendorManagementPage from '../pages/staff/VendorManagementPage'
import VendorProjectsPage from '../pages/staff/VendorProjectsPage'
import ClientAccountsPage from '../pages/staff/ClientAccountsPage'
import UserManagementPage from '../pages/staff/UserManagementPage'
import ClientDashboard from '../pages/client/ClientDashboard'
import ClientProfilePage from '../pages/client/ProfilePage'
import ClientSubmitPage from '../pages/client/ClientSubmitPage'
import ClientMapPage from '../pages/client/ClientMapPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/staff',
    element: (
      <RequireRole allowedRole="richco_staff">
        <AppShell />
      </RequireRole>
    ),
    children: [
      {
        index: true,
        element: <StaffDashboard />,
      },
      {
        path: 'projects',
        element: <ProjectsPage />,
      },
      {
        path: 'surveys',
        element: <SurveysPage />,
      },
      {
        path: 'reports',
        element: <ReportsPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'vendors',
        element: <VendorManagementPage />,
      },
      {
        path: 'vendor-projects',
        element: <VendorProjectsPage />,
      },
      {
        path: 'accounts',
        element: <ClientAccountsPage />,
      },
      {
        path: 'users',
        element: <UserManagementPage />,
      },
      {
        path: 'projects/:projectId',
        element: <ProjectDetailPage />,
      },
      {
        path: 'projects/:projectId/surveys/new',
        element: <SurveyFormPage />,
      },
      {
        path: 'surveys/:surveyId',
        element: <SurveyDetailPage />,
      },
      {
        path: 'surveys/:surveyId/edit',
        element: <SurveyFormPage />,
      },
      {
        path: 'projects/:projectId/flipbook',
        element: <FlipbookViewPage />,
      },
      {
        path: 'projects/:projectId/submissions',
        element: <ClientSubmissionsPage />,
      },
      {
        path: 'projects/:projectId/map',
        element: <MapPage />,
      },
    ],
  },
  {
    path: '/client',
    element: (
      <RequireRole allowedRole="client">
        <AppShell />
      </RequireRole>
    ),
    children: [
      {
        index: true,
        element: <ClientDashboard />,
      },
      {
        path: 'map/:projectId',
        element: <ClientMapPage />,
      },
      {
        path: 'submit',
        element: <ClientSubmitPage />,
      },
      {
        path: 'profile',
        element: <ClientProfilePage />,
      },
    ],
  },
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
])
