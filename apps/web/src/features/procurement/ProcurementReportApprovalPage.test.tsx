import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProcurementReportApprovalPage } from './ProcurementReportApprovalPage';

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
    useLocation: () => ({
      pathname: '/procurement/report-approvals',
      search: '',
    }),
    useNavigate: () => mockNavigate,
  };
});

vi.mock('./procurementApi', () => ({
  useGetProcurementPendingApprovalsQuery: (params: unknown) =>
    mockPending(params),
  useActionProcurementReportApprovalMutation: () => [
    mockAction,
    { isLoading: false },
  ],
}));

describe('ProcurementReportApprovalPage', () => {
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

  function showPendingReport() {
    const refetch = vi.fn();
    mockPending.mockReturnValue({
      data: { data: [{ entityId: 'report-1', title: '待审批采购月报', departmentCode: 'shipping_dept', approvalLevel: 'dept', status: 'submitted', submittedAt: '2026-11-17T02:30:00.000Z' }] },
      isLoading: false,
      refetch,
    });
    render(<ProcurementReportApprovalPage />);
    return refetch;
  }

  it.each(['通过', '退回', '驳回'])('does not submit %s after the comment prompt is canceled', (action) => {
    const refetch = showPendingReport();
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue(null);

    fireEvent.click(screen.getByRole('button', { name: new RegExp(action.split('').join('\\s*')) }));

    expect(prompt).toHaveBeenCalledOnce();
    expect(mockAction).not.toHaveBeenCalled();
    expect(refetch).not.toHaveBeenCalled();
  });

  it('still approves when an empty comment is explicitly confirmed', async () => {
    const refetch = showPendingReport();
    vi.spyOn(window, 'prompt').mockReturnValue('');

    fireEvent.click(screen.getByRole('button', { name: /通\s*过/ }));

    await waitFor(() => expect(refetch).toHaveBeenCalledOnce());
    expect(mockAction).toHaveBeenCalledWith({ id: 'report-1', action: 'approve', comment: undefined });
  });

  it('can return to procurement home from a direct entry', () => {
    render(<ProcurementReportApprovalPage />);

    fireEvent.click(screen.getByRole('button', { name: '返回采购首页' }));

    expect(mockNavigate).toHaveBeenCalledWith('/procurement');
    expect(mockPending).toHaveBeenLastCalledWith({
      entityType: 'report',
      departmentCode: undefined,
    });
    expect(
      screen
        .getByRole('button', { name: '返回采购首页' })
        .closest('.procurement-approval-toolbar'),
    ).toBeInTheDocument();
  });

  it('marks the approval page as the detail return target', () => {
    mockPending.mockReturnValue({
      data: {
        data: [
          {
            entityId: 'report-1',
            title: '2026年8月采购月报',
            departmentCode: 'shipping_dept',
            approvalLevel: 'dept',
            status: 'submitted',
            submittedAt: '2026-08-12T09:30:00.000+08:00',
          },
        ],
      },
      isLoading: false,
      refetch: vi.fn(),
    });
    render(<ProcurementReportApprovalPage />);

    fireEvent.click(screen.getByRole('button', { name: '查看详情' }));

    expect(mockNavigate).toHaveBeenCalledWith(
      '/procurement/report-requests/report-1?backTo=%2Fprocurement%2Freport-approvals',
    );
  });
});
