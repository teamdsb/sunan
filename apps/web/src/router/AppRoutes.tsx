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
import { OfficeAdminPage } from '../features/office/OfficeAdminPage';
import { OfficeHomePage } from '../features/office/OfficeHomePage';
import { OfficeSearchPage } from '../features/office/OfficeSearchPage';
import { AppShell } from '../layouts/AppShell';
import { RequireAuth } from './RequireAuth';
import { myRouteConfig } from './myRouteConfig';
import { officeRouteConfig } from './officeRouteConfig';
import { PlaceholderPage } from './PlaceholderPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path={myRouteConfig.myHome.path} element={<MyHomePage />} />
          <Route path={myRouteConfig.enterpriseProfile.path} element={<EnterpriseProfilePage />} />
          <Route path={myRouteConfig.enterpriseProfile.detailPath} element={<EnterpriseProfileDetailPage />} />
          <Route path={myRouteConfig.enterprisePolicy.path} element={<EnterprisePolicyPage />} />
          <Route path={myRouteConfig.enterprisePolicy.detailPath} element={<EnterprisePolicyDetailPage />} />
          <Route path={myRouteConfig.certificates.path} element={<CertificateListPage />} />
          <Route path={myRouteConfig.certificates.detailPath} element={<CertificateDetailPage />} />
          <Route path={myRouteConfig.reminders.path} element={<ReminderDashboardPage />} />
          <Route path={myRouteConfig.reminders.detailPath} element={<ReminderDetailPage />} />
          <Route path={myRouteConfig.monitors.path} element={<MonitorPage />} />
          <Route path={myRouteConfig.monitors.detailPath} element={<MonitorPage />} />
          <Route path={myRouteConfig.settings.path} element={<SettingsPage />} />
          <Route path={officeRouteConfig.officeHome.path} element={<OfficeHomePage />} />
          <Route path={officeRouteConfig.officeSearch.path} element={<OfficeSearchPage />} />
          <Route path={officeRouteConfig.officeAdmin.path} element={<OfficeAdminPage />} />
          <Route
            path="/procurement"
            element={<PlaceholderPage title="采购管理" description="采购管理将在后续里程碑接入审批、报表和打印能力。" />}
          />
          <Route
            path="/workbench"
            element={<PlaceholderPage title="工作平台" description="工作平台将在后续里程碑接入部门业务模块和工作组能力。" />}
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/my" replace />} />
    </Routes>
  );
}
