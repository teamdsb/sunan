import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from './AppRoutes';
import { myRouteConfig } from './myRouteConfig';
import { buildDetailHref, resolveBackHref } from './myRouteState';
import { authReducer, loginSucceeded } from '../features/auth/authSlice';
import { myUiReducer } from '../features/ui/myUiSlice';
import { baseApi } from '../app/baseApi';
import { officeRouteConfig } from './officeRouteConfig';
import { procurementRouteConfig } from './procurementRouteConfig';
import { workbenchRouteConfig } from './workbenchRouteConfig';
import {
  CURRENT_OAUTH_PERMISSION_VERSION,
  OAUTH_PERMISSION_VERSION_STORAGE_KEY,
} from '../features/auth/oauth';

vi.mock('../features/ui/MyHomePage', () => ({
  MyHomePage: () => <div>MY_HOME</div>,
}));

vi.mock('../features/enterprise/EnterpriseProfilePage', () => ({
  EnterpriseProfilePage: () => <div>ENTERPRISE_PROFILE</div>,
}));

vi.mock('../features/enterprise/EnterpriseProfileDetailPage', () => ({
  EnterpriseProfileDetailPage: () => <div>ENTERPRISE_PROFILE_DETAIL</div>,
}));

vi.mock('../features/enterprise/EnterprisePolicyPage', () => ({
  EnterprisePolicyPage: () => <div>ENTERPRISE_POLICY</div>,
  EnterprisePolicyDetailPage: () => <div>ENTERPRISE_POLICY_DETAIL</div>,
}));

vi.mock('../features/certificate/CertificateListPage', () => ({
  CertificateListPage: () => <div>CERTIFICATE_LIST</div>,
}));

vi.mock('../features/certificate/CertificateDetailPage', () => ({
  CertificateDetailPage: () => <div>CERTIFICATE_DETAIL</div>,
}));

vi.mock('../features/reminder/ReminderDashboardPage', () => ({
  ReminderDashboardPage: () => <div>REMINDER_DASHBOARD</div>,
}));

vi.mock('../features/reminder/ReminderDetailPage', () => ({
  ReminderDetailPage: () => <div>REMINDER_DETAIL</div>,
}));

vi.mock('../features/monitor/MonitorPage', () => ({
  MonitorPage: () => <div>MONITOR_PAGE</div>,
}));

vi.mock('../features/settings/SettingsPage', () => ({
  SettingsPage: () => <div>SETTINGS_PAGE</div>,
}));

vi.mock('../features/office/OfficeHomePage', () => ({
  OfficeHomePage: () => <div>OFFICE_HOME</div>,
}));

vi.mock('../features/office/OfficeSearchPage', () => ({
  OfficeSearchPage: () => <div>OFFICE_SEARCH</div>,
}));

vi.mock('../features/office/OfficeAdminPage', () => ({
  OfficeAdminPage: () => <div>OFFICE_ADMIN</div>,
}));

vi.mock('../features/procurement/ProcurementOrderListPage', () => ({
  ProcurementOrderListPage: () => <div>PROCUREMENT_ORDER_LIST</div>,
}));

vi.mock('../features/procurement/ProcurementOrderCreatePage', () => ({
  ProcurementOrderCreatePage: () => <div>PROCUREMENT_ORDER_CREATE</div>,
}));

vi.mock('../features/procurement/ProcurementOrderDetailPage', () => ({
  ProcurementOrderDetailPage: () => <div>PROCUREMENT_ORDER_DETAIL</div>,
}));

vi.mock('../features/procurement/ProcurementApprovalPage', () => ({
  ProcurementApprovalPage: () => <div>PROCUREMENT_APPROVAL</div>,
}));

vi.mock('../features/procurement/ProcurementReportPage', () => ({
  ProcurementReportPage: () => <div>PROCUREMENT_REPORT</div>,
}));

vi.mock('../features/procurement/ProcurementReportRequestDetailPage', () => ({
  ProcurementReportRequestDetailPage: () => <div>PROCUREMENT_REPORT_REQUEST_DETAIL</div>,
}));

vi.mock('../features/procurement/ProcurementReportApprovalPage', () => ({
  ProcurementReportApprovalPage: () => <div>PROCUREMENT_REPORT_APPROVAL</div>,
}));

vi.mock('../features/procurement/ProcurementDictionaryAdminPage', () => ({
  ProcurementDictionaryAdminPage: () => <div>PROCUREMENT_DICTIONARY_ADMIN</div>,
}));

vi.mock('../features/workbench/WorkbenchHomeRoutePage', () => ({
  WorkbenchHomeRoutePage: () => <div>WORKBENCH_HOME</div>,
}));

