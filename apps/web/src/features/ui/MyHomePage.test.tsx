import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { MyHomePage } from './MyHomePage';

const mockSelector = vi.fn();
const mockCertificates = vi.fn();
const mockMonitors = vi.fn();
const mockReminderDashboard = vi.fn();
const mockReminderList = vi.fn();
const mockWorkbenchDashboard = vi.fn();
const mockEnterpriseProfiles = vi.fn();
const mockEnterprisePolicies = vi.fn();

vi.mock('../../app/hooks', () => ({
  useAppSelector: () => mockSelector(),
}));

vi.mock('../certificate/certificateApi', () => ({
  useGetCertificatesQuery: (params: unknown) => mockCertificates(params),
}));

vi.mock('../monitor/monitorApi', () => ({
  useGetShipMonitorsQuery: (params: unknown) => mockMonitors(params),
}));

vi.mock('../reminder/reminderApi', () => ({
  useGetReminderDashboardQuery: () => mockReminderDashboard(),
  useGetReminderListQuery: (params: unknown) => mockReminderList(params),
}));

vi.mock('../workbench/workbenchApi', () => ({
  useGetWorkbenchDashboardQuery: () => mockWorkbenchDashboard(),
}));

vi.mock('../enterprise/enterpriseApi', () => ({
  useGetEnterpriseProfilesQuery: (params: unknown) => mockEnterpriseProfiles(params),
  useGetEnterprisePoliciesQuery: (params: unknown) => mockEnterprisePolicies(params),
}));

