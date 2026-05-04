import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProcurementReportRequestDetailPage } from './ProcurementReportRequestDetailPage';

const mockNavigate = vi.fn();
const mockCurrentUser = vi.fn();
const mockGetDetail = vi.fn();
const mockGetApprovals = vi.fn();
const mockRefetch = vi.fn();
const mockSubmitRequest = vi.fn();
const mockPrintRequest = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'report-1' }),
  };
});

vi.mock('../../app/hooks', () => ({
  useAppSelector: (
    selector: (state: { auth: { currentUser: { userId: string; roles: string[] } | null } }) => unknown,
  ) => selector({ auth: { currentUser: mockCurrentUser() } }),
}));

vi.mock('./procurementApi', () => ({
  useGetProcurementReportRequestQuery: (id: string, options?: unknown) => mockGetDetail(id, options),
  useGetProcurementReportApprovalsQuery: (id: string, options?: unknown) => mockGetApprovals(id, options),
  useSubmitProcurementReportRequestMutation: () => [mockSubmitRequest, { isLoading: false }],
  usePrintProcurementReportRequestMutation: () => [mockPrintRequest, { isLoading: false }],
}));

describe('ProcurementReportRequestDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser.mockReturnValue({
      userId: 'reporter-1',
      roles: ['all_authenticated', 'shipping'],
    });
    mockRefetch.mockResolvedValue(undefined);
    mockGetApprovals.mockReturnValue({ data: { data: [] } });
    mockGetDetail.mockReturnValue({
      data: {
        data: {
          id: 'report-1',
          reportNo: 'BG202604180001',
          reportType: 'monthly',
          periodYear: 2026,
          periodMonth: 4,
          departmentCode: 'shipping_dept',
          snapshotParams: { year: 2026, month: 4 },
          snapshotSummary: { amount: 6800, orderCount: 3 },
          status: 'draft',
          approvalChannel: 'internal',
          externalProcessInstanceId: null,
          externalStatus: null,
          externalSyncedAt: null,
          submittedAt: null,
          finalApprovedAt: null,
          exportPdfFileId: null,
          createdBy: 'reporter-1',
          updatedBy: 'reporter-1',
          createdAt: '2026-04-18T10:00:00.000+08:00',
          updatedAt: '2026-04-18T10:00:00.000+08:00',
        },
      },
      isLoading: false,
      refetch: mockRefetch,
    });
    mockSubmitRequest.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockPrintRequest.mockReturnValue({
      unwrap: () => Promise.resolve({ data: { fileId: 'pdf-1', downloadUrl: 'https://oss.example.com/report-1.pdf' } }),
    });
  });

  it('submits a draft report request', async () => {
    render(<ProcurementReportRequestDetailPage />);

    fireEvent.click(screen.getByRole('button', { name: '提交审批' }));

    await waitFor(() => {
      expect(mockSubmitRequest).toHaveBeenCalledWith('report-1');
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it('prints report request PDF and opens URL in a new tab', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(<ProcurementReportRequestDetailPage />);

    fireEvent.click(screen.getByRole('button', { name: '导出 PDF' }));

    await waitFor(() => {
      expect(mockPrintRequest).toHaveBeenCalledWith('report-1');
      expect(openSpy).toHaveBeenCalledWith('https://oss.example.com/report-1.pdf', '_blank', 'noopener,noreferrer');
    });
  });
});
