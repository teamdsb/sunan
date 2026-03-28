import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ReminderDashboardPage } from './ReminderDashboardPage';

const mockCurrentUser = vi.fn();
const mockDashboard = vi.fn();
const mockList = vi.fn();
const mockScan = vi.fn();
const dashboardRefetch = vi.fn();
const listRefetch = vi.fn();

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

vi.mock('./reminderApi', () => ({
  useGetReminderDashboardQuery: () => mockDashboard(),
  useGetReminderListQuery: (_params: unknown) => mockList(_params),
  useTriggerReminderScanMutation: () => [mockScan, { isLoading: false }],
}));

describe('ReminderDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser.mockReturnValue({
      userId: 'shipping-manager',
      roles: ['all_authenticated', 'shipping'],
    });
    mockDashboard.mockReturnValue({
      data: {
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
      },
      isLoading: false,
      refetch: dashboardRefetch,
    });
    mockList.mockReturnValue({
      data: {
        data: [
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
        ],
        meta: { total: 2, page: 1, pageSize: 5, totalPages: 1 },
      },
      isLoading: false,
      refetch: listRefetch,
    });
    mockScan.mockReturnValue({
      unwrap: () => Promise.resolve({ data: { jobId: 'job-1', acceptedAt: '2026-03-28T10:00:00+08:00' } }),
    });
  });

  it('shows summary, filters recent reminders, and exposes scan for managers', async () => {
    render(
      <MemoryRouter>
        <ReminderDashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('待处理')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /手动扫描/ })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: '国籍证书' })).toHaveLength(1);
    expect(screen.getByText('逾期')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /待处理 2/ }));
    await waitFor(() => {
      expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'pending' }));
    });
  });

  it('refreshes dashboard and list after a manual scan', async () => {
    render(
      <MemoryRouter>
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
      <MemoryRouter>
        <ReminderDashboardPage />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: /手动扫描/ })).toBeNull();
  });
});
