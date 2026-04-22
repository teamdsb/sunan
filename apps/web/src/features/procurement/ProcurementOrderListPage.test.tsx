import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProcurementOrderListPage } from './ProcurementOrderListPage';

const mockNavigate = vi.fn();
const mockGetOrders = vi.fn();
const mockCurrentUser = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../app/hooks', () => ({
  useAppSelector: (
    selector: (state: { auth: { currentUser: { userId: string; roles: string[] } | null } }) => unknown,
  ) => selector({ auth: { currentUser: mockCurrentUser() } }),
}));

vi.mock('./procurementApi', () => ({
  useGetProcurementOrdersQuery: (params: unknown) => mockGetOrders(params),
}));

describe('ProcurementOrderListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser.mockReturnValue({
      userId: 'admin-1',
      roles: ['all_authenticated', 'system_admin'],
    });
    mockGetOrders.mockReturnValue({
      data: {
        data: [
          {
            id: 'order-1',
            orderNo: 'CG202604180001',
            departmentCode: 'shipping_dept',
            title: '船舶备件采购',
            amount: 16800,
            status: 'submitted',
            submittedAt: '2026-04-18T09:00:00.000+08:00',
          },
        ],
        meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
      },
      isLoading: false,
    });
  });

  it('renders list data and navigates to key routes', () => {
    render(<ProcurementOrderListPage />);

    expect(screen.getByText('CG202604180001')).toBeInTheDocument();
    expect(mockGetOrders).toHaveBeenLastCalledWith(
      expect.objectContaining({
        keyword: undefined,
        departmentCode: undefined,
        status: undefined,
        submittedFrom: undefined,
        submittedTo: undefined,
        page: 1,
        pageSize: 20,
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: '新建采购单' }));
    fireEvent.click(screen.getByRole('button', { name: '字典治理' }));

    expect(mockNavigate).toHaveBeenCalledWith('/procurement/orders/new');
    expect(mockNavigate).toHaveBeenCalledWith('/procurement/dictionaries');
  });

  it('hides dictionary admin action for non-privileged users', () => {
    mockCurrentUser.mockReturnValue({
      userId: 'business-1',
      roles: ['all_authenticated', 'business'],
    });

    render(<ProcurementOrderListPage />);

    expect(screen.queryByRole('button', { name: '字典治理' })).toBeNull();
  });
});
