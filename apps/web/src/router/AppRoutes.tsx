import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthCallbackPage } from '../features/auth/AuthCallbackPage';
import { CertificateDetailPage } from '../features/certificate/CertificateDetailPage';
import { CertificateListPage } from '../features/certificate/CertificateListPage';
import { EnterprisePolicyDetailPage, EnterprisePolicyPage } from '../features/enterprise/EnterprisePolicyPage';
import { EnterpriseProfilePage } from '../features/enterprise/EnterpriseProfilePage';
import { EnterpriseProfileDetailPage } from '../features/enterprise/EnterpriseProfileDetailPage';
import { MonitorPage } from '../features/monitor/MonitorPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { AppShell } from '../layouts/AppShell';
import { PlaceholderPage } from './PlaceholderPage';
import { RequireAuth } from './RequireAuth';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route
            path="/my"
            element={<PlaceholderPage title="我的模块首页" description="Wave 3 业务页面已接入，请从导航进入各模块。" />}
          />
          <Route path="/my/enterprise-profile" element={<EnterpriseProfilePage />} />
          <Route path="/my/enterprise-profile/:id" element={<EnterpriseProfileDetailPage />} />
          <Route path="/my/enterprise-policy" element={<EnterprisePolicyPage />} />
          <Route path="/my/enterprise-policy/:id" element={<EnterprisePolicyDetailPage />} />
          <Route path="/my/certificates" element={<CertificateListPage />} />
          <Route path="/my/certificates/:id" element={<CertificateDetailPage />} />
          <Route path="/my/monitors" element={<MonitorPage />} />
          <Route path="/my/monitors/:vesselId" element={<MonitorPage />} />
          <Route path="/my/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/my" replace />} />
    </Routes>
  );
}


