import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProcurementOrderListPage } from './ProcurementOrderListPage';

const mockNavigate = vi.fn();
const mockGetOrders = vi.fn();
const mockGetBudgetSummary = vi.fn();
const mockCurrentUser = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../app/hooks', () => ({
  useAppSelector: (
    selector: (state: {
      auth: { currentUser: { userId: string; roles: string[] } | null };
    }) => unknown,
  ) => selector({ auth: { currentUser: mockCurrentUser() } }),
}));

vi.mock('./procurementApi', () => ({
  useGetProcurementOrdersQuery: (params: unknown) => mockGetOrders(params),
  useGetProcurementBudgetSummaryQuery: (params: unknown) =>
    mockGetBudgetSummary(params),
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
    mockGetBudgetSummary.mockReturnValue({
      data: {
        data: {
          year: 2026,
          budgetAmount: 100000,
          executedAmount: 120000,
          executionRate: 120,
          overBudgetAmount: 20000,
          isOverBudget: true,
          items: [
            {
              departmentCode: 'shipping_dept',
              dimensionType: 'vessel',
              dimensionKey: 'su-nan-012',
              dimensionName: '苏南012',
              budgetAmount: 100000,
              executedAmount: 120000,
              executionRate: 120,
              overBudgetAmount: 20000,
              isOverBudget: true,
              isConfigured: true,
            },
          ],
        },
      },
    });
  });

  it('renders list data and navigates to key routes', () => {
    const { container } = render(<ProcurementOrderListPage />);

    expect(screen.getByText('CG202604180001')).toBeInTheDocument();
    expect(container.querySelector('.procurement-main-panel')).toContainElement(
      container.querySelector('.procurement-filter-panel'),
    );
    expect(container.querySelector('.procurement-filter-section')).toBeNull();
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
    fireEvent.click(screen.getByRole('button', { name: '预算管理' }));
    fireEvent.click(screen.getByRole('button', { name: '发起申请' }));
    fireEvent.click(screen.getByRole('button', { name: '进入审批' }));
    fireEvent.click(screen.getByRole('button', { name: '查看报表' }));
    fireEvent.click(screen.getByRole('button', { name: '进入报表审批' }));

    expect(mockNavigate).toHaveBeenCalledWith('/procurement/orders/new');
    expect(mockNavigate).toHaveBeenCalledWith('/procurement/dictionaries');
    expect(mockNavigate).toHaveBeenCalledWith('/procurement/budgets');
    expect(mockNavigate).toHaveBeenCalledWith('/procurement/approvals');
    expect(mockNavigate).toHaveBeenCalledWith('/procurement/reports');
    expect(mockNavigate).toHaveBeenCalledWith('/procurement/report-approvals');
    expect(screen.getByText('120.0%')).toBeInTheDocument();
    expect(screen.getByText('已超预算')).toBeInTheDocument();
  });

  it('hides dictionary admin action for non-privileged users', () => {
    mockCurrentUser.mockReturnValue({
      userId: 'business-1',
      roles: ['all_authenticated', 'business'],
    });

    render(<ProcurementOrderListPage />);

    expect(screen.queryByRole('button', { name: '字典治理' })).toBeNull();
    expect(screen.queryByRole('button', { name: '预算管理' })).toBeNull();
  });

  it('hides the annual budget card when backend has no budget or no execution data', () => {
    mockGetBudgetSummary.mockReturnValue({
      data: {
        data: {
          year: 2026,
          budgetAmount: 100000,
          executedAmount: 0,
          executionRate: 0,
          overBudgetAmount: 0,
          isOverBudget: false,
          items: [],
        },
      },
    });

    render(<ProcurementOrderListPage />);

    expect(screen.queryByText('2026 年采购预算')).toBeNull();
  });
});
