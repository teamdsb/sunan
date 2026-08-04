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
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'report-1' }),
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
  useGetProcurementReportRequestQuery: (id: string, options?: unknown) =>
    mockGetDetail(id, options),
  useGetProcurementReportApprovalsQuery: (id: string, options?: unknown) =>
    mockGetApprovals(id, options),
  useSubmitProcurementReportRequestMutation: () => [
    mockSubmitRequest,
    { isLoading: false },
  ],
  usePrintProcurementReportRequestMutation: () => [
    mockPrintRequest,
    { isLoading: false },
  ],
}));

describe('ProcurementReportRequestDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('pdf', { status: 200 })),
    );
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:pdf'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      () => undefined,
    );
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
          snapshotParams: {
            reportType: 'monthly',
            periodYear: 2026,
            periodMonth: 4,
            departmentCode: 'shipping_dept',
            source: 'approval_snapshot',
          },
          snapshotSummary: {
            reportType: 'monthly',
            year: 2026,
            month: 4,
            departmentCode: 'shipping_dept',
            totalAmount: 6800,
            totalOrderCount: 3,
            items: [
              { label: '苏南01', amount: 4200, orderCount: 2 },
              { label: '苏南02', amount: 2600, orderCount: 1 },
            ],
          },
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
      unwrap: () =>
        Promise.resolve({
          data: {
            fileId: 'pdf-1',
            downloadUrl: 'https://oss.example.com/report-1.pdf',
          },
        }),
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

  it('renders a business summary instead of raw snapshot JSON', () => {
    render(<ProcurementReportRequestDetailPage />);

    expect(
      screen.getByRole('heading', { name: '2026年4月采购月报' }),
    ).toBeInTheDocument();
    expect(screen.getByText('采购总额')).toBeInTheDocument();
    expect(screen.getAllByText('¥6,800.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('采购单数').length).toBeGreaterThan(0);
    expect(screen.getByText('统计条件')).toBeInTheDocument();
    expect(screen.getByText('汇总明细')).toBeInTheDocument();
    expect(screen.getByText('苏南01')).toBeInTheDocument();
    expect(screen.getByText('其他参数')).toBeInTheDocument();
    expect(screen.getByText('快照来源')).toBeInTheDocument();
    expect(screen.getByText('审批提交快照')).toBeInTheDocument();
    expect(screen.queryByText(/"totalAmount"/)).not.toBeInTheDocument();
  });

  it('previews report PDF inside the application without window.open', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(<ProcurementReportRequestDetailPage />);

    fireEvent.click(screen.getByRole('button', { name: '预览 PDF' }));

    expect(await screen.findByTitle('BG202604180001.pdf 预览')).toHaveAttribute(
      'src',
      'https://oss.example.com/report-1.pdf',
    );
    expect(mockPrintRequest).toHaveBeenCalledWith('report-1');
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('keeps a failed PDF action retryable in the current page', async () => {
    mockPrintRequest
      .mockReturnValueOnce({
        unwrap: () => Promise.reject(new Error('PDF service unavailable')),
      })
      .mockReturnValueOnce({
        unwrap: () =>
          Promise.resolve({
            data: {
              fileId: 'pdf-1',
              downloadUrl: 'https://oss.example.com/report-1.pdf',
            },
          }),
      });
    render(<ProcurementReportRequestDetailPage />);

    fireEvent.click(screen.getByRole('button', { name: '预览 PDF' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '预览 PDF' })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole('button', { name: '预览 PDF' }));

    expect(await screen.findByTitle('BG202604180001.pdf 预览')).toBeVisible();
    expect(mockPrintRequest).toHaveBeenCalledTimes(2);
  });

  it('preserves the return meaning after backend status resets to draft', () => {
    mockGetApprovals.mockReturnValue({
      data: {
        data: [
          {
            id: 'approval-return',
            approvalLevel: 'finance',
            action: 'return',
            comment: '请调整统计口径',
            source: 'internal',
            externalEventId: null,
            approvedBy: 'finance-1',
            approvedAt: '2026-04-18T11:00:00.000+08:00',
          },
        ],
      },
    });

    render(<ProcurementReportRequestDetailPage />);

    expect(screen.getByText('已退回，待修改')).toBeInTheDocument();
    expect(screen.getByText('已退回修改')).toBeInTheDocument();
  });

  it('downloads a generated report PDF from the export action', async () => {
    render(<ProcurementReportRequestDetailPage />);

    fireEvent.click(screen.getByRole('button', { name: '导出 PDF' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'https://oss.example.com/report-1.pdf',
      );
      expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    });
  });

  it('can return to procurement home from a direct entry', () => {
    render(<ProcurementReportRequestDetailPage />);

    fireEvent.click(screen.getByRole('button', { name: '返回采购首页' }));

    expect(mockNavigate).toHaveBeenCalledWith('/procurement');
  });
});
