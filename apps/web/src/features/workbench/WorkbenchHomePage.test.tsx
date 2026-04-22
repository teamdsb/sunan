import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkbenchHomePage } from './WorkbenchHomePage';

const mockNavigate = vi.fn();
const mockGetWorkbenchDashboardQuery = vi.fn();
const mockGetWorkbenchRecordsQuery = vi.fn();
const mockGetWorkbenchRecordQuery = vi.fn();
const mockGetWorkbenchModuleSchemaQuery = vi.fn();
const mockGetWorkbenchAttendanceStatisticsQuery = vi.fn();
const mockCreateWorkbenchRecord = vi.fn();
const mockPerformWorkbenchRecordAction = vi.fn();
const mockLaunchWorkbenchApproval = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('./workbenchApi', () => ({
  useGetWorkbenchDashboardQuery: () => mockGetWorkbenchDashboardQuery(),
  useGetWorkbenchRecordsQuery: (params: unknown) => mockGetWorkbenchRecordsQuery(params),
  useGetWorkbenchRecordQuery: (recordId: string, options: unknown) => mockGetWorkbenchRecordQuery(recordId, options),
  useGetWorkbenchModuleSchemaQuery: (moduleCode: string, options: unknown) =>
    mockGetWorkbenchModuleSchemaQuery(moduleCode, options),
  useGetWorkbenchAttendanceStatisticsQuery: (params: unknown, options: unknown) =>
    mockGetWorkbenchAttendanceStatisticsQuery(params, options),
  useCreateWorkbenchRecordMutation: () => [mockCreateWorkbenchRecord, { isLoading: false }],
  usePerformWorkbenchRecordActionMutation: () => [mockPerformWorkbenchRecordAction, { isLoading: false }],
  useLaunchWorkbenchApprovalMutation: () => [mockLaunchWorkbenchApproval, { isLoading: false }],
}));

describe('WorkbenchHomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWorkbenchDashboardQuery.mockReturnValue({
      data: {
        data: {
          pendingTotal: 5,
          approvalPendingTotal: 2,
          alerts: [{ code: 'a1', message: '审批回调待重试 1 条' }],
          modules: [
            {
              moduleCode: 'shipping_chart_update',
              moduleName: '海图更新',
              departmentCode: 'shipping',
              templateType: 'ledger_form',
              pendingCount: 1,
              requiresApproval: false,
              supportsPrint: true,
              supportsStatistics: false,
              mobileFirst: true,
            },
            {
              moduleCode: 'business_signin_desk',
              moduleName: '签到台',
              departmentCode: 'general_office',
              templateType: 'attendance_statistics',
              pendingCount: 3,
              requiresApproval: true,
              supportsPrint: true,
              supportsStatistics: true,
              mobileFirst: true,
            },
          ],
        },
      },
      isLoading: false,
    });
    mockGetWorkbenchRecordsQuery.mockReturnValue({
      data: {
        data: [
          {
            id: 'record-1',
            moduleCode: 'shipping_chart_update',
            title: '海图批次 2026-04',
            status: 'assigned',
            vesselId: 'ship-1',
            occurredAt: '2026-04-22T10:00:00.000+08:00',
            approvalChannel: 'internal',
          },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
        },
      },
      isLoading: false,
    });
    mockGetWorkbenchRecordQuery.mockReturnValue({
      data: undefined,
      isFetching: false,
    });
    mockGetWorkbenchModuleSchemaQuery.mockReturnValue({
      data: {
        data: {
          moduleCode: 'shipping_chart_update',
          templateType: 'ledger_form',
          sections: [],
        },
      },
      isLoading: false,
    });
    mockGetWorkbenchAttendanceStatisticsQuery.mockReturnValue({
      data: {
        data: {
          month: '2026-04',
          summary: {
            totalCheckIns: 10,
            financeAndShippingCheckIns: 4,
            operationFlowCheckIns: 6,
            morningCount: 7,
            afternoonCount: 3,
            inRangeCount: 8,
            outRangeCount: 2,
            businessTripCount: 1,
            normalDutyCount: 9,
          },
          moduleTotals: [],
        },
      },
      isLoading: false,
    });
  });

  it('supports route-aware navigation for workbench entry links', () => {
    render(<WorkbenchHomePage routeAware />);

    fireEvent.click(screen.getByRole('button', { name: '返回工作台首页' }));
    fireEvent.click(screen.getByRole('button', { name: '考勤统计' }));
    fireEvent.click(screen.getByRole('button', { name: '审批看板' }));
    fireEvent.click(screen.getAllByRole('button', { name: '查看记录' })[0]);
    fireEvent.click(screen.getByRole('button', { name: '海图批次 2026-04' }));

    expect(mockNavigate).toHaveBeenCalledWith('/workbench');
    expect(mockNavigate).toHaveBeenCalledWith('/workbench/statistics/attendance');
    expect(mockNavigate).toHaveBeenCalledWith('/workbench/approvals');
    expect(mockNavigate).toHaveBeenCalledWith('/workbench/modules/shipping_chart_update');
    expect(mockNavigate).toHaveBeenCalledWith('/workbench/records/record-1');
  });

  it('filters modules in approval board and requests records by approval template when no module selected', async () => {
    render(<WorkbenchHomePage routeAware moduleFilter="requiresApproval" />);

    expect(screen.queryByText('海图更新')).toBeNull();
    expect(screen.getByText('签到台')).toBeInTheDocument();
    expect(screen.getByText('模块记录：签到台')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockGetWorkbenchRecordsQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          templateType: 'wecom_approval',
          page: 1,
          pageSize: 20,
        }),
      );
    });
  });

  it('renders attendance statistics view and skips module grid in statistics-only mode', () => {
    render(<WorkbenchHomePage routeAware statisticsOnly />);

    expect(screen.queryByTestId('workbench-module-grid')).toBeNull();
    expect(screen.getByText('月度考勤统计')).toBeInTheDocument();
    expect(mockGetWorkbenchAttendanceStatisticsQuery).toHaveBeenCalledWith(
      { month: '2026-04' },
      { skip: false },
    );
  });
});
