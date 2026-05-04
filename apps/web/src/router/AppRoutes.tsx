import { Suspense, lazy } from 'react';
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
import { ProcurementApprovalPage } from '../features/procurement/ProcurementApprovalPage';
import { ProcurementDictionaryAdminPage } from '../features/procurement/ProcurementDictionaryAdminPage';
import { ProcurementOrderCreatePage } from '../features/procurement/ProcurementOrderCreatePage';
import { ProcurementOrderDetailPage } from '../features/procurement/ProcurementOrderDetailPage';
import { ProcurementOrderListPage } from '../features/procurement/ProcurementOrderListPage';
import { ProcurementReportApprovalPage } from '../features/procurement/ProcurementReportApprovalPage';
import { ProcurementReportPage } from '../features/procurement/ProcurementReportPage';
import { ProcurementReportRequestDetailPage } from '../features/procurement/ProcurementReportRequestDetailPage';
import { AppShell } from '../layouts/AppShell';
import { RequireAuth } from './RequireAuth';
import { myRouteConfig } from './myRouteConfig';
import { officeRouteConfig } from './officeRouteConfig';
import { procurementRouteConfig } from './procurementRouteConfig';
import { workbenchRouteConfig } from './workbenchRouteConfig';

const WorkbenchHomeRoutePage = lazy(async () => ({
  default: (await import('../features/workbench/WorkbenchHomeRoutePage')).WorkbenchHomeRoutePage,
}));
const WorkbenchModulePage = lazy(async () => ({
  default: (await import('../features/workbench/WorkbenchModulePage')).WorkbenchModulePage,
}));
const WorkbenchRecordDetailPage = lazy(async () => ({
  default: (await import('../features/workbench/WorkbenchRecordDetailPage')).WorkbenchRecordDetailPage,
}));
const WorkbenchAttendancePage = lazy(async () => ({
  default: (await import('../features/workbench/WorkbenchAttendancePage')).WorkbenchAttendancePage,
}));
const WorkbenchApprovalPage = lazy(async () => ({
  default: (await import('../features/workbench/WorkbenchApprovalPage')).WorkbenchApprovalPage,
}));

function renderLazyPage(page: JSX.Element) {
  return <Suspense fallback={<div>页面加载中...</div>}>{page}</Suspense>;
}

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
          <Route path={procurementRouteConfig.orderList.path} element={<ProcurementOrderListPage />} />
          <Route path={procurementRouteConfig.orderCreate.path} element={<ProcurementOrderCreatePage />} />
          <Route path={procurementRouteConfig.orderDetail.path} element={<ProcurementOrderDetailPage />} />
          <Route path={procurementRouteConfig.approvals.path} element={<ProcurementApprovalPage />} />
          <Route path={procurementRouteConfig.reports.path} element={<ProcurementReportPage />} />
          <Route path={procurementRouteConfig.reportRequestDetail.path} element={<ProcurementReportRequestDetailPage />} />
          <Route path={procurementRouteConfig.reportApprovals.path} element={<ProcurementReportApprovalPage />} />
          <Route path={procurementRouteConfig.dictionaries.path} element={<ProcurementDictionaryAdminPage />} />
          <Route path={workbenchRouteConfig.home.path} element={renderLazyPage(<WorkbenchHomeRoutePage />)} />
          <Route path={workbenchRouteConfig.module.path} element={renderLazyPage(<WorkbenchModulePage />)} />
          <Route path={workbenchRouteConfig.recordDetail.path} element={renderLazyPage(<WorkbenchRecordDetailPage />)} />
          <Route path={workbenchRouteConfig.attendanceStatistics.path} element={renderLazyPage(<WorkbenchAttendancePage />)} />
          <Route path={workbenchRouteConfig.approvals.path} element={renderLazyPage(<WorkbenchApprovalPage />)} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/my" replace />} />
    </Routes>
  );
}
