import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProcurementReportPage } from './ProcurementReportPage';

const mockNavigate = vi.fn();
const mockMonthly = vi.fn();
const mockYearly = vi.fn();
const mockDepartmentDetails = vi.fn();
const mockDimensionDetails = vi.fn();
const mockReportRequests = vi.fn();
const mockCreateReportRequest = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useLocation: () => ({ pathname: '/procurement/reports', search: '' }),
    useNavigate: () => mockNavigate,
  };
});

vi.mock('./procurementApi', () => ({
  useGetProcurementMonthlyReportQuery: (params: unknown) => mockMonthly(params),
  useGetProcurementYearlyReportQuery: (params: unknown) => mockYearly(params),
  useGetProcurementDepartmentDetailsQuery: (params: unknown) => mockDepartmentDetails(params),
  useGetProcurementDimensionDetailsQuery: (params: unknown) => mockDimensionDetails(params),
  useGetProcurementReportRequestsQuery: (params: unknown) => mockReportRequests(params),
  useCreateProcurementReportRequestMutation: () => [mockCreateReportRequest, { isLoading: false }],
}));

describe('ProcurementReportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMonthly.mockReturnValue({ data: { data: { year: 2026, month: 4, items: [] } }, isLoading: false });
    mockYearly.mockReturnValue({ data: { data: { year: 2026, items: [] } }, isLoading: false });
    mockDepartmentDetails.mockReturnValue({ data: { data: [] }, isLoading: false });
    mockDimensionDetails.mockReturnValue({ data: { data: [] }, isLoading: false });
    mockReportRequests.mockReturnValue({
      data: { data: [], meta: { total: 0, page: 1, pageSize: 10, totalPages: 1 } },
      isLoading: false,
    });
    mockCreateReportRequest.mockImplementation((payload: { reportType: 'monthly' | 'yearly' }) => ({
      unwrap: () => Promise.resolve({ data: { id: payload.reportType === 'monthly' ? 'report-monthly-1' : 'report-yearly-1' } }),
    }));
  });

  it('creates a monthly report request and jumps to detail', async () => {
    render(<ProcurementReportPage />);

    fireEvent.click(screen.getByRole('button', { name: '生成月报审批单' }));

    await waitFor(() => {
      expect(mockCreateReportRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          reportType: 'monthly',
        }),
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      '/procurement/report-requests/report-monthly-1?backTo=%2Fprocurement%2Freports',
    );
  });

  it('creates a yearly report request and jumps to detail', async () => {
    render(<ProcurementReportPage />);

    fireEvent.click(screen.getByRole('button', { name: '生成年报审批单' }));

    await waitFor(() => {
      expect(mockCreateReportRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          reportType: 'yearly',
        }),
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      '/procurement/report-requests/report-yearly-1?backTo=%2Fprocurement%2Freports',
    );
  });
});
