import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { ReminderDashboardPage } from './ReminderDashboardPage';

const mockCurrentUser = vi.fn();
const mockSettings = vi.fn();
const mockDashboard = vi.fn();
const mockList = vi.fn();
const mockScan = vi.fn();
const dashboardRefetch = vi.fn();
const listRefetch = vi.fn();
const dashboardData = {
  data: {
    totalPending: 2,
    totalOverdue: 1,
    totalAcknowledged: 4,
    byOwnerType: [
      { ownerType: 'vessel', count: 3 },
      { ownerType: 'vehicle', count: 2 },
    ],
    byCertificateType: [
      { certificateTypeName: '国籍证书', count: 4 },
      { certificateTypeName: '安全证书', count: 1 },
    ],
  },
};

const reminderItems = [
  {
    id: 'r-overdue',
    certificateTitle: '国籍证书',
    ownerName: '苏南012',
    ownerType: 'vessel',
    recipientUserId: 'shipping-employee',
    reminderType: 'overdue',
    status: 'pending',
    scheduledDate: '2026-03-28',
    daysBeforeExpiry: -1,
    sentAt: null,
    acknowledgedAt: null,
    acknowledgedBy: null,
  },
  {
    id: 'r-ack',
    certificateTitle: '安全证书',
    ownerName: '桂A0001',
    ownerType: 'vehicle',
    recipientUserId: 'shipping-manager',
    reminderType: 'upcoming',
    status: 'acknowledged',
    scheduledDate: '2026-03-27',
    daysBeforeExpiry: 15,
    sentAt: '2026-03-27T01:00:00+08:00',
    acknowledgedAt: '2026-03-27T02:00:00+08:00',
    acknowledgedBy: 'shipping-manager',
  },
] as const;
const reminderListData = {
  data: reminderItems as unknown as Array<(typeof reminderItems)[number]>,
  meta: { total: 2, page: 1, pageSize: 5, totalPages: 1 },
};

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...(actual as object),
    message: {
      success: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
    },
  };
});

vi.mock('../../app/hooks', () => ({
  useAppSelector: (selector: (state: { auth: { currentUser: { userId: string; roles: string[] } | null } }) => unknown) =>
    selector({ auth: { currentUser: mockCurrentUser() } }),
}));

vi.mock('../settings/settingsApi', () => ({
  useGetSettingsQuery: () => mockSettings(),
}));

vi.mock('./reminderApi', () => ({
  useGetReminderDashboardQuery: (_params: unknown, options?: { skip?: boolean }) =>
    options ? mockDashboard(_params, options) : mockDashboard(_params),
  useGetReminderListQuery: (_params: unknown, options?: { skip?: boolean }) =>
    options ? mockList(_params, options) : mockList(_params),
  useTriggerReminderScanMutation: () => [mockScan, { isLoading: false }],
}));

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

