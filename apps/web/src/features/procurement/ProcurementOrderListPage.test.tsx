import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProcurementOrderListPage } from './ProcurementOrderListPage';

const mockNavigate = vi.fn();
const mockGetOrders = vi.fn();
const mockGetBudgetSummary = vi.fn();
const mockGetPendingApprovals = vi.fn();
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
  useGetProcurementPendingApprovalsQuery: (params: unknown) =>
    mockGetPendingApprovals(params),
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
      isError: false,
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
      isError: false,
    });
    mockGetPendingApprovals.mockReturnValue({
      data: {
        data: [
          {
            entityType: 'order',
            entityId: 'order-1',
            title: '船舶备件采购',
            departmentCode: 'shipping_dept',
            approvalLevel: 'dept',
            status: 'submitted',
            submittedAt: '2026-04-18T09:00:00.000+08:00',
            approvalChannel: 'internal',
            externalStatus: null,
          },
        ],
      },
      isError: false,
    });
  });

  it('renders list data and navigates to key routes', () => {
    const { container } = render(<ProcurementOrderListPage />);

    expect(screen.getByRole('heading', { name: '采购管理' })).toBeInTheDocument();
    expect(screen.getByText('采购单列表')).toBeInTheDocument();
    expect(screen.getByText('CG202604180001')).toBeInTheDocument();
    expect(container.querySelector('.procurement-mobile-home')).toBeInTheDocument();
    expect(container.querySelector('.procurement-main-panel')).toBeNull();
    expect(container.querySelector('.procurement-filter-panel')).toBeNull();
    expect(container.querySelector('.procurement-filter-section')).toBeNull();
    expect(mockGetOrders).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 1,
        pageSize: 20,
      }),
    );
    expect(mockGetPendingApprovals).toHaveBeenCalledWith({
      entityType: 'order',
      page: 1,
      pageSize: 100,
    });
    expect(screen.getByText('待审批')).toBeInTheDocument();
    expect(screen.getByText('船舶备件采购')).toBeInTheDocument();
    expect(screen.getByText(/审批节点：部门审批/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /新建采购单/ }));
    fireEvent.click(screen.getByRole('button', { name: '字典治理' }));
    fireEvent.click(screen.getByRole('button', { name: '预算管理' }));
    fireEvent.click(screen.getByRole('button', { name: /全部/ }));

    expect(mockNavigate).toHaveBeenCalledWith('/procurement/orders/new');
    expect(mockNavigate).toHaveBeenCalledWith('/procurement/dictionaries');
    expect(mockNavigate).toHaveBeenCalledWith('/procurement/budgets');
    expect(mockNavigate).toHaveBeenCalledWith('/procurement/approvals');
    expect(screen.getAllByText('120.0%')).not.toHaveLength(0);
    expect(screen.getByText('超预算 120.0%')).toBeInTheDocument();
  });

  it('renders every order in the current page without inferring approval details from it', () => {
    const orders = Array.from({ length: 4 }, (_, index) => ({
      id: `order-${index + 1}`,
      orderNo: `CG20260418000${index + 1}`,
      departmentCode: 'shipping_dept',
      dimensionType: 'vessel',
      dimensionKey: index === 3 ? 'over-budget-scope' : 'normal-scope',
      title: `采购单 ${index + 1}`,
      amount: 10000 + index,
      status: 'submitted',
    }));
    mockGetOrders.mockReturnValue({
      data: {
        data: orders,
        meta: { total: 4, page: 1, pageSize: 20, totalPages: 1 },
      },
      isError: false,
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
            { departmentCode: 'shipping_dept', dimensionType: 'vessel', dimensionKey: 'scope-1', dimensionName: '范围 1', budgetAmount: 1, executedAmount: 1, executionRate: 100, overBudgetAmount: 0, isOverBudget: false, isConfigured: true },
            { departmentCode: 'shipping_dept', dimensionType: 'vessel', dimensionKey: 'scope-2', dimensionName: '范围 2', budgetAmount: 1, executedAmount: 1, executionRate: 100, overBudgetAmount: 0, isOverBudget: false, isConfigured: true },
            { departmentCode: 'shipping_dept', dimensionType: 'vessel', dimensionKey: 'scope-3', dimensionName: '范围 3', budgetAmount: 1, executedAmount: 1, executionRate: 100, overBudgetAmount: 0, isOverBudget: false, isConfigured: true },
            { departmentCode: 'shipping_dept', dimensionType: 'vessel', dimensionKey: 'over-budget-scope', dimensionName: '超预算范围', budgetAmount: 1, executedAmount: 2, executionRate: 200, overBudgetAmount: 1, isOverBudget: true, isConfigured: true },
          ],
        },
      },
      isError: false,
    });
    mockGetPendingApprovals.mockReturnValue({
      data: {
        data: [
          {
            entityType: 'order',
            entityId: 'order-4',
            title: '采购单 4',
            departmentCode: 'shipping_dept',
            approvalLevel: 'finance',
            status: 'submitted',
            submittedAt: '2026-04-18T09:00:00.000+08:00',
            approvalChannel: 'internal',
            externalStatus: null,
          },
        ],
      },
      isError: false,
    });

    render(<ProcurementOrderListPage />);

    expect(screen.getByText('CG202604180004')).toBeInTheDocument();
    const pendingSection = screen.getByRole('heading', { name: '待处理' }).closest('section');
    expect(pendingSection).not.toBeNull();
    expect(within(pendingSection!).getByText('待财务审批')).toBeInTheDocument();
    expect(within(pendingSection!).queryByText('超预算·待财务审批')).toBeNull();
    expect(within(pendingSection!).queryByText('￥1.0万')).toBeNull();
  });

  it('shows an API error and does not present missing counters as zero', () => {
    mockGetPendingApprovals.mockReturnValue({
      data: undefined,
      isError: true,
    });

    render(<ProcurementOrderListPage />);

    expect(screen.getByText('部分采购数据加载失败')).toBeInTheDocument();
    expect(screen.getByText('--')).toBeInTheDocument();
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

    expect(screen.queryByText('2026 采购预算')).toBeNull();
  });
});
