import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkbenchHomePage } from './WorkbenchHomePage';

const mockNavigate = vi.fn();
const mockGetWorkbenchDashboardQuery = vi.fn();
const mockGetWorkbenchRecordsQuery = vi.fn();
const mockGetWorkbenchRecordQuery = vi.fn();
const mockGetWorkbenchModuleSchemaQuery = vi.fn();
const mockGetWorkbenchAttendanceStatisticsQuery = vi.fn();
const mockTriggerPrintSnapshot = vi.fn();
const mockCreateWorkbenchRecord = vi.fn();
const mockPerformWorkbenchRecordAction = vi.fn();
const mockLaunchWorkbenchApproval = vi.fn();
const mockUploadWorkbenchRecordAttachment = vi.fn();
const mockWxInvoke = vi.fn();

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
  useLazyGetWorkbenchPrintSnapshotQuery: () => [mockTriggerPrintSnapshot, { isFetching: false }],
  useCreateWorkbenchRecordMutation: () => [mockCreateWorkbenchRecord, { isLoading: false }],
  usePerformWorkbenchRecordActionMutation: () => [mockPerformWorkbenchRecordAction, { isLoading: false }],
  useLaunchWorkbenchApprovalMutation: () => [mockLaunchWorkbenchApproval, { isLoading: false }],
  useUploadWorkbenchRecordAttachmentMutation: () => [mockUploadWorkbenchRecordAttachment, { isLoading: false }],
}));

vi.mock('../../hooks/useWecomJsSdk', () => ({
  useWecomJsSdk: () => ({ isReady: true, error: null }),
}));

describe('WorkbenchHomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWxInvoke.mockImplementation((_api, _config, callback) => callback({ err_msg: 'thirdPartyOpenPage:ok' }));
    window.wx = {
      config: vi.fn(),
      ready: vi.fn(),
      error: vi.fn(),
      agentConfig: vi.fn(),
      chooseImage: vi.fn(),
      uploadImage: vi.fn(),
      invoke: mockWxInvoke,
      previewFile: vi.fn(),
    };
    mockTriggerPrintSnapshot.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({ data: { paperSize: 'A4', renderedFormat: 'pdf' } }) });
    mockUploadWorkbenchRecordAttachment.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({ data: { id: 'att-1' } }) });
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
            {
              moduleCode: 'shipping_fuel_bunkering_approval',
              moduleName: '燃油加注审批',
              departmentCode: 'shipping',
              templateType: 'service_asset',
              pendingCount: 2,
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

  it('shows print actions in record detail and triggers print endpoint', async () => {
    mockGetWorkbenchRecordQuery.mockReturnValue({
      data: {
        data: {
          id: 'record-1',
          moduleCode: 'shipping_chart_update',
          title: '海图批次 2026-04',
          summary: '摘要',
          status: 'assigned',
          vesselId: 'ship-1',
          occurredAt: '2026-04-22T10:00:00.000+08:00',
          approvalChannel: 'internal',
          externalProcessInstanceId: null,
          externalStatus: null,
          steps: [],
          attachments: [],
          actionLogs: [],
          payload: {},
        },
      },
      isFetching: false,
    });

    render(<WorkbenchHomePage routeAware initialRecordId="record-1" />);
    fireEvent.click(screen.getByRole('button', { name: '打印 A4' }));
    fireEvent.click(screen.getByRole('button', { name: '打印 A3' }));

    await waitFor(() => {
      expect(mockTriggerPrintSnapshot).toHaveBeenCalledWith({ recordId: 'record-1', paperSize: 'A4' });
      expect(mockTriggerPrintSnapshot).toHaveBeenCalledWith({ recordId: 'record-1', paperSize: 'A3' });
    });
  });

  it('filters modules in approval board and filters approval records without templateType when no module selected', async () => {
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
          {
            id: 'record-approval-1',
            moduleCode: 'shipping_fuel_bunkering_approval',
            title: '燃油加注 2026-04',
            status: 'assigned',
            vesselId: 'ship-1',
            occurredAt: '2026-04-23T10:00:00.000+08:00',
            approvalChannel: 'wecom_native',
          },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 2,
        },
      },
      isLoading: false,
    });

    render(<WorkbenchHomePage routeAware moduleFilter="requiresApproval" />);

    expect(screen.queryByText('海图更新')).toBeNull();
    expect(screen.getByText('签到台')).toBeInTheDocument();
    expect(screen.getByText('燃油加注审批')).toBeInTheDocument();
    expect(screen.getByText('审批相关记录')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '燃油加注 2026-04' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '海图批次 2026-04' })).toBeNull();

    await waitFor(() => {
      expect(mockGetWorkbenchRecordsQuery).toHaveBeenCalledWith(
        {
          requiresApproval: true,
          page: 1,
          pageSize: 20,
        },
      );
    });
    expect(mockGetWorkbenchRecordsQuery).not.toHaveBeenCalledWith(
      expect.objectContaining({
        templateType: 'wecom_approval',
      }),
    );
  });

  it('shows launch approval action for requiresApproval non-wecom detail and calls mutation', async () => {
    mockLaunchWorkbenchApproval.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        data: {
          processInstanceId: 'ww-approval-1',
          thirdNo: 'ww-approval-1',
          wecomTemplateId: 'tpl-1',
          wecomLaunchConfig: {
            oaType: '10001',
            templateId: 'tpl-1',
            thirdNo: 'ww-approval-1',
            extData: { fieldList: [] },
          },
        },
      }),
    });
    mockGetWorkbenchRecordQuery.mockReturnValue({
      data: {
        data: {
          id: 'record-approval-1',
          moduleCode: 'shipping_fuel_bunkering_approval',
          title: '燃油加注 2026-04',
          summary: '燃油加注申请',
          status: 'assigned',
          vesselId: 'ship-1',
          occurredAt: '2026-04-23T10:00:00.000+08:00',
          approvalChannel: 'wecom_native',
          externalProcessInstanceId: null,
          externalStatus: null,
          steps: [],
          attachments: [],
          actionLogs: [],
          payload: { amount: 120 },
        },
      },
      isFetching: false,
    });

    render(<WorkbenchHomePage routeAware initialRecordId="record-approval-1" />);
    fireEvent.click(screen.getByRole('button', { name: '发起企业微信审批' }));

    await waitFor(() => {
      expect(mockLaunchWorkbenchApproval).toHaveBeenCalledWith({
        moduleCode: 'shipping_fuel_bunkering_approval',
        businessRecordId: 'record-approval-1',
        templateCode: 'shipping_fuel_bunkering_approval_v1',
        title: '燃油加注 2026-04',
        applicantUserId: 'current_user',
        summary: '燃油加注申请',
        payload: { amount: 120 },
      });
      expect(mockWxInvoke).toHaveBeenCalledWith(
        'thirdPartyOpenPage',
        expect.objectContaining({ templateId: 'tpl-1', thirdNo: 'ww-approval-1' }),
        expect.any(Function),
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