vi.mock('../features/workbench/MasterDataPage', () => ({
  MasterDataPage: () => <div>MASTER_DATA</div>,
}));

vi.mock('../features/workbench/TaskCenterPage', () => ({
  TaskCenterPage: () => <div>TASK_CENTER</div>,
}));

vi.mock('../features/workbench/TaskDetailPage', () => ({
  TaskDetailPage: () => <div>TASK_DETAIL</div>,
}));

vi.mock('../features/workbench/PlanManagementPage', () => ({
  PlanManagementPage: () => <div>PLAN_MANAGEMENT</div>,
}));

vi.mock('../features/workbench/WorkbenchModulePage', () => ({
  WorkbenchModulePage: () => <div>WORKBENCH_MODULE</div>,
}));

vi.mock('../features/workbench/WorkbenchRecordDetailPage', () => ({
  WorkbenchRecordDetailPage: () => <div>WORKBENCH_RECORD_DETAIL</div>,
}));

vi.mock('../features/workbench/WorkbenchAttendancePage', () => ({
  WorkbenchAttendancePage: () => <div>WORKBENCH_ATTENDANCE</div>,
}));

vi.mock('../features/workbench/WorkbenchApprovalPage', () => ({
  WorkbenchApprovalPage: () => <div>WORKBENCH_APPROVAL</div>,
}));

function BackHrefConsumer() {
  const location = useLocation();
  const backHref = resolveBackHref('/my/reminders', location.search);

  return <a href={backHref}>BACK_HREF:{backHref}</a>;
}

function renderRoute(path: string) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      myUi: myUiReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }).concat(baseApi.middleware),
  });
  store.dispatch(
    loginSucceeded({
      accessToken: 'token',
      expiresIn: 3600,
      user: {
        userId: 'u1',
        name: '张三',
        department: ['总经办'],
        roles: ['all_authenticated'],
      },
    }),
  );

  return render(
    <Provider store={store}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </Provider>,
  );
}

function renderBackHref(path: string) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      myUi: myUiReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }).concat(baseApi.middleware),
  });
  store.dispatch(
    loginSucceeded({
      accessToken: 'token',
      expiresIn: 3600,
      user: {
        userId: 'u1',
        name: '张三',
        department: ['总经办'],
        roles: ['all_authenticated'],
      },
    }),
  );

  return render(
    <Provider store={store}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={[path]}>
        <BackHrefConsumer />
      </MemoryRouter>
    </Provider>,
  );
}

