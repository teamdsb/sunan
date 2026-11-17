import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function showPendingOrder() {
    const refetch = vi.fn();
    mockPending.mockReturnValue({
      data: { data: [{ entityId: 'order-1', title: '待审批采购单', departmentCode: 'shipping_dept', approvalLevel: 'dept', status: 'submitted', submittedAt: '2026-11-17T02:30:00.000Z' }] },
      isLoading: false,
      refetch,
    });
    render(<ProcurementApprovalPage />);
    return refetch;
  }

  it.each(['通过', '退回', '驳回'])('does not submit %s after the comment prompt is canceled', (action) => {
    const refetch = showPendingOrder();
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue(null);

    fireEvent.click(screen.getByRole('button', { name: new RegExp(action.split('').join('\\s*')) }));

    expect(prompt).toHaveBeenCalledOnce();
    expect(mockAction).not.toHaveBeenCalled();
    expect(refetch).not.toHaveBeenCalled();
  });

  it('still approves when an empty comment is explicitly confirmed', async () => {
    const refetch = showPendingOrder();
    vi.spyOn(window, 'prompt').mockReturnValue('');

    fireEvent.click(screen.getByRole('button', { name: /通\s*过/ }));

    await waitFor(() => expect(refetch).toHaveBeenCalledOnce());
    expect(mockAction).toHaveBeenCalledWith({ id: 'order-1', action: 'approve', comment: undefined });
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
