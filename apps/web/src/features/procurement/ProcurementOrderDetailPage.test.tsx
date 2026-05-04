import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProcurementOrderDetailPage } from './ProcurementOrderDetailPage';

const mockNavigate = vi.fn();
const mockCurrentUser = vi.fn();
const mockGetOrder = vi.fn();
const mockGetApprovals = vi.fn();
const mockUpdateOrder = vi.fn();
const mockSubmitOrder = vi.fn();
const mockResubmitOrder = vi.fn();
const mockBindAttachments = vi.fn();
const mockPrintOrder = vi.fn();
const mockRefetch = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'order-1' }),
  };
});

vi.mock('../../app/hooks', () => ({
  useAppSelector: (
    selector: (state: { auth: { currentUser: { userId: string; roles: string[] } | null } }) => unknown,
  ) => selector({ auth: { currentUser: mockCurrentUser() } }),
}));

vi.mock('./procurementApi', () => ({
  useGetProcurementOrderQuery: (id: string, options?: unknown) => mockGetOrder(id, options),
  useGetProcurementOrderApprovalsQuery: (id: string, options?: unknown) => mockGetApprovals(id, options),
  useUpdateProcurementOrderMutation: () => [mockUpdateOrder, { isLoading: false }],
  useSubmitProcurementOrderMutation: () => [mockSubmitOrder, { isLoading: false }],
  useResubmitProcurementOrderMutation: () => [mockResubmitOrder, { isLoading: false }],
  useBindProcurementOrderAttachmentsMutation: () => [mockBindAttachments, { isLoading: false }],
  usePrintProcurementOrderMutation: () => [mockPrintOrder, { isLoading: false }],
}));

describe('ProcurementOrderDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser.mockReturnValue({
      userId: 'creator-1',
      roles: ['all_authenticated', 'business'],
    });
    mockRefetch.mockResolvedValue(undefined);
    mockGetApprovals.mockReturnValue({ data: { data: [] } });
    mockGetOrder.mockReturnValue({
      data: {
        data: {
          id: 'order-1',
          orderNo: 'CG202604180001',
          departmentCode: 'business_dept',
          dimensionType: 'none',
          dimensionKey: null,
          title: '接待用品采购',
          summary: '采购会议与接待用品',
          amount: 1880,
          expenseDate: null,
          status: 'draft',
          approvalChannel: 'internal',
          externalProcessInstanceId: null,
          externalStatus: null,
          externalSyncedAt: null,
          submittedAt: null,
          finalApprovedAt: null,
          createdBy: 'creator-1',
          updatedBy: 'creator-1',
          createdAt: '2026-04-18T09:00:00.000+08:00',
          updatedAt: '2026-04-18T09:00:00.000+08:00',
          files: [],
        },
      },
      isLoading: false,
      refetch: mockRefetch,
    });
    mockUpdateOrder.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockSubmitOrder.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockResubmitOrder.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockBindAttachments.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockPrintOrder.mockReturnValue({
      unwrap: () => Promise.resolve({ data: { fileId: 'pdf-1', downloadUrl: 'https://oss.example.com/order-1.pdf' } }),
    });
  });

  it('prints order PDF and opens the generated download URL', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(<ProcurementOrderDetailPage />);

    fireEvent.click(screen.getByRole('button', { name: '导出 PDF' }));

    await waitFor(() => {
      expect(mockPrintOrder).toHaveBeenCalledWith('order-1');
      expect(openSpy).toHaveBeenCalledWith('https://oss.example.com/order-1.pdf', '_blank', 'noopener,noreferrer');
    });
  });

  it('uses resubmit endpoint when an order has historical submittedAt', async () => {
    mockGetOrder.mockReturnValue({
      data: {
        data: {
          id: 'order-1',
          orderNo: 'CG202604180001',
          departmentCode: 'business_dept',
          dimensionType: 'none',
          dimensionKey: null,
          title: '接待用品采购',
          summary: '采购会议与接待用品',
          amount: 1880,
          expenseDate: null,
          status: 'draft',
          approvalChannel: 'internal',
          externalProcessInstanceId: null,
          externalStatus: null,
          externalSyncedAt: null,
          submittedAt: '2026-04-15T09:00:00.000+08:00',
          finalApprovedAt: null,
          createdBy: 'creator-1',
          updatedBy: 'creator-1',
          createdAt: '2026-04-18T09:00:00.000+08:00',
          updatedAt: '2026-04-18T09:00:00.000+08:00',
          files: [],
        },
      },
      isLoading: false,
      refetch: mockRefetch,
    });

    render(<ProcurementOrderDetailPage />);

    fireEvent.click(screen.getByRole('button', { name: '重新提交' }));

    await waitFor(() => {
      expect(mockResubmitOrder).toHaveBeenCalledWith('order-1');
    });
  });
});
