import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkbenchHomePage } from './WorkbenchHomePage';

vi.mock('../files/FileUploadField', () => ({
  FileUploadField: () => <button type="button">上传文件</button>,
}));
vi.mock('../files/useFileUpload', () => ({
  useFileUpload: () => ({
    uploadFile: vi.fn().mockResolvedValue({ id: 'signature-file' }),
  }),
}));

const mockNavigate = vi.fn();
const mockGetWorkbenchDashboardQuery = vi.fn();
const mockGetWorkbenchRecordsQuery = vi.fn();
const mockGetWorkbenchRecordQuery = vi.fn();
const mockGetWorkbenchRecordIssuesQuery = vi.fn();
const mockGetWorkbenchModuleSchemaQuery = vi.fn();
const mockGetWorkbenchAttendanceStatisticsQuery = vi.fn();
const mockTriggerPrintSnapshot = vi.fn();
const mockCreateWorkbenchRecord = vi.fn();
const mockPerformWorkbenchRecordAction = vi.fn();
const mockLaunchWorkbenchApproval = vi.fn();
const mockUploadWorkbenchRecordAttachment = vi.fn();
const mockCreateSignatureEvidence = vi.fn();
const mockCreateLocationEvidence = vi.fn();
const mockWxInvoke = vi.fn();
const mockScrollTo = vi.fn();
const mockScrollIntoView = vi.fn();

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

vi.mock('./workbenchApi', () => ({
  useGetWorkbenchDashboardQuery: () => mockGetWorkbenchDashboardQuery(),
  useGetWorkbenchRecordsQuery: (params: unknown, options: unknown) =>
    mockGetWorkbenchRecordsQuery(params, options),
  useGetWorkbenchRecordQuery: (recordId: string, options: unknown) =>
    mockGetWorkbenchRecordQuery(recordId, options),
  useGetWorkbenchRecordIssuesQuery: (recordId: string, options: unknown) =>
    mockGetWorkbenchRecordIssuesQuery(recordId, options),
  useGetWorkbenchModuleSchemaQuery: (moduleCode: string, options: unknown) =>
    mockGetWorkbenchModuleSchemaQuery(moduleCode, options),
  useGetWorkbenchAttendanceStatisticsQuery: (
    params: unknown,
    options: unknown,
  ) => mockGetWorkbenchAttendanceStatisticsQuery(params, options),
  useLazyGetWorkbenchPrintSnapshotQuery: () => [
    mockTriggerPrintSnapshot,
    { isFetching: false },
  ],
  useLazyGetWorkbenchAttachmentDownloadUrlQuery: () => [vi.fn()],
  useCreateWorkbenchRecordMutation: () => [
    mockCreateWorkbenchRecord,
    { isLoading: false },
  ],
  usePerformWorkbenchRecordActionMutation: () => [
    mockPerformWorkbenchRecordAction,
    { isLoading: false },
  ],
  useLaunchWorkbenchApprovalMutation: () => [
    mockLaunchWorkbenchApproval,
    { isLoading: false },
  ],
  useUploadWorkbenchRecordAttachmentMutation: () => [
    mockUploadWorkbenchRecordAttachment,
    { isLoading: false },
  ],
  useCreateWorkbenchSignatureEvidenceMutation: () => [
    mockCreateSignatureEvidence,
    { isLoading: false },
  ],
  useCreateWorkbenchLocationEvidenceMutation: () => [
    mockCreateLocationEvidence,
    { isLoading: false },
  ],
}));

vi.mock('../../hooks/useWecomJsSdk', () => ({
  useWecomJsSdk: () => ({ isReady: true, error: null }),
}));

