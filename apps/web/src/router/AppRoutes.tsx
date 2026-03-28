import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthCallbackPage } from '../features/auth/AuthCallbackPage';
import { CertificateDetailPage } from '../features/certificate/CertificateDetailPage';
import { CertificateListPage } from '../features/certificate/CertificateListPage';
import { EnterprisePolicyDetailPage, EnterprisePolicyPage } from '../features/enterprise/EnterprisePolicyPage';
import { EnterpriseProfilePage } from '../features/enterprise/EnterpriseProfilePage';
import { EnterpriseProfileDetailPage } from '../features/enterprise/EnterpriseProfileDetailPage';
import { MonitorPage } from '../features/monitor/MonitorPage';
import { ReminderDashboardPage } from '../features/reminder/ReminderDashboardPage';
import { ReminderDetailPage } from '../features/reminder/ReminderDetailPage';
import { MyHomePage } from '../features/ui/MyHomePage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { AppShell } from '../layouts/AppShell';
import { RequireAuth } from './RequireAuth';
import { myRouteConfig } from './myRouteConfig';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path={myRouteConfig.myHome.path} element={<MyHomePage />} />
          <Route path={myRouteConfig.enterpriseProfile.path} element={<EnterpriseProfilePage />} />
          <Route path={`${myRouteConfig.enterpriseProfile.path}/:id`} element={<EnterpriseProfileDetailPage />} />
          <Route path={myRouteConfig.enterprisePolicy.path} element={<EnterprisePolicyPage />} />
          <Route path={`${myRouteConfig.enterprisePolicy.path}/:id`} element={<EnterprisePolicyDetailPage />} />
          <Route path={myRouteConfig.certificates.path} element={<CertificateListPage />} />
          <Route path={`${myRouteConfig.certificates.path}/:id`} element={<CertificateDetailPage />} />
          <Route path={myRouteConfig.reminders.path} element={<ReminderDashboardPage />} />
          <Route path={`${myRouteConfig.reminders.path}/:id`} element={<ReminderDetailPage />} />
          <Route path={myRouteConfig.monitors.path} element={<MonitorPage />} />
          <Route path={`${myRouteConfig.monitors.path}/:vesselId`} element={<MonitorPage />} />
          <Route path={myRouteConfig.settings.path} element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/my" replace />} />
    </Routes>
  );
}