describe('AppRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.setItem(
      OAUTH_PERMISSION_VERSION_STORAGE_KEY,
      CURRENT_OAUTH_PERMISSION_VERSION,
    );
  });

  it('renders the my home page at /my', async () => {
    renderRoute('/my');
    expect(await screen.findByText('MY_HOME', undefined, { timeout: 15000 })).toBeInTheDocument();
  });

  it.each([
    ['/my/enterprise-profile', 'ENTERPRISE_PROFILE'],
    ['/my/enterprise-policy', 'ENTERPRISE_POLICY'],
    ['/my/certificates', 'CERTIFICATE_LIST'],
    ['/my/reminders', 'REMINDER_DASHBOARD'],
    ['/my/monitors', 'MONITOR_PAGE'],
    ['/my/settings', 'SETTINGS_PAGE'],
    [officeRouteConfig.officeHome.path, 'OFFICE_HOME'],
    [officeRouteConfig.officeSearch.path, 'OFFICE_SEARCH'],
    [officeRouteConfig.officeAdmin.path, 'OFFICE_ADMIN'],
    [procurementRouteConfig.orderList.path, 'PROCUREMENT_ORDER_LIST'],
    [procurementRouteConfig.orderCreate.path, 'PROCUREMENT_ORDER_CREATE'],
    ['/procurement/orders/order-1', 'PROCUREMENT_ORDER_DETAIL'],
    [procurementRouteConfig.approvals.path, 'PROCUREMENT_APPROVAL'],
    [procurementRouteConfig.reports.path, 'PROCUREMENT_REPORT'],
    ['/procurement/report-requests/request-1', 'PROCUREMENT_REPORT_REQUEST_DETAIL'],
    [procurementRouteConfig.reportApprovals.path, 'PROCUREMENT_REPORT_APPROVAL'],
    [procurementRouteConfig.dictionaries.path, 'PROCUREMENT_DICTIONARY_ADMIN'],
    [workbenchRouteConfig.home.path, 'WORKBENCH_HOME'],
    [workbenchRouteConfig.masterData.path, 'MASTER_DATA'],
    [workbenchRouteConfig.tasks.path, 'TASK_CENTER'],
    [workbenchRouteConfig.taskDetail.buildPath('task-1'), 'TASK_DETAIL'],
    [workbenchRouteConfig.plans.path, 'PLAN_MANAGEMENT'],
    [workbenchRouteConfig.planDetail.buildPath('plan-1'), 'PLAN_MANAGEMENT'],
    [workbenchRouteConfig.module.buildPath('shipping_chart_update'), 'WORKBENCH_MODULE'],
    [workbenchRouteConfig.recordDetail.buildPath('record-1'), 'WORKBENCH_RECORD_DETAIL'],
    [workbenchRouteConfig.attendanceStatistics.path, 'WORKBENCH_ATTENDANCE'],
    [workbenchRouteConfig.approvals.path, 'WORKBENCH_APPROVAL'],
  ] as const)('renders %s', async (path, expectedText) => {
    renderRoute(path);
    expect(await screen.findByText(expectedText)).toBeInTheDocument();
  });

  it.each([
    [myRouteConfig.reminders.path, myRouteConfig.reminders.detailPath, '1', '/my/reminders/1', 'REMINDER_DETAIL'],
    [myRouteConfig.enterprisePolicy.path, myRouteConfig.enterprisePolicy.detailPath, '1', '/my/enterprise-policy/1', 'ENTERPRISE_POLICY_DETAIL'],
    [myRouteConfig.enterpriseProfile.path, myRouteConfig.enterpriseProfile.detailPath, '1', '/my/enterprise-profile/1', 'ENTERPRISE_PROFILE_DETAIL'],
    [myRouteConfig.certificates.path, myRouteConfig.certificates.detailPath, '1', '/my/certificates/1', 'CERTIFICATE_DETAIL'],
    [myRouteConfig.monitors.path, myRouteConfig.monitors.detailPath, 'vessel-1', '/my/monitors/vessel-1', 'MONITOR_PAGE'],
  ] as const)('renders detail route %s', async (listPath, detailPath, id, path, expectedText) => {
    expect(detailPath).toMatch(/\/:(id|vesselId)$/);
    const href = buildDetailHref(listPath, id);
    expect(href).toBe(`${path}?backTo=${encodeURIComponent(listPath)}`);
    renderRoute(href);
    expect(await screen.findByText(expectedText)).toBeInTheDocument();
  });

  it('exposes the shared my route config for route-aware consumers', () => {
    expect(myRouteConfig.myHome.path).toBe('/my');
    expect(myRouteConfig.enterpriseProfile.path).toBe('/my/enterprise-profile');
    expect(myRouteConfig.enterprisePolicy.path).toBe('/my/enterprise-policy');
    expect(myRouteConfig.certificates.path).toBe('/my/certificates');
    expect(myRouteConfig.reminders.path).toBe('/my/reminders');
    expect(myRouteConfig.monitors.path).toBe('/my/monitors');
    expect(myRouteConfig.settings.path).toBe('/my/settings');
  });

  it('reconstructs the list url when returning from detail pages', () => {
    const detailSearch = `?backTo=${encodeURIComponent('/my/reminders?page=2&status=pending')}`;
    expect(buildDetailHref('/my/reminders', '1', '?page=2&status=pending')).toBe(`/my/reminders/1${detailSearch}`);
    expect(resolveBackHref('/my/reminders', detailSearch)).toBe('/my/reminders?page=2&status=pending');
    expect(resolveBackHref('/my/reminders', '?backTo=https%3A%2F%2Fevil.example')).toBe('/my/reminders');
    expect(resolveBackHref('/my/reminders', '?backTo=%2F%2Fevil.example')).toBe('/my/reminders');
    expect(resolveBackHref('/my/reminders', `?backTo=${encodeURIComponent('/my/reminders-archive?x=1')}`)).toBe('/my/reminders');
    expect(resolveBackHref('/my/reminders', `?backTo=${encodeURIComponent('/my/settings')}`)).toBe('/my/reminders');
    expect(resolveBackHref('/my/reminders')).toBe('/my/reminders');
  });

  it('renders the round-trip back href from a generated detail url', () => {
    const href = buildDetailHref('/my/reminders', '1', '?page=2&status=pending');
    renderBackHref(href);

    expect(screen.getByRole('link', { name: 'BACK_HREF:/my/reminders?page=2&status=pending' })).toHaveAttribute(
      'href',
      '/my/reminders?page=2&status=pending',
    );
  });

  it('falls back to the list path for an unsafe backTo value', () => {
    renderBackHref('/my/reminders/1?backTo=%2Fmy%2Fsettings');

    expect(screen.getByRole('link', { name: 'BACK_HREF:/my/reminders' })).toHaveAttribute('href', '/my/reminders');
  });
});
