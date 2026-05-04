import { Suspense, lazy, type ComponentType } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { myRouteConfig } from './myRouteConfig';
import { officeRouteConfig } from './officeRouteConfig';
import { procurementRouteConfig } from './procurementRouteConfig';
import { workbenchRouteConfig } from './workbenchRouteConfig';

function lazyNamed<TModule extends Record<string, unknown>, TExport extends keyof TModule>(
  loader: () => Promise<TModule>,
  exportName: TExport,
) {
  return lazy(async () => ({
    default: (await loader())[exportName] as ComponentType,
  }));
}

const EnterpriseProfilePage = lazyNamed(
  () => import('../features/enterprise/EnterpriseProfilePage'),
  'EnterpriseProfilePage',
);
const AuthCallbackPage = lazyNamed(
  () => import('../features/auth/AuthCallbackPage'),
  'AuthCallbackPage',
);
const RequireAuth = lazyNamed(() => import('./RequireAuth'), 'RequireAuth');
const AppShell = lazyNamed(() => import('../layouts/AppShell'), 'AppShell');
const MyHomePage = lazyNamed(
  () => import('../features/ui/MyHomePage'),
  'MyHomePage',
);
const EnterpriseProfileDetailPage = lazyNamed(
  () => import('../features/enterprise/EnterpriseProfileDetailPage'),
  'EnterpriseProfileDetailPage',
);
const EnterprisePolicyPage = lazyNamed(
  () => import('../features/enterprise/EnterprisePolicyPage'),
  'EnterprisePolicyPage',
);
const EnterprisePolicyDetailPage = lazyNamed(
  () => import('../features/enterprise/EnterprisePolicyPage'),
  'EnterprisePolicyDetailPage',
);
const CertificateListPage = lazyNamed(
  () => import('../features/certificate/CertificateListPage'),
  'CertificateListPage',
);
const CertificateDetailPage = lazyNamed(
  () => import('../features/certificate/CertificateDetailPage'),
  'CertificateDetailPage',
);
const ReminderDashboardPage = lazyNamed(
  () => import('../features/reminder/ReminderDashboardPage'),
  'ReminderDashboardPage',
);
const ReminderDetailPage = lazyNamed(
  () => import('../features/reminder/ReminderDetailPage'),
  'ReminderDetailPage',
);
const MonitorPage = lazyNamed(() => import('../features/monitor/MonitorPage'), 'MonitorPage');
const SettingsPage = lazyNamed(() => import('../features/settings/SettingsPage'), 'SettingsPage');
const OfficeHomePage = lazyNamed(() => import('../features/office/OfficeHomePage'), 'OfficeHomePage');
const OfficeSearchPage = lazyNamed(() => import('../features/office/OfficeSearchPage'), 'OfficeSearchPage');
const OfficeAdminPage = lazyNamed(() => import('../features/office/OfficeAdminPage'), 'OfficeAdminPage');
const ProcurementOrderListPage = lazyNamed(
  () => import('../features/procurement/ProcurementOrderListPage'),
  'ProcurementOrderListPage',
);
const ProcurementOrderCreatePage = lazyNamed(
  () => import('../features/procurement/ProcurementOrderCreatePage'),
  'ProcurementOrderCreatePage',
);
const ProcurementOrderDetailPage = lazyNamed(
  () => import('../features/procurement/ProcurementOrderDetailPage'),
  'ProcurementOrderDetailPage',
);
const ProcurementApprovalPage = lazyNamed(
  () => import('../features/procurement/ProcurementApprovalPage'),
  'ProcurementApprovalPage',
);
const ProcurementReportPage = lazyNamed(
  () => import('../features/procurement/ProcurementReportPage'),
  'ProcurementReportPage',
);
const ProcurementReportRequestDetailPage = lazyNamed(
  () => import('../features/procurement/ProcurementReportRequestDetailPage'),
  'ProcurementReportRequestDetailPage',
);
const ProcurementReportApprovalPage = lazyNamed(
  () => import('../features/procurement/ProcurementReportApprovalPage'),
  'ProcurementReportApprovalPage',
);
const ProcurementDictionaryAdminPage = lazyNamed(
  () => import('../features/procurement/ProcurementDictionaryAdminPage'),
  'ProcurementDictionaryAdminPage',
);
const WorkbenchHomeRoutePage = lazyNamed(
  () => import('../features/workbench/WorkbenchHomeRoutePage'),
  'WorkbenchHomeRoutePage',
);
const WorkbenchModulePage = lazyNamed(
  () => import('../features/workbench/WorkbenchModulePage'),
  'WorkbenchModulePage',
);
const WorkbenchRecordDetailPage = lazyNamed(
  () => import('../features/workbench/WorkbenchRecordDetailPage'),
  'WorkbenchRecordDetailPage',
);
const WorkbenchAttendancePage = lazyNamed(
  () => import('../features/workbench/WorkbenchAttendancePage'),
  'WorkbenchAttendancePage',
);
const WorkbenchApprovalPage = lazyNamed(
  () => import('../features/workbench/WorkbenchApprovalPage'),
  'WorkbenchApprovalPage',
);

