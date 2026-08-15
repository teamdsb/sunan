import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ReminderDetailPage } from './ReminderDetailPage';

const mockCurrentUser = vi.fn();
const mockDetail = vi.fn();
const mockAcknowledge = vi.fn();

vi.mock('../../app/hooks', () => ({
  useAppSelector: (selector: (state: { auth: { currentUser: { userId: string; roles: string[] } | null } }) => unknown) =>
    selector({ auth: { currentUser: mockCurrentUser() } }),
}));

vi.mock('./reminderApi', () => ({
  useGetReminderByIdQuery: () => mockDetail(),
  useAcknowledgeReminderMutation: () => [mockAcknowledge, { isLoading: false }],
}));

describe('ReminderDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser.mockReturnValue({
      userId: 'shipping-employee',
      roles: ['all_authenticated'],
    });
    mockDetail.mockReturnValue({
      data: {
        data: {
          id: 'r1',
          certificateId: 'c1',
          certificateTitle: '国籍证书',
          ownerType: 'vessel',
          ownerName: '苏南012',
          recipientUserId: 'shipping-employee',
          reminderType: 'overdue',
          status: 'pending',
          scheduledDate: '2026-03-28',
          daysBeforeExpiry: -1,
          sentAt: '2026-03-28T01:00:00+08:00',
          acknowledgedAt: null,
          acknowledgedBy: null,
        },
      },
      isLoading: false,
      refetch: vi.fn(),
    });
    mockAcknowledge.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          data: {
            id: 'r1',
            certificateId: 'c1',
            certificateTitle: '国籍证书',
            ownerType: 'vessel',
            ownerName: '苏南012',
            recipientUserId: 'shipping-employee',
            reminderType: 'overdue',
            status: 'acknowledged',
            scheduledDate: '2026-03-28',
            daysBeforeExpiry: -1,
            sentAt: '2026-03-28T01:00:00+08:00',
            acknowledgedAt: '2026-03-28T02:00:00+08:00',
            acknowledgedBy: 'shipping-employee',
          },
        }),
    });
  });

  it('renders detail summary and allows acknowledge for the recipient', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/my/reminders/r1']}>
        <Routes>
          <Route path="/my/reminders/:id" element={<ReminderDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getAllByText('国籍证书')).toHaveLength(2);
    expect(screen.getByText('处理记录')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /确认提醒/ }));

    await waitFor(() => expect(mockAcknowledge).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /确认提醒|已确认/ })).not.toBeInTheDocument(),
    );
    expect(screen.getAllByText('已确认').length).toBeGreaterThan(0);
  });

  it('hides acknowledge when the current user lacks permission', () => {
    mockCurrentUser.mockReturnValue({
      userId: 'external-user',
      roles: ['all_authenticated'],
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/my/reminders/r1']}>
        <Routes>
          <Route path="/my/reminders/:id" element={<ReminderDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: /确认提醒/ })).toBeNull();
  });

  it('shows acknowledged state after a 409 conflict', async () => {
    mockAcknowledge.mockReturnValue({
      unwrap: () => Promise.reject({ status: 409 }),
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/my/reminders/r1']}>
        <Routes>
          <Route path="/my/reminders/:id" element={<ReminderDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /确认提醒/ }));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /确认提醒|已确认/ })).not.toBeInTheDocument(),
    );
    expect(screen.getAllByText('已确认').length).toBeGreaterThan(0);
  });

  it('returns to the reminder list state that opened the detail', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        initialEntries={['/my/reminders/r1?backTo=%2Fmy%2Freminders%3Fview%3Dlist%26status%3Dpending%26page%3D2']}
      >
        <Routes>
          <Route path="/my/reminders/:id" element={<ReminderDetailPage />} />
          <Route path="/my/reminders" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /返回提醒列表/ }));
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/my/reminders?view=list&status=pending&page=2',
    );
  });
});

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}{location.search}</div>;
}
