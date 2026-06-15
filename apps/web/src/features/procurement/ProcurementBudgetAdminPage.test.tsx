import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProcurementBudgetAdminPage } from './ProcurementBudgetAdminPage';

const mockCurrentUser = vi.fn();
const mockRefetch = vi.fn();
const mockGetBudgets = vi.fn();
const mockCreateBudget = vi.fn();
const mockUpdateBudget = vi.fn();

vi.mock('../../app/hooks', () => ({
  useAppSelector: (
    selector: (state: {
      auth: { currentUser: { userId: string; roles: string[] } | null };
    }) => unknown,
  ) => selector({ auth: { currentUser: mockCurrentUser() } }),
}));

vi.mock('./procurementApi', () => ({
  useGetProcurementBudgetsQuery: (params: unknown) => mockGetBudgets(params),
  useGetProcurementDimensionsQuery: () => ({ data: { data: [] } }),
  useGetProcurementBudgetAuditsQuery: () => ({
    data: { data: [] },
    isLoading: false,
  }),
  useCreateProcurementBudgetMutation: () => [
    mockCreateBudget,
    { isLoading: false },
  ],
  useUpdateProcurementBudgetMutation: () => [
    mockUpdateBudget,
    { isLoading: false },
  ],
}));

describe('ProcurementBudgetAdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefetch.mockResolvedValue(undefined);
    mockGetBudgets.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      refetch: mockRefetch,
    });
    mockCreateBudget.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockUpdateBudget.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  it('blocks non-privileged users', () => {
    mockCurrentUser.mockReturnValue({
      userId: 'business-1',
      roles: ['all_authenticated', 'business'],
    });

    render(<ProcurementBudgetAdminPage />);

    expect(screen.getByText('无权限访问')).toBeInTheDocument();
  });

  it('creates a department budget with a required change reason', async () => {
    mockCurrentUser.mockReturnValue({
      userId: 'admin-1',
      roles: ['all_authenticated', 'system_admin'],
    });

    render(<ProcurementBudgetAdminPage />);

    const amountInput = screen.getByRole('spinbutton', { name: '预算金额' });
    const reasonInput = screen.getByRole('textbox', { name: '设置原因' });
    fireEvent.change(amountInput, { target: { value: '88000' } });
    fireEvent.change(reasonInput, { target: { value: '年度预算批复' } });
    fireEvent.click(screen.getByRole('button', { name: '新增预算' }));

    await waitFor(() => {
      expect(mockCreateBudget).toHaveBeenCalledWith(
        expect.objectContaining({
          departmentCode: 'general_office',
          dimensionType: 'none',
          budgetAmount: 88000,
          changeReason: '年度预算批复',
        }),
      );
    });
  });
});