describe('WorkbenchHomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = mockScrollTo;
    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    };
    Element.prototype.scrollIntoView = mockScrollIntoView;
    mockWxInvoke.mockImplementation((_api, _config, callback) =>
      callback({ err_msg: 'thirdPartyOpenPage:ok' }),
    );
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
    mockTriggerPrintSnapshot.mockReturnValue({
      unwrap: vi
        .fn()
        .mockResolvedValue({
          data: { paperSize: 'A4', renderedFormat: 'pdf' },
        }),
    });
    mockUploadWorkbenchRecordAttachment.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ data: { id: 'att-1' } }),
    });
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
      isError: false,
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
      isError: false,
    });
    mockGetWorkbenchRecordQuery.mockReturnValue({
      data: undefined,
      isFetching: false,
    });
    mockGetWorkbenchRecordIssuesQuery.mockReturnValue({ data: { data: [] } });
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

    fireEvent.click(screen.getByRole('button', { name: /考勤统计/ }));
    fireEvent.click(screen.getByRole('button', { name: /审批看板/ }));
    fireEvent.click(screen.getAllByRole('button', { name: /海图更新/ })[0]);
    fireEvent.click(
      screen.getAllByRole('button', { name: /海图批次 2026-04/ })[0],
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      '/workbench/statistics/attendance',
    );
    expect(mockNavigate).toHaveBeenCalledWith('/workbench/approvals');
    expect(mockNavigate).toHaveBeenCalledWith(
      '/workbench/modules/shipping_chart_update',
    );
    expect(mockNavigate).toHaveBeenCalledWith('/workbench/records/record-1');
  });

  it('keeps the home entry at the top instead of a stale module scroll position', () => {
    render(<WorkbenchHomePage routeAware />);

    expect(mockScrollTo).toHaveBeenCalledWith({ top: 0, left: 0 });
    expect(mockScrollIntoView).not.toHaveBeenCalled();
  });

  it('expands all real module entries and all records from the loaded page', () => {
    const dashboard = mockGetWorkbenchDashboardQuery().data.data;
    mockGetWorkbenchDashboardQuery.mockReturnValue({
      data: {
        data: {
          ...dashboard,
          modules: [
            ...dashboard.modules,
            {
              moduleCode: 'goa_meeting',
              moduleName: '会议管理',
              departmentCode: 'general_office',
              templateType: 'ledger_form',
              pendingCount: 0,
              requiresApproval: false,
              supportsPrint: true,
              supportsStatistics: false,
              mobileFirst: false,
            },
          ],
        },
      },
      isLoading: false,
      isError: false,
    });
    const records = Array.from({ length: 4 }, (_, index) => ({
      id: `record-${index + 1}`,
      moduleCode: 'shipping_chart_update',
      title: `海图记录 ${index + 1}`,
      status: 'assigned',
      vesselId: 'ship-1',
      occurredAt: `2026-04-${22 - index}T10:00:00.000+08:00`,
      approvalChannel: 'internal',
    }));
    mockGetWorkbenchRecordsQuery.mockReturnValue({
      data: {
        data: records,
        pagination: { page: 1, pageSize: 20, total: 4 },
      },
      isLoading: false,
      isError: false,
    });

    render(<WorkbenchHomePage routeAware />);

    const moduleSection = screen
      .getByRole('heading', { name: '模块入口' })
      .closest('section');
    expect(moduleSection).not.toBeNull();
    expect(within(moduleSection!).queryByText('会议管理')).toBeNull();
    fireEvent.click(
      within(moduleSection!).getByRole('button', { name: /查看全部/ }),
    );
    expect(within(moduleSection!).getByText('会议管理')).toBeInTheDocument();

    const recordSection = screen
      .getByRole('heading', { name: '最近记录' })
      .closest('section');
    expect(recordSection).not.toBeNull();
    expect(within(recordSection!).queryByText('海图记录 4')).toBeNull();
    fireEvent.click(
      within(recordSection!).getByRole('button', { name: /展开本页/ }),
    );
    expect(within(recordSection!).getByText('海图记录 4')).toBeInTheDocument();
  });

  it('anchors direct module entries to their selected module card', () => {
    render(
      <WorkbenchHomePage routeAware initialModuleCode="business_signin_desk" />,
    );

    expect(
      screen.getByText('签到台').closest('.workbench-module-card'),
    ).toHaveClass('is-selected');
    expect(mockScrollIntoView).toHaveBeenCalledWith({ block: 'center' });
  });

  it('adds return actions for direct module, approval and attendance entries', () => {
    const { rerender } = render(
      <WorkbenchHomePage
        routeAware
        initialModuleCode="shipping_chart_update"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '返回工作台首页' }));
    expect(mockNavigate).toHaveBeenCalledWith('/workbench');

    rerender(<WorkbenchHomePage routeAware moduleFilter="requiresApproval" />);
    fireEvent.click(screen.getByRole('button', { name: '返回工作台首页' }));
    expect(mockNavigate).toHaveBeenCalledWith('/workbench');

    rerender(<WorkbenchHomePage routeAware statisticsOnly />);
    fireEvent.click(screen.getByRole('button', { name: '返回工作台首页' }));
    expect(mockNavigate).toHaveBeenCalledWith('/workbench');
  });

  it('renders workbench side rail from real records without static schedule samples', () => {
    render(<WorkbenchHomePage routeAware />);

    expect(screen.getByText('最近记录')).toBeInTheDocument();
    expect(screen.getByText('优先处理')).toBeInTheDocument();
    expect(screen.getAllByText('海图批次 2026-04').length).toBeGreaterThan(0);
    expect(screen.queryByText('总经办例会')).not.toBeInTheDocument();
    expect(screen.queryByText('证书到期确认')).not.toBeInTheDocument();
    expect(screen.queryByText('+4 今日')).not.toBeInTheDocument();
    expect(screen.queryByText('低于 SLA')).not.toBeInTheDocument();
    expect(screen.getByText('审批回调待重试 1 条')).toBeInTheDocument();
  });

  it('loads approval-pending priorities independently from the recent-record page', () => {
    const recentClosedRecords = Array.from({ length: 20 }, (_, index) => ({
      id: `closed-${index + 1}`,
      moduleCode: 'shipping_chart_update',
      title: `已关闭记录 ${index + 1}`,
      status: 'closed',
      vesselId: 'ship-1',
      occurredAt: `2026-04-${String(30 - index).padStart(2, '0')}T10:00:00.000+08:00`,
      approvalChannel: 'internal',
    }));
    mockGetWorkbenchRecordsQuery.mockImplementation(
      (params: { status?: string }) => ({
        data:
          params?.status === 'approval_pending'
            ? {
                data: [
                  {
                    id: 'older-approval',
                    moduleCode: 'business_signin_desk',
                    title: '较早的待审批记录',
                    status: 'approval_pending',
                    vesselId: null,
                    occurredAt: '2026-03-01T10:00:00.000+08:00',
                    approvalChannel: 'internal',
                  },
                ],
                pagination: { page: 1, pageSize: 100, total: 1 },
              }
            : {
                data: recentClosedRecords,
                pagination: { page: 1, pageSize: 20, total: 20 },
              },
        isLoading: false,
        isError: false,
      }),
    );

    render(<WorkbenchHomePage routeAware />);

    const prioritySection = screen
      .getByRole('heading', { name: '优先处理' })
      .closest('section');
    expect(prioritySection).not.toBeNull();
    expect(
      within(prioritySection!).getByText('较早的待审批记录'),
    ).toBeInTheDocument();
    expect(mockGetWorkbenchRecordsQuery).toHaveBeenCalledWith(
      { status: 'approval_pending', page: 1, pageSize: 100 },
      { skip: false },
    );
  });

  it('shows a partial-data error when the dashboard request fails', () => {
    mockGetWorkbenchDashboardQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    render(<WorkbenchHomePage routeAware />);

    expect(screen.getByText('部分工作台数据加载失败')).toBeInTheDocument();
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
      expect(mockTriggerPrintSnapshot).toHaveBeenCalledWith({
        recordId: 'record-1',
        paperSize: 'A4',
      });
      expect(mockTriggerPrintSnapshot).toHaveBeenCalledWith({
        recordId: 'record-1',
        paperSize: 'A3',
      });
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
    expect(screen.getAllByText('燃油加注审批').length).toBeGreaterThan(0);
    expect(screen.getByText('审批相关记录')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '燃油加注 2026-04' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '海图批次 2026-04' }),
    ).toBeNull();

    await waitFor(() => {
      expect(mockGetWorkbenchRecordsQuery).toHaveBeenCalledWith(
        {
          requiresApproval: true,
          page: 1,
          pageSize: 20,
        },
        undefined,
      );
    });
    expect(
      mockGetWorkbenchRecordsQuery.mock.calls.map(([params]) => params),
    ).not.toContainEqual(
      expect.objectContaining({ templateType: 'wecom_approval' }),
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

    render(
      <WorkbenchHomePage routeAware initialRecordId="record-approval-1" />,
    );
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
        expect.objectContaining({
          templateId: 'tpl-1',
          thirdNo: 'ww-approval-1',
        }),
        expect.any(Function),
      );
    });
  });

  it('renders attendance statistics view and skips module grid in statistics-only mode', () => {
    render(<WorkbenchHomePage routeAware statisticsOnly />);

    const currentMonth = new Date().toISOString().slice(0, 7);

    expect(screen.queryByTestId('workbench-module-grid')).toBeNull();
    expect(screen.getByText('月度考勤统计')).toBeInTheDocument();
    expect(screen.getByTestId('workbench-attendance-stat-grid')).toHaveClass(
      'workbench-attendance-stat-grid',
    );
    expect(
      screen.getAllByTestId('workbench-attendance-stat-card'),
    ).toHaveLength(8);
    expect(mockGetWorkbenchAttendanceStatisticsQuery).toHaveBeenCalledWith(
      { month: currentMonth },
      { skip: false },
    );
  });
});