function renderLazyPage(page: JSX.Element) {
  return (
    <Suspense
      fallback={
        <div className="route-loading-panel" role="status" aria-live="polite">
          <span>页面加载中...</span>
        </div>
      }
    >
      {page}
    </Suspense>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth/callback" element={renderLazyPage(<AuthCallbackPage />)} />
      <Route element={renderLazyPage(<RequireAuth />)}>
        <Route element={renderLazyPage(<AppShell />)}>
          <Route path={myRouteConfig.myHome.path} element={renderLazyPage(<MyHomePage />)} />
          <Route path={myRouteConfig.enterpriseProfile.path} element={renderLazyPage(<EnterpriseProfilePage />)} />
          <Route path={myRouteConfig.enterpriseProfile.detailPath} element={renderLazyPage(<EnterpriseProfileDetailPage />)} />
          <Route path={myRouteConfig.enterprisePolicy.path} element={renderLazyPage(<EnterprisePolicyPage />)} />
          <Route path={myRouteConfig.enterprisePolicy.detailPath} element={renderLazyPage(<EnterprisePolicyDetailPage />)} />
          <Route path={myRouteConfig.certificates.path} element={renderLazyPage(<CertificateListPage />)} />
          <Route path={myRouteConfig.certificates.detailPath} element={renderLazyPage(<CertificateDetailPage />)} />
          <Route path={myRouteConfig.reminders.path} element={renderLazyPage(<ReminderDashboardPage />)} />
          <Route path={myRouteConfig.reminders.detailPath} element={renderLazyPage(<ReminderDetailPage />)} />
          <Route path={myRouteConfig.monitors.path} element={renderLazyPage(<MonitorPage />)} />
          <Route path={myRouteConfig.monitors.detailPath} element={renderLazyPage(<MonitorPage />)} />
          <Route path={myRouteConfig.settings.path} element={renderLazyPage(<SettingsPage />)} />
          <Route path={officeRouteConfig.officeHome.path} element={renderLazyPage(<OfficeHomePage />)} />
          <Route path={officeRouteConfig.officeSearch.path} element={renderLazyPage(<OfficeSearchPage />)} />
          <Route path={officeRouteConfig.officeAdmin.path} element={renderLazyPage(<OfficeAdminPage />)} />
          <Route path={procurementRouteConfig.orderList.path} element={renderLazyPage(<ProcurementOrderListPage />)} />
          <Route path={procurementRouteConfig.orderCreate.path} element={renderLazyPage(<ProcurementOrderCreatePage />)} />
          <Route path={procurementRouteConfig.orderDetail.path} element={renderLazyPage(<ProcurementOrderDetailPage />)} />
          <Route path={procurementRouteConfig.approvals.path} element={renderLazyPage(<ProcurementApprovalPage />)} />
          <Route path={procurementRouteConfig.reports.path} element={renderLazyPage(<ProcurementReportPage />)} />
          <Route path={procurementRouteConfig.reportRequestDetail.path} element={renderLazyPage(<ProcurementReportRequestDetailPage />)} />
          <Route path={procurementRouteConfig.reportApprovals.path} element={renderLazyPage(<ProcurementReportApprovalPage />)} />
          <Route path={procurementRouteConfig.dictionaries.path} element={renderLazyPage(<ProcurementDictionaryAdminPage />)} />
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
