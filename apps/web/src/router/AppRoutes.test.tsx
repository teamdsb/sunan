import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from './AppRoutes';
import { myRouteConfig } from './myRouteConfig';
import { buildDetailHref, resolveBackHref } from './myRouteState';
import { authReducer, loginSucceeded } from '../features/auth/authSlice';
import { myUiReducer } from '../features/ui/myUiSlice';
import { baseApi } from '../app/baseApi';

vi.mock('../features/ui/MyHomePage', () => ({
  MyHomePage: () => <div>MY_HOME</div>,
}));

vi.mock('../features/enterprise/EnterpriseProfilePage', () => ({
  EnterpriseProfilePage: () => <div>ENTERPRISE_PROFILE</div>,
}));

vi.mock('../features/enterprise/EnterprisePolicyPage', () => ({
  EnterprisePolicyPage: () => <div>ENTERPRISE_POLICY</div>,
  EnterprisePolicyDetailPage: () => <div>ENTERPRISE_POLICY_DETAIL</div>,
}));

vi.mock('../features/certificate/CertificateListPage', () => ({
  CertificateListPage: () => <div>CERTIFICATE_LIST</div>,
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

function renderRoute(path: string) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      myUi: myUiReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
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
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </Provider>,
  );
}

describe('AppRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the my home page at /my', () => {
    renderRoute('/my');
    expect(screen.getByText('MY_HOME')).toBeInTheDocument();
  });

  it.each([
    ['/my/enterprise-profile', 'ENTERPRISE_PROFILE'],
    ['/my/enterprise-policy', 'ENTERPRISE_POLICY'],
    ['/my/certificates', 'CERTIFICATE_LIST'],
    ['/my/reminders', 'REMINDER_DASHBOARD'],
    ['/my/monitors', 'MONITOR_PAGE'],
    ['/my/settings', 'SETTINGS_PAGE'],
  ] as const)('renders %s', (path, expectedText) => {
    renderRoute(path);
    expect(screen.getByText(expectedText)).toBeInTheDocument();
  });

  it.each([
    [myRouteConfig.reminders.path, myRouteConfig.reminders.detailPath, '/my/reminders/1', 'REMINDER_DETAIL'],
    [myRouteConfig.enterprisePolicy.path, myRouteConfig.enterprisePolicy.detailPath, '/my/enterprise-policy/1', 'ENTERPRISE_POLICY_DETAIL'],
  ] as const)('renders detail route %s', (listPath, detailPath, path, expectedText) => {
    expect(detailPath).toMatch(/\/:id$/);
    expect(buildDetailHref(listPath, '1')).toBe(path);
    renderRoute(path);
    expect(screen.getByText(expectedText)).toBeInTheDocument();
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
    expect(resolveBackHref('/my/reminders', '?view=list&status=pending')).toBe('/my/reminders?view=list&status=pending');
  });
});
