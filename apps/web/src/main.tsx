import { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './styles.css';
import './app.css';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { isPortalUser } from './features/auth/portal';
import { Loading } from './components/Feedback';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import NotFoundPage from './pages/NotFoundPage';
import AppLayout from './app/AppLayout';
import { ROUTER_BASENAME } from './lib/appRoot';

const DashboardPage = lazy(() => import('./app/DashboardPage'));
const PortalPage = lazy(() => import('./app/PortalPage'));
const PropertiesListPage = lazy(() => import('./app/properties/PropertiesListPage'));
const PropertyFormPage = lazy(() => import('./app/properties/PropertyFormPage'));
const PropertyDetailPage = lazy(() => import('./app/properties/PropertyDetailPage'));
const OwnersListPage = lazy(() => import('./app/owners/OwnersListPage'));
const OwnerFormPage = lazy(() => import('./app/owners/OwnerFormPage'));
const OwnerDetailPage = lazy(() => import('./app/owners/OwnerDetailPage'));
const ReservationsListPage = lazy(() => import('./app/reservations/ReservationsListPage'));
const ReservationFormPage = lazy(() => import('./app/reservations/ReservationFormPage'));
const ReservationDetailPage = lazy(() => import('./app/reservations/ReservationDetailPage'));
const CalendarPage = lazy(() => import('./app/calendar/CalendarPage'));
const GuestsListPage = lazy(() => import('./app/guests/GuestsListPage'));
const GuestDetailPage = lazy(() => import('./app/guests/GuestDetailPage'));
const BlacklistPage = lazy(() => import('./app/guests/BlacklistPage'));
const TasksListPage = lazy(() => import('./app/tasks/TasksListPage'));
const TaskFormPage = lazy(() => import('./app/tasks/TaskFormPage'));
const TaskDetailPage = lazy(() => import('./app/tasks/TaskDetailPage'));
const CheckinsPage = lazy(() => import('./app/checkins/CheckinsPage'));
const FinancePage = lazy(() => import('./app/finance/FinancePage'));
const DocumentsPage = lazy(() => import('./app/documents/DocumentsPage'));
const MarketingPage = lazy(() => import('./app/marketing/MarketingPage'));
const CampaignDetailPage = lazy(() => import('./app/marketing/CampaignDetailPage'));
const ReportsPage = lazy(() => import('./app/reports/ReportsPage'));
const ImportPage = lazy(() => import('./app/import/ImportPage'));
const NotificationsPage = lazy(() => import('./app/notifications/NotificationsPage'));
const SupportListPage = lazy(() => import('./app/support/SupportListPage'));
const SupportTicketPage = lazy(() => import('./app/support/SupportTicketPage'));
const ContractsPage = lazy(() => import('./app/settings/ContractsPage'));
const VerificationSettingsPage = lazy(() => import('./app/settings/VerificationSettingsPage'));
const AuditPage = lazy(() => import('./app/audit/AuditPage'));
const ProfilePage = lazy(() => import('./app/profile/ProfilePage'));
const UsersListPage = lazy(() => import('./app/UsersListPage'));
const UserDetailPage = lazy(() => import('./app/UserDetailPage'));
const RolesListPage = lazy(() => import('./app/RolesListPage'));
const PublicCheckinPage = lazy(() => import('./app/checkin/PublicCheckinPage'));

function AppHome() {
  const { user } = useAuth();
  return <Navigate to={isPortalUser(user) ? 'portal' : 'dashboard'} replace />;
}

createRoot(document.getElementById('root')!).render(
  <BrowserRouter basename={ROUTER_BASENAME}>
    <AuthProvider>
      <Suspense fallback={<Loading page />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/checkin/:token" element={<PublicCheckinPage />} />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AppHome />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="portal" element={<PortalPage />} />
            <Route path="properties" element={<PropertiesListPage />} />
            <Route path="properties/new" element={<PropertyFormPage />} />
            <Route path="properties/:id" element={<PropertyDetailPage />} />
            <Route path="properties/:id/edit" element={<PropertyFormPage />} />
            <Route path="owners" element={<OwnersListPage />} />
            <Route path="owners/new" element={<OwnerFormPage />} />
            <Route path="owners/:id" element={<OwnerDetailPage />} />
            <Route path="owners/:id/edit" element={<OwnerFormPage />} />
            <Route path="reservations" element={<ReservationsListPage />} />
            <Route path="reservations/new" element={<ReservationFormPage />} />
            <Route path="reservations/:id" element={<ReservationDetailPage />} />
            <Route path="reservations/:id/edit" element={<ReservationFormPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="guests" element={<GuestsListPage />} />
            <Route path="guests/:id" element={<GuestDetailPage />} />
            <Route path="blacklist" element={<BlacklistPage />} />
            <Route path="tasks" element={<TasksListPage />} />
            <Route path="tasks/new" element={<TaskFormPage />} />
            <Route path="tasks/:id" element={<TaskDetailPage />} />
            <Route path="tasks/:id/edit" element={<TaskFormPage />} />
            <Route path="checkins" element={<CheckinsPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="marketing" element={<MarketingPage />} />
            <Route path="marketing/:id" element={<CampaignDetailPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="import" element={<ImportPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="support" element={<SupportListPage />} />
            <Route path="support/:id" element={<SupportTicketPage />} />
            <Route path="contracts" element={<ContractsPage />} />
            <Route path="verification-settings" element={<VerificationSettingsPage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="users" element={<UsersListPage />} />
            <Route path="users/:id" element={<UserDetailPage />} />
            <Route path="roles" element={<RolesListPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  </BrowserRouter>,
);
