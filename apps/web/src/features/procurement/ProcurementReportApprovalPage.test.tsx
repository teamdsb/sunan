import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