describe('ReminderDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser.mockReturnValue({
      userId: 'shipping-manager',
      roles: ['all_authenticated', 'shipping'],
    });
    mockDashboard.mockReturnValue({
      data: dashboardData,
      isLoading: false,
      refetch: dashboardRefetch,
    });
    mockList.mockReturnValue({
      data: reminderListData,
      isLoading: false,
      refetch: listRefetch,
    });
    mockSettings.mockReturnValue({
      data: { data: { reminderViewMode: 'dashboard' } },
      isLoading: false,
    });
    mockScan.mockReturnValue({
      unwrap: () => Promise.resolve({ data: { jobId: 'job-1', acceptedAt: '2026-03-28T10:00:00+08:00' } }),
    });
  });

  it('falls back to the settings view when the URL omits view, but lets the URL win when present', () => {
    mockSettings.mockReturnValue({
      data: { data: { reminderViewMode: 'list' } },
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/my/reminders']}>
        <ReminderDashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '提醒列表' })).toBeInTheDocument();

    render(
      <MemoryRouter initialEntries={['/my/reminders?view=dashboard']}>
        <ReminderDashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '证书提醒看板' })).toBeInTheDocument();
  });

  it('waits for settings before choosing a default view when the URL omits view', async () => {
    let settingsState = {
      data: undefined,
      isLoading: true,
    };

    mockSettings.mockImplementation(() => settingsState);
    mockDashboard.mockImplementation((_params: unknown, options?: { skip?: boolean }) => ({
      data: options?.skip ? undefined : dashboardData,
      isLoading: false,
      refetch: dashboardRefetch,
    }));
    mockList.mockImplementation((params: unknown, options?: { skip?: boolean }) => ({
      data: options?.skip ? undefined : reminderListData,
      isLoading: false,
      refetch: listRefetch,
    }));

    const { rerender } = render(
      <MemoryRouter initialEntries={['/my/reminders']}>
        <ReminderDashboardPage />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('heading', { name: '证书提醒看板' })).toBeNull();
    expect(screen.queryByRole('heading', { name: '提醒列表' })).toBeNull();
    expect(mockDashboard).toHaveBeenLastCalledWith(undefined, expect.objectContaining({ skip: true }));
    expect(mockList).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, pageSize: 5 }),
      expect.objectContaining({ skip: true }),
    );

    settingsState = {
      data: { data: { reminderViewMode: 'list' } },
      isLoading: false,
    };

    rerender(
      <MemoryRouter initialEntries={['/my/reminders']}>
        <ReminderDashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '提醒列表' })).toBeInTheDocument();
    await waitFor(() => {
      expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, pageSize: 5 }));
    });
  });

  it('shows summary, filters recent reminders, and exposes scan for managers', async () => {
    render(
      <MemoryRouter initialEntries={['/my/reminders?view=dashboard']}>
        <ReminderDashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('reminder-stat-button-pending')).toBeInTheDocument();
    expect(screen.getByTestId('reminder-stat-button-overdue')).toBeInTheDocument();
    expect(screen.getByTestId('reminder-stat-button-acknowledged')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /手动扫描/ })).toBeInTheDocument();
    expect(screen.getByTestId('reminder-item-link-r-overdue')).toHaveAttribute(
      'href',
      '/my/reminders/r-overdue?backTo=%2Fmy%2Freminders%3Fview%3Ddashboard',
    );
    expect(screen.getByTestId('reminder-item-link-r-ack')).toHaveAttribute(
      'href',
      '/my/reminders/r-ack?backTo=%2Fmy%2Freminders%3Fview%3Ddashboard',
    );
    expect(screen.getByText('逾期')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('reminder-stat-button-pending'));
    await waitFor(() => {
      expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'pending' }));
    });
  });

  it('writes stat card selections into the URL and the list query', async () => {
    render(
      <MemoryRouter initialEntries={['/my/reminders?view=dashboard']}>
        <ReminderDashboardPage />
        <LocationDisplay />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('reminder-stat-button-pending'));

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent('?view=list&status=pending');
    });
    await waitFor(() => {
      expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, pageSize: 5, status: 'pending' }));
    });
  });

  it('clears unrelated filters like ownerType when a stat card changes the view', async () => {
    render(
      <MemoryRouter initialEntries={['/my/reminders?foo=bar&view=dashboard&ownerType=vessel&page=3&pageSize=20']}>
        <ReminderDashboardPage />
        <LocationDisplay />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('reminder-stat-button-overdue'));

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent(/^\?foo=bar&view=list&reminderType=overdue$/);
    });
    await waitFor(() => {
      expect(mockList).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, pageSize: 5, reminderType: 'overdue' }),
      );
    });
  });

  it('preserves the current query when linking to detail pages', () => {
    render(
      <MemoryRouter
        initialEntries={['/my/reminders?view=list&page=2&pageSize=10&status=pending&ownerType=vessel']}
      >
        <ReminderDashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: '国籍证书' })).toHaveAttribute(
      'href',
      '/my/reminders/r-overdue?backTo=%2Fmy%2Freminders%3Fview%3Dlist%26page%3D2%26pageSize%3D10%26status%3Dpending%26ownerType%3Dvessel',
    );
  });

  it('refreshes dashboard and list after a manual scan', async () => {
    render(
      <MemoryRouter initialEntries={['/my/reminders?view=dashboard']}>
        <ReminderDashboardPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /手动扫描/ }));

    await waitFor(() => expect(mockScan).toHaveBeenCalled());
    await waitFor(() => expect(dashboardRefetch).toHaveBeenCalled());
    await waitFor(() => expect(listRefetch).toHaveBeenCalled());
  });

  it('hides scan when the user is not authorized', () => {
    mockCurrentUser.mockReturnValue({
      userId: 'employee-1',
      roles: ['all_authenticated'],
    });

    render(
      <MemoryRouter initialEntries={['/my/reminders?view=dashboard']}>
        <ReminderDashboardPage />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: /手动扫描/ })).toBeNull();
  });
});