describe('MyHomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelector.mockReturnValue({
      name: '王工',
      department: ['船务部'],
      position: '经理',
    });
    mockEnterpriseProfiles.mockReturnValue({
      data: { data: [{ id: 'profile-1' }], meta: { total: 3 } },
      isLoading: false,
      isError: false,
    });
    mockEnterprisePolicies.mockReturnValue({
      data: { data: [{ id: 'policy-1' }], meta: { total: 7 } },
      isLoading: false,
      isError: false,
    });
    mockCertificates.mockReturnValue({
      data: {
        data: [
          { id: 'c1', title: '国籍证书' },
          { id: 'c2', title: '船检证书' },
        ],
        meta: { total: 2 },
      },
      isLoading: false,
      isError: false,
    });
    mockMonitors.mockReturnValue({
      data: {
        data: [
          { id: 'm1', vesselId: 'vessel-1', isActive: true },
          { id: 'm2', vesselId: 'vessel-1', isActive: true },
          { id: 'm3', vesselId: 'vessel-2', isActive: true },
        ],
      },
      isLoading: false,
      isError: false,
    });
    mockReminderDashboard.mockReturnValue({
      data: {
        data: {
          totalPending: 4,
          totalOverdue: 1,
          totalAcknowledged: 8,
          byOwnerType: [],
          byCertificateType: [],
        },
      },
      isLoading: false,
      isError: false,
    });
    mockReminderList.mockImplementation((params: { reminderType?: string }) => {
      if (params?.reminderType === 'overdue') {
        return {
          data: {
            data: [
              {
                id: 'r-overdue',
                certificateTitle: '消防证书',
                ownerName: '苏南018',
                scheduledDate: '2026-06-16',
                reminderType: 'overdue',
                status: 'pending',
                daysBeforeExpiry: -2,
              },
            ],
          },
          isLoading: false,
          isError: false,
        };
      }

      return {
        data: {
          data: [
            {
              id: 'r-pending',
              certificateTitle: '船检证书',
              ownerName: '苏南012',
              scheduledDate: '2026-06-16',
              reminderType: 'upcoming',
              status: 'pending',
              daysBeforeExpiry: 12,
            },
          ],
        },
        isLoading: false,
        isError: false,
      };
    });
    mockWorkbenchDashboard.mockReturnValue({
      data: {
        data: {
          pendingTotal: 3,
          approvalPendingTotal: 2,
          alerts: [{ code: 'approval_pending', message: '当前有 2 条审批待处理。' }],
          modules: [],
        },
      },
      isLoading: false,
      isError: false,
    });
  });

  it('renders six grid entries including reminders', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MyHomePage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('my-home-entry-my-enterprise-profile')).toHaveAttribute('href', '/my/enterprise-profile');
    expect(screen.getByTestId('my-home-entry-my-enterprise-policy')).toHaveAttribute('href', '/my/enterprise-policy');
    expect(screen.getByTestId('my-home-entry-my-certificates')).toHaveAttribute('href', '/my/certificates');
    expect(screen.getByTestId('my-home-entry-my-reminders')).toHaveAttribute('href', '/my/reminders');
    expect(screen.getByTestId('my-home-entry-my-monitors')).toHaveAttribute('href', '/my/monitors');
    expect(screen.getByTestId('my-home-entry-my-settings')).toHaveAttribute('href', '/my/settings');
  });

  it('renders the blue enterprise card grid hooks', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MyHomePage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('my-home-page')).toHaveClass('my-home-page');
    expect(screen.getByTestId('my-home-grid')).toHaveClass('my-home-grid', 'my-home-card-grid');
    expect(screen.getAllByRole('link')).toHaveLength(6);
  });

  it('renders the refreshed command dashboard copy', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MyHomePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '王工 · 船务部' })).toBeInTheDocument();
    expect(screen.getByText('欢迎使用船舶管理工作台')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '当前重点' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '常用入口' })).toBeInTheDocument();
    expect(screen.getByText('待办审批')).toBeInTheDocument();
    expect(screen.getByText('工作平台审批待处理')).toBeInTheDocument();
    expect(screen.getAllByText('证照预警').length).toBeGreaterThan(0);
  });

  it('does not count overdue pending reminders twice', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MyHomePage />
      </MemoryRouter>,
    );

    expect(screen.getByText('4 条需复核')).toBeInTheDocument();
    expect(screen.queryByText('5 条需复核')).toBeNull();
    expect(screen.getByText('当前待办')).toBeInTheDocument();
    expect(mockReminderList).toHaveBeenCalledWith({
      page: 1,
      pageSize: 5,
      reminderType: 'overdue',
      status: 'pending',
    });
  });

  it('does not display acknowledged overdue reminders as active warnings', () => {
    mockReminderList.mockImplementation((params: { reminderType?: string }) => ({
      data: {
        data:
          params?.reminderType === 'overdue'
            ? [
                {
                  id: 'r-acknowledged',
                  certificateTitle: '已确认消防证书',
                  ownerName: '苏南018',
                  scheduledDate: '2026-06-16',
                  reminderType: 'overdue',
                  status: 'acknowledged',
                  daysBeforeExpiry: -2,
                },
              ]
            : [],
      },
      isLoading: false,
      isError: false,
    }));

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MyHomePage />
      </MemoryRouter>,
    );

    expect(screen.queryByText('已确认消防证书')).toBeNull();
  });

  it('renders dashboard values from real API hooks instead of hardcoded demo data', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MyHomePage />
      </MemoryRouter>,
    );

    expect(mockCertificates).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active' }),
    );
    expect(mockMonitors).toHaveBeenCalledWith({ activeOnly: true });
    expect(mockEnterpriseProfiles).toHaveBeenCalledWith({ page: 1, pageSize: 1 });
    expect(mockEnterprisePolicies).toHaveBeenCalledWith({ page: 1, pageSize: 1 });
    expect(screen.getByText('企业资料 3 项')).toBeInTheDocument();
    expect(screen.getByText('制度文档 7 份')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '王工 · 船务部' })).toBeInTheDocument();
    expect(screen.getByText('消防证书')).toBeInTheDocument();
    expect(screen.getAllByText('船检证书').length).toBeGreaterThan(0);
    expect(screen.queryByText('苏南 16 号船检证书复核')).not.toBeInTheDocument();
    expect(screen.queryByText('284')).not.toBeInTheDocument();
    expect(screen.queryByText('92%')).not.toBeInTheDocument();
  });

  it('shows a partial-data error without replacing missing values with zero', () => {
    mockEnterpriseProfiles.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MyHomePage />
      </MemoryRouter>,
    );

    expect(screen.getByText('部分首页数据加载失败')).toBeInTheDocument();
    expect(screen.getByText('企业资料 - 项')).toBeInTheDocument();
  });

  it('renders the mobile status card instead of the old command hero artwork', () => {
    const { container } = render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MyHomePage />
      </MemoryRouter>,
    );

    expect(container.querySelector('.my-home-status-card')).toBeInTheDocument();
    expect(container.querySelector('.my-home-command-hero')).toBeNull();
    expect(container.querySelector('.my-home-command-hero svg')).toBeNull();
    expect(container.querySelector('.my-home-ship-visual')).toBeNull();
  });

  it('renders enterprise shortcut cards with stable labels', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MyHomePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: '企业资料' })).toHaveClass('my-home-shortcut');
    expect(screen.getByRole('link', { name: '电子证照' })).toHaveClass('my-home-shortcut');
  });

  it('renders shortcuts with blue icon plates', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MyHomePage />
      </MemoryRouter>,
    );

    expect(screen.getAllByTestId('my-home-shortcut-icon')).toHaveLength(6);
    expect(screen.getAllByTestId('my-home-shortcut-icon')[0]).toHaveClass('my-home-shortcut-icon', 'my-home-shortcut-icon-blue');
  });

  it('uses the whole shortcut card as the action without rendering redundant view labels', () => {
    const { container } = render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MyHomePage />
      </MemoryRouter>,
    );

    expect(container.querySelectorAll('.my-home-shortcut-action')).toHaveLength(0);
    expect(screen.queryByText('查看')).not.toBeInTheDocument();
  });
});
