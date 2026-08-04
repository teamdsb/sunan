import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProcurementApprovalPage } from './ProcurementApprovalPage';

const mockNavigate = vi.fn();
const mockPending = vi.fn();
const mockAction = vi.fn();

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

vi.mock('./procurementApi', () => ({
  useGetProcurementPendingApprovalsQuery: (params: unknown) =>
    mockPending(params),
  useActionProcurementOrderApprovalMutation: () => [
    mockAction,
    { isLoading: false },
  ],
}));

describe('ProcurementApprovalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPending.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      refetch: vi.fn(),
    });
    mockAction.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  it('can return to procurement home from a direct entry', () => {
    render(<ProcurementApprovalPage />);

    fireEvent.click(screen.getByRole('button', { name: '返回采购首页' }));

    expect(mockNavigate).toHaveBeenCalledWith('/procurement');
    expect(mockPending).toHaveBeenLastCalledWith({
      entityType: 'order',
      departmentCode: undefined,
    });
    expect(
      screen
        .getByRole('button', { name: '返回采购首页' })
        .closest('.procurement-approval-toolbar'),
    ).toBeInTheDocument();
  });
});
